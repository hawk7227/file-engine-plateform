-- =====================================================
-- FILE ENGINE — ADMIN COST SETTINGS
-- Admins control token optimization for their team
-- Run this AFTER schema-memory.sql
-- =====================================================


-- =====================================================
-- 1. TEAM COST SETTINGS TABLE
-- One row per team — admin-configurable
-- =====================================================

CREATE TABLE IF NOT EXISTS team_cost_settings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID NOT NULL UNIQUE,
  updated_by      UUID REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Model Routing
  -- When true: simple questions use cheaper models automatically
  -- When false: always use the user's selected model tier
  smart_model_routing    BOOLEAN NOT NULL DEFAULT true,
  
  -- Default model tier when smart routing is OFF
  -- 'fast' = Haiku/GPT-4o-mini, 'pro' = Sonnet/GPT-4o, 'premium' = Opus/o1
  default_model_tier     TEXT NOT NULL DEFAULT 'pro' CHECK (default_model_tier IN ('fast', 'pro', 'premium')),
  
  -- Conversation Trimming
  -- When true: old messages get compressed before sending to API
  -- When false: full conversation history sent every time
  conversation_trimming  BOOLEAN NOT NULL DEFAULT true,
  
  -- Max conversation pairs to keep in full (rest get summarized)
  -- Higher = more context but more tokens
  max_history_pairs      INTEGER NOT NULL DEFAULT 6 CHECK (max_history_pairs BETWEEN 2 AND 20),
  
  -- Max characters per individual message before truncation
  max_message_chars      INTEGER NOT NULL DEFAULT 3000 CHECK (max_message_chars BETWEEN 500 AND 10000),
  
  -- Smart max_tokens
  -- When true: max_tokens varies by intent (512 for chat, 8192 for code gen)
  -- When false: always use fixed max_tokens
  smart_max_tokens       BOOLEAN NOT NULL DEFAULT true,
  
  -- Fixed max_tokens when smart_max_tokens is OFF
  fixed_max_tokens       INTEGER NOT NULL DEFAULT 8192 CHECK (fixed_max_tokens BETWEEN 256 AND 16384),
  
  -- Smart Context Injection
  -- When true: only inject relevant skills/memory per intent
  -- When false: always inject full context (old behavior)
  smart_context          BOOLEAN NOT NULL DEFAULT true,
  
  -- Dual Call Prevention
  -- When true: chat-only messages don't trigger generation pipeline
  -- When false: broad regex triggers both chat + generate (old behavior)
  prevent_dual_calls     BOOLEAN NOT NULL DEFAULT true,
  
  -- Skill Cache
  -- When true: cache skill matches across messages
  skill_caching          BOOLEAN NOT NULL DEFAULT true,
  
  -- Provider Preference
  -- 'balanced' = round-robin, 'provider_a' = prefer first pool, 'provider_b' = prefer second pool
  provider_preference    TEXT NOT NULL DEFAULT 'balanced' CHECK (provider_preference IN ('balanced', 'provider_a', 'provider_b')),
  
  -- Cost Alerts
  -- Estimated daily token budget (0 = unlimited)
  daily_token_budget     INTEGER NOT NULL DEFAULT 0,
  
  -- Alert threshold (percentage of budget)
  alert_threshold_pct    INTEGER NOT NULL DEFAULT 80 CHECK (alert_threshold_pct BETWEEN 10 AND 100),
  
  -- Alert email (null = team owner email)
  alert_email            TEXT
);

-- RLS: Only team owners/admins can read/write
ALTER TABLE team_cost_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_cost_settings' AND policyname='team_cost_settings_admin') THEN 
CREATE POLICY "team_cost_settings_admin" ON team_cost_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.team_id = team_cost_settings.team_id
        AND p.role IN ('owner', 'admin')
    )
  );
END IF; END $$;


-- =====================================================
-- 2. PROFILES TABLE — ADD ROLE COLUMN
-- So we can distinguish admin vs regular users
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
      CHECK (role IN ('owner', 'admin', 'developer', 'viewer', 'user'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN team_id UUID;
  END IF;
END $$;


-- =====================================================
-- 3. SEED DEFAULT SETTINGS FOR A TEAM
-- Call when a team is created
-- =====================================================

CREATE OR REPLACE FUNCTION seed_team_cost_settings(p_team_id UUID, p_admin_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO team_cost_settings (team_id, updated_by)
  VALUES (p_team_id, p_admin_id)
  ON CONFLICT (team_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. DAILY TOKEN USAGE TRACKING
-- Track actual tokens used per team per day
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_token_usage (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id     UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Token counts
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0,
  
  -- Request counts by intent
  requests_chat       INTEGER NOT NULL DEFAULT 0,
  requests_generate   INTEGER NOT NULL DEFAULT 0,
  requests_fix        INTEGER NOT NULL DEFAULT 0,
  requests_explain    INTEGER NOT NULL DEFAULT 0,
  requests_other      INTEGER NOT NULL DEFAULT 0,
  
  -- Model tier usage
  tier_fast_count     INTEGER NOT NULL DEFAULT 0,
  tier_pro_count      INTEGER NOT NULL DEFAULT 0,
  tier_premium_count  INTEGER NOT NULL DEFAULT 0,
  
  -- Estimated cost (cents)
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(team_id, user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_team_date ON daily_token_usage(team_id, date DESC);

ALTER TABLE daily_token_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='daily_token_usage' AND policyname='usage_team_admin') THEN
CREATE POLICY "usage_team_admin" ON daily_token_usage
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.team_id = daily_token_usage.team_id
        AND p.role IN ('owner', 'admin')
    )
  );
END IF; END $$;


-- =====================================================
-- 5. INCREMENT USAGE FUNCTION
-- Called after each API request from the chat route
-- =====================================================

CREATE OR REPLACE FUNCTION track_token_usage(
  p_team_id UUID,
  p_user_id UUID,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_intent TEXT,
  p_model_tier TEXT,
  p_cost_cents INTEGER DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_token_usage (
    team_id, user_id, date,
    input_tokens, output_tokens, total_tokens,
    estimated_cost_cents
  ) VALUES (
    p_team_id, p_user_id, CURRENT_DATE,
    p_input_tokens, p_output_tokens, p_input_tokens + p_output_tokens,
    p_cost_cents
  )
  ON CONFLICT (team_id, user_id, date)
  DO UPDATE SET
    input_tokens = daily_token_usage.input_tokens + p_input_tokens,
    output_tokens = daily_token_usage.output_tokens + p_output_tokens,
    total_tokens = daily_token_usage.total_tokens + p_input_tokens + p_output_tokens,
    estimated_cost_cents = daily_token_usage.estimated_cost_cents + p_cost_cents,
    requests_chat = daily_token_usage.requests_chat + CASE WHEN p_intent = 'general_chat' THEN 1 ELSE 0 END,
    requests_generate = daily_token_usage.requests_generate + CASE WHEN p_intent = 'generate_code' THEN 1 ELSE 0 END,
    requests_fix = daily_token_usage.requests_fix + CASE WHEN p_intent = 'fix_code' THEN 1 ELSE 0 END,
    requests_explain = daily_token_usage.requests_explain + CASE WHEN p_intent = 'explain' THEN 1 ELSE 0 END,
    requests_other = daily_token_usage.requests_other + CASE WHEN p_intent NOT IN ('general_chat','generate_code','fix_code','explain') THEN 1 ELSE 0 END,
    tier_fast_count = daily_token_usage.tier_fast_count + CASE WHEN p_model_tier = 'fast' THEN 1 ELSE 0 END,
    tier_pro_count = daily_token_usage.tier_pro_count + CASE WHEN p_model_tier = 'pro' THEN 1 ELSE 0 END,
    tier_premium_count = daily_token_usage.tier_premium_count + CASE WHEN p_model_tier = 'premium' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
