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
  return generateAiText(buildMessagePrompt(input), signal);
}

export async function generateAiText(
  prompt: string,
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
        input: prompt,
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
    throw normalizeAiError(error);
  }
}

export async function generateStructuredAiData<T>(
  prompt: string,
  schema: Record<string, unknown>,
  validate: (value: unknown) => T | null,
  signal?: AbortSignal,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiServiceError("AI 서비스 설정이 완료되지 않았습니다.", 503);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create(
      {
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        input: prompt,
        store: false,
        generation_config: { thinking_level: "low", max_output_tokens: 4000 },
        response_format: { type: "text", mime_type: "application/json", schema },
      },
      signal ? { fetchOptions: { signal } } : undefined,
    );

    const text = interaction.output_text?.trim();
    if (!text) throw new AiServiceError("생성된 결과가 비어 있습니다. 다시 시도해 주세요.", 502);
    let parsed: unknown;
    try { parsed = JSON.parse(text); }
    catch { throw new AiServiceError("AI 응답 형식을 확인할 수 없습니다. 다시 생성해 주세요.", 502); }
    const validated = validate(parsed);
    if (!validated) throw new AiServiceError("생성 결과의 구성이 올바르지 않습니다. 다시 생성해 주세요.", 502);
    return validated;
  } catch (error) {
    throw normalizeAiError(error);
  }
}

function normalizeAiError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) return error;
  if (error instanceof Error && error.name === "AbortError") return new AiServiceError("요청이 취소되었습니다. 다시 시도해 주세요.", 499);
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : 0;
  if (status === 429) return new AiServiceError("요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (status === 400 || status === 401 || status === 403) return new AiServiceError("AI 서비스 인증을 확인해 주세요.", 502);
  return new AiServiceError("AI 내용을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
}
