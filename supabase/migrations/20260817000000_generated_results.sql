create table if not exists generated_results(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 tool text not null check(tool in ('newsletter','lesson-plan','korean-performance-assessment','leveled-korean-worksheet')),
 title text not null check(char_length(title) between 1 and 200),
 content text not null check(char_length(content) between 1 and 100000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists generated_results_owner_updated_idx on generated_results(owner_key,updated_at desc);
alter table generated_results enable row level security;
grant select,insert,update,delete on table generated_results to anon,authenticated;
drop policy if exists owner_access on generated_results;
create policy owner_access on generated_results for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));
