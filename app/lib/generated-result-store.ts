import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";

export const GENERATED_RESULT_TOOLS = ["newsletter", "lesson-plan", "korean-performance-assessment", "leveled-korean-worksheet"] as const;
export type GeneratedResultTool = (typeof GENERATED_RESULT_TOOLS)[number];
export type GeneratedResult = { id: string; tool: GeneratedResultTool; title: string; content: string; data: unknown; createdAt: string; updatedAt: string };

type GeneratedResultRow = { id: string; tool: GeneratedResultTool; title: string; content: string; data: unknown; created_at: string; updated_at: string };

const columns = "id,tool,title,content,data,created_at,updated_at";
const representation = { Prefer: "return=representation" };
const minimal = { Prefer: "return=minimal" };

const isTool = (value: unknown): value is GeneratedResultTool =>
  typeof value === "string" && (GENERATED_RESULT_TOOLS as readonly string[]).includes(value);

function toGeneratedResult(row: GeneratedResultRow): GeneratedResult {
  return { id: row.id, tool: row.tool, title: row.title, content: row.content, data: row.data ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function validateGeneratedResultInput(value: unknown): { data?: { tool: GeneratedResultTool; title: string; content: string; data?: unknown }; error?: string } {
  if (!value || typeof value !== "object") return { error: "저장할 내용을 확인해 주세요." };
  const raw = value as Record<string, unknown>;
  if (!isTool(raw.tool)) return { error: "저장할 도구를 확인해 주세요." };
  const title = (typeof raw.title === "string" ? raw.title.trim().slice(0, 200) : "") || "제목 없음";
  const content = typeof raw.content === "string" ? raw.content.trim().slice(0, 100000) : "";
  if (!content) return { error: "저장할 내용이 비어 있습니다." };
  if (raw.data !== undefined && JSON.stringify(raw.data).length > 300000) return { error: "저장할 내용이 너무 큽니다." };
  return { data: { tool: raw.tool, title, content, data: raw.data } };
}

export async function listGeneratedResults(email: string, tool?: GeneratedResultTool): Promise<GeneratedResult[]> {
  const filter = tool ? `&tool=eq.${encodeURIComponent(tool)}` : "";
  const response = await attendanceStoreRequest(email, "generated_results", `?select=${columns}${filter}&order=updated_at.desc&limit=50`);
  return ((await response.json()) as GeneratedResultRow[]).map(toGeneratedResult);
}

export async function getGeneratedResult(email: string, id: string): Promise<GeneratedResult | undefined> {
  const response = await attendanceStoreRequest(email, "generated_results", `?select=${columns}&id=eq.${encodeURIComponent(id)}&limit=1`);
  const [row] = (await response.json()) as GeneratedResultRow[];
  return row ? toGeneratedResult(row) : undefined;
}

export async function createGeneratedResult(email: string, input: { tool: GeneratedResultTool; title: string; content: string; data?: unknown }): Promise<GeneratedResult> {
  const { owner } = await attendanceStoreAuth(email);
  const response = await attendanceStoreRequest(email, "generated_results", "", {
    method: "POST",
    headers: representation,
    body: JSON.stringify({ owner_key: owner, tool: input.tool, title: input.title, content: input.content, data: input.data ?? null }),
  });
  const [row] = (await response.json()) as GeneratedResultRow[];
  if (!row) throw new AttendanceStoreError();
  return toGeneratedResult(row);
}

export async function deleteGeneratedResult(email: string, id: string): Promise<void> {
  if (!id) throw new AttendanceStoreError();
  await attendanceStoreRequest(email, "generated_results", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: minimal });
}
