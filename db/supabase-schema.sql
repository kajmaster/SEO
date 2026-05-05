-- ContentFlow Concierge Beta Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query

create extension if not exists pgcrypto;

-- WORKSPACES
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nieuwe workspace',
  slug text unique,
  company_name text,
  company_website text,
  launch_mode text not null default 'concierge_beta' check (launch_mode in ('concierge_beta','self_serve_mvp','agency_pilot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_workspace_id uuid references workspaces(id) on delete set null,
  company_name text default 'ContentFlow B.V.',
  website text,
  vision text,
  mission text,
  services text,
  tone_nl text,
  target_audience text,
  buyer_persona text,
  prohibited_claims text,
  style_preferences text,
  positive_examples text,
  negative_examples text,
  paragraph_length text default 'medium',
  algo_settings jsonb default '{}'::jsonb,
  trust_level int default 0,
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function is_workspace_member(p_workspace uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = p_workspace
      and wm.user_id = auth.uid()
  );
$$;

create or replace function current_workspace_role(p_workspace uuid)
returns text
language sql
stable
as $$
  select wm.role
  from workspace_members wm
  where wm.workspace_id = p_workspace
    and wm.user_id = auth.uid()
  limit 1;
$$;

create table if not exists brand_profiles (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  brand_summary text,
  services text,
  target_accounts text,
  pain_points text,
  desired_outcomes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tone_profiles (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  tone_label text,
  voice_principles text,
  style_preferences text,
  prohibited_words text,
  positive_examples text,
  negative_examples text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customer_preferences (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  primary_cta text,
  review_mode text default 'human_review_required',
  preferred_length text,
  locale text default 'nl-NL',
  include_case_style boolean default true,
  require_fact_check boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists template_library (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  slug text,
  template_type text not null default 'xml',
  xml_template text,
  instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  keyword text not null,
  content_goal text not null default 'convince' check (content_goal in ('inform','convince','convert')),
  status text not null default 'pending' check (status in ('pending','drafting','refining','scored','ready_for_review','failed')),
  template_id uuid references template_library(id) on delete set null,
  template_name text,
  source_content text,
  brand_profile_snapshot jsonb not null default '{}'::jsonb,
  tone_profile jsonb not null default '{}'::jsonb,
  customer_preferences jsonb not null default '{}'::jsonb,
  quality_summary jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_pages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  generation_job_id uuid references generation_jobs(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  slug text,
  primary_keyword text,
  content_goal text not null default 'convince' check (content_goal in ('inform','convince','convert')),
  status text not null default 'draft' check (status in ('draft','review','approved','live')),
  review_status text not null default 'needs_review' check (review_status in ('needs_review','in_review','approved')),
  seo_score numeric(5,2) not null default 0,
  quality_score numeric(5,2) not null default 0,
  selected_variant_id uuid,
  brand_profile_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists content_variants (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references content_pages(id) on delete cascade,
  generation_job_id uuid references generation_jobs(id) on delete set null,
  variant_index int not null,
  title text not null,
  meta_description text,
  content text,
  word_count int not null default 0,
  seo_score numeric(5,2) not null default 0,
  quality_score numeric(5,2) not null default 0,
  quality_notes jsonb not null default '[]'::jsonb,
  quality_summary text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (page_id, variant_index)
);

alter table content_pages
  drop constraint if exists content_pages_selected_variant_id_fkey;
alter table content_pages
  add constraint content_pages_selected_variant_id_fkey
  foreign key (selected_variant_id) references content_variants(id) on delete set null;

create table if not exists review_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  page_id uuid not null references content_pages(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  reviewer_name text,
  reviewer_email text,
  message text,
  expires_at timestamptz,
  approved_at timestamptz,
  approved_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists review_comments (
  id uuid primary key default gen_random_uuid(),
  review_link_id uuid references review_links(id) on delete cascade,
  page_id uuid not null references content_pages(id) on delete cascade,
  variant_id uuid references content_variants(id) on delete set null,
  category text not null check (category in ('tone','clarity','accuracy','conversion','structure')),
  quote_text text,
  anchor_text text,
  comment text not null,
  commenter_name text,
  commenter_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_base (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  type text not null check (type in ('persona','tone','topical_map','source','guide')),
  title text not null,
  content text,
  tags text[],
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  ws_id uuid;
  base_slug text;
begin
  base_slug := regexp_replace(split_part(coalesce(new.email, 'workspace'), '@', 1), '[^a-zA-Z0-9]+', '-', 'g');

  insert into workspaces (owner_user_id, name, slug, company_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), initcap(replace(base_slug, '-', ' ')) || ' Workspace'),
    lower(trim(both '-' from base_slug)) || '-' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), initcap(replace(base_slug, '-', ' ')))
  )
  returning id into ws_id;

  insert into profiles (id, default_workspace_id, company_name)
  values (
    new.id,
    ws_id,
    coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), initcap(replace(base_slug, '-', ' ')))
  );

  insert into workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'admin');

  insert into brand_profiles (workspace_id, brand_summary)
  values (ws_id, 'Beschrijf hier in 2-3 zinnen waar jullie merk voor staat.');

  insert into tone_profiles (workspace_id, tone_label, voice_principles)
  values (ws_id, 'Consultatief', 'Schrijf helder, menselijk en overtuigend voor B2B-beslissers.');

  insert into customer_preferences (workspace_id, primary_cta)
  values (ws_id, 'Vraag een gesprek of offerte aan');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table brand_profiles enable row level security;
alter table tone_profiles enable row level security;
alter table customer_preferences enable row level security;
alter table template_library enable row level security;
alter table generation_jobs enable row level security;
alter table content_pages enable row level security;
alter table content_variants enable row level security;
alter table review_links enable row level security;
alter table review_comments enable row level security;
alter table knowledge_base enable row level security;

drop policy if exists "Own profile" on profiles;
create policy "Own profile" on profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Workspace members can read workspaces" on workspaces
  for select using (is_workspace_member(id));
create policy "Workspace admins can update workspaces" on workspaces
  for update using (current_workspace_role(id) = 'admin')
  with check (current_workspace_role(id) = 'admin');
create policy "Workspace owners can insert workspaces" on workspaces
  for insert with check (auth.uid() = owner_user_id);

create policy "Members can read membership" on workspace_members
  for select using (is_workspace_member(workspace_id));
create policy "Admins can manage membership" on workspace_members
  for all using (current_workspace_role(workspace_id) = 'admin')
  with check (current_workspace_role(workspace_id) = 'admin');

create policy "Members can manage brand profiles" on brand_profiles
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage tone profiles" on tone_profiles
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage customer preferences" on customer_preferences
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage templates" on template_library
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage generation jobs" on generation_jobs
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage content pages" on content_pages
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage content variants" on content_variants
  for all
  using (
    exists (
      select 1
      from content_pages cp
      where cp.id = content_variants.page_id
        and is_workspace_member(cp.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from content_pages cp
      where cp.id = content_variants.page_id
        and is_workspace_member(cp.workspace_id)
    )
  );
create policy "Members can manage review links" on review_links
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));
create policy "Members can manage review comments" on review_comments
  for all
  using (
    (
      review_link_id is null and
      exists (
        select 1
        from content_pages cp
        where cp.id = review_comments.page_id
          and is_workspace_member(cp.workspace_id)
      )
    ) or exists (
      select 1
      from review_links rl
      where rl.id = review_comments.review_link_id
        and is_workspace_member(rl.workspace_id)
    )
  )
  with check (
    (
      review_link_id is null and
      exists (
        select 1
        from content_pages cp
        where cp.id = review_comments.page_id
          and is_workspace_member(cp.workspace_id)
      )
    ) or exists (
      select 1
      from review_links rl
      where rl.id = review_comments.review_link_id
        and is_workspace_member(rl.workspace_id)
    )
  );
create policy "Members can manage knowledge" on knowledge_base
  for all using (is_workspace_member(workspace_id))
  with check (is_workspace_member(workspace_id));

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_generation_jobs_workspace on generation_jobs(workspace_id, created_at desc);
create index if not exists idx_generation_jobs_status on generation_jobs(status);
create index if not exists idx_content_pages_workspace on content_pages(workspace_id, created_at desc);
create index if not exists idx_content_variants_page on content_variants(page_id, variant_index);
create index if not exists idx_review_links_page on review_links(page_id, created_at desc);
create index if not exists idx_review_comments_link on review_comments(review_link_id, created_at asc);
