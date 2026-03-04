import { createClient } from '@supabase/supabase-js'
import { createCipheriv, randomBytes, scryptSync } from 'crypto'

const SUPABASE_URL = 'https://fzenkpfwyhibcoulxfdx.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6ZW5rcGZ3eWhpYmNvdWx4ZmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTAxNDQzMCwiZXhwIjoyMDg0NTkwNDMwfQ.IhQA1sAkeyPatn_L5xv0HMalVvE6VYXg8VYEO23lYB4'
const OWNER_ID = 'f1626735-8d94-4f09-91a7-511dc9e16b51'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('\n=== FILE ENGINE — ADMIN KEYS DIAGNOSIS ===\n')

// 1. Check table exists
console.log('1. Checking admin_api_keys table...')
const { data: rows, error: selectErr } = await supabase
  .from('admin_api_keys')
  .select('team_id, key_name, updated_at')
  .limit(10)

if (selectErr) {
  console.error('   ❌ TABLE ERROR:', selectErr.message, '| code:', selectErr.code)
  console.error('   → Table likely does not exist. Run the migration SQL.')
} else {
  console.log(`   ✅ Table exists. Rows visible: ${rows.length}`)
  if (rows.length > 0) {
    rows.forEach(r => console.log(`      - team_id=${r.team_id} key=${r.key_name}`))
  }
}

// 2. Test upsert (the exact same call as the PUT route)
console.log('\n2. Testing upsert (same as PUT route)...')

function encrypt(text) {
  const key = scryptSync(SERVICE_KEY, 'admin-keys-salt', 32)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

const encrypted = encrypt('sk-ant-test-diagnosis-key-123456')
const { error: upsertErr } = await supabase
  .from('admin_api_keys')
  .upsert({
    team_id: OWNER_ID,
    key_name: '__diagnosis_test__',
    encrypted_value: encrypted,
    updated_by: OWNER_ID,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'team_id,key_name' })

if (upsertErr) {
  console.error('   ❌ UPSERT FAILED:', upsertErr.message, '| code:', upsertErr.code)
  console.error('   hint:', upsertErr.hint)
  console.error('   details:', upsertErr.details)
} else {
  console.log('   ✅ Upsert succeeded')

  // Verify it saved
  const { data: verify } = await supabase
    .from('admin_api_keys')
    .select('key_name, updated_at')
    .eq('team_id', OWNER_ID)
    .eq('key_name', '__diagnosis_test__')
    .single()
  
  console.log('   ✅ Verified row:', verify)

  // Clean up
  await supabase.from('admin_api_keys').delete()
    .eq('team_id', OWNER_ID).eq('key_name', '__diagnosis_test__')
  console.log('   ✅ Cleanup done')
}

// 3. Check profiles table for team_id
console.log('\n3. Checking owner profile...')
const { data: profile, error: profileErr } = await supabase
  .from('profiles')
  .select('id, email, role, team_id')
  .eq('id', OWNER_ID)
  .single()

if (profileErr) {
  console.error('   ❌ Profile error:', profileErr.message)
} else {
  console.log('   ✅ Profile:', JSON.stringify(profile))
}

// 4. Create table if missing
if (selectErr && selectErr.code === '42P01') {
  console.log('\n4. Creating missing table...')
  const { error: createErr } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.admin_api_keys (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        team_id UUID NOT NULL,
        key_name TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        updated_by UUID,
        updated_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(team_id, key_name)
      );
      CREATE INDEX IF NOT EXISTS idx_admin_api_keys_team ON public.admin_api_keys(team_id);
    `
  })
  if (createErr) {
    console.error('   ❌ Could not auto-create table:', createErr.message)
    console.log('   → Run supabase/supabase-migration-admin-keys.sql manually in Supabase SQL editor')
  } else {
    console.log('   ✅ Table created')
  }
}

console.log('\n===========================================\n')
