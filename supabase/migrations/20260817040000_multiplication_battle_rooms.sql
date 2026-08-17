create table if not exists multiplication_battle_rooms(
 id uuid primary key default gen_random_uuid(),
 owner_key text not null,
 room_code text not null unique,
 mode text not null check(mode in ('table-solo','table-battle','multiplication-solo','multiplication-battle')),
 problems jsonb not null,
 time_limit int not null default 0 check(time_limit in (0,10,20,30)),
 status text not null default 'open' check(status in ('open','closed')),
 created_at timestamptz not null default now()
);
create table if not exists multiplication_battle_entries(
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references multiplication_battle_rooms(id) on delete cascade,
 player_name text not null check(char_length(player_name) between 1 and 20),
 correct_count int not null check(correct_count>=0),
 total_count int not null check(total_count>0),
 score int not null check(score>=0),
 total_time numeric not null check(total_time>=0),
 submitted_at timestamptz not null default now()
);
create index if not exists multiplication_battle_rooms_owner_idx on multiplication_battle_rooms(owner_key,created_at desc);
create index if not exists multiplication_battle_entries_room_idx on multiplication_battle_entries(room_id,score desc,total_time asc);
alter table multiplication_battle_rooms enable row level security;
alter table multiplication_battle_entries enable row level security;
grant select,insert,update,delete on table multiplication_battle_rooms,multiplication_battle_entries to anon,authenticated;

drop policy if exists owner_access on multiplication_battle_rooms;
create policy owner_access on multiplication_battle_rooms for all
 using (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'))
 with check (owner_key = (select current_setting('request.headers', true)::json->>'x-owner-key'));

drop policy if exists owner_select_entries on multiplication_battle_entries;
create policy owner_select_entries on multiplication_battle_entries for select
 using (exists(select 1 from multiplication_battle_rooms r where r.id=room_id and r.owner_key=(select current_setting('request.headers', true)::json->>'x-owner-key')));

create or replace function get_battle_room(p_code text) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('mode',mode,'problems',problems,'timeLimit',time_limit,'status',status)
 from multiplication_battle_rooms where room_code=p_code
$$;

create or replace function submit_battle_entry(p_code text,p_name text,p_correct int,p_total int,p_score int,p_total_time numeric) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r multiplication_battle_rooms%rowtype;
begin
 select * into r from multiplication_battle_rooms where room_code=p_code for update;
 if not found then raise exception 'room_not_found'; end if;
 if octet_length(coalesce(trim(p_name),''))=0 then raise exception 'invalid_name'; end if;
 insert into multiplication_battle_entries(room_id,player_name,correct_count,total_count,score,total_time)
 values(r.id,left(trim(p_name),20),greatest(0,coalesce(p_correct,0)),greatest(1,coalesce(p_total,1)),greatest(0,coalesce(p_score,0)),greatest(0,coalesce(p_total_time,0)));
 return jsonb_build_object('ok',true);
end$$;

create or replace function list_battle_entries(p_code text) returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('playerName',e.player_name,'correctCount',e.correct_count,'totalCount',e.total_count,'score',e.score,'totalTime',e.total_time,'submittedAt',e.submitted_at) order by e.score desc, e.total_time asc, e.submitted_at asc),'[]'::jsonb)
 from multiplication_battle_entries e join multiplication_battle_rooms r on r.id=e.room_id where r.room_code=p_code
$$;

revoke all on function get_battle_room(text) from public;
revoke all on function submit_battle_entry(text,text,int,int,int,numeric) from public;
revoke all on function list_battle_entries(text) from public;
grant execute on function get_battle_room(text),submit_battle_entry(text,text,int,int,int,numeric),list_battle_entries(text) to anon,authenticated;
