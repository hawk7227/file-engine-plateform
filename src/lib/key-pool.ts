// =====================================================
// FILE ENGINE - API KEY POOL MANAGER
// Handles multiple API keys for zero throttling
// Supports 1000s of concurrent builds
// =====================================================

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

export function getKeyWithFailover(preferredProvider?: 'anthropic' | 'openai'): KeyResult | null {
  // Initialize if not done
  if (keyPool.anthropic.length === 0 && keyPool.openai.length === 0) {
    initializeKeyPool()
  }
  
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
