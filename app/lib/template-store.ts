import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";

export const TEMPLATE_SCOPES = ["수업 자료", "업무 양식"] as const;
export const TEMPLATE_TYPES = ["메시지", "가정통신문", "지도안", "활동지", "평가", "기록", "설문", "기타"] as const;
export const TEMPLATE_GRADES = ["공통", "1학년", "2학년", "3학년", "4학년", "5학년", "6학년"] as const;
export const TEMPLATE_SUBJECTS = ["공통", "국어", "수학", "사회", "과학", "영어", "도덕", "실과", "체육", "음악", "미술", "통합교과", "학급운영", "기타"] as const;

export type TemplateScope = typeof TEMPLATE_SCOPES[number];
export type TemplateType = typeof TEMPLATE_TYPES[number];
export type TeacherTemplate = {
  id: string;
  title: string;
  description: string;
  scope: TemplateScope;
  resourceType: TemplateType;
  grade: string;
  subject: string;
  content: string;
  isFavorite: boolean;
  useCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type TeacherTemplateInput = Omit<TeacherTemplate, "id" | "isFavorite" | "useCount" | "lastUsedAt" | "createdAt" | "updatedAt">;

type TemplateRow = {
  id: string; title: string; description: string | null; scope: TemplateScope; resource_type: TemplateType;
  grade: string; subject: string; content: string; is_favorite: boolean; use_count: number;
  last_used_at: string | null; created_at: string; updated_at: string;
};

const columns = "id,title,description,scope,resource_type,grade,subject,content,is_favorite,use_count,last_used_at,created_at,updated_at";
const representation = { Prefer: "return=representation" };
const minimal = { Prefer: "return=minimal" };

function toTemplate(row: TemplateRow): TeacherTemplate {
  return { id: row.id, title: row.title, description: row.description || "", scope: row.scope, resourceType: row.resource_type, grade: row.grade, subject: row.subject, content: row.content, isFavorite: row.is_favorite, useCount: row.use_count, lastUsedAt: row.last_used_at || undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function validateTemplateInput(value: unknown): { data?: TeacherTemplateInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "템플릿 내용을 확인해 주세요." };
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 100) : "";
  const content = typeof raw.content === "string" ? raw.content.trim().slice(0, 30000) : "";
  const description = typeof raw.description === "string" ? raw.description.trim().slice(0, 300) : "";
  const scope = raw.scope as TemplateScope;
  const resourceType = raw.resourceType as TemplateType;
  const grade = typeof raw.grade === "string" && TEMPLATE_GRADES.includes(raw.grade as typeof TEMPLATE_GRADES[number]) ? raw.grade : "공통";
  const subject = typeof raw.subject === "string" && TEMPLATE_SUBJECTS.includes(raw.subject as typeof TEMPLATE_SUBJECTS[number]) ? raw.subject : "공통";
  if (!title) return { error: "템플릿 이름을 입력해 주세요." };
  if (!content) return { error: "다시 사용할 내용을 입력해 주세요." };
  if (!TEMPLATE_SCOPES.includes(scope)) return { error: "자료 구분을 선택해 주세요." };
  if (!TEMPLATE_TYPES.includes(resourceType)) return { error: "자료 유형을 선택해 주세요." };
  return { data: { title, description, scope, resourceType, grade, subject, content } };
}

export async function listTeacherTemplates(email: string) {
  const response = await attendanceStoreRequest(email, "teacher_templates", `?select=${columns}&order=updated_at.desc`);
  return ((await response.json()) as TemplateRow[]).map(toTemplate);
}

export async function createTeacherTemplate(email: string, input: TeacherTemplateInput) {
  const { owner } = await attendanceStoreAuth(email);
  const response = await attendanceStoreRequest(email, "teacher_templates", "", { method: "POST", headers: representation, body: JSON.stringify({ owner_key: owner, title: input.title, description: input.description || null, scope: input.scope, resource_type: input.resourceType, grade: input.grade, subject: input.subject, content: input.content }) });
  const [row] = (await response.json()) as TemplateRow[];
  if (!row) throw new AttendanceStoreError();
  return toTemplate(row);
}

export async function updateTeacherTemplate(email: string, id: string, input: TeacherTemplateInput) {
  const response = await attendanceStoreRequest(email, "teacher_templates", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: representation, body: JSON.stringify({ title: input.title, description: input.description || null, scope: input.scope, resource_type: input.resourceType, grade: input.grade, subject: input.subject, content: input.content, updated_at: new Date().toISOString() }) });
  const [row] = (await response.json()) as TemplateRow[];
  if (!row) throw new AttendanceStoreError();
  return toTemplate(row);
}

export async function setTeacherTemplateFavorite(email: string, id: string, isFavorite: boolean) {
  const response = await attendanceStoreRequest(email, "teacher_templates", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: representation, body: JSON.stringify({ is_favorite: isFavorite, updated_at: new Date().toISOString() }) });
  const [row] = (await response.json()) as TemplateRow[];
  if (!row) throw new AttendanceStoreError();
  return toTemplate(row);
}

export async function markTeacherTemplateUsed(email: string, id: string, currentUseCount: number) {
  const response = await attendanceStoreRequest(email, "teacher_templates", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: representation, body: JSON.stringify({ use_count: Math.max(0, Math.floor(currentUseCount)) + 1, last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  const [row] = (await response.json()) as TemplateRow[];
  if (!row) throw new AttendanceStoreError();
  return toTemplate(row);
}

export async function deleteTeacherTemplate(email: string, id: string) {
  await attendanceStoreRequest(email, "teacher_templates", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: minimal });
}
