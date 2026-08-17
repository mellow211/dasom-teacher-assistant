import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";
import { publicRpc } from "./survey-store";
import type { HistoryQuestion } from "./history-quiz";

export async function publishHistoryQuizSession(email: string, title: string, topic: string, difficulty: string, questions: HistoryQuestion[]) {
  const { owner } = await attendanceStoreAuth(email);
  const response = await attendanceStoreRequest(email, "history_quiz_sessions", "", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ owner_key: owner, title: title.slice(0, 150), topic: topic.slice(0, 100), difficulty, questions }),
  });
  const [row] = (await response.json()) as { public_slug: string }[];
  if (!row) throw new AttendanceStoreError();
  return { slug: row.public_slug };
}

export async function loadPublicHistoryQuiz(slug: string) {
  const data = await publicRpc("get_public_history_quiz", { p_slug: slug }) as { title: string; topic: string; difficulty: string; questions: HistoryQuestion[] } | null;
  return data;
}
