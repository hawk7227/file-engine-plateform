-- ================================================================
-- Builder Engine + KPB — FIXED for existing projects table
-- Existing projects table uses user_id (not owner_id)
-- Run in Supabase SQL Editor
-- ================================================================

-- ── user_preferences ──
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tone_mode text default 'copilot',
  theme jsonb default '{}'::jsonb,
  font_scale_desktop numeric(4,2) default 1.00,
  font_scale_mobile numeric(4,2) default 0.98,
  default_stack jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ── project_members ──
create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

-- ── project_state ──
create table if not exists public.project_state (
  project_id uuid primary key references public.projects(id) on delete cascade,
  active_goal text,
  current_phase text,
  active_constraints jsonb default '[]'::jsonb,
  current_context_summary text,
  last_active_thread_id uuid,
  last_activity_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── project_decisions ──
create table if not exists public.project_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  kind text not null,
  title text,
  decision text not null,
  data jsonb default '{}'::jsonb,
  confidence numeric(3,2) default 0.80,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- ── project_tasks ──
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  details text,
  status text default 'open',
  blocked_reason text,
  priority int default 2,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── chat_threads ──
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── chat_messages ──
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  role text not null,
  content text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ── patch_sets ──
create table if not exists public.patch_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  thread_id uuid references public.chat_threads(id) on delete set null,
  created_by uuid references public.profiles(id),
  summary text,
  created_at timestamptz default now()
);

-- ── patch_files ──
create table if not exists public.patch_files (
  id uuid primary key default gen_random_uuid(),
  patch_set_id uuid references public.patch_sets(id) on delete cascade,
  path text not null,
  before_hash text,
  after_hash text,
  diff text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ── build_runs ──
create table if not exists public.build_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  patch_set_id uuid references public.patch_sets(id) on delete set null,
  status text not null,
  summary text,
  evidence jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- ── knowledge_sources ──
create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  owner_scope text not null,
  owner_id uuid,
  project_id uuid references public.projects(id) on delete cascade,
  type text not null,
  name text not null,
  base_url text,
  meta jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ── knowledge_documents ──
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.knowledge_sources(id) on delete cascade,
  pack text,
  version text,
  title text,
  canonical_ref text,
  source_url text,
  content_md text,
  content_hash text,
  fetched_at timestamptz,
  meta jsonb default '{}'::jsonb,
  storage_bucket text,
  storage_path text,
  byte_size int,
  mime_type text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ── knowledge_chunks ──
create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.knowledge_documents(id) on delete cascade,
  chunk_index int,
  content text not null,
  tokens_est int,
  source_url text,
  content_hash text,
  meta jsonb default '{}'::jsonb,
  storage_bucket text,
  storage_path text,
  byte_size int,
  mime_type text,
  created_at timestamptz default now()
);

-- ── knowledge_ingest_runs ──
create table if not exists public.knowledge_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.knowledge_sources(id) on delete cascade,
  status text,
  summary text,
  stats jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- ── knowledge_fixes ──
create table if not exists public.knowledge_fixes (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  project_id uuid references public.projects(id) on delete cascade,
  signature text not null,
  symptoms jsonb default '{}'::jsonb,
  root_cause text,
  fix_steps text,
  patch_template text,
  confidence numeric(3,2) default 0.80,
  created_at timestamptz default now()
);

-- ── admin_api_keys ──
create table if not exists public.admin_api_keys (
  id uuid primary key default gen_random_uuid(),
  team_id uuid,
  key_name text not null,
  encrypted_value text not null,
  updated_by uuid,
  updated_at timestamptz default now(),
  unique(team_id, key_name)
);

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

create index if not exists idx_projects_user_updated on public.projects(user_id, updated_at desc);
create index if not exists idx_project_members_user on public.project_members(user_id);
create index if not exists idx_decisions_project_created on public.project_decisions(project_id, created_at desc);
create index if not exists idx_tasks_project_status_pri on public.project_tasks(project_id, status, priority);
create index if not exists idx_threads_project_updated on public.chat_threads(project_id, updated_at desc);
create index if not exists idx_msgs_thread_created on public.chat_messages(thread_id, created_at asc);
create index if not exists idx_patch_sets_project_created on public.patch_sets(project_id, created_at desc);
create index if not exists idx_build_runs_project_started on public.build_runs(project_id, started_at desc);
create index if not exists idx_kscope_type_active on public.knowledge_sources(owner_scope, type, is_active);
create index if not exists idx_kdocs_source_updated on public.knowledge_documents(source_id, updated_at desc);
create index if not exists idx_kdocs_pack on public.knowledge_documents(pack);
create index if not exists idx_kchunks_doc_idx on public.knowledge_chunks(document_id, chunk_index);
create index if not exists idx_kruns_source_started on public.knowledge_ingest_runs(source_id, started_at desc);
create index if not exists idx_kfixes_sig on public.knowledge_fixes(signature);
create index if not exists idx_kchunks_content_fts on public.knowledge_chunks using gin(to_tsvector('english', content));

-- ══════════════════════════════════════════════
-- RLS (uses user_id on projects, not owner_id)
-- ══════════════════════════════════════════════

alter table public.user_preferences enable row level security;
alter table public.project_members enable row level security;
alter table public.project_state enable row level security;
alter table public.project_decisions enable row level security;
alter table public.project_tasks enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.patch_sets enable row level security;
alter table public.patch_files enable row level security;
alter table public.build_runs enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_ingest_runs enable row level security;
alter table public.knowledge_fixes enable row level security;

-- Helper: is user a member/owner of project?
create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable as $$
  select exists(
    select 1
    from public.projects pr
    left join public.project_members pm on pm.project_id = pr.id and pm.user_id = auth.uid()
    where pr.id = p_project_id
      and (pr.user_id = auth.uid() or pm.user_id is not null)
  );
$$;

-- User preferences
create policy if not exists "prefs_select_own" on public.user_preferences for select using (user_id = auth.uid());
create policy if not exists "prefs_insert_own" on public.user_preferences for insert with check (user_id = auth.uid());
create policy if not exists "prefs_update_own" on public.user_preferences for update using (user_id = auth.uid());

-- Project-scoped tables
create policy if not exists "state_member" on public.project_state for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy if not exists "decisions_member" on public.project_decisions for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy if not exists "tasks_member" on public.project_tasks for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy if not exists "threads_member" on public.chat_threads for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy if not exists "messages_member" on public.chat_messages for all using (
  exists(select 1 from public.chat_threads t where t.id = thread_id and public.is_project_member(t.project_id))
) with check (
  exists(select 1 from public.chat_threads t where t.id = thread_id and public.is_project_member(t.project_id))
);
create policy if not exists "patch_sets_member" on public.patch_sets for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy if not exists "patch_files_member" on public.patch_files for all using (
  exists(select 1 from public.patch_sets ps where ps.id = patch_set_id and public.is_project_member(ps.project_id))
) with check (
  exists(select 1 from public.patch_sets ps where ps.id = patch_set_id and public.is_project_member(ps.project_id))
);
create policy if not exists "build_runs_member" on public.build_runs for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

-- Knowledge: globally readable
create policy if not exists "knowledge_sources_select" on public.knowledge_sources for select using (
  owner_scope = 'global'
  or (project_id is not null and public.is_project_member(project_id))
  or (owner_scope = 'user' and owner_id = auth.uid())
);
create policy if not exists "knowledge_docs_select" on public.knowledge_documents for select using (true);
create policy if not exists "knowledge_chunks_select" on public.knowledge_chunks for select using (true);
create policy if not exists "knowledge_runs_select" on public.knowledge_ingest_runs for select using (true);
create policy if not exists "knowledge_fixes_select" on public.knowledge_fixes for select using (true);

-- ══════════════════════════════════════════════
-- Give your user a team_id for admin keys panel
-- ══════════════════════════════════════════════

UPDATE profiles SET team_id = id WHERE email = 'hawkinsmarcus127@gmail.com' AND team_id IS NULL;

-- ══════════════════════════════════════════════
-- SEED: Known Issues
-- ══════════════════════════════════════════════

INSERT INTO knowledge_fixes (scope, signature, symptoms, root_cause, fix_steps, confidence) VALUES
('global', 'nextjs_dynamic_import_ssr_mismatch',
 '{"includes": ["Hydration failed", "Text content does not match server-rendered HTML"]}',
 'Client/server render mismatch due to dynamic content rendered on server.',
 E'Wrap component with next/dynamic and disable SSR.\nGate browser-only APIs behind useEffect.',
 0.80),
('global', 'supabase_rls_denied_select',
 '{"includes": ["permission denied for relation", "new row violates row-level security policy"]}',
 'RLS enabled without correct SELECT/INSERT policies for authenticated role.',
 E'Create explicit RLS policies for authenticated users.\nVerify auth.uid() matches owner columns.',
 0.85),
('global', 'stripe_webhook_signature_verification_failed',
 '{"includes": ["No signatures found matching the expected signature"]}',
 'Wrong webhook secret or request body modified before verification.',
 E'Use the endpoint webhook signing secret (whsec_...).\nUse raw request body; disable JSON parsing before verification.',
 0.90),
('global', 'navigator_locks_deadlock',
 '{"includes": ["navigator.locks", "lock timeout", "auth session stuck"]}',
 'Supabase auth navigator.locks deadlock.',
 E'Override lock in createBrowserClient auth config.\nUse custom storageKey.',
 0.95),
('global', 'vercel_env_vars_missing_runtime',
 '{"includes": ["API keys not available", "process.env undefined", "Missing env"]}',
 'Env vars not available at runtime on Vercel.',
 E'Verify in Vercel Settings > Environment Variables.\nRedeploy after adding new vars.',
 0.90),
('global', 'localstorage_not_persisting',
 '{"includes": ["NO TOKEN", "localStorage empty", "session not persisting"]}',
 'Browser blocks localStorage in certain contexts.',
 E'Pass auth tokens via React props from auth boundary.\nCapture access_token at sign-in.',
 0.95),
('global', 'supabase_406_not_acceptable',
 '{"includes": ["406", "Not Acceptable"]}',
 'Table missing or query format invalid.',
 E'Check table exists in Supabase dashboard.\nRun migration SQL if missing.',
 0.85)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════
-- SEED: Global knowledge sources
-- ══════════════════════════════════════════════

INSERT INTO knowledge_sources (owner_scope, type, name, base_url, meta, is_active) VALUES
('global', 'web', 'Next.js Docs', 'https://nextjs.org/docs',
 '{"seed_urls": ["https://nextjs.org/docs"], "include_patterns": ["^https://nextjs\\.org/docs/"], "exclude_patterns": [".*(privacy|terms).*"], "max_pages": 200, "chunk_size": 900, "chunk_overlap": 120}',
 true),
('global', 'web', 'Supabase Docs', 'https://supabase.com/docs',
 '{"seed_urls": ["https://supabase.com/docs"], "include_patterns": ["^https://supabase\\.com/docs/"], "exclude_patterns": [".*(privacy|terms).*"], "max_pages": 200, "chunk_size": 900, "chunk_overlap": 120}',
 true),
('global', 'web', 'React Docs', 'https://react.dev',
 '{"seed_urls": ["https://react.dev/"], "include_patterns": ["^https://react\\.dev/"], "exclude_patterns": [".*(privacy|terms).*"], "max_pages": 150, "chunk_size": 900, "chunk_overlap": 120}',
 true)
ON CONFLICT DO NOTHING;
