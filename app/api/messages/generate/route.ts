import { AiServiceError, generateTeacherMessage } from "../../../lib/ai-service";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { validateMessageInput } from "../../../lib/message-generator";
import { createSavedMessage } from "../../../lib/saved-message-store";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 });
  }

  const validation = validateMessageInput(payload);
  if (!validation.data) {
    return Response.json(
      { error: "필수 입력값을 확인해 주세요.", fields: validation.errors },
      { status: 400 },
    );
  }

  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "로그인 후 이용해 주세요." }, { status: 401 });

  try {
    const message = await generateTeacherMessage(validation.data, request.signal);
    const savedMessage = await createSavedMessage(user.email, {
      recipient: validation.data.recipient,
      studentName: validation.data.studentName,
      message,
    });
    return Response.json({ message, savedMessage });
  } catch (error) {
    const status = error instanceof AiServiceError ? error.status : 500;
    const message = error instanceof AiServiceError
      ? error.message
      : "메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return Response.json({ error: message }, { status });
  }
}
