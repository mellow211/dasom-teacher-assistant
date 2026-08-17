import { AiServiceError } from "../../../lib/ai-service";
import { extractHandwrittenText } from "../../../lib/ocr-service";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Source image is capped at 3MB client-side; base64 inflates that ~33%, so allow headroom to ~4.1MB of encoded text.
const MAX_BASE64_LENGTH = Math.ceil((3 * 1024 * 1024) / 3) * 4 + 1000;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "요청 내용을 확인해 주세요." }, { status: 400 }); }
  const image = typeof body.image === "string" ? body.image : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  if (!image || !ALLOWED_TYPES.includes(mimeType)) return Response.json({ error: "지원하는 이미지 형식(JPG, PNG, WEBP, HEIC)의 사진을 올려 주세요." }, { status: 400 });
  if (image.length > MAX_BASE64_LENGTH) return Response.json({ error: "사진 용량은 3MB 이하만 가능합니다." }, { status: 413 });
  try {
    const text = await extractHandwrittenText(image, mimeType, request.signal);
    return Response.json({ text });
  } catch (error) {
    const status = error instanceof AiServiceError ? error.status : 500;
    const message = error instanceof AiServiceError ? error.message : "글씨를 인식하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return Response.json({ error: message }, { status });
  }
}
