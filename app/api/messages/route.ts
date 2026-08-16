import { getChatGPTUser } from "../../chatgpt-auth";
import { AttendanceStoreError } from "../../lib/attendance-store";
import { deleteSavedMessage, listSavedMessages, updateSavedMessage } from "../../lib/saved-message-store";

const unauthorized = () => Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
const failure = (error: unknown) => Response.json({ error: error instanceof AttendanceStoreError ? error.message : "저장된 메시지를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  try { return Response.json({ messages: await listSavedMessages(user.email) }); }
  catch (error) { return failure(error); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: { id?: string; message?: string };
  try { body = await request.json() as { id?: string; message?: string }; }
  catch { return Response.json({ error: "저장할 메시지를 확인해 주세요." }, { status: 400 }); }
  if (!body.id || !body.message?.trim()) return Response.json({ error: "저장할 메시지를 확인해 주세요." }, { status: 400 });
  try { return Response.json({ message: await updateSavedMessage(user.email, body.id, body.message) }); }
  catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return unauthorized();
  let body: { id?: string };
  try { body = await request.json() as { id?: string }; }
  catch { return Response.json({ error: "삭제할 메시지를 확인해 주세요." }, { status: 400 }); }
  if (!body.id) return Response.json({ error: "삭제할 메시지를 확인해 주세요." }, { status: 400 });
  try { await deleteSavedMessage(user.email, body.id); return new Response(null, { status: 204 }); }
  catch (error) { return failure(error); }
}
