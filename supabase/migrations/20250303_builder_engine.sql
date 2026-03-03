-- Builder Engine schema + KPB storage pointers
-- Generated: 2026-03-03
-- Source: builder_engine_package_v1 + kpb_v1

-- ══════════════════════════════════════════════
-- USER PREFERENCES (token-independent memory)
-- ══════════════════════════════════════════════

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tone_mode text default 'copilot',
  theme jsonb default '{}'::jsonb,
  font_scale_desktop numeric(4,2) default 1.00,
  font_scale_mobile numeric(4,2) default 0.98,
  default_stack jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════
-- PROJECTS + STATE + DECISIONS + TASKS
-- ══════════════════════════════════════════════

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text not null,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_members (
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  primary key (project_id, user_id)
);

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

-- ══════════════════════════════════════════════
-- CHAT THREADS + MESSAGES
-- ══════════════════════════════════════════════

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id),
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.chat_threads(id) on delete cascade,
  role text not null,
  content text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- ══════════════════════════════════════════════
-- PATCH SETS + BUILD RUNS (evidence)
-- ══════════════════════════════════════════════

create table if not exists public.patch_sets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  thread_id uuid references public.chat_threads(id) on delete set null,
  created_by uuid references public.profiles(id),
  summary text,
  created_at timestamptz default now()
);

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

-- ══════════════════════════════════════════════
-- KNOWLEDGE SYSTEM (sources + docs + chunks)
-- ══════════════════════════════════════════════

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
  -- KPB v1 storage pointers (for 1.5-2GB scale)
  storage_bucket text,
  storage_path text,
  byte_size int,
  mime_type text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.knowledge_documents(id) on delete cascade,
  chunk_index int,
  content text not null,
  tokens_est int,
  source_url text,
  content_hash text,
  meta jsonb default '{}'::jsonb,
  -- KPB v1 storage pointers
  storage_bucket text,
  storage_path text,
  byte_size int,
  mime_type text,
  created_at timestamptz default now()
);

create table if not exists public.knowledge_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.knowledge_sources(id) on delete cascade,
  status text,
  summary text,
  stats jsonb default '{}'::jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

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

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

create index if not exists idx_projects_owner_updated on public.projects(owner_id, updated_at desc);
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

-- Full-text search index on knowledge chunks
create index if not exists idx_kchunks_content_fts on public.knowledge_chunks
  using gin(to_tsvector('english', content));

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

alter table public.user_preferences enable row level security;
alter table public.projects enable row level security;
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
      and (pr.owner_id = auth.uid() or pm.user_id is not null)
  );
$$;

-- User preferences: own only
create policy "prefs_select_own" on public.user_preferences for select using (user_id = auth.uid());
create policy "prefs_insert_own" on public.user_preferences for insert with check (user_id = auth.uid());
create policy "prefs_update_own" on public.user_preferences for update using (user_id = auth.uid());

-- Projects: owner or member can read
create policy "projects_select_member" on public.projects for select using (
  owner_id = auth.uid()
  or exists(select 1 from public.project_members pm where pm.project_id = id and pm.user_id = auth.uid())
);
create policy "projects_insert_owner" on public.projects for insert with check (owner_id = auth.uid());
create policy "projects_update_owner" on public.projects for update using (owner_id = auth.uid());

-- Project-scoped tables: member access
create policy "state_member" on public.project_state for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "decisions_member" on public.project_decisions for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "tasks_member" on public.project_tasks for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "threads_member" on public.chat_threads for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "messages_member" on public.chat_messages for all using (
  exists(select 1 from public.chat_threads t where t.id = thread_id and public.is_project_member(t.project_id))
) with check (
  exists(select 1 from public.chat_threads t where t.id = thread_id and public.is_project_member(t.project_id))
);
create policy "patch_sets_member" on public.patch_sets for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "patch_files_member" on public.patch_files for all using (
  exists(select 1 from public.patch_sets ps where ps.id = patch_set_id and public.is_project_member(ps.project_id))
) with check (
  exists(select 1 from public.patch_sets ps where ps.id = patch_set_id and public.is_project_member(ps.project_id))
);
create policy "build_runs_member" on public.build_runs for all using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));

-- Knowledge: global readable, project-scoped for members
create policy "knowledge_sources_select" on public.knowledge_sources for select using (
  owner_scope = 'global'
  or (project_id is not null and public.is_project_member(project_id))
  or (owner_scope = 'user' and owner_id = auth.uid())
);
create policy "knowledge_docs_select" on public.knowledge_documents for select using (true);
create policy "knowledge_chunks_select" on public.knowledge_chunks for select using (true);
create policy "knowledge_runs_select" on public.knowledge_ingest_runs for select using (true);
create policy "knowledge_fixes_select" on public.knowledge_fixes for select using (true);
