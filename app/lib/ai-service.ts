import type { MessageGeneratorInput } from "./message-generator";
import { buildMessagePrompt, isCompleteTeacherMessage } from "./message-generator";

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
  const prompt = buildMessagePrompt(input);
  const first = await generateAiText(prompt, signal, 2000);
  if (isCompleteTeacherMessage(first)) return first;
  const retry = await generateAiText(`${prompt}\n\n[중요] 앞선 응답이 문장 중간에서 끝날 수 있습니다. 마지막 문장까지 완결된 메시지를 처음부터 다시 작성하세요.`, signal, 2000);
  if (!isCompleteTeacherMessage(retry)) {
    throw new AiServiceError("메시지가 완성되기 전에 중단되었습니다. 잠시 후 다시 생성해 주세요.", 502);
  }
  return retry;
}

export async function generateAiText(
  prompt: string,
  signal?: AbortSignal,
  maxOutputTokens = 2000,
): Promise<string> {
  try {
    const message = (await runReplicate({ prompt, max_completion_tokens: maxOutputTokens }, signal)).trim();
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
  maxOutputTokens = 4000,
): Promise<T> {
  const structuredPrompt = `${prompt}\n\n반드시 아래 JSON 스키마를 정확히 따르는 application/json 형식의 JSON 객체만 출력하세요. 코드블록, 설명 문장, 스키마 자체를 반환하지 마세요.\n${JSON.stringify(schema)}`;

  try {
    const text = (await runReplicate({ prompt: structuredPrompt, max_completion_tokens: maxOutputTokens }, signal)).trim();
    if (!text) throw new AiServiceError("생성된 결과가 비어 있습니다. 다시 시도해 주세요.", 502);
    let parsed: unknown;
    try { parsed = JSON.parse(extractJson(text)); }
    catch { throw new AiServiceError("AI 응답 형식을 확인할 수 없습니다. 다시 생성해 주세요.", 502); }
    const validated = validate(parsed);
    if (!validated) throw new AiServiceError("생성 결과의 구성이 올바르지 않습니다. 다시 생성해 주세요.", 502);
    return validated;
  } catch (error) {
    throw normalizeAiError(error);
  }
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: unknown;
  error?: unknown;
  urls: { get: string; cancel?: string };
};

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

async function runReplicate(
  input: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<string> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new AiServiceError("AI 서비스 설정이 완료되지 않았습니다.", 503);

  const model = process.env.REPLICATE_MODEL || "openai/gpt-5.6-terra";
  const authHeader = { Authorization: `Bearer ${token}` };

  const createResponse = await fetch(`${REPLICATE_API_BASE}/models/${model}/predictions`, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json", Prefer: "wait=60" },
    body: JSON.stringify({ input: { reasoning_effort: "none", ...input } }),
    signal,
  });

  let prediction = await readReplicatePrediction(createResponse);

  while (prediction.status === "starting" || prediction.status === "processing") {
    await sleep(1000);
    const pollResponse = await fetch(prediction.urls.get, { headers: authHeader, signal });
    prediction = await readReplicatePrediction(pollResponse);
  }

  // Replicate retains prediction input/output by default; delete it right away so
  // teacher/student content isn't kept on their servers longer than needed.
  fetch(prediction.urls.get, { method: "DELETE", headers: authHeader }).catch(() => undefined);

  if (prediction.status !== "succeeded") {
    const message = typeof prediction.error === "string" ? prediction.error : "생성에 실패했습니다.";
    throw new AiServiceError(message, 502);
  }

  const output = prediction.output;
  return Array.isArray(output) ? output.join("") : typeof output === "string" ? output : "";
}

async function readReplicatePrediction(response: Response): Promise<ReplicatePrediction> {
  const data = await response.json().catch(() => null) as (ReplicatePrediction & { detail?: string }) | null;
  if (!response.ok || !data) {
    const error = new Error(data?.detail || "replicate request failed") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAiError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) return error;
  if (error instanceof Error && error.name === "AbortError") return new AiServiceError("요청이 취소되었습니다. 다시 시도해 주세요.", 499);
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : 0;
  if (status === 429) return new AiServiceError("요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.", 429);
  if (status === 400 || status === 401 || status === 403) return new AiServiceError("AI 서비스 인증을 확인해 주세요.", 502);
  return new AiServiceError("AI 내용을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
}
