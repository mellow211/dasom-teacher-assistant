create extension if not exists pgcrypto;

create table if not exists public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  display_name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint app_accounts_username_format check (username ~ '^[a-z0-9_]{4,20}$'),
  constraint app_accounts_display_name_length check (char_length(display_name) between 1 and 40)
);

create unique index if not exists app_accounts_username_lower_key on public.app_accounts (lower(username));

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_account_id_idx on public.app_sessions(account_id);
create index if not exists app_sessions_expires_at_idx on public.app_sessions(expires_at);

alter table public.app_accounts enable row level security;
alter table public.app_sessions enable row level security;
revoke all on public.app_accounts from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;

create or replace function public.register_app_account(p_username text, p_password text, p_display_name text)
returns table(account_id uuid, username text, display_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_username text := lower(trim(p_username));
begin
  if normalized_username !~ '^[a-z0-9_]{4,20}$' then
    raise exception using errcode = '22023', message = 'invalid_username';
  end if;
  if char_length(p_password) < 8 or char_length(p_password) > 72 then
    raise exception using errcode = '22023', message = 'invalid_password';
  end if;
  if char_length(trim(p_display_name)) < 1 or char_length(trim(p_display_name)) > 40 then
    raise exception using errcode = '22023', message = 'invalid_display_name';
  end if;

  return query
  insert into public.app_accounts(username, display_name, password_hash)
  values (normalized_username, trim(p_display_name), extensions.crypt(p_password, extensions.gen_salt('bf', 12)))
  returning app_accounts.id, app_accounts.username, app_accounts.display_name;
exception when unique_violation then
  raise exception using errcode = '23505', message = 'username_already_exists';
end;
$$;

create or replace function public.login_app_account(p_username text, p_password text)
returns table(session_token text, account_id uuid, username text, display_name text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_account public.app_accounts%rowtype;
  raw_token text;
  session_expiry timestamptz := now() + interval '30 days';
begin
  select * into found_account
  from public.app_accounts
  where app_accounts.username = lower(trim(p_username))
    and app_accounts.password_hash = extensions.crypt(p_password, app_accounts.password_hash);

  if found_account.id is null then return; end if;
  delete from public.app_sessions where app_sessions.expires_at < now();
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_sessions(account_id, token_hash, expires_at)
  values (found_account.id, encode(extensions.digest(raw_token, 'sha256'), 'hex'), session_expiry);
  return query select raw_token, found_account.id, found_account.username, found_account.display_name, session_expiry;
end;
$$;

create or replace function public.get_app_session(p_session_token text)
returns table(account_id uuid, username text, display_name text, expires_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select a.id, a.username, a.display_name, s.expires_at
  from public.app_sessions s
  join public.app_accounts a on a.id = s.account_id
  where s.token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex')
    and s.expires_at > now()
  limit 1;
$$;

create or replace function public.logout_app_session(p_session_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.app_sessions
  where token_hash = encode(extensions.digest(p_session_token, 'sha256'), 'hex');
$$;

revoke all on function public.register_app_account(text,text,text) from public;
revoke all on function public.login_app_account(text,text) from public;
revoke all on function public.get_app_session(text) from public;
revoke all on function public.logout_app_session(text) from public;
grant execute on function public.register_app_account(text,text,text) to anon;
grant execute on function public.login_app_account(text,text) to anon;
grant execute on function public.get_app_session(text) to anon;
grant execute on function public.logout_app_session(text) to anon;

create or replace function public.claim_legacy_teacher_data(p_old_owner_key text, p_new_owner_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_old_owner_key !~ '^[0-9a-f]{64}$' or p_new_owner_key !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_owner_key';
  end if;
  update public.student_observation_memos set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.teacher_classes set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.class_students set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.attendance_records set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.class_assignments set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.submission_records set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.class_roles set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.role_cycles set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.role_preferences set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.role_assignments set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.surveys set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.survey_questions set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.survey_options set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
  update public.survey_summaries set owner_key=p_new_owner_key where owner_key=p_old_owner_key;
end;
$$;
revoke all on function public.claim_legacy_teacher_data(text,text) from public;
grant execute on function public.claim_legacy_teacher_data(text,text) to anon;
