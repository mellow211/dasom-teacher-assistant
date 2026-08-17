create table if not exists history_quiz_sessions(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 public_slug text not null unique default encode(gen_random_bytes(9),'hex'),
 title text not null,
 topic text not null,
 difficulty text not null,
 questions jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists history_quiz_sessions_owner_idx on history_quiz_sessions(owner_key,created_at desc);
alter table history_quiz_sessions enable row level security;
grant select,insert,update,delete on table history_quiz_sessions to anon,authenticated;
drop policy if exists owner_access on history_quiz_sessions;
create policy owner_access on history_quiz_sessions for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));

create or replace function get_public_history_quiz(p_slug text) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('title',title,'topic',topic,'difficulty',difficulty,'questions',questions)
 from history_quiz_sessions where public_slug=p_slug
$$;
revoke all on function get_public_history_quiz(text) from public;
grant execute on function get_public_history_quiz(text) to anon,authenticated;
