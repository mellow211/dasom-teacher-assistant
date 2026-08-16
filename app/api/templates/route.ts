import { getChatGPTUser } from "../../chatgpt-auth";
import { AttendanceStoreError } from "../../lib/attendance-store";
import { createTeacherTemplate, deleteTeacherTemplate, listTeacherTemplates, markTeacherTemplateUsed, setTeacherTemplateFavorite, updateTeacherTemplate, validateTemplateInput } from "../../lib/template-store";

const unauthorized = () => Response.json({ error: "로그인 후 자료·템플릿을 이용해 주세요." }, { status: 401 });
const failure = (error: unknown) => Response.json({ error: error instanceof AttendanceStoreError ? "자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." : "자료·템플릿을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  try { return Response.json({ templates: await listTeacherTemplates(user.email) }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "템플릿 내용을 확인해 주세요." }, { status: 400 }); }
  const validation = validateTemplateInput(body);
  if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
  try { return Response.json({ template: await createTeacherTemplate(user.email, validation.data) }, { status: 201 }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "수정할 템플릿을 확인해 주세요." }, { status: 400 }); }
  if (!validId(body.id)) return Response.json({ error: "수정할 템플릿을 확인해 주세요." }, { status: 400 });
  try {
    if (body.action === "favorite") return Response.json({ template: await setTeacherTemplateFavorite(user.email, body.id as string, body.isFavorite === true) });
    if (body.action === "use") return Response.json({ template: await markTeacherTemplateUsed(user.email, body.id as string, Number(body.useCount) || 0) });
    const validation = validateTemplateInput(body);
    if (!validation.data) return Response.json({ error: validation.error }, { status: 400 });
    return Response.json({ template: await updateTeacherTemplate(user.email, body.id as string, validation.data) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: { id?: string };
  try { body = await request.json() as { id?: string }; } catch { return Response.json({ error: "삭제할 템플릿을 확인해 주세요." }, { status: 400 }); }
  if (!validId(body.id)) return Response.json({ error: "삭제할 템플릿을 확인해 주세요." }, { status: 400 });
  try { await deleteTeacherTemplate(user.email, body.id!); return new Response(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
