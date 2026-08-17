import { getChatGPTUser } from "../../../chatgpt-auth";
import { AttendanceStoreError } from "../../../lib/attendance-store";
import { getTeacherMaterialFile, markTeacherMaterialDownloaded } from "../../../lib/material-store";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "파일을 확인해 주세요." }, { status: 400 });
  try {
    const file = await getTeacherMaterialFile(user.email, id);
    if (!file) return Response.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });
    await markTeacherMaterialDownloaded(user.email, id, file.downloadCount).catch(() => {});
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        "Content-Length": String(file.data.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) { return Response.json({ error: error instanceof AttendanceStoreError ? error.message : "파일을 불러오지 못했습니다." }, { status: 500 }); }
}
