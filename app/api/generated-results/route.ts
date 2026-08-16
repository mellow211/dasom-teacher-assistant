import { getChatGPTUser } from "../../chatgpt-auth";
import { AttendanceStoreError } from "../../lib/attendance-store";
import { createGeneratedResult, deleteGeneratedResult, GENERATED_RESULT_TOOLS, listGeneratedResults, validateGeneratedResultInput, type GeneratedResultTool } from "../../lib/generated-result-store";

const unauthorized = () => Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
const failure = (error: unknown) => Response.json({ error: error instanceof AttendanceStoreError ? error.message : "저장한 결과물을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const isTool = (value: unknown): value is GeneratedResultTool => typeof value === "string" && (GENERATED_RESULT_TOOLS as readonly string[]).includes(value);

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const toolParam = new URL(request.url).searchParams.get("tool");
  const tool = isTool(toolParam) ? toolParam : undefined;
  try { return Response.json({ results: await listGeneratedResults(user.email, tool) }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "저장할 내용을 확인해 주세요." }, { status: 400 }); }
  const validation = validateGeneratedResultInput(body);
  if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
  try { return Response.json({ result: await createGeneratedResult(user.email, validation.data) }, { status: 201 }); }
  catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: { id?: string };
  try { body = await request.json() as { id?: string }; } catch { return Response.json({ error: "삭제할 항목을 확인해 주세요." }, { status: 400 }); }
  if (!validId(body.id)) return Response.json({ error: "삭제할 항목을 확인해 주세요." }, { status: 400 });
  try { await deleteGeneratedResult(user.email, body.id!); return new Response(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
