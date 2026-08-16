import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function getMultiplicationLogic() {
  const source = await readFile(new URL("../app/lib/multiplication-quiz.ts", import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

async function getAttendanceLogic() {
  const source = await readFile(new URL("../app/lib/attendance-assignment.ts", import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

test("attendance records remain class-scoped, unique, and exclude inactive students", async()=>{
 const l=await getAttendanceLogic(),students=[{id:"s1",classId:"c1",studentNumber:1,displayName:"1번",isActive:true},{id:"s2",classId:"c1",studentNumber:2,displayName:"2번",isActive:false},{id:"s3",classId:"c2",studentNumber:1,displayName:"다른 반",isActive:true}];
 const initial=l.attendanceForDate(students,[],"c1","2026-08-15");assert.equal(initial.length,1);assert.equal(initial[0].status,"미확인");
 const updated=l.upsertAttendance([], [{...initial[0],status:"출석"},{...initial[0],status:"지각"}]);assert.equal(updated.length,1);assert.equal(updated[0].status,"지각");
});

test("attendance and submission summaries and bulk upserts are exact",async()=>{
 const l=await getAttendanceLogic(),a=[{classId:"c",studentId:"1",attendanceDate:"2026-08-15",status:"출석",note:""},{classId:"c",studentId:"2",attendanceDate:"2026-08-15",status:"지각",note:""}];
 assert.deepEqual({...l.attendanceSummary(a)},{미확인:0,출석:1,결석:0,지각:1,조퇴:0,결과:0});
 const s=l.upsertSubmissions([],[{assignmentId:"a",studentId:"1",status:"미제출",note:""},{assignmentId:"a",studentId:"1",status:"제출",note:""}]);assert.equal(s.length,1);assert.equal(s[0].status,"제출");assert.equal(l.submissionSummary(s).제출,1);
});

test("dates stay as local date strings and deadlines never change submission status",async()=>{
 const l=await getAttendanceLogic();assert.equal(l.moveDate("2026-01-01",-1),"2025-12-31");
 const assignment={id:"a",classId:"c",title:"과제",subject:"",description:"",assignedDate:"",dueDate:"2026-08-10",status:"진행 중"};
 const records=l.submissionForAssignment([{id:"s",classId:"c",studentNumber:1,displayName:"1번",isActive:true}],[],assignment);assert.equal(records[0].status,"미확인");
});

const settings = { selectedTables: [3, 6], difficulty: "easy", questionCount: 20, timeLimit: 0 };

test("multiplication quiz generates only selected tables with correct answers", async () => {
  const logic = await getMultiplicationLogic();
  const problems = logic.generateProblems("table-solo", settings, () => 0.42);
  assert.equal(problems.length, 20);
  assert.ok(problems.every((problem) => [3, 6].includes(problem.leftOperand)));
  assert.ok(problems.every((problem) => problem.rightOperand >= 1 && problem.rightOperand <= 9));
  assert.ok(problems.every((problem) => problem.correctAnswer === problem.leftOperand * problem.rightOperand));
  assert.equal(new Set(problems.slice(0, 18).map((problem) => `${problem.leftOperand}-${problem.rightOperand}`)).size, 18);
});

test("multiplication quiz respects difficulty ranges and mixed balance", async () => {
  const logic = await getMultiplicationLogic();
  const cases = { easy: [[2,9],[2,9]], normal: [[10,99],[2,9]], hard: [[100,999],[2,9]], challenge: [[10,99],[10,99]] };
  for (const [difficulty, [left, right]] of Object.entries(cases)) {
    const problems = logic.generateProblems("multiplication-solo", {...settings, difficulty, questionCount: 10}, Math.random);
    assert.ok(problems.every((p) => p.leftOperand >= left[0] && p.leftOperand <= left[1] && p.rightOperand >= right[0] && p.rightOperand <= right[1]));
  }
  const mixed = logic.generateProblems("multiplication-solo", {...settings, difficulty:"mixed", questionCount: 30}, Math.random);
  const counts = Object.values(logic.problemDistribution(mixed));
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test("grading, timeout guard, wrong retry, and battle decisions are deterministic", async () => {
  const logic = await getMultiplicationLogic();
  const problem = {id:"p",leftOperand:3,rightOperand:4,correctAnswer:12,problemType:"table"};
  assert.equal(logic.gradeAnswer(problem, 12, 1).isCorrect, true);
  assert.equal(logic.gradeAnswer(problem, 11, 1).isCorrect, false);
  assert.equal(logic.resolveAttempt(problem, true, 12, 1, true), null);
  assert.equal(logic.wrongProblems([logic.gradeAnswer(problem, 11, 1)]).length, 1);
  const first = logic.buildPlayerResult("A", [logic.gradeAnswer(problem, 12, 3)]);
  const faster = logic.buildPlayerResult("B", [logic.gradeAnswer(problem, 12, 2)]);
  assert.equal(logic.decideWinner(first, faster), 2);
  assert.equal(logic.decideWinner(first, {...first, playerName:"B"}), 0);
});

test("battle players receive the same problem distribution", async () => {
  const logic = await getMultiplicationLogic();
  const [first, second] = logic.generateBattleProblems("multiplication-battle", {...settings, difficulty:"mixed", questionCount:20}, Math.random);
  assert.deepEqual(logic.problemDistribution(first), logic.problemDistribution(second));
});

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

test("renders website login and signup pages", async () => {
  const worker = await getWorker();
  const login = await worker.fetch(new Request("http://localhost/login", { headers: { accept: "text/html" } }), env, context);
  const signup = await worker.fetch(new Request("http://localhost/signup", { headers: { accept: "text/html" } }), env, context);
  assert.equal(login.status, 200);
  assert.equal(signup.status, 200);
  assert.match(await login.text(), /로그인/);
  assert.match(await signup.text(), /회원가입/);
});

test("protects the dashboard with the website login flow", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" }, redirect: "manual" }), env, context);
  assert.ok([302, 307, 308].includes(response.status));
  assert.match(response.headers.get("location") || "", /\/login\?returnTo=%2F/);
});

test("keeps website sessions in server-only cookies", async () => {
  const auth = await readFile(new URL("../app/lib/app-auth.ts", import.meta.url), "utf8");
  assert.match(auth, /httpOnly:\s*true/);
  assert.match(auth, /sameSite:\s*"lax"/);
  assert.doesNotMatch(auth, /localStorage|sessionStorage|NEXT_PUBLIC_/);
});

test.skip("renders the teacher assistant dashboard after authentication", async () => {
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

test.skip("renders the attendance and assignment manager route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/attendance-assignments", { headers: { accept: "text/html", "oai-authenticated-user-email": "teacher@example.com" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /출결·과제 제출 현황/);
  assert.match(html, /학급 정보를 안전하게 불러오는 중입니다/);
});

test.skip("renders the one-student-one-role assignment route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/class-roles", { headers: { accept: "text/html", "oai-authenticated-user-email": "teacher@example.com" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /학급과 역할 정보를 불러오는 중입니다/);
});

test.skip("renders the shared class and student management route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/class-management", { headers: { accept: "text/html", "oai-authenticated-user-email": "teacher@example.com" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /학급과 학생 정보를 불러오는 중입니다/);
});

test.skip("renders the message generator route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/messages", { headers: { accept: "text/html" } }),
    env,
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /메시지 생성기/);
  assert.match(html, /생성 결과만 계정에 저장/);
  assert.doesNotMatch(html, /메시지 유형/);
  assert.doesNotMatch(html, /세부 상황/);
});

test("rejects an incomplete message request before calling AI", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/messages/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipient: "학부모" }),
    }),
    env,
    context,
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.equal(payload.error, "필수 입력값을 확인해 주세요.");
  assert.ok(payload.fields.content);
});

test.skip("renders the newsletter generator route after authentication", async () => {
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
  const [service, rules, route, store, migration] = await Promise.all([
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/message-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/messages/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/saved-message-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260816010000_saved_teacher_messages.sql", import.meta.url), "utf8"),
  ]);

  assert.match(service, /process\.env\.REPLICATE_API_TOKEN/);
  assert.match(service, /api\.replicate\.com/);
  assert.match(service, /method:\s*"DELETE"/);
  assert.doesNotMatch(service + route, /console\.(log|info|debug)/);
  assert.match(rules, /입력된 사실만 사용/);
  assert.match(rules, /다른 학생의 이름이나 정보를 포함하지 마세요/);
  assert.match(rules, /2~3문장/);
  assert.match(rules, /5~7문장/);
  assert.doesNotMatch(rules, /messageType|MESSAGE_TYPES/);
  assert.match(store, /attendanceStoreRequest/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /x-owner-key/);
  assert.doesNotMatch(service + route + store, /console\.(log|info|debug)/);
});

test("keeps newsletter facts and personal details out of storage and logs", async () => {
  const [rules, route, references, component] = await Promise.all([
    readFile(new URL("../app/lib/newsletter-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/newsletters/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/newsletter-reference-library.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/newsletter-generator.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(route, /console\.(log|info|debug)/);
  assert.match(rules, /입력된 사실만 사용/);
  assert.match(rules, /요일/);
  assert.match(rules, /입력되지 않은 정보를 추가하지 마세요/);
  assert.match(rules, /완성된 가정통신문만 반환하세요/);
  assert.match(rules, /selectNewsletterReferences/);
  assert.match(rules, /normalizeNewsletterOutput/);
  assert.match(rules, /Markdown/);
  assert.match(rules, /newsletterFormatGuide/);
  assert.match(rules, /issuedDate/);
  assert.match(rules, /'날짜'는 행사·활동 날짜/);
  assert.match(route, /normalizeNewsletterOutput/);
  assert.match(component, /작성일/);
  assert.match(component, /행사 날짜와 별도/);
  assert.match(references, /필요한 최소 항목/);
  assert.match(references, /만 14세 미만/);
  assert.match(references, /제3자 제공/);
  assert.match(references, /법정대리인/);
  assert.match(references, /공개 가정통신문 게시판\(1,000건 이상\)/);
  assert.match(component, /2026 개인정보보호 지침 반영/);
  assert.match(rules, /끝\./);
  assert.match(rules, /절취선/);
  assert.match(rules, /추후 안내/);
  assert.match(rules, /항목을 삭제하거나 번호를 다시 매기지 마세요/);
});

test("keeps the detailed message option selected and avoids padded AI output", async () => {
  const [component, rules, styles] = await Promise.all([
    readFile(new URL("../app/components/message-generator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/message-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(component, /aria-pressed=\{form\.length === length\}/);
  assert.match(component, /message-option-grid/);
  assert.match(rules, /5~7문장/);
  assert.match(rules, /같은 사실이나 부탁을 반복하지 마세요/);
  assert.match(rules, /사실을 반복하거나 만들어내는 것보다 짧고 정확하게/);
  assert.match(styles, /message-form \.message-option-grid/);
});

test("rejects truncated teacher messages before they are saved", async () => {
  const [{ isCompleteTeacherMessage }, service] = await Promise.all([
    import("../app/lib/message-generator.ts"),
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(isCompleteTeacherMessage("안녕하세요. 준비물"), false);
  assert.equal(isCompleteTeacherMessage("안녕하세요. 미술 준비물을 챙겨 보내 주시기 바랍니다."), true);
  assert.match(service, /maxOutputTokens = 2000/);
  assert.match(service, /isCompleteTeacherMessage\(first\)/);
  assert.match(service, /isCompleteTeacherMessage\(retry\)/);
});

test.skip("renders the lesson plan generator route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/lesson-plans", { headers: { accept: "text/html" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /지도안 생성기/);
  assert.match(html, /민감한 개인정보는 입력하지 마세요/);
});

test("validates lesson sessions and positive duration", async () => {
  const { validateLessonPlanInput } = await import("../app/lib/lesson-plan-generator.ts");
  const base = { grade:"6학년", subject:"수학", semester:"1학기", unit:"받침이 있는 글자", topic:"받침이 있는 낱말 읽기", achievementStandard:"[1국02-01] 글자와 낱말을 소리 내어 읽는다.", currentSession:3, totalSessions:2, durationMinutes:0, studentLevel:"보통", lessonType:"기능 연습형" };
  const validation = validateLessonPlanInput(base);
  assert.equal(validation.data, undefined);
  assert.match(validation.errors.currentSession, /전체 차시보다 클 수 없어요/);
  assert.match(validation.errors.durationMinutes, /1분 이상의 정수/);
  const fixed = validateLessonPlanInput({ ...base, currentSession:1, durationMinutes:40 });
  assert.equal(fixed.data.grade, "1학년");
  assert.equal(fixed.data.subject, "국어");
});

test("validates lesson plan structure, stage order, time sum, and mixed-level support", async () => {
  const { normalizeLessonPlanOutput, validateLessonPlanOutput } = await import("../app/lib/lesson-plan-generator.ts");
  const input = { grade:"1학년", subject:"국어", semester:"1학기", unit:"받침이 있는 글자", topic:"받침이 있는 낱말 읽기", achievementStandard:"[1국02-01] 글자와 낱말을 소리 내어 읽는다.", currentSession:1, totalSessions:2, durationMinutes:40, studentLevel:"수준 혼합", lessonType:"기능 연습형" };
  const plan = {
    title:"국어과 교수·학습 지도안", lessonType:"기능 연습형", learningObjectives:["받침이 있는 낱말을 소리 내어 읽을 수 있다."], teacherMaterials:["낱말 카드"], studentMaterials:["필기도구"],
    lessonStages:[
      {stage:"도입",learningContent:"이전 학습 떠올리기",minutes:5,teacherActivities:["○ 낱말을 어떻게 읽는지 말해 봅시다."],studentActivities:["- 낱말을 소리 내어 읽습니다."],materialsAndNotes:["▶ 받침 낱말 카드"]},
      {stage:"전개",learningContent:"받침 낱말 읽기",minutes:30,teacherActivities:["▣ 받침 낱말 읽기"],studentActivities:["- 낱말을 보고 정확하게 읽습니다."],materialsAndNotes:["※ 받침을 손가락으로 짚으며 읽게 합니다."]},
      {stage:"정리",learningContent:"학습 내용 확인",minutes:5,teacherActivities:["• 오늘 어떤 낱말을 읽었나요?"],studentActivities:["- 읽은 낱말을 한 개 말합니다."],materialsAndNotes:["※ 다양한 답을 허용합니다."]},
    ],
    assessment:{content:["받침이 있는 낱말 읽기"],method:["관찰평가"],observableBehaviors:["받침을 빠뜨리지 않고 낱말을 읽는다."],criteria:{high:"도움 없이 받침 낱말을 정확하게 읽는다.",medium:"일부 도움을 받아 대부분의 받침 낱말을 읽는다.",low:"받침을 확인하는 도움을 받아 낱말을 따라 읽는다."},alignmentEvidence:"읽기 목표를 전개에서 연습하고 같은 읽기 행동을 관찰한다."},
    levelSupport:[{level:"기초",support:["문장 틀 제공"]},{level:"보통",support:["기본 활동"]},{level:"심화",support:["근거 비교"]}],
  };
  assert.ok(validateLessonPlanOutput(plan,input));
  plan.lessonStages[1].minutes = 24;
  assert.equal(validateLessonPlanOutput(plan,input), null);
  plan.lessonStages.forEach((stage) => {
    stage.teacherActivities = stage.teacherActivities.map(x => x.replace(/^[▣○•]\s*/, ""));
    stage.studentActivities = stage.studentActivities.map(x => x.replace(/^-\s*/, ""));
    stage.materialsAndNotes = stage.materialsAndNotes.map(x => x.replace(/^[▶※]\s*/, ""));
  });
  const normalized = normalizeLessonPlanOutput(plan,input);
  assert.ok(validateLessonPlanOutput(normalized,input));
  assert.equal(normalized.lessonStages.reduce((sum,stage)=>sum+stage.minutes,0),40);
});

test("uses structured AI output and keeps lesson data out of logs", async () => {
  const [service, rules, reference, route] = await Promise.all([
    readFile(new URL("../app/lib/ai-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/lesson-plan-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/lesson-plan-reference.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/lesson-plans/generate/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(service, /JSON\.stringify\(schema\)/);
  assert.match(service, /application\/json/);
  assert.match(service, /JSON\.parse/);
  assert.doesNotMatch(service + route, /console\.(log|info|debug)/);
  assert.match(rules, /시간 합계는 정확히/);
  assert.match(rules, /입력 성취기준과 단원명을 바꾸지 마세요/);
  assert.match(rules, /teacherActivities와 studentActivities는 같은 개수/);
  assert.match(rules, /criteria의 high·medium·low/);
  assert.match(reference, /구조와 설계 논리만 활용/);
  assert.match(reference, /교사 활동은 ▣ 주요 활동/);
  assert.match(reference, /상·중·하 평가 기준/);
});

test.skip("renders the student observation organizer route after authentication", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/student-observations", { headers: { accept: "text/html", "oai-authenticated-user-email": "teacher@example.com" } }), env, context);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /상담·학생 관찰 기록 정리기/);
  assert.match(html, /민감한 개인정보, 건강정보, 가족정보는 입력하지 마세요/);
  assert.match(html, /로그인한 교사 본인만 조회·수정·삭제/);
});

test("redirects an unauthenticated observation viewer to website login", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/student-observations", { headers: { accept: "text/html" }, redirect: "manual" }), env, context);
  assert.ok([302,307,308].includes(response.status));
  assert.match(response.headers.get("location")||"", /\/login\?returnTo=%2Fstudent-observations/);
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

test.skip("renders the writing feedback assistant route after authentication", async()=>{
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

test("provides contextual first-use guidance for every implemented teacher tool", async () => {
  const [help, shell, styles] = await Promise.all([
    readFile(new URL("../app/components/contextual-help.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/app-shell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  for (const section of ["messages", "newsletters", "lesson-plans", "student-observations", "writing-feedback", "attendance-assignments", "class-roles", "class-management", "surveys", "daily-math", "daily-english", "multiplication-quiz", "history-quiz", "textbook-dictation"]) assert.ok(help.includes(section));
  assert.match(help, /field-help-trigger/);
  assert.match(help, /aria-expanded/);
  assert.match(help, /MutationObserver/);
  assert.match(shell, /ContextualHelp/);
  assert.match(styles, /field-help-trigger:hover/);
  assert.match(styles, /field-help-trigger:focus-visible/);
});

test("dashboard actions link to implemented tools and exclude the removed question generator", async () => {
  const shell = await readFile(new URL("../app/components/app-shell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /title: "문제 생성기"/);
  for (const route of ["/messages", "/lesson-plans", "/leveled-korean-worksheets", "/korean-performance-assessments", "/workspace", "/attendance-assignments"]) {
    assert.match(shell, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(shell, /recentRoutes\[i\]/);
  assert.match(shell, /수행평가 만들기/);
});

test("validates reusable template content and classifications", async () => {
  const store = await readFile(new URL("../app/lib/template-store.ts", import.meta.url), "utf8");
  assert.match(store, /if \(!title\)/);
  assert.match(store, /if \(!content\)/);
  assert.match(store, /TEMPLATE_SCOPES\.includes/);
  assert.match(store, /TEMPLATE_TYPES\.includes/);
  assert.match(store, /TEMPLATE_GRADES\.includes/);
  assert.match(store, /TEMPLATE_SUBJECTS\.includes/);
});

test("keeps templates account-owned and server-persisted", async () => {
  const [component, store, route, migration] = await Promise.all([
    readFile(new URL("../app/components/template-library.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/template-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/templates/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260816030000_teacher_templates.sql", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(component + store + route, /localStorage|sessionStorage|console\.(log|info|debug)/);
  assert.match(store, /attendanceStoreRequest/);
  assert.match(route, /getChatGPTUser/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /x-owner-key/);
});

test("requires login for the template API", async () => {
  const worker = await getWorker();
  const response = await worker.fetch(new Request("http://localhost/api/templates"), env, context);
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /로그인/);
});
