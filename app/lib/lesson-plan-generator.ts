export const GRADES = ["1학년", "2학년", "3학년", "4학년", "5학년", "6학년"] as const;
export const SUBJECTS = ["국어", "수학", "사회", "과학", "영어", "도덕", "실과", "체육", "음악", "미술", "통합교과", "기타"] as const;
export const STUDENT_LEVELS = ["기초", "보통", "심화", "수준 혼합"] as const;
export const LESSON_STAGES = ["도입", "전개", "정리"] as const;

export type LessonPlanInput = {
  grade: (typeof GRADES)[number]; subject: (typeof SUBJECTS)[number]; topic: string; achievementStandard: string;
  currentSession: number; totalSessions: number; durationMinutes: number; studentLevel: (typeof STUDENT_LEVELS)[number];
  coreContent?: string; classCharacteristics?: string; desiredActivities?: string; availableMaterials?: string; additionalRequests?: string;
};
export type LessonPlanErrors = Partial<Record<keyof LessonPlanInput, string>>;
export type LessonStage = { stage: (typeof LESSON_STAGES)[number]; minutes: number; teacherActivities: string[]; studentActivities: string[]; materialsAndNotes: string[] };
export type LessonPlanData = {
  title: string; learningObjectives: string[]; teacherMaterials: string[]; studentMaterials: string[]; lessonStages: LessonStage[];
  assessment: { content: string[]; method: string[]; observableBehaviors: string[] };
  levelSupport: Array<{ level: "기초" | "보통" | "심화"; support: string[] }>;
};

const includes = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === "string" && values.includes(value as T);
const clean = (value: unknown, max = 2000) => typeof value === "string" ? value.trim().slice(0, max) : "";
const positiveInt = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value > 0;

export function validateLessonPlanInput(value: unknown): { data?: LessonPlanInput; errors: LessonPlanErrors } {
  if (!value || typeof value !== "object") return { errors: { topic: "수업 정보를 확인해 주세요." } };
  const raw = value as Record<string, unknown>; const errors: LessonPlanErrors = {};
  if (!includes(GRADES, raw.grade)) errors.grade = "학년을 선택해 주세요.";
  if (!includes(SUBJECTS, raw.subject)) errors.subject = "교과를 선택해 주세요.";
  if (!clean(raw.topic, 300)) errors.topic = "단원 또는 수업 주제를 입력해 주세요.";
  if (!clean(raw.achievementStandard, 1000)) errors.achievementStandard = "성취기준을 입력해 주세요.";
  if (!positiveInt(raw.currentSession)) errors.currentSession = "현재 차시는 1 이상의 정수로 입력해 주세요.";
  if (!positiveInt(raw.totalSessions)) errors.totalSessions = "전체 차시는 1 이상의 정수로 입력해 주세요.";
  if (positiveInt(raw.currentSession) && positiveInt(raw.totalSessions) && Number(raw.currentSession) > Number(raw.totalSessions)) errors.currentSession = "현재 차시는 전체 차시보다 클 수 없어요.";
  if (!positiveInt(raw.durationMinutes)) errors.durationMinutes = "수업 시간은 1분 이상의 정수로 입력해 주세요.";
  if (!includes(STUDENT_LEVELS, raw.studentLevel)) errors.studentLevel = "학생 수준을 선택해 주세요.";
  if (Object.keys(errors).length) return { errors };
  const optional = (key: keyof LessonPlanInput, max = 2000) => clean(raw[key], max) || undefined;
  return { errors, data: {
    grade: raw.grade as LessonPlanInput["grade"], subject: raw.subject as LessonPlanInput["subject"], topic: clean(raw.topic,300), achievementStandard: clean(raw.achievementStandard,1000),
    currentSession: raw.currentSession as number, totalSessions: raw.totalSessions as number, durationMinutes: raw.durationMinutes as number, studentLevel: raw.studentLevel as LessonPlanInput["studentLevel"],
    coreContent: optional("coreContent"), classCharacteristics: optional("classCharacteristics"), desiredActivities: optional("desiredActivities"), availableMaterials: optional("availableMaterials"), additionalRequests: optional("additionalRequests"),
  } };
}

const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === "string" && x.trim());
export function validateLessonPlanOutput(value: unknown, input: LessonPlanInput): LessonPlanData | null {
  if (!value || typeof value !== "object") return null; const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || !stringArray(v.learningObjectives) || !stringArray(v.teacherMaterials) || !stringArray(v.studentMaterials)) return null;
  if (!Array.isArray(v.lessonStages) || v.lessonStages.length !== 3) return null;
  const stages: LessonStage[] = [];
  for (let i=0;i<3;i++) { const raw=v.lessonStages[i] as Record<string,unknown>; if (!raw || raw.stage !== LESSON_STAGES[i] || !positiveInt(raw.minutes) || !stringArray(raw.teacherActivities) || !stringArray(raw.studentActivities) || !stringArray(raw.materialsAndNotes)) return null; stages.push(raw as LessonStage); }
  if (stages.reduce((sum,s)=>sum+s.minutes,0) !== input.durationMinutes) return null;
  const assessment=v.assessment as Record<string,unknown>; if (!assessment || !stringArray(assessment.content) || !stringArray(assessment.method) || !stringArray(assessment.observableBehaviors)) return null;
  if (!Array.isArray(v.levelSupport) || !v.levelSupport.length) return null;
  const expected = input.studentLevel === "수준 혼합" ? ["기초","보통","심화"] : [input.studentLevel];
  const supports: LessonPlanData["levelSupport"] = [];
  for (const item of v.levelSupport) { const raw=item as Record<string,unknown>; if (!raw || !expected.includes(raw.level as never) || !stringArray(raw.support)) return null; supports.push(raw as LessonPlanData["levelSupport"][number]); }
  if (new Set(supports.map(x=>x.level)).size !== expected.length) return null;
  return { title:v.title.trim(), learningObjectives:v.learningObjectives, teacherMaterials:v.teacherMaterials, studentMaterials:v.studentMaterials, lessonStages:stages, assessment:assessment as LessonPlanData["assessment"], levelSupport:supports };
}

export const lessonPlanJsonSchema: Record<string, unknown> = {
  type:"object", additionalProperties:false,
  properties:{
    title:{type:"string"}, learningObjectives:{type:"array",items:{type:"string"},minItems:1,maxItems:2}, teacherMaterials:{type:"array",items:{type:"string"},minItems:1}, studentMaterials:{type:"array",items:{type:"string"},minItems:1},
    lessonStages:{type:"array",minItems:3,maxItems:3,items:{type:"object",additionalProperties:false,properties:{stage:{type:"string",enum:[...LESSON_STAGES]},minutes:{type:"integer",minimum:1},teacherActivities:{type:"array",items:{type:"string"},minItems:1},studentActivities:{type:"array",items:{type:"string"},minItems:1},materialsAndNotes:{type:"array",items:{type:"string"},minItems:1}},required:["stage","minutes","teacherActivities","studentActivities","materialsAndNotes"]}},
    assessment:{type:"object",additionalProperties:false,properties:{content:{type:"array",items:{type:"string"},minItems:1},method:{type:"array",items:{type:"string"},minItems:1},observableBehaviors:{type:"array",items:{type:"string"},minItems:1}},required:["content","method","observableBehaviors"]},
    levelSupport:{type:"array",minItems:1,maxItems:3,items:{type:"object",additionalProperties:false,properties:{level:{type:"string",enum:["기초","보통","심화"]},support:{type:"array",items:{type:"string"},minItems:1}},required:["level","support"]}},
  }, required:["title","learningObjectives","teacherMaterials","studentMaterials","lessonStages","assessment","levelSupport"],
};

export function buildLessonPlanPrompt(input: LessonPlanInput): string {
  return `초등학교 교사가 실제로 운영하고 수정할 수 있는 한 차시 수업 지도안을 구조화된 형식으로 작성하세요.
[수업 정보]\n- 학년: ${input.grade}\n- 교과: ${input.subject}\n- 단원 또는 주제: ${input.topic}\n- 성취기준(문구를 그대로 유지): ${input.achievementStandard}\n- 차시: ${input.currentSession}/${input.totalSessions}차시\n- 수업 시간: ${input.durationMinutes}분\n- 학생 수준: ${input.studentLevel}\n- 핵심 내용: ${input.coreContent || "입력되지 않음"}\n- 학급 특성: ${input.classCharacteristics || "입력되지 않음"}\n- 포함 활동: ${input.desiredActivities || "입력되지 않음"}\n- 사용 가능 자료: ${input.availableMaterials || "입력되지 않음"}\n- 추가 요청: ${input.additionalRequests || "입력되지 않음"}
[작성 기준]\n- 입력된 성취기준을 바꾸거나 새로 만들지 마세요. 학년·교과·차시·학생 수준에 맞추세요.\n- 수업 흐름은 도입, 전개, 정리 순서로 정확히 3개이며 시간 합계는 반드시 ${input.durationMinutes}분이어야 합니다.\n- 교사 활동과 학생 활동을 구분하고 학생이 질문·생각·참여하는 실제 가능한 활동을 포함하세요.\n- 입력되지 않은 교과서명, 페이지, 특정 영상·사이트·특별한 시설·고가 장비를 지정하지 마세요.\n- 입력 자료가 없다면 종이, 칠판, 필기도구 등 일반 교실의 최소 자료만 제안하세요.\n- 발달 수준과 안전을 고려하고 학습 목표, 활동, 평가를 연결하세요. 평가는 관찰 가능한 학생 행동 중심으로 작성하세요.\n- 수준별 지원은 도움 자료, 활동 방법, 사고 수준을 조절하세요. 문제 수만 바꾸지 마세요.\n- 학생 수준이 수준 혼합이면 기초·보통·심화를 모두, 그 외에는 ${input.studentLevel} 수준만 levelSupport에 포함하세요.\n- 수업을 이미 실시한 것처럼 결과를 꾸며내지 말고 검토 가능한 초안으로 작성하세요.`;
}
