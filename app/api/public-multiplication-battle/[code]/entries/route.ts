import { AttendanceStoreError } from "../../../../lib/attendance-store";
import { listBattleEntries } from "../../../../lib/multiplication-battle-store";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    return Response.json({ entries: await listBattleEntries(code.toUpperCase()) });
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceStoreError ? "순위를 불러오지 못했습니다." : "순위를 불러오지 못했습니다." }, { status: 500 });
  }
}
