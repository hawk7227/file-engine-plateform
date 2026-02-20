-- =====================================================
-- FILE ENGINE - Preview & Deploy System Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PREVIEW DEPLOYMENTS
-- Store preview deployments for cleanup
-- =====================================================

CREATE TABLE IF NOT EXISTS file_engine_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  deployment_id TEXT NOT NULL,
  preview_url TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  status TEXT DEFAULT 'active' -- active, expired, deployed, deleted
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_previews_user_id ON file_engine_previews(user_id);
CREATE INDEX IF NOT EXISTS idx_previews_status ON file_engine_previews(status);
CREATE INDEX IF NOT EXISTS idx_previews_expires_at ON file_engine_previews(expires_at);

-- RLS
ALTER TABLE file_engine_previews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='file_engine_previews' AND policyname='Users can CRUD own previews') THEN CREATE POLICY "Users can CRUD own previews" ON file_engine_previews FOR ALL USING (auth.uid() = user_id); END IF; END $$;


-- =====================================================
-- USER CONNECTIONS
-- Store user's connected accounts (Vercel, GitHub)
-- =====================================================

CREATE TABLE IF NOT EXISTS file_engine_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'vercel' | 'github'
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  account_name TEXT,
  account_id TEXT,
  scopes TEXT[],
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON file_engine_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON file_engine_connections(provider);

-- RLS
ALTER TABLE file_engine_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='file_engine_connections' AND policyname='Users can CRUD own connections') THEN CREATE POLICY "Users can CRUD own connections" ON file_engine_connections FOR ALL USING (auth.uid() = user_id); END IF; END $$;


-- =====================================================
-- DEPLOYMENT HISTORY
-- Store all deployments (Vercel, GitHub, or both)
-- =====================================================

CREATE TABLE IF NOT EXISTS file_engine_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]'::jsonb,
  deployed_to TEXT[] NOT NULL DEFAULT '{}', -- ['vercel', 'github']
  vercel_url TEXT,
  vercel_deployment_id TEXT,
  github_url TEXT,
  github_commit_sha TEXT,
  status TEXT DEFAULT 'completed', -- completed, failed, in_progress
  error_message TEXT,
  build_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON file_engine_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON file_engine_deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON file_engine_deployments(created_at DESC);

-- RLS
ALTER TABLE file_engine_deployments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='file_engine_deployments' AND policyname='Users can CRUD own deployments') THEN CREATE POLICY "Users can CRUD own deployments" ON file_engine_deployments FOR ALL USING (auth.uid() = user_id); END IF; END $$;


-- =====================================================
-- FIX ATTEMPTS
-- Store fix attempts for learning and debugging
-- =====================================================

CREATE TABLE IF NOT EXISTS file_engine_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  original_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_or_feedback TEXT NOT NULL,
  fix_type TEXT NOT NULL, -- 'auto' | 'user_requested'
  fixed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  changed_files TEXT[] DEFAULT '{}',
  explanation TEXT,
  successful BOOLEAN,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fixes_user_id ON file_engine_fixes(user_id);
CREATE INDEX IF NOT EXISTS idx_fixes_fix_type ON file_engine_fixes(fix_type);
CREATE INDEX IF NOT EXISTS idx_fixes_successful ON file_engine_fixes(successful);

-- RLS
ALTER TABLE file_engine_fixes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='file_engine_fixes' AND policyname='Users can CRUD own fixes') THEN CREATE POLICY "Users can CRUD own fixes" ON file_engine_fixes FOR ALL USING (auth.uid() = user_id); END IF; END $$;


-- =====================================================
-- ADMIN FEATURES CONFIG
-- Store admin feature configurations
-- =====================================================

CREATE TABLE IF NOT EXISTS file_engine_admin_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default admin config
INSERT INTO file_engine_admin_config (config_key, config_value, description) VALUES
  ('preview_settings', '{"enabled": true, "maxDuration": 86400, "maxPerUser": 5}', 'Preview deployment settings'),
  ('auto_fix_settings', '{"enabled": true, "maxAttempts": 3, "defaultModel": "claude-sonnet-4"}', 'Auto-fix settings'),
  ('deploy_settings', '{"vercelEnabled": true, "githubEnabled": true, "requireVerification": true}', 'Deployment settings'),
  ('feature_flags', '{"previewForFree": false, "autoFixForFree": false, "deployForFree": false}', 'Feature flags for pricing tiers')
ON CONFLICT (config_key) DO NOTHING;

-- RLS - Only admins can modify, all can read
ALTER TABLE file_engine_admin_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='file_engine_admin_config' AND policyname='Anyone can read admin config') THEN CREATE POLICY "Anyone can read admin config" ON file_engine_admin_config FOR SELECT USING (true); END IF; END $$;

-- Note: For UPDATE/INSERT/DELETE, you'll need to add a policy based on your admin role logic
-- Example: CREATE POLICY "Admins can modify config" ON file_engine_admin_config 
--   FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));


-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to clean up expired previews
CREATE OR REPLACE FUNCTION cleanup_expired_previews()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE file_engine_previews 
  SET status = 'expired'
  WHERE status = 'active' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get user's deployment stats
CREATE OR REPLACE FUNCTION get_user_deployment_stats(p_user_id UUID)
RETURNS TABLE (
  total_deployments BIGINT,
  vercel_deployments BIGINT,
  github_deployments BIGINT,
  active_previews BIGINT,
  last_deployment TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_deployments,
    COUNT(*) FILTER (WHERE 'vercel' = ANY(deployed_to))::BIGINT as vercel_deployments,
    COUNT(*) FILTER (WHERE 'github' = ANY(deployed_to))::BIGINT as github_deployments,
    (SELECT COUNT(*) FROM file_engine_previews WHERE user_id = p_user_id AND status = 'active')::BIGINT as active_previews,
    MAX(created_at) as last_deployment
  FROM file_engine_deployments
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at on connections
CREATE OR REPLACE FUNCTION update_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS connections_updated_at ON file_engine_connections;
CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON file_engine_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_timestamp();
