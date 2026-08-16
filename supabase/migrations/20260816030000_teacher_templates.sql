create table if not exists teacher_templates(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 title text not null check(char_length(title) between 1 and 100),
 description text check(description is null or char_length(description) <= 300),
 scope text not null check(scope in ('수업 자료','업무 양식')),
 resource_type text not null check(resource_type in ('메시지','가정통신문','지도안','활동지','평가','기록','설문','기타')),
 grade text not null default '공통' check(grade in ('공통','1학년','2학년','3학년','4학년','5학년','6학년')),
 subject text not null default '공통' check(subject in ('공통','국어','수학','사회','과학','영어','도덕','실과','체육','음악','미술','통합교과','학급운영','기타')),
 content text not null check(char_length(content) between 1 and 30000),
 is_favorite boolean not null default false,
 use_count integer not null default 0 check(use_count >= 0),
 last_used_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists teacher_templates_owner_updated_idx on teacher_templates(owner_key,updated_at desc);
create index if not exists teacher_templates_owner_favorite_idx on teacher_templates(owner_key,is_favorite) where is_favorite = true;
alter table teacher_templates enable row level security;
grant select,insert,update,delete on table teacher_templates to anon,authenticated;
drop policy if exists owner_access on teacher_templates;
create policy owner_access on teacher_templates for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));
