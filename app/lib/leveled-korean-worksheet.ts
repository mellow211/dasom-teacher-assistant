import { KOREAN_ACTIVITY_TYPES, KOREAN_WORKSHEET_AREAS, KOREAN_WORKSHEET_LEVELS, STUDENT_LEVEL_TITLES, type KoreanActivityType, type KoreanWorksheetArea, type KoreanWorksheetLevel } from "./korean-worksheet-config.ts";
import { CURRICULUM_SEMESTERS, findCurriculumSession, formatStandards } from "./korean-curriculum-1.ts";

export type KoreanWorksheetSelection = {
  semester: (typeof CURRICULUM_SEMESTERS)[number]; unit: string; topic: string; additionalRequest?: string;
  areas: KoreanWorksheetArea[]; levels: KoreanWorksheetLevel[]; itemCount: 3 | 5 | 7 | 10; pages: 1 | 2;
  composition: "선택형 중심" | "쓰기 활동 중심" | "선택형·쓰기 활동 혼합"; fontSize: "크게" | "보통"; spacing: "넓게" | "보통";
};
export type KoreanWorksheetInput = KoreanWorksheetSelection & {
  achievementStandard: string; currentSession: number; totalSessions: number; textbookName: string; textbookPages: string;
};
export type KoreanWorksheetErrors = Partial<Record<keyof KoreanWorksheetInput, string>>;
export type WorksheetItem = { id:string; type:KoreanActivityType; prompt:string; sourceText:string; options:string[]; correctAnswer:string; acceptedAnswers:string[]; sampleAnswer:string; explanation:string; scaffold:string; writingLines:number };
export type LevelWorksheet = { level:KoreanWorksheetLevel; studentTitle:string; shortDescription:string; instructions:string; items:WorksheetItem[] };
export type TeacherAnswer = { level:KoreanWorksheetLevel; itemId:string; answer:string; acceptedAnswers:string[]; explanation:string };
export type TeacherGuide = { commonLearningGoal:string; levelDifferences:string[]; teachingTips:string[]; answerKey:TeacherAnswer[] };
export type WorksheetSet = { title:string; grade:"1학년"; subject:"국어"; semester:KoreanWorksheetInput["semester"]; unit:string; topic:string; achievementStandard:string; learningGoal:string; levels:LevelWorksheet[]; teacherGuide:TeacherGuide };

const clean=(v:unknown,max=5000)=>typeof v==="string"?v.trim().slice(0,max):"";
const includes=<T extends string>(a:readonly T[],v:unknown):v is T=>typeof v==="string"&&a.includes(v as T);
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==="string");

export function validateKoreanWorksheetInput(value:unknown):{data?:KoreanWorksheetInput;errors:KoreanWorksheetErrors}{
  if(!obj(value))return{errors:{topic:"학습 정보를 확인해 주세요."}};const errors:KoreanWorksheetErrors={};
  if(!includes(CURRICULUM_SEMESTERS,value.semester))errors.semester="학기를 선택해 주세요.";
  if(!clean(value.unit,300))errors.unit="단원을 선택해 주세요.";
  if(!clean(value.topic,500))errors.topic="차시 주제를 선택해 주세요.";
  const areas=Array.isArray(value.areas)?[...new Set(value.areas.filter(x=>includes(KOREAN_WORKSHEET_AREAS,x)))]:[];if(!areas.length)errors.areas="학습 영역을 한 개 이상 선택해 주세요.";
  const levels=Array.isArray(value.levels)?[...new Set(value.levels.filter(x=>includes(KOREAN_WORKSHEET_LEVELS,x)))]:[];if(!levels.length)errors.levels="생성할 수준을 선택해 주세요.";
  if(![3,5,7,10].includes(Number(value.itemCount)))errors.itemCount="문제 수를 선택해 주세요.";if(![1,2].includes(Number(value.pages)))errors.pages="활동지 분량을 선택해 주세요.";
  if(!includes(["선택형 중심","쓰기 활동 중심","선택형·쓰기 활동 혼합"] as const,value.composition))errors.composition="문제 구성을 선택해 주세요.";
  if(!includes(["크게","보통"] as const,value.fontSize))errors.fontSize="글자 크기를 선택해 주세요.";if(!includes(["넓게","보통"] as const,value.spacing))errors.spacing="문제 간격을 선택해 주세요.";
  if(Object.keys(errors).length)return{errors};
  const session=includes(CURRICULUM_SEMESTERS,value.semester)?findCurriculumSession(value.semester,clean(value.unit,300),clean(value.topic,500)):undefined;
  if(!session)return{errors:{topic:"단원과 차시 주제를 다시 선택해 주세요."}};
  return{errors,data:{semester:value.semester as KoreanWorksheetInput["semester"],unit:session.unit,topic:session.topic,achievementStandard:formatStandards(session.standardCodes),currentSession:session.currentSession,totalSessions:session.totalSessions,textbookName:session.textbookName,textbookPages:session.textbookPages,additionalRequest:clean(value.additionalRequest,1000)||undefined,areas:areas as KoreanWorksheetArea[],levels:levels as KoreanWorksheetLevel[],itemCount:Number(value.itemCount) as 3|5|7|10,pages:Number(value.pages) as 1|2,composition:value.composition as KoreanWorksheetInput["composition"],fontSize:value.fontSize as KoreanWorksheetInput["fontSize"],spacing:value.spacing as KoreanWorksheetInput["spacing"]}};
}

export function validateKoreanWorksheetOutput(value:unknown,input:KoreanWorksheetInput,requestedLevel:KoreanWorksheetLevel):WorksheetSet|null{
  if(!obj(value)||typeof value.title!=="string"||value.grade!=="1학년"||value.subject!=="국어"||value.semester!==input.semester||typeof value.learningGoal!=="string"||!value.learningGoal.trim()||!Array.isArray(value.levels)||value.levels.length!==1||!obj(value.teacherGuide))return null;
  const level=value.levels[0];if(!obj(level)||level.level!==requestedLevel||typeof level.studentTitle!=="string"||/(보충|기본|심화|낮은 수준|수준이 낮)/.test(level.studentTitle)||typeof level.shortDescription!=="string"||typeof level.instructions!=="string"||!Array.isArray(level.items)||level.items.length!==input.itemCount)return null;
  const ids=new Set<string>();for(const item of level.items){if(!obj(item)||typeof item.id!=="string"||!item.id||ids.has(item.id)||!includes(KOREAN_ACTIVITY_TYPES,item.type)||typeof item.prompt!=="string"||!item.prompt.trim()||typeof item.sourceText!=="string"||!strings(item.options)||typeof item.correctAnswer!=="string"||!strings(item.acceptedAnswers)||typeof item.sampleAnswer!=="string"||typeof item.explanation!=="string"||typeof item.scaffold!=="string"||!Number.isInteger(item.writingLines)||Number(item.writingLines)<0||Number(item.writingLines)>8)return null;const typed=item as unknown as WorksheetItem;ids.add(typed.id);if(typed.options.length&&(!typed.correctAnswer||typed.options.filter(x=>x===typed.correctAnswer).length!==1))return null;if(typed.sourceText&&typed.correctAnswer&&!typed.sourceText.includes(typed.correctAnswer)&&!typed.acceptedAnswers.some(x=>typed.sourceText.includes(x)))return null;}
  const studentFacing=[level.studentTitle,level.shortDescription,level.instructions,...level.items.flatMap((item:unknown)=>obj(item)?[item.prompt,item.scaffold]:[])].join(" ");if(/(보충반|기본반|심화반|낮은 수준|수준이 낮)/.test(studentFacing))return null;if(requestedLevel==="보충"&&!level.items.some((item:unknown)=>obj(item)&&((typeof item.scaffold==="string"&&item.scaffold.trim())||(Array.isArray(item.options)&&item.options.length))))return null;
  const guide=value.teacherGuide;if(guide.commonLearningGoal!==value.learningGoal||!strings(guide.levelDifferences)||!strings(guide.teachingTips)||!Array.isArray(guide.answerKey)||guide.answerKey.length!==level.items.length)return null;
  for(const answer of guide.answerKey){if(!obj(answer)||answer.level!==requestedLevel||typeof answer.itemId!=="string"||!ids.has(answer.itemId)||typeof answer.answer!=="string"||!strings(answer.acceptedAnswers)||typeof answer.explanation!=="string")return null;const item=level.items.find((x:unknown)=>obj(x)&&x.id===answer.itemId) as Record<string,unknown>|undefined;if(!item||answer.answer!==item.correctAnswer)return null;}
  return value as WorksheetSet;
}

const stringArray={type:"array",items:{type:"string"}};
const worksheetItemSchema={type:"object",additionalProperties:false,properties:{id:{type:"string"},type:{type:"string",enum:KOREAN_ACTIVITY_TYPES},prompt:{type:"string"},sourceText:{type:"string"},options:stringArray,correctAnswer:{type:"string"},acceptedAnswers:stringArray,sampleAnswer:{type:"string"},explanation:{type:"string"},scaffold:{type:"string"},writingLines:{type:"integer",minimum:0,maximum:8}},required:["id","type","prompt","sourceText","options","correctAnswer","acceptedAnswers","sampleAnswer","explanation","scaffold","writingLines"]};
const levelSchema={type:"object",additionalProperties:false,properties:{level:{type:"string",enum:KOREAN_WORKSHEET_LEVELS},studentTitle:{type:"string"},shortDescription:{type:"string"},instructions:{type:"string"},items:{type:"array",items:worksheetItemSchema}},required:["level","studentTitle","shortDescription","instructions","items"]};
const answerSchema={type:"object",additionalProperties:false,properties:{level:{type:"string",enum:KOREAN_WORKSHEET_LEVELS},itemId:{type:"string"},answer:{type:"string"},acceptedAnswers:stringArray,explanation:{type:"string"}},required:["level","itemId","answer","acceptedAnswers","explanation"]};
export const koreanWorksheetJsonSchema:Record<string,unknown>={
  type:"object",additionalProperties:false,
  properties:{title:{type:"string"},grade:{type:"string",enum:["1학년"]},subject:{type:"string",enum:["국어"]},semester:{type:"string",enum:["1학기","2학기"]},unit:{type:"string"},topic:{type:"string"},achievementStandard:{type:"string"},learningGoal:{type:"string"},levels:{type:"array",minItems:1,maxItems:1,items:levelSchema},teacherGuide:{type:"object",additionalProperties:false,properties:{commonLearningGoal:{type:"string"},levelDifferences:stringArray,teachingTips:stringArray,answerKey:{type:"array",items:answerSchema}},required:["commonLearningGoal","levelDifferences","teachingTips","answerKey"]}},
  required:["title","grade","subject","semester","unit","topic","achievementStandard","learningGoal","levels","teacherGuide"]
};

export function buildKoreanWorksheetPrompt(input:KoreanWorksheetInput,level:KoreanWorksheetLevel,excludePrompts:string[]=[]){const title=STUDENT_LEVEL_TITLES[level];const rule=level==="보충"?"짧은 지시, 한 문제 한 과제, 예시·보기·따라 쓰기·연결하기, 최소 읽기와 넓은 쓰기 공간":level==="기본"?"차시 핵심 목표, 낱말·짧은 문장, 선택형과 간단한 쓰기의 균형, 기본 적용": "같은 내용을 새 상황에 적용, 짧은 문장 완성·이유 표현·순서와 관계·근거 찾기. 1학년을 넘는 긴 글쓰기나 추상 논술 금지";return `초등학교 1학년 국어 ${level} 활동지 한 종류를 구조화된 데이터로 작성하세요.\n[고정] grade=1학년, subject=국어, level=${level}, studentTitle=${title}\n[입력 - 국정 교육과정 진도표에서 가져온 값] 학기=${input.semester}, 단원=${input.unit}, 차시 주제=${input.topic}, 차시=${input.currentSession}/${input.totalSessions}차시, 성취기준(문구 그대로)=${input.achievementStandard}, 교과서=${input.textbookName} ${input.textbookPages}쪽, 영역=${input.areas.join(", ")}, 문제 구성=${input.composition}, 문제 수=${input.itemCount}, 교사의 추가 요청=${input.additionalRequest||"입력 없음"}\n[학습 목표와 핵심 내용] 이번 차시의 학습 목표와 핵심 내용은 별도로 입력되지 않았으니 성취기준과 차시 주제, 선택한 영역을 근거로 이 학년 수준에 알맞게 직접 판단해 learningGoal에 작성하세요. 교사의 추가 요청이 있다면 그 판단에 최우선으로 반영하세요.\n[제시문] 문항에 제시문이 필요하면 특정 교과서 원문처럼 보이지 않는 짧은 1학년 수준 예시를 문항의 sourceText로 직접 만드세요. 실제 교과서 원문을 아는 것처럼 꾸미지 마세요.\n[수준 원칙] ${rule}\n[공통 원칙] 모든 문제는 학습 목표와 선택 영역에 맞아야 합니다. 지원 유형은 ${KOREAN_ACTIVITY_TYPES.join(", ")} 중에서만 고르세요. 그림·음성·손글씨 인식·긴 서술·교과서 삽화는 요구하지 마세요. 지시문과 보기는 짧게 쓰고 객관식 정답은 보기에 정확히 한 번 포함하세요. 학생 개인정보, 점수, 반 이름, 수준 낙인 표현을 쓰지 마세요. 입력된 학기·단원·차시 주제·성취기준·차시·교과서 정보는 한 글자도 바꾸지 마세요. 제시문 기반 문항은 sourceText에 사용한 원문 일부를 정확히 넣고 답을 그 안에서 확인할 수 있어야 합니다. 제시문 맞춤법과 문장부호를 고치지 마세요. 창의 답은 sampleAnswer와 acceptedAnswers로 허용 기준을 제시하세요. 정답·해설은 일치해야 합니다. 듣기·말하기 영역이면 teachingTips에 교사가 읽을 말이나 진행 방법을 포함하세요. item id는 ${level}-1부터 순서대로 고유하게 만드세요. 학생 제목과 설명에는 보충·기본·심화 또는 낮은 수준 같은 내부 수준명을 쓰지 마세요. teacherGuide.answerKey는 모든 문항과 같은 id·정답을 순서대로 포함하세요.${excludePrompts.length?` 다음 기존 문제와 겹치지 않게 만드세요: ${excludePrompts.join(" / ")}`:""}`;}

export function combineWorksheetSets(parts:WorksheetSet[]):WorksheetSet{const levels=parts.flatMap(x=>x.levels);return{...parts[0],levels,teacherGuide:{commonLearningGoal:parts[0].learningGoal,levelDifferences:parts.flatMap(x=>x.teacherGuide.levelDifferences),teachingTips:[...new Set(parts.flatMap(x=>x.teacherGuide.teachingTips))],answerKey:parts.flatMap(x=>x.teacherGuide.answerKey)}};}

export function formatWorksheetSetText(set:WorksheetSet):string{
  return [set.title,`학년·교과: ${set.grade} ${set.subject}`,`학기: ${set.semester}`,`단원·차시 주제: ${set.unit} ${set.topic}`,`성취기준: ${set.achievementStandard}`,`학습 목표: ${set.learningGoal}`,
  ...set.levels.flatMap(level=>[`\n[${level.level} · ${level.studentTitle}]`,level.shortDescription,level.instructions,...level.items.map((item,i)=>`${i+1}. ${item.prompt}${item.options.length?` (보기: ${item.options.join(" / ")})`:""}`)]),
  "\n[교사용 지도 가이드]",`공통 학습 목표: ${set.teacherGuide.commonLearningGoal}`,...set.teacherGuide.levelDifferences.map(x=>`- ${x}`),"지도 팁: "+set.teacherGuide.teachingTips.join(" / "),
  "\n[정답표]",...set.teacherGuide.answerKey.map(a=>`${a.level} ${a.itemId}: ${a.answer}`)].join("\n");
}

export function printableWorksheetIssues(set:WorksheetSet):string[]{const issues:string[]=[];for(const level of set.levels){if(/(보충|기본|심화|낮은 수준)/.test(level.studentTitle))issues.push(`${level.level} 학생용 제목에 내부 수준명이 포함되어 있습니다.`);const ids=new Set<string>();for(const [index,item] of level.items.entries()){if(!item.prompt.trim())issues.push(`${level.level} ${index+1}번 문제 내용이 비어 있습니다.`);if(ids.has(item.id))issues.push(`${level.level} 문항 번호가 중복되었습니다.`);ids.add(item.id);if(item.options.length&&(!item.correctAnswer||!item.options.includes(item.correctAnswer)))issues.push(`${level.level} ${index+1}번 정답이 보기에 없습니다.`)}}return issues;}
