export const OBSERVATION_CATEGORIES = ["학습 태도", "교우 관계", "생활 습관", "책임감", "의사소통", "학교생활", "기타"] as const;
export const RESULT_TYPES = ["상담·관찰 기록", "행동특성 및 종합의견 초안", "두 결과 모두 생성"] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];
export type ObservationMemo = {
  id: string; studentIdentifier: string; date: string; category: ObservationCategory;
  situation?: string; memo: string; teacherSupport?: string; subsequentChange?: string;
};
export type ObservationMemoErrors = Partial<Record<"studentIdentifier" | "date" | "memo", string>>;
export type ObservationResultType = (typeof RESULT_TYPES)[number];
export type OrganizedRecord = { date:string; category:string; situation:string; objectiveObservation:string; teacherSupport:string; subsequentChange:string };
export type ObservationResult = {
  studentIdentifier:string; organizedRecords:OrganizedRecord[]; repeatedStrengths:string[]; growthPoints:string[];
  behaviorCharacteristicsDraft:string; insufficientEvidenceNotice:string;
};

const clean=(value:unknown,max=2000)=>typeof value==="string"?value.trim().slice(0,max):"";
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00`));
export function validateObservationMemo(value:unknown):{data?:Omit<ObservationMemo,"id">;errors:ObservationMemoErrors}{
  if(!value||typeof value!=="object")return{errors:{memo:"관찰 메모를 입력해 주세요."}};
  const raw=value as Record<string,unknown>;const errors:ObservationMemoErrors={};
  if(!clean(raw.studentIdentifier,100))errors.studentIdentifier="학생 번호, 이니셜 또는 별칭을 입력해 주세요.";
  if(!validDate(clean(raw.date,10)))errors.date="관찰 날짜를 선택해 주세요.";
  if(!clean(raw.memo,3000))errors.memo="확인한 행동이나 상황을 입력해 주세요.";
  if(Object.keys(errors).length)return{errors};
  const category=OBSERVATION_CATEGORIES.includes(raw.category as ObservationCategory)?raw.category as ObservationCategory:"기타";
  return{errors,data:{studentIdentifier:clean(raw.studentIdentifier,100),date:clean(raw.date,10),category,situation:clean(raw.situation,1000)||undefined,memo:clean(raw.memo,3000),teacherSupport:clean(raw.teacherSupport,2000)||undefined,subsequentChange:clean(raw.subsequentChange,2000)||undefined}};
}
export const sortMemosByDate=(memos:ObservationMemo[],newest=false)=>[...memos].sort((a,b)=>newest?b.date.localeCompare(a.date):a.date.localeCompare(b.date));
export const selectStudentMemos=(memos:ObservationMemo[],studentIdentifier:string)=>sortMemosByDate(memos.filter(m=>m.studentIdentifier===studentIdentifier));
export const hasInsufficientEvidence=(memos:ObservationMemo[])=>memos.length<2||new Set(memos.map(m=>m.date)).size<2||new Set(memos.map(m=>m.category)).size<2;

const stringArray=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==="string");
export function validateObservationOutput(value:unknown,inputMemos:ObservationMemo[],resultType:ObservationResultType):ObservationResult|null{
  if(!value||typeof value!=="object")return null;const v=value as Record<string,unknown>;
  if(typeof v.studentIdentifier!=="string"||v.studentIdentifier!==inputMemos[0]?.studentIdentifier||!Array.isArray(v.organizedRecords)||!stringArray(v.repeatedStrengths)||!stringArray(v.growthPoints)||typeof v.behaviorCharacteristicsDraft!=="string"||typeof v.insufficientEvidenceNotice!=="string")return null;
  if(resultType!=="행동특성 및 종합의견 초안"&&v.organizedRecords.length!==inputMemos.length)return null;
  const records:OrganizedRecord[]=[];
  for(const [i,item] of v.organizedRecords.entries()){if(!item||typeof item!=="object")return null;const r=item as Record<string,unknown>;if(typeof r.date!=="string"||typeof r.category!=="string"||typeof r.situation!=="string"||typeof r.objectiveObservation!=="string"||typeof r.teacherSupport!=="string"||typeof r.subsequentChange!=="string")return null;if(r.date!==inputMemos[i]?.date||r.category!==inputMemos[i]?.category)return null;records.push(r as OrganizedRecord);}
  if(resultType==="상담·관찰 기록"&&v.behaviorCharacteristicsDraft!=="")return null;
  if(resultType==="행동특성 및 종합의견 초안"&&v.organizedRecords.length!==0)return null;
  return{studentIdentifier:v.studentIdentifier,organizedRecords:records,repeatedStrengths:v.repeatedStrengths,growthPoints:v.growthPoints,behaviorCharacteristicsDraft:v.behaviorCharacteristicsDraft,insufficientEvidenceNotice:v.insufficientEvidenceNotice};
}

export const observationJsonSchema:Record<string,unknown>={type:"object",additionalProperties:false,properties:{studentIdentifier:{type:"string"},organizedRecords:{type:"array",items:{type:"object",additionalProperties:false,properties:{date:{type:"string"},category:{type:"string"},situation:{type:"string"},objectiveObservation:{type:"string"},teacherSupport:{type:"string"},subsequentChange:{type:"string"}},required:["date","category","situation","objectiveObservation","teacherSupport","subsequentChange"]}},repeatedStrengths:{type:"array",items:{type:"string"}},growthPoints:{type:"array",items:{type:"string"}},behaviorCharacteristicsDraft:{type:"string"},insufficientEvidenceNotice:{type:"string"}},required:["studentIdentifier","organizedRecords","repeatedStrengths","growthPoints","behaviorCharacteristicsDraft","insufficientEvidenceNotice"]};

export function buildObservationPrompt(studentIdentifier:string,memos:ObservationMemo[],resultType:ObservationResultType):string{
  const safe=selectStudentMemos(memos,studentIdentifier).map(({date,category,situation,memo,teacherSupport,subsequentChange})=>({date,category,situation:situation||"",memo,teacherSupport:teacherSupport||"",subsequentChange:subsequentChange||""}));
  return `선택한 한 학생의 관찰 메모만 객관적인 교사 기록 초안으로 정리하세요.\n학생 식별명: ${studentIdentifier}\n결과 유형: ${resultType}\n관찰 메모(JSON): ${JSON.stringify(safe)}\n[작성 원칙]\n- 입력된 기록만 사용하고 행동, 사건, 감정, 동기, 결과를 만들지 마세요. 날짜와 관찰 영역을 바꾸지 마세요.\n- 성격이나 의도를 추측하거나 학생을 단정·낙인찍지 말고 관찰 가능한 행동을 중심으로 쓰세요.\n- 건강, 장애, 심리, 가정환경, 경제 상황을 추측·진단하지 마세요. 점수, 등급, 위험도, 학생 비교를 만들지 마세요.\n- 메모 속 다른 학생의 이름은 '다른 학생' 또는 '친구'로 익명화하세요.\n- 부정적 행동은 상황, 행동, 교사의 지원, 변화 순으로 객관적으로 정리하고 비난하지 마세요.\n- 반복 확인되지 않은 행동을 일반 특성으로 확대하지 말고, 상충하는 기록은 상황에 따른 서로 다른 모습으로 표현하세요.\n- 행동특성 초안은 반복 근거가 있는 내용만 긍정적·성장 중심으로 쓰며 근거 없는 영역은 채우지 마세요. 징계·진단·상담 의뢰를 자동 제안하지 마세요.\n- 빈 입력 항목은 빈 문자열로 반환하고 임의로 채우지 마세요. 기록이 부족하면 insufficientEvidenceNotice에 '관찰 자료가 충분하지 않아 학생의 전반적인 특성을 판단하기 어려울 수 있습니다.'를 넣으세요.\n- 결과 유형이 상담·관찰 기록이면 organizedRecords만 채우고 behaviorCharacteristicsDraft는 빈 문자열로, 행동특성 초안이면 organizedRecords는 빈 배열로, 두 결과 모두면 둘 다 채우세요.\n- organizedRecords는 입력과 같은 날짜 오름차순이며 날짜·영역·개수가 정확히 일치해야 합니다. 결과는 교사가 사실관계를 확인하고 수정해야 하는 초안입니다.`;
}
