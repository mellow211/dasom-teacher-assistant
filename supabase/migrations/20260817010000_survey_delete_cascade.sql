alter table survey_answers drop constraint if exists survey_answers_question_id_fkey;
alter table survey_answers add constraint survey_answers_question_id_fkey foreign key (question_id) references survey_questions(id) on delete cascade;
