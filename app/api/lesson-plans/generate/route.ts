import { AiServiceError, generateStructuredAiData } from "../../../lib/ai-service";
import { buildLessonPlanPrompt, lessonPlanJsonSchema, validateLessonPlanInput, validateLessonPlanOutput } from "../../../lib/lesson-plan-generator";

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return Response.json({ error: "수업 정보를 확인해 주세요." }, { status: 400 }); }
  const validation = validateLessonPlanInput(payload);
  if (!validation.data) return Response.json({ error: "필수 입력값을 확인해 주세요.", fields: validation.errors }, { status: 400 });
  const input = validation.data;
  try {
    const create = () => generateStructuredAiData(buildLessonPlanPrompt(input), lessonPlanJsonSchema, value => validateLessonPlanOutput(value,input), request.signal, 8000);
    let plan;
    try { plan = await create(); }
    catch (error) { if (!(error instanceof AiServiceError) || error.status !== 502) throw error; plan = await create(); }
    return Response.json({ plan, overview: { grade:input.grade, subject:input.subject, semester:input.semester, unit:input.unit, topic:input.topic, session:`${input.currentSession}/${input.totalSessions}차시`, textbook:[input.textbookName,input.textbookPages].filter(Boolean).join(" · ")||"입력 없음", achievementStandard:input.achievementStandard } });
  } catch (error) {
    const status=error instanceof AiServiceError?error.status:500;
    const message=error instanceof AiServiceError?error.message:"지도안을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    return Response.json({ error:message },{status});
  }
}
