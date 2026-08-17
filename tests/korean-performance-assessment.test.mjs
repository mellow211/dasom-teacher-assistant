import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildPerformanceAssessmentPrompt,defaultPerformanceLevelNames,mergePerformanceSection,performancePrintIssues,validatePerformanceAssessmentInput,validatePerformanceAssessmentOutput } from "../app/lib/korean-performance-assessment.ts";

const selection={semester:"1학기",unit:"6. 또박또박 읽어요",topic:"여러 가지 문장 읽기 (1)",additionalRequest:"",methods:["관찰평가","구술평가"],mode:"개인",durationMinutes:20,timing:"수업 중",customTiming:"",levelCount:3,levelNames:defaultPerformanceLevelNames(3),scoreMode:"점수와 성취수준 함께 사용",totalScore:20};
const input={...selection,achievementStandard:"[2국02-01] 글자, 단어, 문장, 짧은 글을 정확하게 소리 내어 읽는다.",domain:"읽기",currentSession:2,totalSessions:13,textbookName:"미래엔 초등 국어 1-1",textbookPages:"280-283"};
const LEARNING_GOAL="짧은 문장을 소리 내어 읽을 수 있다.";
const ELEMENTS=["정확하게 읽기","내용 확인하기"];
function make(){const rubric=ELEMENTS.map((element,i)=>({criterionId:`E${i+1}`,assessmentElement:element,observableEvidence:i?"글에서 일어난 일을 한 문장으로 말함":"제시된 문장을 빠뜨리지 않고 소리 내어 읽음",maxScore:10,levels:input.levelNames.map((name,n)=>({levelName:name,description:n===0?"교사의 지속적인 도움을 받아 핵심 행동을 시도함":n===1?"교사의 일부 도움을 받아 핵심 행동을 수행함":"도움 없이 목표 행동을 정확하게 수행함",score:[3,7,10][n]}))}));return{title:"짧은 문장 읽기 수행평가",overview:{grade:"1학년",subject:"국어",semester:input.semester,unit:input.unit,topic:input.topic,domain:input.domain,achievementStandard:input.achievementStandard,learningGoal:LEARNING_GOAL,assessmentElements:ELEMENTS,assessmentMethods:input.methods,timing:input.timing,duration:20,materials:["학생용 수행평가지"]},studentTask:{situation:"짧은 문장을 읽습니다.",instruction:"문장을 소리 내어 읽고 물음에 답하세요.",steps:["문장을 천천히 읽어요.","물음에 한 문장으로 답해요."],expectedProduct:"읽기와 말하기 수행",reminders:["차례를 지켜요."],observableElements:ELEMENTS},studentWorksheet:{introduction:"문장을 읽고 차례대로 해 보세요.",sourceText:"토끼가 산에 갑니다.",tasks:[{id:"T1",instruction:"문장을 소리 내어 읽어 보세요.",answerSpaceLines:2},{id:"T2",instruction:"누가 산에 가는지 써 보세요.",answerSpaceLines:3}],selfAssessment:[]},teacherGuide:{intent:"문장을 정확하게 읽고 내용을 확인하는지 관찰합니다.",preparation:["학생용 수행평가지"],procedure:["학생에게 과제를 안내합니다.","읽기와 응답을 관찰합니다."],observableBehaviors:rubric.map(x=>x.observableEvidence),estimatedMinutes:20,cautions:["학생의 실제 수행 행동만 기록합니다."],support:["낱말을 손가락으로 짚어 줍니다."],sampleAnswers:[{taskId:"T1",answer:"제시된 문장을 정확하게 읽음"},{taskId:"T2",answer:"토끼"}]},rubric,observationChecklist:rubric.map(x=>({criterionId:x.criterionId,observableBehavior:x.observableEvidence,recordType:"확인/메모"})),feedbackTemplates:{strengths:["문장을 또박또박 읽었어요."],nextSteps:["쉼표에서 잠깐 쉬어 읽어 보세요."],practice:["짧은 문장을 한 번 더 읽어 보세요."]}}}

test("validates assessment selection against the curriculum and required methods",()=>{
  const missingMethods=validatePerformanceAssessmentInput({...selection,methods:[]});
  assert.equal(missingMethods.data,undefined);
  assert.match(missingMethods.errors.methods,/선택해 주세요/);
  const badTopic=validatePerformanceAssessmentInput({...selection,topic:"존재하지 않는 차시"});
  assert.equal(badTopic.data,undefined);
  assert.match(badTopic.errors.topic,/다시 선택해 주세요/);
  const fixed=validatePerformanceAssessmentInput({...selection,grade:"6학년",subject:"수학"});
  assert.ok(fixed.data);
  assert.equal("grade" in fixed.data,false);
  assert.equal("subject" in fixed.data,false);
  assert.equal(fixed.data.currentSession,2);
  assert.equal(fixed.data.totalSessions,13);
  assert.equal(fixed.data.textbookName,"미래엔 초등 국어 1-1");
  assert.equal(fixed.data.domain,"읽기");
  assert.match(fixed.data.achievementStandard,/\[2국02-01\]/);
});
test("preserves the achievement standard and links tasks, rubric, and checklist",()=>{const result=validatePerformanceAssessmentOutput(make(),input);assert.ok(result);assert.equal(result.overview.achievementStandard,input.achievementStandard);assert.deepEqual(result.studentTask.observableElements,ELEMENTS);assert.deepEqual(result.rubric.map(x=>x.assessmentElement),ELEMENTS);assert.deepEqual(new Set(result.observationChecklist.map(x=>x.criterionId)),new Set(["E1","E2"]))});
test("validates three and four levels with ascending scores and totals",()=>{assert.ok(validatePerformanceAssessmentOutput(make(),input));const fourInput={...input,levelCount:4,levelNames:defaultPerformanceLevelNames(4)};const four=make();four.rubric.forEach(x=>x.levels=fourInput.levelNames.map((name,i)=>({levelName:name,description:["기초 행동을 도움받아 시도함","일부 도움을 받아 핵심 행동을 수행함","목표 행동을 독립적으로 수행함","목표 행동을 새 상황에도 적용함"][i],score:[2,5,8,10][i]})));assert.ok(validatePerformanceAssessmentOutput(four,fourInput));const wrong=make();wrong.rubric[1].maxScore=9;assert.equal(validatePerformanceAssessmentOutput(wrong,input),null)});
test("rejects vague criteria and keeps student task IDs aligned with teacher answers",()=>{const vague=make();vague.rubric[0].levels[0].description="태도가 좋음";assert.equal(validatePerformanceAssessmentOutput(vague,input),null);const mismatch=make();mismatch.teacherGuide.sampleAnswers[0].taskId="OTHER";assert.equal(validatePerformanceAssessmentOutput(mismatch,input),null)});
test("partial regeneration preserves unrelated edited sections",()=>{const current=make(),next=make();current.title="교사가 수정한 제목";next.feedbackTemplates.strengths=["새 피드백"];const merged=mergePerformanceSection(current,next,"feedback");assert.equal(merged.title,"교사가 수정한 제목");assert.deepEqual(merged.feedbackTemplates.strengths,["새 피드백"]);assert.equal(merged.studentTask,current.studentTask)});
test("print and privacy rules are wired without storing student data",async()=>{const result=make();assert.deepEqual(performancePrintIssues(result,input),[]);const [component,styles,shell,route]=await Promise.all([readFile(new URL("../app/components/korean-performance-assessment-generator.tsx",import.meta.url),"utf8"),readFile(new URL("../app/korean-performance-assessment.css",import.meta.url),"utf8"),readFile(new URL("../app/components/app-shell.tsx",import.meta.url),"utf8"),readFile(new URL("../app/api/korean-performance-assessments/generate/route.ts",import.meta.url),"utf8")]);assert.match(component,/학생용 수행평가지만 인쇄|학생용/);assert.match(component,/채점기준·관찰표/);assert.match(styles,/@page\{size:A4 portrait/);assert.match(styles,/page-break-inside:avoid/);assert.match(shell,/\/korean-performance-assessments/);assert.match(route,/generateStructuredAiData/);assert.doesNotMatch(component+route,/localStorage|sessionStorage|console\.(log|info|debug)/)});
test("prompt keeps standard exact and forbids automatic student scoring",()=>{const prompt=buildPerformanceAssessmentPrompt(input);assert.match(prompt,/입력된 학기·단원·차시 주제·성취기준·국어 영역 정보는 한 글자도 바꾸지 마세요/);assert.match(prompt,/학생 이름·답안·점수는 만들지 마세요/);assert.match(prompt,/score도 오름차순/)});
