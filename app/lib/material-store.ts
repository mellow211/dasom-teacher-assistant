import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";

export const MATERIAL_CATEGORIES = ["수업 자료", "업무 서식", "평가·기록", "가정통신문", "기타"] as const;
export const MATERIAL_GRADES = ["공통", "1학년", "2학년", "3학년", "4학년", "5학년", "6학년"] as const;
export const MATERIAL_SUBJECTS = ["공통", "국어", "수학", "사회", "과학", "영어", "도덕", "실과", "체육", "음악", "미술", "통합교과", "학급운영", "기타"] as const;
export const MATERIAL_MAX_BYTES = 4 * 1024 * 1024;
export const MATERIAL_ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".hwp", ".hwpx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".csv", ".zip"];

export type MaterialCategory = typeof MATERIAL_CATEGORIES[number];
export type TeacherMaterial = {
  id: string;
  title: string;
  description: string;
  category: MaterialCategory;
  grade: string;
  subject: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isFavorite: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
};
export type TeacherMaterialMeta = { title: string; description: string; category: MaterialCategory; grade: string; subject: string };

type MaterialRow = {
  id: string; title: string; description: string | null; category: MaterialCategory; grade: string; subject: string;
  file_name: string; mime_type: string; file_size: number; is_favorite: boolean; download_count: number;
  created_at: string; updated_at: string;
};

const metaColumns = "id,title,description,category,grade,subject,file_name,mime_type,file_size,is_favorite,download_count,created_at,updated_at";
const representation = { Prefer: "return=representation" };
const minimal = { Prefer: "return=minimal" };

function toMaterial(row: MaterialRow): TeacherMaterial {
  return { id: row.id, title: row.title, description: row.description || "", category: row.category, grade: row.grade, subject: row.subject, fileName: row.file_name, mimeType: row.mime_type, fileSize: row.file_size, isFavorite: row.is_favorite, downloadCount: row.download_count, createdAt: row.created_at, updatedAt: row.updated_at };
}
function toBytea(buffer: Buffer): string { return "\\x" + buffer.toString("hex"); }
function fromBytea(value: string): Buffer { return Buffer.from(value.replace(/^\\x/, ""), "hex"); }

export function validateMaterialMeta(value: unknown): { data?: TeacherMaterialMeta; error?: string } {
  if (!value || typeof value !== "object") return { error: "자료 정보를 확인해 주세요." };
  const raw = value as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 150) : "";
  const description = typeof raw.description === "string" ? raw.description.trim().slice(0, 300) : "";
  const category = raw.category as MaterialCategory;
  const grade = typeof raw.grade === "string" && MATERIAL_GRADES.includes(raw.grade as typeof MATERIAL_GRADES[number]) ? raw.grade : "공통";
  const subject = typeof raw.subject === "string" && MATERIAL_SUBJECTS.includes(raw.subject as typeof MATERIAL_SUBJECTS[number]) ? raw.subject : "공통";
  if (!title) return { error: "자료 이름을 입력해 주세요." };
  if (!MATERIAL_CATEGORIES.includes(category)) return { error: "자료 분류를 선택해 주세요." };
  return { data: { title, description, category, grade, subject } };
}

export function validateMaterialFile(fileName: string, size: number): string | null {
  if (!fileName) return "파일을 선택해 주세요.";
  if (size <= 0) return "빈 파일은 올릴 수 없습니다.";
  if (size > MATERIAL_MAX_BYTES) return "파일은 4MB 이하만 올릴 수 있습니다.";
  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!MATERIAL_ALLOWED_EXTENSIONS.includes(ext)) return "지원하지 않는 파일 형식입니다. (문서·표·이미지·압축 파일만 가능)";
  return null;
}

export async function listTeacherMaterials(email: string) {
  const response = await attendanceStoreRequest(email, "teacher_materials", `?select=${metaColumns}&order=updated_at.desc`);
  return ((await response.json()) as MaterialRow[]).map(toMaterial);
}

export async function createTeacherMaterial(email: string, meta: TeacherMaterialMeta, fileName: string, mimeType: string, bytes: Buffer) {
  const { owner } = await attendanceStoreAuth(email);
  const response = await attendanceStoreRequest(email, "teacher_materials", "", { method: "POST", headers: representation, body: JSON.stringify({ owner_key: owner, title: meta.title, description: meta.description || null, category: meta.category, grade: meta.grade, subject: meta.subject, file_name: fileName.slice(0, 255), mime_type: mimeType || "application/octet-stream", file_size: bytes.length, file_data: toBytea(bytes) }) });
  const [row] = (await response.json()) as MaterialRow[];
  if (!row) throw new AttendanceStoreError();
  return toMaterial(row);
}

export async function updateTeacherMaterialMeta(email: string, id: string, meta: TeacherMaterialMeta) {
  const response = await attendanceStoreRequest(email, "teacher_materials", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: representation, body: JSON.stringify({ title: meta.title, description: meta.description || null, category: meta.category, grade: meta.grade, subject: meta.subject, updated_at: new Date().toISOString() }) });
  const [row] = (await response.json()) as MaterialRow[];
  if (!row) throw new AttendanceStoreError();
  return toMaterial(row);
}

export async function setTeacherMaterialFavorite(email: string, id: string, isFavorite: boolean) {
  const response = await attendanceStoreRequest(email, "teacher_materials", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: representation, body: JSON.stringify({ is_favorite: isFavorite, updated_at: new Date().toISOString() }) });
  const [row] = (await response.json()) as MaterialRow[];
  if (!row) throw new AttendanceStoreError();
  return toMaterial(row);
}

export async function markTeacherMaterialDownloaded(email: string, id: string, currentCount: number) {
  await attendanceStoreRequest(email, "teacher_materials", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: minimal, body: JSON.stringify({ download_count: Math.max(0, Math.floor(currentCount)) + 1, updated_at: new Date().toISOString() }) });
}

export async function deleteTeacherMaterial(email: string, id: string) {
  await attendanceStoreRequest(email, "teacher_materials", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: minimal });
}

export async function getTeacherMaterialFile(email: string, id: string) {
  const response = await attendanceStoreRequest(email, "teacher_materials", `?id=eq.${encodeURIComponent(id)}&select=file_name,mime_type,download_count,file_data`);
  const [row] = (await response.json()) as { file_name: string; mime_type: string; download_count: number; file_data: string }[];
  if (!row) return null;
  return { fileName: row.file_name, mimeType: row.mime_type, downloadCount: row.download_count, data: fromBytea(row.file_data) };
}
