import { AiServiceError } from "./ai-service";

const OCR_PROMPT = "다음 이미지 속 학생이 손으로 쓴 한국어 글을 최대한 정확하게 그대로 옮겨 적으세요. 맞춤법, 띄어쓰기, 문장부호를 고치거나 정리하지 말고 원문에 쓰인 그대로 옮기세요. 읽을 수 없는 글자나 단어는 [판독 불가]로 표시하세요. 인사말이나 설명, 따옴표 없이 옮겨 적은 글 내용만 출력하세요.";

export async function extractHandwrittenText(base64Image: string, mimeType: string, signal?: AbortSignal): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiServiceError("OCR 서비스 설정이 완료되지 않았습니다.", 503);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: OCR_PROMPT }, { inline_data: { mime_type: mimeType, data: base64Image } }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2000 },
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new AiServiceError("요청이 취소되었습니다. 다시 시도해 주세요.", 499);
    throw new AiServiceError("글씨를 인식하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }

  const data = await response.json().catch(() => null) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } } | null;
  if (!response.ok || !data) {
    if (response.status === 429) throw new AiServiceError("요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.", 429);
    throw new AiServiceError("글씨를 인식하지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }

  const text = (data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "").trim();
  if (!text) throw new AiServiceError("사진에서 글자를 찾지 못했습니다. 더 선명한 사진으로 다시 시도해 주세요.", 422);
  return text;
}
