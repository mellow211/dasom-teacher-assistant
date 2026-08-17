import { AttendanceStoreError } from "../../../lib/attendance-store";
import { loadBattleRoom, submitBattleEntry } from "../../../lib/multiplication-battle-store";

const fail = (e: unknown) => Response.json({ error: e instanceof AttendanceStoreError ? "요청을 처리하지 못했습니다." : "요청을 처리하지 못했습니다." }, { status: 500 });

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const room = await loadBattleRoom(code.toUpperCase());
    if (!room) return Response.json({ error: "대결방을 찾을 수 없습니다. 코드를 다시 확인해 주세요." }, { status: 404 });
    return Response.json(room);
  } catch (error) { return fail(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "제출 내용을 확인해 주세요." }, { status: 400 }); }
  const name = typeof body.playerName === "string" ? body.playerName.trim().slice(0, 20) : "";
  const correctCount = Number(body.correctCount), totalCount = Number(body.totalCount), score = Number(body.score), totalTime = Number(body.totalTime);
  if (!name) return Response.json({ error: "이름을 입력해 주세요." }, { status: 400 });
  if (!Number.isFinite(correctCount) || !Number.isFinite(totalCount) || totalCount <= 0 || !Number.isFinite(score) || !Number.isFinite(totalTime)) return Response.json({ error: "결과 내용을 확인해 주세요." }, { status: 400 });
  try {
    const { code } = await params;
    await submitBattleEntry(code.toUpperCase(), name, correctCount, totalCount, score, totalTime);
    return Response.json({ ok: true });
  } catch { return Response.json({ error: "결과를 제출하지 못했습니다. 대결방 코드를 확인해 주세요." }, { status: 400 }); }
}
