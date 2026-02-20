-- =====================================================
-- Migration: Admin API Keys + Audit Log
-- Run this in your Supabase SQL editor
-- =====================================================

-- 1. API Keys table (encrypted storage)
CREATE TABLE IF NOT EXISTS admin_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, key_name)
);

-- RLS: Only service role can access (API routes use service role key)
ALTER TABLE admin_api_keys ENABLE ROW LEVEL SECURITY;

-- No public access — only service role bypasses RLS
-- This means keys are ONLY accessible through the API routes

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_api_keys_team ON admin_api_keys(team_id);

-- 2. Audit log (optional — for tracking admin actions)
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_audit_team ON admin_audit_log(team_id, created_at DESC);

-- 3. Add role column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'developer';
  END IF;
END $$;

-- 4. Add team_id column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN team_id UUID;
  END IF;
END $$;
