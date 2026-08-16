import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildKoreanWorksheetPrompt,combineWorksheetSets,printableWorksheetIssues,validateKoreanWorksheetInput,validateKoreanWorksheetOutput } from "../app/lib/leveled-korean-worksheet.ts";

const input={semester:"1학기",unit:"글자를 만들어요",lesson:"3차시",achievementStandard:"[1국02-01] 글자와 낱말을 소리 내어 읽는다.",learningGoal:"받침이 있는 낱말을 소리 내어 읽을 수 있다.",coreContent:"산, 문, 달과 같이 받침이 있는 낱말 읽기",keywords:"산, 문, 달",areas:["낱말 읽기"],levels:["보충","기본","심화"],itemCount:3,pages:1,composition:"선택형·쓰기 활동 혼합",fontSize:"크게",spacing:"넓게"};

function make(level){
  const items=Array.from({length:3},(_,i)=>({
    id:`${level}-${i+1}`,type:i===0?"알맞은 낱말 고르기":"핵심 낱말을 사용하여 문장 만들기",
    prompt:i===0?"받침이 있는 낱말을 고르세요.":"낱말을 넣어 짧은 문장을 쓰세요.",sourceText:"",
    options:i===0?["나","산","우리"]:[],correctAnswer:i===0?"산":"",acceptedAnswers:[],sampleAnswer:i===0?"":"산이 높아요.",
    explanation:i===0?"산에는 받침 ㄴ이 있습니다.":"핵심 낱말을 알맞게 사용하면 됩니다.",scaffold:level==="보충"?"보기: 산":"",writingLines:level==="보충"?2:3,
  }));
  return {title:"받침 낱말 활동",grade:"1학년",subject:"국어",semester:"1학기",unit:"글자를 만들어요",lesson:"3차시",achievementStandard:input.achievementStandard,learningGoal:input.learningGoal,levels:[{level,studentTitle:{보충:"활동지 A",기본:"활동지 B",심화:"활동지 C"}[level],shortDescription:"낱말을 읽고 써 봅니다.",instructions:"문제를 읽고 차례대로 답하세요.",items}],teacherGuide:{commonLearningGoal:input.learningGoal,levelDifferences:[`${level} 도움 방식`],teachingTips:["학생이 낱말을 천천히 읽도록 기다립니다."],answerKey:items.map(x=>({level,itemId:x.id,answer:x.correctAnswer,acceptedAnswers:x.acceptedAnswers,explanation:x.explanation}))}};
}

test("fixes the feature to first-grade Korean and validates required learning data",()=>{const result=validateKoreanWorksheetInput({...input,grade:"6학년",subject:"수학"});assert.ok(result.data);assert.equal("grade" in result.data,false);assert.equal("subject" in result.data,false);const invalid=validateKoreanWorksheetInput({...input,learningGoal:"",coreContent:"",areas:[]});assert.ok(invalid.errors.learningGoal);assert.ok(invalid.errors.coreContent);assert.ok(invalid.errors.areas)});
test("validates every requested level with the same goal and exact item count",()=>{const parts=input.levels.map(level=>validateKoreanWorksheetOutput(make(level),input,level));assert.ok(parts.every(Boolean));const combined=combineWorksheetSets(parts,input);assert.deepEqual(combined.levels.map(x=>x.level),input.levels);assert.equal(combined.learningGoal,input.learningGoal);assert.ok(combined.levels.every(x=>x.items.length===3))});
test("requires support scaffolds in the prompt and keeps enrichment at grade one",()=>{const support=buildKoreanWorksheetPrompt(input,"보충"),advanced=buildKoreanWorksheetPrompt(input,"심화");assert.match(support,/예시·보기·따라 쓰기/);assert.match(advanced,/1학년을 넘는 긴 글쓰기나 추상 논술 금지/);assert.match(support,/입력된 성취기준과 학습 목표는 한 글자도 바꾸지 마세요/)});
test("rejects ambiguous choices, missing evidence, and invalid printable edits",()=>{
  const wrong=make("기본");
  wrong.levels[0].items[0].correctAnswer="달";
  assert.equal(validateKoreanWorksheetOutput(wrong,input,"기본"),null);
  assert.ok(printableWorksheetIssues(wrong).some(x=>x.includes("정답이 보기에 없습니다")));
});
test("keeps student sheets neutral and supports item, level, lock, and print actions",async()=>{const [component,config,styles,shell,route]=await Promise.all([readFile(new URL("../app/components/leveled-korean-worksheet-generator.tsx",import.meta.url),"utf8"),readFile(new URL("../app/lib/korean-worksheet-config.ts",import.meta.url),"utf8"),readFile(new URL("../app/leveled-korean-worksheet.css",import.meta.url),"utf8"),readFile(new URL("../app/components/app-shell.tsx",import.meta.url),"utf8"),readFile(new URL("../app/api/leveled-korean-worksheets/generate/route.ts",import.meta.url),"utf8")]);assert.match(config,/활동지 A/);assert.match(config,/활동지 B/);assert.match(config,/활동지 C/);assert.match(component,/regenerateItem/);assert.match(component,/keepLocked/);assert.match(component,/선택 수준 인쇄/);assert.match(component,/교사용 인쇄/);assert.match(styles,/@page\{size:A4 portrait/);assert.match(styles,/page-break-inside:avoid/);assert.match(shell,/\/leveled-korean-worksheets/);assert.match(route,/generateStructuredAiData/);assert.doesNotMatch(component+route,/localStorage|sessionStorage|console\.(log|info|debug)/)});
