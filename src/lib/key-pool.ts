// =====================================================
// FILE ENGINE - API KEY POOL MANAGER
// Handles multiple API keys for zero throttling
// Supports 1000s of concurrent builds
// Keys loaded from: ENV vars → Supabase admin_api_keys
// =====================================================

import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, scryptSync } from 'crypto'

export interface KeyPool {
  anthropic: string[]
  openai: string[]
}

export interface KeyStats {
  key: string
  provider: 'anthropic' | 'openai'
  uses: number
  lastUsed: number
  errors: number
  rateLimited: boolean
  rateLimitResetAt: number | null
}

// =====================================================
// KEY POOL STORAGE
// =====================================================

const keyPool: KeyPool = {
  anthropic: [],
  openai: []
}

const keyStats: Map<string, KeyStats> = new Map()

// Track which keys are currently rate limited
const rateLimitedKeys: Set<string> = new Set()

// Track if DB keys have been loaded (async, one-shot)
let dbKeysLoaded = false
let dbKeysLoading: Promise<void> | null = null

// =====================================================
// DECRYPT HELPER (matches /api/admin/keys encryption)
// =====================================================

function decryptKey(data: string): string | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-key-do-not-use-in-prod'
    const encKey = scryptSync(secret, 'admin-keys-salt', 32)
    const [ivHex, authTagHex, encrypted] = data.split(':')
    if (!ivHex || !authTagHex || !encrypted) return null
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', encKey, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (e) {
    console.warn('[KeyPool] Decrypt failed:', (e instanceof Error ? e.message : String(e)))
    return null
  }
}

// =====================================================
// LOAD KEYS FROM SUPABASE admin_api_keys TABLE
// =====================================================

async function loadKeysFromDatabase(): Promise<void> {
  if (dbKeysLoaded) return
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.warn('[KeyPool] No Supabase service role key — skipping DB key load')
    dbKeysLoaded = true
    return
  }
  try {
    const supabase = createClient(url, serviceKey)
    const { data, error } = await supabase
      .from('admin_api_keys')
      .select('key_name, encrypted_value')
    if (error) {
      console.warn('[KeyPool] DB key load error:', error.message)
      dbKeysLoaded = true
      return
    }
    if (!data || data.length === 0) {
      console.log('[KeyPool] No keys stored in database')
      dbKeysLoaded = true
      return
    }
    let added = 0
    for (const row of data) {
      const name = row.key_name as string
      const raw = decryptKey(row.encrypted_value as string)
      if (!raw) continue
      let provider: 'anthropic' | 'openai' | null = null
      if (name.startsWith('ANTHROPIC_API_KEY')) provider = 'anthropic'
      else if (name.startsWith('OPENAI_API_KEY')) provider = 'openai'
      if (!provider) continue
      if (!keyPool[provider].includes(raw)) {
        keyPool[provider].push(raw)
        initKeyStats(raw, provider)
        added++
      }
    }
    if (added > 0) console.log(`[KeyPool] Loaded ${added} key(s) from database`)
  } catch (e) {
    console.warn('[KeyPool] DB key load exception:', (e instanceof Error ? e.message : String(e)))
  }
  dbKeysLoaded = true
}

// =====================================================
// ENSURE KEYS LOADED (env + DB)
// =====================================================

async function ensureKeysLoaded(): Promise<void> {
  if (keyPool.anthropic.length === 0 && keyPool.openai.length === 0) {
    initializeKeyPool()
  }
  if (keyPool.anthropic.length === 0 && keyPool.openai.length === 0) {
    if (!dbKeysLoading) {
      dbKeysLoading = loadKeysFromDatabase()
    }
    await dbKeysLoading
  }
}

// =====================================================
// INITIALIZE KEY POOL FROM ENV
// =====================================================

export function initializeKeyPool(): void {
  // Clear existing
  keyPool.anthropic = []
  keyPool.openai = []
  
  // Load Anthropic keys (ANTHROPIC_API_KEY + ANTHROPIC_API_KEY_1 + ANTHROPIC_API_KEY_2)
  const anthropicMain = process.env.ANTHROPIC_API_KEY
  if (anthropicMain) {
    keyPool.anthropic.push(anthropicMain)
    initKeyStats(anthropicMain, 'anthropic')
  }
  
  // Load keys 1-3 (allows for 4 total)
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`ANTHROPIC_API_KEY_${i}`]
    if (key && !keyPool.anthropic.includes(key)) {
      keyPool.anthropic.push(key)
      initKeyStats(key, 'anthropic')
    }
  }
  
  // Load OpenAI keys (OPENAI_API_KEY + OPENAI_API_KEY_1 + OPENAI_API_KEY_2)
  const openaiMain = process.env.OPENAI_API_KEY
  if (openaiMain) {
    keyPool.openai.push(openaiMain)
    initKeyStats(openaiMain, 'openai')
  }
  
  // Load keys 1-3 (allows for 4 total)
  for (let i = 1; i <= 3; i++) {
    const key = process.env[`OPENAI_API_KEY_${i}`]
    if (key && !keyPool.openai.includes(key)) {
      keyPool.openai.push(key)
      initKeyStats(key, 'openai')
    }
  }
  
  // Log count without revealing pool structure
  const totalKeys = keyPool.anthropic.length + keyPool.openai.length
  if (totalKeys > 0) {
    console.log(`[KeyPool] Initialized with ${totalKeys} API keys`)
  } else {
    console.warn('[KeyPool] No API keys configured')
  }
}

function initKeyStats(key: string, provider: 'anthropic' | 'openai'): void {
  keyStats.set(key, {
    key,
    provider,
    uses: 0,
    lastUsed: 0,
    errors: 0,
    rateLimited: false,
    rateLimitResetAt: null
  })
}

// =====================================================
// GET NEXT AVAILABLE KEY (Load Balancing)
// =====================================================

export function getNextKey(provider: 'anthropic' | 'openai'): string | null {
  const keys = keyPool[provider]
  
  if (keys.length === 0) {
    console.error(`[KeyPool] No ${provider} keys available`)
    return null
  }
  
  // Filter out rate-limited keys
  const availableKeys = keys.filter(key => !rateLimitedKeys.has(key))
  
  if (availableKeys.length === 0) {
    // All keys rate limited - find the one that resets soonest
    console.warn(`[KeyPool] All ${provider} keys rate limited, finding soonest reset`)
    return findSoonestResetKey(provider)
  }
  
  // Load balancing: pick the least recently used key
  let bestKey = availableKeys[0]
  let bestStats = keyStats.get(bestKey)
  
  for (const key of availableKeys) {
    const stats = keyStats.get(key)
    if (stats && (!bestStats || stats.lastUsed < bestStats.lastUsed)) {
      bestKey = key
      bestStats = stats
    }
  }
  
  // Update stats
  if (bestStats) {
    bestStats.uses++
    bestStats.lastUsed = Date.now()
  }
  
  return bestKey
}

function findSoonestResetKey(provider: 'anthropic' | 'openai'): string | null {
  const keys = keyPool[provider]
  let soonestKey: string | null = null
  let soonestReset = Infinity
  
  for (const key of keys) {
    const stats = keyStats.get(key)
    if (stats?.rateLimitResetAt && stats.rateLimitResetAt < soonestReset) {
      soonestKey = key
      soonestReset = stats.rateLimitResetAt
    }
  }
  
  // If reset time has passed, clear the rate limit
  if (soonestKey && soonestReset <= Date.now()) {
    clearRateLimit(soonestKey)
  }
  
  return soonestKey || keys[0] // Fallback to first key
}

// =====================================================
// MARK KEY AS RATE LIMITED
// =====================================================

export function markRateLimited(key: string, resetInMs: number = 60000): void {
  rateLimitedKeys.add(key)
  
  const stats = keyStats.get(key)
  if (stats) {
    stats.rateLimited = true
    stats.rateLimitResetAt = Date.now() + resetInMs
    stats.errors++
  }
  
  console.warn(`[KeyPool] Key marked as rate limited, reset in ${resetInMs}ms`)
  
  // Auto-clear after reset time
  setTimeout(() => {
    clearRateLimit(key)
  }, resetInMs)
}

export function clearRateLimit(key: string): void {
  rateLimitedKeys.delete(key)
  
  const stats = keyStats.get(key)
  if (stats) {
    stats.rateLimited = false
    stats.rateLimitResetAt = null
  }
  
  console.log(`[KeyPool] Key rate limit cleared`)
}

// =====================================================
// GET KEY WITH AUTOMATIC FAILOVER
// =====================================================

export interface KeyResult {
  key: string
  provider: 'anthropic' | 'openai'
}

export async function getKeyWithFailover(preferredProvider?: 'anthropic' | 'openai'): Promise<KeyResult | null> {
  // Ensure all key sources loaded (env + DB)
  await ensureKeysLoaded()
  
  // If no preference, load-balance across both providers equally
  // Pick the provider with the least-recently-used available key
  if (!preferredProvider) {
    const anthropicKey = getNextKey('anthropic')
    const openaiKey = getNextKey('openai')
    
    if (anthropicKey && openaiKey) {
      const aStats = keyStats.get(anthropicKey)
      const oStats = keyStats.get(openaiKey)
      // Pick whichever was used least recently (true round-robin)
      if ((aStats?.lastUsed || 0) <= (oStats?.lastUsed || 0)) {
        return { key: anthropicKey, provider: 'anthropic' }
      } else {
        return { key: openaiKey, provider: 'openai' }
      }
    }
    if (anthropicKey) return { key: anthropicKey, provider: 'anthropic' }
    if (openaiKey) return { key: openaiKey, provider: 'openai' }
    
    console.error('[KeyPool] No keys available from any provider')
    return null
  }
  
  // With preference, try preferred first then failover
  const providers: ('anthropic' | 'openai')[] = [preferredProvider, preferredProvider === 'anthropic' ? 'openai' : 'anthropic']
  
  for (const provider of providers) {
    const key = getNextKey(provider)
    if (key) {
      return { key, provider }
    }
  }
  
  console.error('[KeyPool] No keys available from any provider')
  return null
}

// =====================================================
// POOL STATUS (For monitoring)
// =====================================================

export interface PoolStatus {
  anthropic: {
    total: number
    available: number
    rateLimited: number
  }
  openai: {
    total: number
    available: number
    rateLimited: number
  }
  totalCapacity: number
  availableCapacity: number
}

export function getPoolStatus(): PoolStatus {
  const anthropicRateLimited = keyPool.anthropic.filter(k => rateLimitedKeys.has(k)).length
  const openaiRateLimited = keyPool.openai.filter(k => rateLimitedKeys.has(k)).length
  
  return {
    anthropic: {
      total: keyPool.anthropic.length,
      available: keyPool.anthropic.length - anthropicRateLimited,
      rateLimited: anthropicRateLimited
    },
    openai: {
      total: keyPool.openai.length,
      available: keyPool.openai.length - openaiRateLimited,
      rateLimited: openaiRateLimited
    },
    totalCapacity: keyPool.anthropic.length + keyPool.openai.length,
    availableCapacity: (keyPool.anthropic.length - anthropicRateLimited) + (keyPool.openai.length - openaiRateLimited)
  }
}

// =====================================================
// ESTIMATE CONCURRENT CAPACITY
// Each key ~50 requests/min
// =====================================================

export function estimateConcurrentCapacity(): number {
  const status = getPoolStatus()
  const requestsPerKeyPerMinute = 50
  return status.availableCapacity * requestsPerKeyPerMinute
}

// =====================================================
// INITIALIZE ON IMPORT
// =====================================================

// Auto-initialize when module loads
if (typeof process !== 'undefined' && process.env) {
  initializeKeyPool()
}
