import { GoogleGenAI } from "@google/genai";
import type { MessageGeneratorInput } from "./message-generator";
import { buildMessagePrompt } from "./message-generator";

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AiServiceError("AI 서비스 설정이 완료되지 않았습니다.", 503);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create(
      {
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        input: buildMessagePrompt(input),
        store: false,
        generation_config: {
          thinking_level: "low",
          max_output_tokens: 800,
        },
      },
      signal ? { fetchOptions: { signal } } : undefined,
    );

    const message = interaction.output_text?.trim();
    if (!message) {
      throw new AiServiceError("생성된 메시지가 비어 있습니다. 다시 시도해 주세요.", 502);
    }
    return message;
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiServiceError("요청이 취소되었습니다. 다시 시도해 주세요.", 499);
    }

    const status = typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : 0;
    if (status === 429) {
      throw new AiServiceError("요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.", 429);
    }
    if (status === 400 || status === 401 || status === 403) {
      throw new AiServiceError("AI 서비스 인증을 확인해 주세요.", 502);
    }
    throw new AiServiceError("메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
}
