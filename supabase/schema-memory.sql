-- =====================================================
-- FILE ENGINE — SUPABASE SCHEMA
-- Memory, Context, and Rules Storage
-- Run this in Supabase SQL Editor
-- =====================================================


-- =====================================================
-- 1. USER MEMORIES TABLE
-- Stores coding style, preferences, corrections, project context
-- Uses type+category+key as a logical composite key
-- =====================================================

CREATE TABLE IF NOT EXISTS user_memories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Classification
  type          TEXT NOT NULL CHECK (type IN ('style', 'preference', 'correction', 'project', 'context', 'skill')),
  category      TEXT NOT NULL DEFAULT 'general',
  key           TEXT NOT NULL,
  
  -- The actual data (JSONB for flexible structure)
  value         JSONB NOT NULL,
  
  -- Confidence score: 0.0 = guess, 1.0 = user explicitly set this
  confidence    REAL NOT NULL DEFAULT 0.8,
  
  -- Usage tracking (for relevance ranking)
  usage_count   INTEGER NOT NULL DEFAULT 1,
  last_used     TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate entries
  UNIQUE(user_id, type, category, key)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_memories_user_type ON user_memories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_memories_user_type_key ON user_memories(user_id, type, key);
CREATE INDEX IF NOT EXISTS idx_user_memories_last_used ON user_memories(user_id, last_used DESC);

-- RLS: Users can only see their own memories
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_memories' 
        AND policyname = 'users_own_memories'
    ) THEN
        CREATE POLICY "users_own_memories" ON user_memories
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;


-- =====================================================
-- 2. DEFAULT MEMORY SEEDS
-- When a new user signs up, insert these defaults
-- These are NOT injected into API calls — they're just
-- the starting values that get updated as the user works
-- =====================================================

-- Call this function from your signup flow:
CREATE OR REPLACE FUNCTION seed_user_memories(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Default coding style
  INSERT INTO user_memories (user_id, type, category, key, value, confidence)
  VALUES (
    p_user_id, 'style', 'coding', 'default',
    '{
      "indentation": "spaces",
      "indentSize": 2,
      "semicolons": false,
      "quotes": "single",
      "trailingComma": true,
      "preferredFramework": "react",
      "preferredStyling": "tailwind",
      "componentStyle": "functional",
      "stateManagement": "hooks",
      "namingConvention": "camelCase"
    }'::jsonb,
    0.5  -- Low confidence = defaults, will increase as user confirms
  ) ON CONFLICT (user_id, type, category, key) DO NOTHING;

  -- Default preferences
  INSERT INTO user_memories (user_id, type, category, key, value, confidence)
  VALUES (
    p_user_id, 'preference', 'app', 'default',
    '{
      "defaultModel": "auto",
      "autoFix": true,
      "autoValidate": true,
      "codeCommenting": "moderate",
      "defaultFramework": "react",
      "defaultStyling": "tailwind"
    }'::jsonb,
    0.5
  ) ON CONFLICT (user_id, type, category, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 3. AUTO-INCREMENT USAGE COUNT
-- Used by memory.ts for fire-and-forget usage tracking
-- =====================================================

CREATE OR REPLACE FUNCTION increment_memory_usage(p_memory_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE user_memories
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE id = p_memory_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 4. AUTO-LEARN CODING STYLE FROM GENERATED CODE
-- Trigger this after a successful generation
-- Analyzes the code and updates the user's style memory
-- =====================================================

CREATE OR REPLACE FUNCTION learn_coding_style(
  p_user_id UUID,
  p_uses_semicolons BOOLEAN,
  p_uses_tabs BOOLEAN,
  p_indent_size INTEGER,
  p_quote_style TEXT,
  p_framework TEXT,
  p_styling TEXT
)
RETURNS void AS $$
DECLARE
  current_style JSONB;
  current_confidence REAL;
BEGIN
  -- Get current style
  SELECT value, confidence INTO current_style, current_confidence
  FROM user_memories
  WHERE user_id = p_user_id AND type = 'style' AND key = 'default';

  IF current_style IS NULL THEN
    -- First time — seed and return
    PERFORM seed_user_memories(p_user_id);
    RETURN;
  END IF;

  -- Only update if we're more confident (user has done 3+ generations)
  UPDATE user_memories
  SET value = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(value,
              '{semicolons}', to_jsonb(p_uses_semicolons)),
            '{indentation}', to_jsonb(CASE WHEN p_uses_tabs THEN 'tabs' ELSE 'spaces' END)),
          '{indentSize}', to_jsonb(p_indent_size)),
        '{quotes}', to_jsonb(p_quote_style)),
      '{preferredFramework}', to_jsonb(COALESCE(p_framework, 'react'))),
    '{preferredStyling}', to_jsonb(COALESCE(p_styling, 'tailwind'))),
    confidence = LEAST(1.0, confidence + 0.05),
    updated_at = now()
  WHERE user_id = p_user_id AND type = 'style' AND key = 'default';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 5. CLEANUP: Remove stale memories
-- Run weekly via Supabase pg_cron or external cron
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_stale_memories()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  temp_count INTEGER;
BEGIN
  -- Delete corrections older than 90 days with low usage
  DELETE FROM user_memories
  WHERE type = 'correction'
    AND last_used < now() - interval '90 days'
    AND usage_count < 3;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete project context older than 180 days
  DELETE FROM user_memories
  WHERE type = 'context'
    AND last_used < now() - interval '180 days';
  
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Auto-run weekly with pg_cron
-- SELECT cron.schedule('cleanup-memories', '0 3 * * 0', 'SELECT cleanup_stale_memories()');


-- =====================================================
-- 6. PROFILES TABLE EXTENSION
-- Add skill_level for onboarding (referenced in FileEngineApp.tsx)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'skill_level'
  ) THEN
    ALTER TABLE profiles ADD COLUMN skill_level TEXT DEFAULT 'intermediate';
  END IF;
END $$;
