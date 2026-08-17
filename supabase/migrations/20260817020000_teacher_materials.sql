create table if not exists teacher_materials(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 title text not null check(char_length(title) between 1 and 150),
 description text check(description is null or char_length(description) <= 300),
 category text not null default '기타' check(category in ('수업 자료','업무 서식','평가·기록','가정통신문','기타')),
 grade text not null default '공통' check(grade in ('공통','1학년','2학년','3학년','4학년','5학년','6학년')),
 subject text not null default '공통' check(subject in ('공통','국어','수학','사회','과학','영어','도덕','실과','체육','음악','미술','통합교과','학급운영','기타')),
 file_name text not null check(char_length(file_name) between 1 and 255),
 mime_type text not null,
 file_size integer not null check(file_size > 0 and file_size <= 4194304),
 file_data bytea not null,
 is_favorite boolean not null default false,
 download_count integer not null default 0 check(download_count >= 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists teacher_materials_owner_updated_idx on teacher_materials(owner_key,updated_at desc);
create index if not exists teacher_materials_owner_favorite_idx on teacher_materials(owner_key,is_favorite) where is_favorite = true;
alter table teacher_materials enable row level security;
grant select,insert,update,delete on table teacher_materials to anon,authenticated;
drop policy if exists owner_access on teacher_materials;
create policy owner_access on teacher_materials for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));
