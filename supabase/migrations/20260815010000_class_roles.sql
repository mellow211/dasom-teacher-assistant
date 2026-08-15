create table if not exists class_roles(
 id uuid primary key default gen_random_uuid(), owner_key text not null,
 class_id uuid not null references teacher_classes(id) on delete cascade,
 name text not null, description text, capacity int not null check(capacity > 0),
 display_order int not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists role_cycles(
 id uuid primary key default gen_random_uuid(), owner_key text not null,
 class_id uuid not null references teacher_classes(id) on delete cascade,
 name text not null, start_date date not null, end_date date not null,
 note text, status text not null default 'draft' check(status in ('draft','confirmed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(start_date <= end_date)
);
create table if not exists role_preferences(
 id uuid primary key default gen_random_uuid(), owner_key text not null,
 cycle_id uuid not null references role_cycles(id) on delete cascade,
 student_id uuid not null references class_students(id) on delete cascade,
 first_choice_role_id uuid references class_roles(id) on delete set null,
 second_choice_role_id uuid references class_roles(id) on delete set null,
 third_choice_role_id uuid references class_roles(id) on delete set null,
 excluded_role_ids jsonb not null default '[]'::jsonb, note text,
 locked_role_id uuid references class_roles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(cycle_id,student_id)
);
create table if not exists role_assignments(
 id uuid primary key default gen_random_uuid(), owner_key text not null,
 cycle_id uuid not null references role_cycles(id) on delete cascade,
 student_id uuid not null references class_students(id) on delete cascade,
 role_id uuid not null references class_roles(id) on delete restrict,
 is_locked boolean not null default false,
 assignment_source text not null check(assignment_source in ('auto','manual','fixed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(cycle_id,student_id)
);
create index if not exists class_roles_owner_class_idx on class_roles(owner_key,class_id);
create index if not exists role_cycles_owner_class_dates_idx on role_cycles(owner_key,class_id,start_date,end_date);
create index if not exists role_preferences_cycle_idx on role_preferences(cycle_id);
create index if not exists role_assignments_cycle_role_idx on role_assignments(cycle_id,role_id);
create index if not exists class_roles_class_id_idx on class_roles(class_id);
create index if not exists role_cycles_class_id_idx on role_cycles(class_id);
create index if not exists role_preferences_student_id_idx on role_preferences(student_id);
create index if not exists role_preferences_first_role_idx on role_preferences(first_choice_role_id);
create index if not exists role_preferences_second_role_idx on role_preferences(second_choice_role_id);
create index if not exists role_preferences_third_role_idx on role_preferences(third_choice_role_id);
create index if not exists role_preferences_locked_role_idx on role_preferences(locked_role_id);
create index if not exists role_assignments_student_id_idx on role_assignments(student_id);
create index if not exists role_assignments_role_id_idx on role_assignments(role_id);
alter table class_roles enable row level security;
alter table role_cycles enable row level security;
alter table role_preferences enable row level security;
alter table role_assignments enable row level security;
grant select,insert,update,delete on table class_roles,role_cycles,role_preferences,role_assignments to anon,authenticated;
do $$ declare t text; begin foreach t in array array['class_roles','role_cycles','role_preferences','role_assignments'] loop
 execute format('drop policy if exists owner_access on %I',t);
 execute format('create policy owner_access on %I for all using (owner_key = (select current_setting(''request.headers'', true)::json->>''x-owner-key'')) with check (owner_key = (select current_setting(''request.headers'', true)::json->>''x-owner-key''))',t);
end loop; end $$;
