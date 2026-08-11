import { AiServiceError, generateAiText } from "../../../lib/ai-service";
import { buildNewsletterPrompt, validateNewsletterInput } from "../../../lib/newsletter-generator";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 }); }

  const validation = validateNewsletterInput(payload);
  if (!validation.data) return Response.json({ error: "필수 입력값을 확인해 주세요.", fields: validation.errors }, { status: 400 });

  try {
    const newsletter = await generateAiText(buildNewsletterPrompt(validation.data), request.signal);
    return Response.json({ newsletter });
  } catch (error) {
    const status = error instanceof AiServiceError ? error.status : 500;
    const message = error instanceof AiServiceError ? error.message : "가정통신문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return Response.json({ error: message }, { status });
  }
}
