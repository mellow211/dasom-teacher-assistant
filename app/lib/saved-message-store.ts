import { attendanceStoreAuth, attendanceStoreRequest, AttendanceStoreError } from "./attendance-store";

export type SavedMessage = {
  id: string;
  recipient: "학부모" | "학생";
  studentName?: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};

type SavedMessageRow = {
  id: string;
  recipient: "학부모" | "학생";
  student_name: string | null;
  message_text: string;
  created_at: string;
  updated_at: string;
};

const representation = { Prefer: "return=representation" };
const minimal = { Prefer: "return=minimal" };

function toSavedMessage(row: SavedMessageRow): SavedMessage {
  return {
    id: row.id,
    recipient: row.recipient,
    studentName: row.student_name || undefined,
    message: row.message_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSavedMessages(email: string): Promise<SavedMessage[]> {
  const response = await attendanceStoreRequest(email, "saved_teacher_messages", "?select=id,recipient,student_name,message_text,created_at,updated_at&order=updated_at.desc&limit=30");
  return ((await response.json()) as SavedMessageRow[]).map(toSavedMessage);
}

export async function createSavedMessage(email: string, input: { recipient: "학부모" | "학생"; studentName?: string; message: string }): Promise<SavedMessage> {
  const message = input.message.trim().slice(0, 10000);
  if (!message) throw new AttendanceStoreError();
  const { owner } = await attendanceStoreAuth(email);
  const response = await attendanceStoreRequest(email, "saved_teacher_messages", "", {
    method: "POST",
    headers: representation,
    body: JSON.stringify({ owner_key: owner, recipient: input.recipient, student_name: input.studentName?.trim().slice(0, 40) || null, message_text: message }),
  });
  const [row] = (await response.json()) as SavedMessageRow[];
  if (!row) throw new AttendanceStoreError();
  return toSavedMessage(row);
}

export async function updateSavedMessage(email: string, id: string, messageText: string): Promise<SavedMessage> {
  const message = messageText.trim().slice(0, 10000);
  if (!id || !message) throw new AttendanceStoreError();
  const response = await attendanceStoreRequest(email, "saved_teacher_messages", `?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: representation,
    body: JSON.stringify({ message_text: message, updated_at: new Date().toISOString() }),
  });
  const [row] = (await response.json()) as SavedMessageRow[];
  if (!row) throw new AttendanceStoreError();
  return toSavedMessage(row);
}

export async function deleteSavedMessage(email: string, id: string): Promise<void> {
  if (!id) throw new AttendanceStoreError();
  await attendanceStoreRequest(email, "saved_teacher_messages", `?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: minimal });
}
