import { AiServiceError, generateAiText } from "../../../lib/ai-service";
import { buildNewsletterPrompt, buildNewsletterRevisionPrompt, normalizeNewsletterOutput, validateNewsletterInput } from "../../../lib/newsletter-generator";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 }); }

  const body = payload as Record<string, unknown>;
  if (body.action === "revise") {
    const previousResult = typeof body.previousResult === "string" ? body.previousResult.trim().slice(0, 8000) : "";
    const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 500) : "";
    if (!previousResult) return Response.json({ error: "수정할 가정통신문 내용이 없습니다." }, { status: 400 });
    if (!instruction) return Response.json({ error: "어떻게 수정할지 요청 내용을 입력해 주세요." }, { status: 400 });
    try {
      const newsletter = normalizeNewsletterOutput(await generateAiText(buildNewsletterRevisionPrompt(previousResult, instruction), request.signal));
      return Response.json({ newsletter });
    } catch (error) {
      const status = error instanceof AiServiceError ? error.status : 500;
      const message = error instanceof AiServiceError ? error.message : "가정통신문을 수정하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      return Response.json({ error: message }, { status });
    }
  }

  const validation = validateNewsletterInput(payload);
  if (!validation.data) return Response.json({ error: "필수 입력값을 확인해 주세요.", fields: validation.errors }, { status: 400 });

  try {
    const newsletter = normalizeNewsletterOutput(await generateAiText(buildNewsletterPrompt(validation.data), request.signal));
    return Response.json({ newsletter });
  } catch (error) {
    const status = error instanceof AiServiceError ? error.status : 500;
    const message = error instanceof AiServiceError ? error.message : "가정통신문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return Response.json({ error: message }, { status });
  }
}
