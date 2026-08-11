import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function getWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders the teacher assistant dashboard", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>다솜쌤 \| AI 교사 도우미<\/title>/);
  assert.match(html, /다솜쌤/);
});

test("renders the message generator route", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/messages", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /메시지 생성기/);
  assert.match(html, /입력 내용은 저장하지 않아요/);
});

test("rejects an incomplete message request before calling AI", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/messages/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messageType: "문의 답변" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "필수 입력값을 확인해 주세요.");
  assert.ok(payload.fields.facts);
  assert.ok(payload.fields.request);
});

test("renders the newsletter generator route", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/newsletters", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /가정통신문 생성기/);
  assert.match(html, /입력 내용은 저장하지 않아요/);
});

test("rejects an incomplete newsletter request before calling AI", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/newsletters/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "행사 안내", audience: "특정 학년" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "필수 입력값을 확인해 주세요.");
  assert.ok(payload.fields.audienceDetail);
  assert.ok(payload.fields.coreContent);
});

test("keeps message privacy and writing rules in the server service", async () => {
  const [service, rules, route] = await Promise.all([
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/message-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/generate/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(service, /process\.env\.GEMINI_API_KEY/);
  assert.match(service, /new GoogleGenAI/);
  assert.match(service, /store:\s*false/);
  assert.doesNotMatch(service + route, /console\.(log|info|debug)/);
  assert.match(rules, /입력된 사실만 사용/);
  assert.match(rules, /다른 학생의 이름이나 정보를 포함하지 마세요/);
  assert.match(rules, /2~3문장/);
  assert.match(rules, /5~7문장/);
});

test("keeps newsletter facts and personal details out of storage and logs", async () => {
  const [rules, route] = await Promise.all([
    readFile(new URL("../app/lib/newsletter-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/newsletters/generate/route.ts", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(route, /console\.(log|info|debug)/);
  assert.match(rules, /입력된 사실만 사용/);
  assert.match(rules, /요일/);
  assert.match(rules, /입력되지 않은 정보를 추가하지 마세요/);
  assert.match(rules, /완성된 가정통신문만 반환하세요/);
});

test("renders the lesson plan generator route", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/lesson-plans", { headers: { accept: "text/html" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /지도안 생성기/);
  assert.match(html, /민감한 개인정보는 입력하지 마세요/);
});

test("validates lesson sessions and positive duration", async () => {
  const { validateLessonPlanInput } = await import("../app/lib/lesson-plan-generator.ts");
  const base = { grade:"3학년", subject:"국어", topic:"중심 생각", achievementStandard:"[4국02-01] 문단과 글의 중심 생각을 파악한다.", currentSession:3, totalSessions:2, durationMinutes:0, studentLevel:"보통" };
  const validation = validateLessonPlanInput(base);
  assert.equal(validation.data, undefined);
  assert.match(validation.errors.currentSession, /전체 차시보다 클 수 없어요/);
  assert.match(validation.errors.durationMinutes, /1분 이상의 정수/);
});

test("validates lesson plan structure, stage order, time sum, and mixed-level support", async () => {
  const { validateLessonPlanOutput } = await import("../app/lib/lesson-plan-generator.ts");
  const input = { grade:"3학년", subject:"국어", topic:"중심 생각", achievementStandard:"[4국02-01] 문단과 글의 중심 생각을 파악한다.", currentSession:1, totalSessions:2, durationMinutes:40, studentLevel:"수준 혼합" };
  const plan = {
    title:"중심 생각을 찾는 수업", learningObjectives:["글의 중심 생각을 찾을 수 있다."], teacherMaterials:["칠판"], studentMaterials:["필기도구"],
    lessonStages:[
      {stage:"도입",minutes:5,teacherActivities:["질문 제시"],studentActivities:["생각 나누기"],materialsAndNotes:["참여 관찰"]},
      {stage:"전개",minutes:25,teacherActivities:["활동 안내"],studentActivities:["글 읽고 중심 생각 찾기"],materialsAndNotes:["개별 지원"]},
      {stage:"정리",minutes:10,teacherActivities:["정리 질문"],studentActivities:["배운 점 말하기"],materialsAndNotes:["형성평가"]},
    ],
    assessment:{content:["중심 생각 파악"],method:["관찰"],observableBehaviors:["근거를 들어 중심 생각을 말한다."]},
    levelSupport:[{level:"기초",support:["문장 틀 제공"]},{level:"보통",support:["기본 활동"]},{level:"심화",support:["근거 비교"]}],
  };
  assert.ok(validateLessonPlanOutput(plan,input));
  plan.lessonStages[1].minutes = 24;
  assert.equal(validateLessonPlanOutput(plan,input), null);
});

test("uses Gemini structured output and keeps lesson data out of logs", async () => {
  const [service, rules, route] = await Promise.all([
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/lesson-plan-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lesson-plans/generate/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(service, /response_format/);
  assert.match(service, /application\/json/);
  assert.match(service, /JSON\.parse/);
  assert.doesNotMatch(service + route, /console\.(log|info|debug)/);
  assert.match(rules, /시간 합계는 반드시/);
  assert.match(rules, /성취기준을 바꾸거나 새로 만들지 마세요/);
});

test("renders the student observation organizer route with privacy guidance", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/student-observations", { headers: { accept: "text/html" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /학생 관찰 메모 정리기/);
  assert.match(html, /민감한 개인정보, 건강정보, 가족정보는 입력하지 마세요/);
  assert.match(html, /로그인한 교사 본인만 조회·수정·삭제/);
});

test("validates observation memo required values and sorts dates", async () => {
  const { validateObservationMemo, sortMemosByDate } = await import("../app/lib/student-observation-organizer.ts");
  const invalid = validateObservationMemo({ studentIdentifier:"", date:"", category:"학습 태도", memo:"" });
  assert.ok(invalid.errors.studentIdentifier);
  assert.ok(invalid.errors.date);
  assert.ok(invalid.errors.memo);
  const memos = [
    {id:"2",studentIdentifier:"12번",date:"2026-08-11",category:"책임감",memo:"두 번째"},
    {id:"1",studentIdentifier:"12번",date:"2026-08-01",category:"학습 태도",memo:"첫 번째"},
  ];
  assert.deepEqual(sortMemosByDate(memos).map(x=>x.id), ["1","2"]);
  assert.deepEqual(sortMemosByDate(memos,true).map(x=>x.id), ["2","1"]);
});

test("separates student records before building the AI request", async () => {
  const { selectStudentMemos, buildObservationPrompt } = await import("../app/lib/student-observation-organizer.ts");
  const memos = [
    {id:"a",studentIdentifier:"A",date:"2026-08-01",category:"학습 태도",memo:"A의 기록"},
    {id:"b",studentIdentifier:"B",date:"2026-08-02",category:"교우 관계",memo:"B만의 비공개 기록"},
  ];
  const selected = selectStudentMemos(memos,"A");
  assert.equal(selected.length,1);
  const prompt = buildObservationPrompt("A",selected,"두 결과 모두 생성");
  assert.match(prompt,/A의 기록/);
  assert.doesNotMatch(prompt,/B만의 비공개 기록/);
});

test("validates structured observation output against source dates and categories", async () => {
  const { validateObservationOutput } = await import("../app/lib/student-observation-organizer.ts");
  const memos=[{id:"a",studentIdentifier:"A",date:"2026-08-01",category:"학습 태도",memo:"활동지를 끝까지 작성함"}];
  const output={studentIdentifier:"A",organizedRecords:[{date:"2026-08-01",category:"학습 태도",situation:"",objectiveObservation:"활동지를 끝까지 작성함.",teacherSupport:"",subsequentChange:""}],repeatedStrengths:[],growthPoints:[],behaviorCharacteristicsDraft:"",insufficientEvidenceNotice:"관찰 자료가 충분하지 않아 학생의 전반적인 특성을 판단하기 어려울 수 있습니다."};
  assert.ok(validateObservationOutput(output,memos,"상담·관찰 기록"));
  output.organizedRecords[0].date="2026-08-02";
  assert.equal(validateObservationOutput(output,memos,"상담·관찰 기록"),null);
});

test("keeps observation content out of storage and logs", async () => {
  const [rules,route,component,store] = await Promise.all([
    readFile(new URL("../app/lib/student-observation-organizer.ts", import.meta.url),"utf8"),
    readFile(new URL("../app/api/student-observations/generate/route.ts", import.meta.url),"utf8"),
    readFile(new URL("../app/components/student-observation-organizer.tsx", import.meta.url),"utf8"),
    readFile(new URL("../app/lib/observation-store.ts", import.meta.url),"utf8"),
  ]);
  assert.doesNotMatch(rules+route+component+store,/localStorage|sessionStorage|console\.(log|info|debug)/);
  assert.match(rules,/다른 학생의 이름은 '다른 학생' 또는 '친구'로 익명화/);
  assert.match(route,/선택한 학생의 메모만 전송/);
  assert.match(store,/SUPABASE_OWNER_SECRET/);
  assert.match(store,/HMAC/);
  assert.doesNotMatch(store,/NEXT_PUBLIC_/);
});

test("requires an authenticated teacher for stored observation memos", async () => {
  const worker=await getWorker();
  const response=await worker.fetch(new Request("http://localhost/api/student-observations"),env,context);
  assert.equal(response.status,401);
  const payload=await response.json();
  assert.match(payload.error,/로그인/);
});

test("renders the writing feedback assistant route", async()=>{
  const worker=await getWorker();
  const response=await worker.fetch(new Request("http://localhost/writing-feedback",{headers:{accept:"text/html"}}),env,context);
  assert.equal(response.status,200);const html=await response.text();
  assert.match(html,/글쓰기 피드백 도우미/);
  assert.match(html,/학생 이름, 연락처, 건강정보, 가족정보/);
  assert.match(html,/학생 글과 결과는 저장하지 않아요/);
});

test("validates required writing feedback inputs",async()=>{
  const {validateWritingFeedbackInput}=await import("../app/lib/writing-feedback.ts");
  const validation=validateWritingFeedbackInput({grade:"",writingType:"",studentText:"",feedbackAreas:[],detail:"보통"});
  assert.equal(validation.data,undefined);assert.ok(validation.errors.grade);assert.ok(validation.errors.writingType);assert.ok(validation.errors.studentText);assert.ok(validation.errors.feedbackAreas);
});

test("validates selected feedback areas and spelling correction data",async()=>{
  const {validateWritingFeedbackOutput}=await import("../app/lib/writing-feedback.ts");
  const input={grade:"3학년",writingType:"생활문",studentText:"오늘 공원에 갔다.",feedbackAreas:["내용","맞춤법·띄어쓰기"],detail:"보통"};
  const output={overallFeedback:{strengths:"경험이 분명해요.",prioritySuggestion:"구체적인 모습을 더 떠올려 보세요."},contentFeedback:{strengths:["주제가 드러나요."],suggestions:["공원에서 한 일을 더 써 보세요."],guidingQuestions:["공원에서 무엇을 보았나요?"]},organizationFeedback:{strengths:[],suggestions:[]},expressionFeedback:{strengths:[],revisions:[]},spellingFeedback:{corrections:[{original:"갔다",corrected:"갔다",reason:"이 표현은 바르게 썼어요."}]},revisionChecklist:["주제가 잘 드러나는지 확인하기","고친 문장을 다시 읽기"]};
  assert.ok(validateWritingFeedbackOutput(output,input));output.organizationFeedback.strengths=["잘함"];
  assert.equal(validateWritingFeedbackOutput(output,input),null);
  output.organizationFeedback.strengths=[];output.spellingFeedback.corrections=[{original:"",corrected:"갔다",reason:"설명"}];
  assert.equal(validateWritingFeedbackOutput(output,input),null);
});

test("keeps student writing out of storage and logs",async()=>{
  const [rules,route,component]=await Promise.all([readFile(new URL("../app/lib/writing-feedback.ts",import.meta.url),"utf8"),readFile(new URL("../app/api/writing-feedback/generate/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/components/writing-feedback-assistant.tsx",import.meta.url),"utf8")]);
  assert.doesNotMatch(rules+route+component,/localStorage|sessionStorage|console\.(log|info|debug)|observation-store/);
  assert.match(rules,/학생 대신 글 전체를 다시 쓰지 마세요/);
  assert.match(rules,/실제 오류만 제시/);
});
