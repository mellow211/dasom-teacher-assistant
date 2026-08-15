create index if not exists survey_answers_option_idx on survey_answers(option_id);
create index if not exists survey_summaries_question_idx on survey_summaries(question_id);

drop policy if exists survey_owner on surveys;
create policy survey_owner on surveys for all
using(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'))
with check(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'));
drop policy if exists question_owner on survey_questions;
create policy question_owner on survey_questions for all
using(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'))
with check(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'));
drop policy if exists option_owner on survey_options;
create policy option_owner on survey_options for all
using(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'))
with check(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'));
drop policy if exists response_owner_select on survey_responses;
create policy response_owner_select on survey_responses for select using(exists(select 1 from surveys s where s.id=survey_id and s.owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key')));
drop policy if exists answer_owner_select on survey_answers;
create policy answer_owner_select on survey_answers for select using(exists(select 1 from survey_questions q where q.id=question_id and q.owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key')));
drop policy if exists answer_option_owner_select on survey_answer_options;
create policy answer_option_owner_select on survey_answer_options for select using(exists(select 1 from survey_answers a join survey_questions q on q.id=a.question_id where a.id=answer_id and q.owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key')));
drop policy if exists summary_owner on survey_summaries;
create policy summary_owner on survey_summaries for all
using(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'))
with check(owner_key=((select current_setting('request.headers',true))::json->>'x-owner-key'));

revoke execute on function get_public_survey(text),submit_public_survey(text,text,jsonb,jsonb) from authenticated;
