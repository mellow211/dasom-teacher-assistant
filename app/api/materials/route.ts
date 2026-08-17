import { getChatGPTUser } from "../../chatgpt-auth";
import { AttendanceStoreError } from "../../lib/attendance-store";
import { createTeacherMaterial, deleteTeacherMaterial, listTeacherMaterials, MATERIAL_MAX_BYTES, setTeacherMaterialFavorite, updateTeacherMaterialMeta, validateMaterialFile, validateMaterialMeta } from "../../lib/material-store";

const unauthorized = () => Response.json({ error: "로그인 후 자료함을 이용해 주세요." }, { status: 401 });
const failure = (error: unknown) => Response.json({ error: error instanceof AttendanceStoreError ? "자료를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." : "자료를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
const validId = (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  try { return Response.json({ materials: await listTeacherMaterials(user.email) }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  const size = Number(request.headers.get("content-length") || 0);
  if (size > MATERIAL_MAX_BYTES * 1.4) return Response.json({ error: "파일은 4MB 이하만 올릴 수 있습니다." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "업로드 내용을 확인해 주세요." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "업로드할 파일을 선택해 주세요." }, { status: 400 });
  const meta = validateMaterialMeta({ title: form.get("title"), description: form.get("description"), category: form.get("category"), grade: form.get("grade"), subject: form.get("subject") });
  if (!meta.data) return Response.json({ error: meta.error }, { status: 400 });
  const fileError = validateMaterialFile(file.name, file.size);
  if (fileError) return Response.json({ error: fileError }, { status: 400 });
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    return Response.json({ material: await createTeacherMaterial(user.email, meta.data, file.name, file.type, bytes) }, { status: 201 });
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "수정할 자료를 확인해 주세요." }, { status: 400 }); }
  if (!validId(body.id)) return Response.json({ error: "수정할 자료를 확인해 주세요." }, { status: 400 });
  try {
    if (body.action === "favorite") return Response.json({ material: await setTeacherMaterialFavorite(user.email, body.id as string, body.isFavorite === true) });
    const meta = validateMaterialMeta(body);
    if (!meta.data) return Response.json({ error: meta.error }, { status: 400 });
    return Response.json({ material: await updateTeacherMaterialMeta(user.email, body.id as string, meta.data) });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: { id?: string };
  try { body = await request.json() as { id?: string }; } catch { return Response.json({ error: "삭제할 자료를 확인해 주세요." }, { status: 400 }); }
  if (!validId(body.id)) return Response.json({ error: "삭제할 자료를 확인해 주세요." }, { status: 400 });
  try { await deleteTeacherMaterial(user.email, body.id!); return new Response(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
