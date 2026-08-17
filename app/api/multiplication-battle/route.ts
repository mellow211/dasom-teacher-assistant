import { getChatGPTUser } from "../../chatgpt-auth";
import { AttendanceStoreError } from "../../lib/attendance-store";
import { createBattleRoom } from "../../lib/multiplication-battle-store";
import { generateProblems, type GameMode, type GameSettings } from "../../lib/multiplication-quiz";

const MODES: GameMode[] = ["table-solo", "table-battle", "multiplication-solo", "multiplication-battle"];

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "설정을 확인해 주세요." }, { status: 400 }); }
  const mode = body.mode as GameMode;
  const settings = body.settings as GameSettings;
  if (!MODES.includes(mode) || !settings || typeof settings !== "object") return Response.json({ error: "게임 설정을 확인해 주세요." }, { status: 400 });
  const selectedTables = Array.isArray(settings.selectedTables) ? settings.selectedTables.filter((n): n is number => Number.isInteger(n) && n >= 2 && n <= 9) : [];
  const questionCount = [10, 20, 30].includes(settings.questionCount) ? settings.questionCount : 10;
  const timeLimit = [0, 10, 20, 30].includes(settings.timeLimit) ? settings.timeLimit : 0;
  const difficulty = ["easy", "normal", "hard", "challenge", "mixed"].includes(settings.difficulty) ? settings.difficulty : "easy";
  if (mode.startsWith("table") && !selectedTables.length) return Response.json({ error: "연습할 단을 선택해 주세요." }, { status: 400 });
  const cleanSettings: GameSettings = { selectedTables, questionCount, timeLimit, difficulty };
  const problems = generateProblems(mode, cleanSettings);
  if (!problems.length) return Response.json({ error: "문제를 만들지 못했습니다." }, { status: 400 });
  try {
    const { code } = await createBattleRoom(user.email, mode, problems, timeLimit);
    return Response.json({ code }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof AttendanceStoreError ? error.message : "방을 만들지 못했습니다." }, { status: 500 });
  }
}
