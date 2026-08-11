import { AiServiceError, generateStructuredAiData } from "../../../lib/ai-service";
import { buildObservationPrompt, observationJsonSchema, RESULT_TYPES, selectStudentMemos, validateObservationMemo, validateObservationOutput, type ObservationMemo, type ObservationResultType } from "../../../lib/student-observation-organizer";

export async function POST(request:Request){
  let payload:unknown;try{payload=await request.json();}catch{return Response.json({error:"입력 내용을 확인해 주세요."},{status:400});}
  if(!payload||typeof payload!=="object")return Response.json({error:"입력 내용을 확인해 주세요."},{status:400});
  const raw=payload as Record<string,unknown>;const studentIdentifier=typeof raw.studentIdentifier==="string"?raw.studentIdentifier.trim():"";const resultType=raw.resultType as ObservationResultType;
  if(!studentIdentifier||!RESULT_TYPES.includes(resultType)||!Array.isArray(raw.memos))return Response.json({error:"정리할 학생과 결과 유형을 확인해 주세요."},{status:400});
  const memos:ObservationMemo[]=[];
  for(const [index,item] of raw.memos.entries()){const validation=validateObservationMemo(item);if(!validation.data)return Response.json({error:`${index+1}번째 메모의 필수값을 확인해 주세요.`},{status:400});memos.push({...validation.data,id:`request-${index}`});}
  const selected=selectStudentMemos(memos,studentIdentifier);if(!selected.length||selected.length!==memos.length)return Response.json({error:"선택한 학생의 메모만 전송해 주세요."},{status:400});
  try{const result=await generateStructuredAiData(buildObservationPrompt(studentIdentifier,selected,resultType),observationJsonSchema,value=>validateObservationOutput(value,selected,resultType),request.signal);return Response.json({result});}
  catch(error){const status=error instanceof AiServiceError?error.status:500;return Response.json({error:error instanceof AiServiceError?error.message:"관찰 기록을 정리하지 못했습니다. 잠시 후 다시 시도해 주세요."},{status});}
}
