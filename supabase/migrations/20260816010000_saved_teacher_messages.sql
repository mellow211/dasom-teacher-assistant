create table if not exists saved_teacher_messages(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 recipient text not null check(recipient in ('학부모','학생')),
 student_name text,
 message_text text not null check(char_length(message_text) between 1 and 10000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists saved_teacher_messages_owner_updated_idx on saved_teacher_messages(owner_key,updated_at desc);
alter table saved_teacher_messages enable row level security;
grant select,insert,update,delete on table saved_teacher_messages to anon,authenticated;
drop policy if exists owner_access on saved_teacher_messages;
create policy owner_access on saved_teacher_messages for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));
