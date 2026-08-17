import { AttendanceStoreError } from "../../../lib/attendance-store";
import { loadPublicHistoryQuiz } from "../../../lib/history-quiz-session-store";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const data = await loadPublicHistoryQuiz(slug);
    if (!data) return Response.json({ error: "퀴즈를 찾을 수 없습니다." }, { status: 404 });
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceStoreError ? "퀴즈를 불러오지 못했습니다." : "요청을 처리하지 못했습니다." }, { status: 500 });
  }
}
