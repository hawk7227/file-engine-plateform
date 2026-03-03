-- =====================================================
-- CONVERSATION PERSISTENCE
-- Tables for storing chat conversations and messages
-- with RLS policies ensuring user-only access.
-- =====================================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID,
  title TEXT NOT NULL DEFAULT 'New chat',
  model TEXT DEFAULT 'auto',
  settings_json JSONB DEFAULT '{}',
  archived BOOLEAN DEFAULT false,
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  files_json JSONB,
  tool_calls_json JSONB,
  attachments_json JSONB,
  thinking TEXT,
  tokens_used INTEGER,
  model TEXT,
  status TEXT DEFAULT 'complete' CHECK (status IN ('complete', 'streaming', 'error')),
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_search ON conversations USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING gin(to_tsvector('english', content));

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'conversations_owner_select') THEN
    CREATE POLICY conversations_owner_select ON conversations FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'conversations_owner_insert') THEN
    CREATE POLICY conversations_owner_insert ON conversations FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'conversations_owner_update') THEN
    CREATE POLICY conversations_owner_update ON conversations FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'conversations_owner_delete') THEN
    CREATE POLICY conversations_owner_delete ON conversations FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_owner_select') THEN
    CREATE POLICY messages_owner_select ON messages FOR SELECT USING (
      conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_owner_insert') THEN
    CREATE POLICY messages_owner_insert ON messages FOR INSERT WITH CHECK (
      conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_owner_update') THEN
    CREATE POLICY messages_owner_update ON messages FOR UPDATE USING (
      conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_owner_delete') THEN
    CREATE POLICY messages_owner_delete ON messages FOR DELETE USING (
      conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );
  END IF;
END $$;

-- Auto-update conversations.updated_at when messages are inserted
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_update_conversation ON messages;
CREATE TRIGGER messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();
