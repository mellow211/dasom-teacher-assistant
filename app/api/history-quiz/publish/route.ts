import { getChatGPTUser } from "../../../chatgpt-auth";
import { AttendanceStoreError } from "../../../lib/attendance-store";
import { publishHistoryQuizSession } from "../../../lib/history-quiz-session-store";
import { validateHistoryQuestions } from "../../../lib/history-quiz";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "퀴즈 내용을 확인해 주세요." }, { status: 400 }); }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "";
  const questions = validateHistoryQuestions({ questions: body.questions }, "general");
  if (!title || !["basic", "standard", "challenge"].includes(difficulty) || !questions || !questions.length) {
    return Response.json({ error: "배포할 퀴즈 내용을 확인해 주세요." }, { status: 400 });
  }
  try {
    const { slug } = await publishHistoryQuizSession(user.email, title, topic, difficulty, questions);
    return Response.json({ slug }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceStoreError ? error.message : "퀴즈를 배포하지 못했습니다." }, { status: 500 });
  }
}
