import type { MessageGeneratorInput } from "./message-generator";
import { buildMessagePrompt } from "./message-generator";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type OpenAIResponse = {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

export class AiServiceError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
    this.name = "AiServiceError";
  }
}

export async function generateTeacherMessage(
  input: MessageGeneratorInput,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError("AI 서비스 설정이 완료되지 않았습니다.", 503);
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      store: false,
      reasoning: { effort: "none" },
      max_output_tokens: 800,
      input: buildMessagePrompt(input),
    }),
    signal,
  });

  let payload: OpenAIResponse;
  try {
    payload = (await response.json()) as OpenAIResponse;
  } catch {
    throw new AiServiceError("AI 서비스의 응답을 확인할 수 없습니다.", 502);
  }

  if (!response.ok) {
    throw new AiServiceError(
      response.status === 429
        ? "요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요."
        : "메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      response.status === 429 ? 429 : 502,
    );
  }

  const message = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")
    ?.text?.trim();

  if (!message) throw new AiServiceError("생성된 메시지가 비어 있습니다. 다시 시도해 주세요.", 502);
  return message;
}
