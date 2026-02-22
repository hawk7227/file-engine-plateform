-- =====================================================
-- FILE ENGINE — Permission System Migration
-- 
-- Tables:
--   permission_groups         — Named groups of users
--   permission_group_members  — User ↔ Group membership
--   feature_permissions       — Feature grants (per user, group, or plan)
--
-- Functions:
--   user_has_feature()        — Check if user has a specific feature
--   get_user_features()       — Get all features for a user
--   get_user_permissions()    — Full permission details for admin UI
--
-- Seeds:
--   Default plan-level permissions for free/pro/enterprise
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1. PERMISSION GROUPS
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permission_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-update timestamp
CREATE TRIGGER set_permission_groups_updated_at
  BEFORE UPDATE ON permission_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;

-- Only admins can manage groups
CREATE POLICY "Admins manage permission groups"
  ON permission_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

-- ─────────────────────────────────────────────────────
-- 2. GROUP MEMBERSHIP
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permission_group_members (
  group_id UUID NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pgm_user 
  ON permission_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pgm_group 
  ON permission_group_members(group_id);

ALTER TABLE permission_group_members ENABLE ROW LEVEL SECURITY;

-- Admins manage membership; users can read their own
CREATE POLICY "Admins manage group members"
  ON permission_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users read own memberships"
  ON permission_group_members FOR SELECT
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────
-- 3. FEATURE PERMISSIONS
-- ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- WHO (exactly one must be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES permission_groups(id) ON DELETE CASCADE,
  plan TEXT CHECK (plan IN ('free', 'pro', 'enterprise')),

  -- WHAT
  feature TEXT NOT NULL,

  -- CONTROLS
  enabled BOOLEAN NOT NULL DEFAULT true,
  limit_value INTEGER,           -- optional usage cap
  limit_period TEXT CHECK (limit_period IN ('day', 'week', 'month')),
  expires_at TIMESTAMPTZ,        -- optional expiry for trials

  -- META
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,                    -- why this was granted ("trial", "upsell", "support")
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one target must be set
  CONSTRAINT fp_exactly_one_target CHECK (
    (CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN group_id IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN plan IS NOT NULL THEN 1 ELSE 0 END) = 1
  ),

  -- No duplicate feature grants for the same target
  CONSTRAINT fp_unique_user_feature UNIQUE (user_id, feature),
  CONSTRAINT fp_unique_group_feature UNIQUE (group_id, feature),
  CONSTRAINT fp_unique_plan_feature UNIQUE (plan, feature)
);

-- Indexes for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_fp_user 
  ON feature_permissions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_group 
  ON feature_permissions(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_plan 
  ON feature_permissions(plan) WHERE plan IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fp_feature 
  ON feature_permissions(feature);
CREATE INDEX IF NOT EXISTS idx_fp_enabled 
  ON feature_permissions(feature, enabled) WHERE enabled = true;

-- Auto-update timestamp
CREATE TRIGGER set_feature_permissions_updated_at
  BEFORE UPDATE ON feature_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- Admins manage; users can read their own applicable permissions
CREATE POLICY "Admins manage feature permissions"
  ON feature_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Users read own permissions"
  ON feature_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM permission_group_members WHERE user_id = auth.uid()
    )
    OR plan IS NOT NULL  -- plan-level permissions are readable by all
  );

-- ─────────────────────────────────────────────────────
-- 4. PERMISSION CHECK FUNCTION
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION user_has_feature(p_user_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_plan TEXT;
  v_has_individual BOOLEAN;
  v_has_group BOOLEAN;
  v_has_plan BOOLEAN;
BEGIN
  -- 1. Check individual user permission (highest priority)
  SELECT enabled INTO v_has_individual
  FROM feature_permissions
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  -- If individual permission exists, use it (can be explicit deny)
  IF v_has_individual IS NOT NULL THEN
    RETURN v_has_individual;
  END IF;

  -- 2. Check group permissions
  SELECT bool_or(fp.enabled) INTO v_has_group
  FROM feature_permissions fp
  INNER JOIN permission_group_members pgm ON pgm.group_id = fp.group_id
  WHERE pgm.user_id = p_user_id
    AND fp.feature = p_feature
    AND fp.enabled = true
    AND (fp.expires_at IS NULL OR fp.expires_at > now());

  IF v_has_group = true THEN
    RETURN true;
  END IF;

  -- 3. Check plan-level permission
  SELECT COALESCE(
    (SELECT s.plan FROM subscriptions s 
     WHERE s.user_id = p_user_id AND s.status = 'active' 
     LIMIT 1),
    'free'
  ) INTO v_user_plan;

  SELECT enabled INTO v_has_plan
  FROM feature_permissions
  WHERE plan = v_user_plan
    AND feature = p_feature
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_has_plan = true THEN
    RETURN true;
  END IF;

  -- 4. Default: denied
  RETURN false;
END;
$$;

-- ─────────────────────────────────────────────────────
-- 5. GET ALL FEATURES FOR A USER
-- ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_features(p_user_id UUID)
RETURNS TABLE(feature TEXT, source TEXT, expires_at TIMESTAMPTZ, limit_value INTEGER, limit_period TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_plan TEXT;
BEGIN
  -- Get user's plan
  SELECT COALESCE(
    (SELECT s.plan FROM subscriptions s 
     WHERE s.user_id = p_user_id AND s.status = 'active' 
     LIMIT 1),
    'free'
  ) INTO v_user_plan;

  RETURN QUERY
  -- Individual permissions
  SELECT fp.feature, 'individual'::TEXT AS source, fp.expires_at, fp.limit_value, fp.limit_period
  FROM feature_permissions fp
  WHERE fp.user_id = p_user_id
    AND fp.enabled = true
    AND (fp.expires_at IS NULL OR fp.expires_at > now())

  UNION

  -- Group permissions
  SELECT fp.feature, ('group:' || pg.name)::TEXT AS source, fp.expires_at, fp.limit_value, fp.limit_period
  FROM feature_permissions fp
  INNER JOIN permission_group_members pgm ON pgm.group_id = fp.group_id
  INNER JOIN permission_groups pg ON pg.id = fp.group_id
  WHERE pgm.user_id = p_user_id
    AND fp.enabled = true
    AND (fp.expires_at IS NULL OR fp.expires_at > now())

  UNION

  -- Plan permissions
  SELECT fp.feature, ('plan:' || fp.plan)::TEXT AS source, fp.expires_at, fp.limit_value, fp.limit_period
  FROM feature_permissions fp
  WHERE fp.plan = v_user_plan
    AND fp.enabled = true
    AND (fp.expires_at IS NULL OR fp.expires_at > now());
END;
$$;

-- ─────────────────────────────────────────────────────
-- 6. SEED DEFAULT PLAN PERMISSIONS
-- ─────────────────────────────────────────────────────

-- Pro plan features
INSERT INTO feature_permissions (plan, feature, enabled, reason) VALUES
  ('pro', 'deploy_vercel', true, 'default_plan'),
  ('pro', 'deploy_github', true, 'default_plan'),
  ('pro', 'preview_panel', true, 'default_plan'),
  ('pro', 'build_verify', true, 'default_plan'),
  ('pro', 'user_fix', true, 'default_plan'),
  ('pro', 'generate_validated', true, 'default_plan'),
  ('pro', 'media_generation', true, 'default_plan'),
  ('pro', 'vision_analysis', true, 'default_plan'),
  ('pro', 'image_search', true, 'default_plan'),
  ('pro', 'code_execution', true, 'default_plan'),
  ('pro', 'memory_persistent', true, 'default_plan'),
  ('pro', 'export_zip', true, 'default_plan'),
  ('pro', 'url_import', true, 'default_plan'),
  ('pro', 'advanced_models', true, 'default_plan')
ON CONFLICT (plan, feature) DO NOTHING;

-- Enterprise plan features (everything Pro has + more)
INSERT INTO feature_permissions (plan, feature, enabled, reason) VALUES
  ('enterprise', 'deploy_vercel', true, 'default_plan'),
  ('enterprise', 'deploy_github', true, 'default_plan'),
  ('enterprise', 'preview_panel', true, 'default_plan'),
  ('enterprise', 'build_verify', true, 'default_plan'),
  ('enterprise', 'user_fix', true, 'default_plan'),
  ('enterprise', 'generate_validated', true, 'default_plan'),
  ('enterprise', 'media_generation', true, 'default_plan'),
  ('enterprise', 'vision_analysis', true, 'default_plan'),
  ('enterprise', 'image_search', true, 'default_plan'),
  ('enterprise', 'code_execution', true, 'default_plan'),
  ('enterprise', 'memory_persistent', true, 'default_plan'),
  ('enterprise', 'export_zip', true, 'default_plan'),
  ('enterprise', 'url_import', true, 'default_plan'),
  ('enterprise', 'advanced_models', true, 'default_plan'),
  -- Enterprise-exclusive
  ('enterprise', 'auto_fix', true, 'default_plan'),
  ('enterprise', 'byok', true, 'default_plan'),
  ('enterprise', 'team_features', true, 'default_plan'),
  ('enterprise', 'extended_thinking', true, 'default_plan'),
  ('enterprise', 'batch_operations', true, 'default_plan')
ON CONFLICT (plan, feature) DO NOTHING;

-- Free plan: nothing gated is enabled by default
-- (Admin can grant individual features to free users via the dashboard)
