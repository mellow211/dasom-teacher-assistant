import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";
import { publicRpc } from "./survey-store";
import type { GameMode, Problem } from "./multiplication-quiz";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export type BattleRoom = { mode: GameMode; problems: Problem[]; timeLimit: number; status: "open" | "closed" };
export type BattleEntry = { playerName: string; correctCount: number; totalCount: number; score: number; totalTime: number; submittedAt: string };

export async function createBattleRoom(email: string, mode: GameMode, problems: Problem[], timeLimit: number) {
  const { owner } = await attendanceStoreAuth(email);
  const code = randomCode();
  const response = await attendanceStoreRequest(email, "multiplication_battle_rooms", "", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ owner_key: owner, room_code: code, mode, problems, time_limit: timeLimit }),
  });
  const [row] = (await response.json()) as { room_code: string }[];
  if (!row) throw new AttendanceStoreError();
  return { code: row.room_code };
}

export async function loadBattleRoom(code: string) {
  return (await publicRpc("get_battle_room", { p_code: code })) as BattleRoom | null;
}

export async function submitBattleEntry(code: string, name: string, correctCount: number, totalCount: number, score: number, totalTime: number) {
  return await publicRpc("submit_battle_entry", { p_code: code, p_name: name, p_correct: correctCount, p_total: totalCount, p_score: score, p_total_time: totalTime });
}

export async function listBattleEntries(code: string) {
  return (await publicRpc("list_battle_entries", { p_code: code })) as BattleEntry[];
}
