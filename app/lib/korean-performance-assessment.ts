import { ASSESSMENT_METHODS, ASSESSMENT_MODES, ASSESSMENT_TIMINGS, DEFAULT_LEVEL_NAMES, PERFORMANCE_DOMAINS, type AssessmentMethod, type AssessmentMode, type AssessmentTiming, type PerformanceDomain } from "./korean-performance-config.ts";
import { CURRICULUM_SEMESTERS, findCurriculumSession, formatStandards } from "./korean-curriculum-1.ts";

export type ScoreMode = "성취수준만 사용" | "점수와 성취수준 함께 사용";
export type PerformanceAssessmentSelection = {
  semester: (typeof CURRICULUM_SEMESTERS)[number]; unit: string; topic: string; additionalRequest?: string;
  methods: AssessmentMethod[]; mode: AssessmentMode; durationMinutes: number; timing: AssessmentTiming; customTiming?: string;
  levelCount: 3 | 4; levelNames: string[]; scoreMode: ScoreMode; totalScore?: number;
};
export type PerformanceAssessmentInput = PerformanceAssessmentSelection & {
  achievementStandard: string; domain: PerformanceDomain; currentSession: number; totalSessions: number; textbookName: string; textbookPages: string;
};
export type PerformanceAssessmentErrors = Partial<Record<keyof PerformanceAssessmentInput,string>>;
export type AssessmentTask = { id:string; instruction:string; answerSpaceLines:number };
export type RubricLevel = { levelName:string; description:string; score:number };
export type RubricCriterion = { criterionId:string; assessmentElement:string; observableEvidence:string; maxScore:number; levels:RubricLevel[] };
export type PerformanceAssessment = {
  title:string;
  overview:{grade:"1학년";subject:"국어";semester:string;unit:string;topic:string;domain:PerformanceDomain;achievementStandard:string;learningGoal:string;assessmentElements:string[];assessmentMethods:AssessmentMethod[];timing:string;duration:number;materials:string[]};
  studentTask:{situation:string;instruction:string;steps:string[];expectedProduct:string;reminders:string[];observableElements:string[]};
  studentWorksheet:{introduction:string;sourceText:string;tasks:AssessmentTask[];selfAssessment:string[]};
  teacherGuide:{intent:string;preparation:string[];procedure:string[];observableBehaviors:string[];estimatedMinutes:number;cautions:string[];support:string[];sampleAnswers:Array<{taskId:string;answer:string}>};
  rubric:RubricCriterion[];
  observationChecklist:Array<{criterionId:string;observableBehavior:string;recordType:string}>;
  feedbackTemplates:{strengths:string[];nextSteps:string[];practice:string[]};
};

const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const clean=(v:unknown,max=5000)=>typeof v==="string"?v.trim().slice(0,max):"";
const includes=<T extends string>(a:readonly T[],v:unknown):v is T=>typeof v==="string"&&a.includes(v as T);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==="string"&&x.trim().length>0);
const positive=(v:unknown)=>Number.isInteger(v)&&Number(v)>0;

const DOMAIN_BY_PREFIX:Record<string,PerformanceDomain>={"01":"듣기·말하기","02":"읽기","03":"쓰기","04":"문법","05":"문학","06":"매체"};
export function domainForStandardCodes(codes:string[]):PerformanceDomain{
  const domains=[...new Set(codes.map(c=>DOMAIN_BY_PREFIX[c.split("-")[0]]).filter(Boolean))];
  return domains.length===1?domains[0]:"영역 통합";
}

export function validatePerformanceAssessmentInput(value:unknown):{data?:PerformanceAssessmentInput;errors:PerformanceAssessmentErrors}{
  if(!obj(value))return{errors:{topic:"평가 기본 정보를 확인해 주세요."}};const errors:PerformanceAssessmentErrors={};
  if(!includes(CURRICULUM_SEMESTERS,value.semester))errors.semester="학기를 선택해 주세요.";
  if(!clean(value.unit,300))errors.unit="단원을 선택해 주세요.";
  if(!clean(value.topic,500))errors.topic="차시 주제를 선택해 주세요.";
  const methods=Array.isArray(value.methods)?[...new Set(value.methods.filter(x=>includes(ASSESSMENT_METHODS,x)))]:[];if(!methods.length)errors.methods="평가 방법을 한 개 이상 선택해 주세요.";
  if(!includes(ASSESSMENT_MODES,value.mode))errors.mode="평가 방식을 선택해 주세요.";if(!positive(value.durationMinutes))errors.durationMinutes="평가 시간은 1분 이상의 정수로 입력해 주세요.";
  if(!includes(ASSESSMENT_TIMINGS,value.timing))errors.timing="평가 실시 시기를 선택해 주세요.";if(value.timing==="직접 입력"&&!clean(value.customTiming,100))errors.customTiming="평가 실시 시기를 입력해 주세요.";
  const levelCount=value.levelCount===4?4:3;const names=Array.isArray(value.levelNames)?value.levelNames.map(x=>clean(x,30)):[];if(names.length!==levelCount||names.some(x=>!x)||new Set(names).size!==names.length)errors.levelNames=`서로 다른 ${levelCount}개 수준 명칭을 입력해 주세요.`;
  if(value.scoreMode!=="성취수준만 사용"&&value.scoreMode!=="점수와 성취수준 함께 사용")errors.scoreMode="평가 결과 방식을 선택해 주세요.";
  const totalScore=Number(value.totalScore);
  if(value.scoreMode==="점수와 성취수준 함께 사용"&&!positive(totalScore))errors.totalScore="총점을 1 이상의 정수로 입력해 주세요.";
  if(Object.keys(errors).length)return{errors};
  const session=includes(CURRICULUM_SEMESTERS,value.semester)?findCurriculumSession(value.semester,clean(value.unit,300),clean(value.topic,500)):undefined;
  if(!session)return{errors:{topic:"단원과 차시 주제를 다시 선택해 주세요."}};
  return{errors,data:{semester:value.semester as PerformanceAssessmentInput["semester"],unit:session.unit,topic:session.topic,achievementStandard:formatStandards(session.standardCodes),domain:domainForStandardCodes(session.standardCodes),currentSession:session.currentSession,totalSessions:session.totalSessions,textbookName:session.textbookName,textbookPages:session.textbookPages,additionalRequest:clean(value.additionalRequest,1000)||undefined,methods:methods as AssessmentMethod[],mode:value.mode as AssessmentMode,durationMinutes:Number(value.durationMinutes),timing:value.timing as AssessmentTiming,customTiming:clean(value.customTiming,100)||undefined,levelCount,levelNames:names,scoreMode:value.scoreMode as ScoreMode,totalScore:value.scoreMode==="점수와 성취수준 함께 사용"?totalScore:undefined}};
}

const forbidden=/(매우 우수함|대체로 잘함|부족함|열심히 참여함|태도가 좋음|지능|성격)/;
export function validatePerformanceAssessmentOutput(value:unknown,input:PerformanceAssessmentInput):PerformanceAssessment|null{
  if(!obj(value)||typeof value.title!=="string"||!obj(value.overview)||!obj(value.studentTask)||!obj(value.studentWorksheet)||!obj(value.teacherGuide)||!obj(value.feedbackTemplates))return null;const o=value.overview;
  if(o.grade!=="1학년"||o.subject!=="국어"||o.semester!==input.semester||o.unit!==input.unit||o.topic!==input.topic||o.domain!==input.domain||o.achievementStandard!==input.achievementStandard||typeof o.learningGoal!=="string"||!o.learningGoal.trim()||!strings(o.assessmentElements)||o.assessmentElements.length<1||o.assessmentElements.length>3||new Set(o.assessmentElements).size!==o.assessmentElements.length||!Array.isArray(o.assessmentMethods)||!input.methods.every(x=>(o.assessmentMethods as unknown[]).includes(x))||o.duration!==input.durationMinutes||!strings(o.materials))return null;
  const elements=o.assessmentElements as string[];
  const task=value.studentTask;if(!strings(task.steps)||!strings(task.reminders)||!strings(task.observableElements)||task.observableElements.length<elements.length||typeof task.situation!=="string"||typeof task.instruction!=="string"||typeof task.expectedProduct!=="string")return null;
  const sw=value.studentWorksheet;if(typeof sw.introduction!=="string"||typeof sw.sourceText!=="string"||!Array.isArray(sw.tasks)||!Array.isArray(sw.selfAssessment)||(input.methods.some(x=>x==="자기평가"||x==="동료평가")&&sw.selfAssessment.length===0))return null;const taskIds=new Set<string>();for(const item of sw.tasks){if(!obj(item)||typeof item.id!=="string"||!item.id||taskIds.has(item.id)||typeof item.instruction!=="string"||!item.instruction.trim()||!Number.isInteger(item.answerSpaceLines)||Number(item.answerSpaceLines)<1||Number(item.answerSpaceLines)>12)return null;taskIds.add(item.id)}
  const guide=value.teacherGuide;if(typeof guide.intent!=="string"||!strings(guide.preparation)||!strings(guide.procedure)||!strings(guide.observableBehaviors)||guide.estimatedMinutes!==input.durationMinutes||!strings(guide.cautions)||!strings(guide.support)||!Array.isArray(guide.sampleAnswers))return null;for(const a of guide.sampleAnswers){if(!obj(a)||typeof a.taskId!=="string"||!taskIds.has(a.taskId)||typeof a.answer!=="string")return null}
  if(!Array.isArray(value.rubric)||value.rubric.length!==elements.length)return null;const criterionIds=new Set<string>();const useScore=input.scoreMode==="점수와 성취수준 함께 사용";let scoreSum=0;
  for(const [i,item] of value.rubric.entries()){
    if(!obj(item)||item.criterionId!==`E${i+1}`||item.assessmentElement!==elements[i]||typeof item.observableEvidence!=="string"||!item.observableEvidence.trim()||forbidden.test(item.observableEvidence)||!Array.isArray(item.levels)||item.levels.length!==input.levelCount)return null;
    if(!Number.isInteger(item.maxScore)||(useScore?Number(item.maxScore)<1:Number(item.maxScore)!==0))return null;
    const max=Number(item.maxScore);let previous=-1;
    for(const [n,l] of item.levels.entries()){if(!obj(l)||l.levelName!==input.levelNames[n]||typeof l.description!=="string"||!l.description.trim()||forbidden.test(l.description)||!Number.isInteger(l.score)||Number(l.score)<previous||Number(l.score)>max)return null;previous=Number(l.score)}
    if(useScore&&previous!==max)return null;
    scoreSum+=max;criterionIds.add(item.criterionId as string);
  }
  if(useScore&&scoreSum!==input.totalScore)return null;
  if(!Array.isArray(value.observationChecklist)||value.observationChecklist.length<elements.length)return null;for(const item of value.observationChecklist){if(!obj(item)||typeof item.criterionId!=="string"||!criterionIds.has(item.criterionId)||typeof item.observableBehavior!=="string"||!item.observableBehavior.trim()||forbidden.test(item.observableBehavior)||typeof item.recordType!=="string")return null}
  const f=value.feedbackTemplates;if(!strings(f.strengths)||!strings(f.nextSteps)||!strings(f.practice))return null;
  return value as PerformanceAssessment;
}

const sa={type:"array",items:{type:"string"}};
const rubricLevel={type:"object",additionalProperties:false,properties:{levelName:{type:"string"},description:{type:"string"},score:{type:"integer",minimum:0}},required:["levelName","description","score"]};
export const performanceAssessmentSchema:Record<string,unknown>={type:"object",additionalProperties:false,properties:{title:{type:"string"},overview:{type:"object",additionalProperties:false,properties:{grade:{type:"string",enum:["1학년"]},subject:{type:"string",enum:["국어"]},semester:{type:"string"},unit:{type:"string"},topic:{type:"string"},domain:{type:"string",enum:PERFORMANCE_DOMAINS},achievementStandard:{type:"string"},learningGoal:{type:"string"},assessmentElements:{type:"array",minItems:1,maxItems:3,items:{type:"string"}},assessmentMethods:sa,timing:{type:"string"},duration:{type:"integer"},materials:sa},required:["grade","subject","semester","unit","topic","domain","achievementStandard","learningGoal","assessmentElements","assessmentMethods","timing","duration","materials"]},studentTask:{type:"object",additionalProperties:false,properties:{situation:{type:"string"},instruction:{type:"string"},steps:sa,expectedProduct:{type:"string"},reminders:sa,observableElements:sa},required:["situation","instruction","steps","expectedProduct","reminders","observableElements"]},studentWorksheet:{type:"object",additionalProperties:false,properties:{introduction:{type:"string"},sourceText:{type:"string"},tasks:{type:"array",items:{type:"object",additionalProperties:false,properties:{id:{type:"string"},instruction:{type:"string"},answerSpaceLines:{type:"integer",minimum:1,maximum:12}},required:["id","instruction","answerSpaceLines"]}},selfAssessment:sa},required:["introduction","sourceText","tasks","selfAssessment"]},teacherGuide:{type:"object",additionalProperties:false,properties:{intent:{type:"string"},preparation:sa,procedure:sa,observableBehaviors:sa,estimatedMinutes:{type:"integer"},cautions:sa,support:sa,sampleAnswers:{type:"array",items:{type:"object",additionalProperties:false,properties:{taskId:{type:"string"},answer:{type:"string"}},required:["taskId","answer"]}}},required:["intent","preparation","procedure","observableBehaviors","estimatedMinutes","cautions","support","sampleAnswers"]},rubric:{type:"array",items:{type:"object",additionalProperties:false,properties:{criterionId:{type:"string"},assessmentElement:{type:"string"},observableEvidence:{type:"string"},maxScore:{type:"integer",minimum:0},levels:{type:"array",items:rubricLevel}},required:["criterionId","assessmentElement","observableEvidence","maxScore","levels"]}},observationChecklist:{type:"array",items:{type:"object",additionalProperties:false,properties:{criterionId:{type:"string"},observableBehavior:{type:"string"},recordType:{type:"string"}},required:["criterionId","observableBehavior","recordType"]}},feedbackTemplates:{type:"object",additionalProperties:false,properties:{strengths:sa,nextSteps:sa,practice:sa},required:["strengths","nextSteps","practice"]}},required:["title","overview","studentTask","studentWorksheet","teacherGuide","rubric","observationChecklist","feedbackTemplates"]};

export function buildPerformanceAssessmentPrompt(input:PerformanceAssessmentInput,current?:PerformanceAssessment,section:"all"|"task"|"rubric"|"checklist"|"feedback"="all"){
  const scoreRule=input.scoreMode==="점수와 성취수준 함께 사용"?`평가 요소별 배점(maxScore)의 합은 총점 ${input.totalScore}점과 정확히 같아야 합니다.`:"점수를 사용하지 않으므로 모든 maxScore와 score는 0으로 두세요.";
  return `초등학교 1학년 국어 수행평가 초안을 구조화된 데이터로 작성하세요.\n[고정] grade=1학년, subject=국어\n[입력 - 국정 교육과정 진도표에서 가져온 값] 학기=${input.semester}, 단원=${input.unit}, 차시 주제=${input.topic}, 차시=${input.currentSession}/${input.totalSessions}차시, 성취기준(문구 그대로)=${input.achievementStandard}, 국어 영역(문구 그대로)=${input.domain}, 교과서=${input.textbookName} ${input.textbookPages}쪽, 평가 방법=${input.methods.join(", ")}, 방식=${input.mode}, 시간=${input.durationMinutes}분, 시기=${input.timing==="직접 입력"?input.customTiming:input.timing}, 수준 명칭(낮은 단계부터)=${input.levelNames.join(" < ")}, 점수 사용 여부=${input.scoreMode}${input.scoreMode==="점수와 성취수준 함께 사용"?`, 총점=${input.totalScore}점`:""}, 교사의 추가 요청=${input.additionalRequest||"입력 없음"}\n[학습 목표와 평가 요소] 이번 차시의 학습 목표와 평가 요소(1~3개)는 별도로 입력되지 않았으니 성취기준과 차시 주제, 국어 영역을 근거로 이 학년 수준에 알맞게 직접 판단해 learningGoal과 assessmentElements에 작성하세요. 교사의 추가 요청이 있다면 그 판단에 최우선으로 반영하세요.\n[제시문] 평가 과제에 제시문이 필요하면 특정 교과서 원문처럼 보이지 않는 짧은 1학년 수준 예시를 studentWorksheet.sourceText로 직접 만드세요. 실제 교과서 원문을 아는 것처럼 꾸미지 마세요. 필요 없으면 빈 문자열로 두세요.\n[작성 원칙] 입력된 학기·단원·차시 주제·성취기준·국어 영역 정보는 한 글자도 바꾸지 마세요. assessmentElements는 1~3개, 서로 다른 짧은 표현으로 만드세요. 각 평가 요소마다 관찰 가능한 행동을 하나씩 observableElements에 같은 순서로 쓰고(평가 요소 문구를 그대로 반복하지 말고 구체적인 관찰 행동으로 풀어 쓰세요), rubric은 E1부터 입력 순서로 각 평가 요소와 연결하고 assessmentElement 값은 평가 요소 문구와 정확히 같게 쓰세요. checklist도 같은 방식으로 연결하세요. 1학년이 한 번에 이해할 짧은 지시와 ${input.durationMinutes}분 안에 가능한 활동으로 구성하세요. 이미지가 없으므로 그림이나 빈 이미지 자리를 요구하지 마세요. 긴 글·어려운 문법 용어·사생활 공개를 요구하지 마세요. 짝·모둠에서도 개인 행동을 관찰할 수 있게 하세요. 기준은 성격이나 태도 평가가 아니라 실제 관찰 행동으로 쓰고 '매우 우수함, 대체로 잘함, 부족함, 열심히 참여함, 태도가 좋음'을 쓰지 마세요. 수준별 설명은 서로 다른 도움 정도와 수행 행동을 명확히 쓰세요. rubric levels는 낮은 수준부터 높은 수준 순서이고 score도 오름차순이며 마지막 score=maxScore입니다. ${scoreRule} 학생 자료에는 정답·채점기준·수준 분류를 넣지 마세요. 자기·동료평가를 선택했다면 얼굴표정이나 짧은 선택 문장으로 만드세요. 학생 이름·답안·점수는 만들지 마세요. teacherGuide sampleAnswers의 taskId는 학생 문항 ID와 일치해야 합니다. 자료는 교사가 검토·수정할 초안입니다.${current?`\n[부분 재생성] ${section} 부분만 새롭게 만들 목적입니다. 아래 기존 결과와 구조·ID를 호환하고 나머지 내용은 최대한 동일하게 반환하세요.\n${JSON.stringify(current)}`:""}`;
}

export function formatPerformanceAssessmentText(result:PerformanceAssessment):string{
  const o=result.overview;
  return [result.title,`학년·교과: ${o.grade} ${o.subject}`,`학기: ${o.semester}`,`단원·차시 주제: ${o.unit} ${o.topic}`,`영역: ${o.domain}`,`성취기준: ${o.achievementStandard}`,`학습 목표: ${o.learningGoal}`,`평가 요소: ${o.assessmentElements.join(", ")}`,`평가 방법: ${o.assessmentMethods.join(", ")}`,`시기·시간: ${o.timing} · ${o.duration}분`,
  "\n[학생 과제]",`상황: ${result.studentTask.situation}`,`지시: ${result.studentTask.instruction}`,...result.studentTask.steps.map(x=>`- ${x}`),`결과물: ${result.studentTask.expectedProduct}`,
  "\n[학생 활동지]",result.studentWorksheet.introduction,...result.studentWorksheet.tasks.map(t=>`(${t.id}) ${t.instruction}`),
  "\n[채점기준]",...result.rubric.flatMap(c=>[`${c.criterionId} · ${c.assessmentElement}${c.maxScore?` (${c.maxScore}점)`:""}`,...c.levels.map(l=>`  ${l.levelName}${c.maxScore?`(${l.score}점)`:""}: ${l.description}`)]),
  "\n[관찰 체크리스트]",...result.observationChecklist.map(x=>`${x.criterionId}: ${x.observableBehavior} (${x.recordType})`),
  "\n[교사용 자료]",`평가 의도: ${result.teacherGuide.intent}`,"준비물: "+result.overview.materials.join(", "),...result.teacherGuide.procedure.map(x=>`- ${x}`),"유의사항: "+result.teacherGuide.cautions.join(" / "),
  "\n[피드백 문장 틀]","잘한 점: "+result.feedbackTemplates.strengths.join(" / "),"다음 학습 방향: "+result.feedbackTemplates.nextSteps.join(" / ")].join("\n");
}

export function calculateRubricScores(maxScore:number,levelCount:3|4):number[]{
  if(maxScore<=0)return Array.from({length:levelCount},()=>0);const lowest=Math.max(1,Math.round(maxScore*.3));return Array.from({length:levelCount},(_,i)=>i===levelCount-1?maxScore:Math.round(lowest+(maxScore-lowest)*(i/(levelCount-1))));
}
function splitScore(total:number,count:number):number[]{
  if(count<=0)return[];const base=Math.floor(total/count);const remainder=total-base*count;return Array.from({length:count},(_,i)=>base+(i<remainder?1:0));
}
export function normalizePerformanceScores(value:unknown,input:PerformanceAssessmentInput):unknown{
  if(!obj(value)||!Array.isArray(value.rubric))return value;
  const useScore=input.scoreMode==="점수와 성취수준 함께 사용";
  const scores=useScore?splitScore(input.totalScore||0,value.rubric.length):value.rubric.map(()=>0);
  return{...value,rubric:value.rubric.map((item,i)=>obj(item)?{...item,maxScore:scores[i]||0,levels:Array.isArray(item.levels)?item.levels.map((level,n)=>obj(level)?{...level,score:calculateRubricScores(scores[i]||0,input.levelCount)[n]}:level):item.levels}:item)};
}

export function mergePerformanceSection(current:PerformanceAssessment,next:PerformanceAssessment,section:"task"|"rubric"|"checklist"|"feedback"):PerformanceAssessment{
  if(section==="task")return{...current,studentTask:next.studentTask,studentWorksheet:next.studentWorksheet,teacherGuide:{...current.teacherGuide,...next.teacherGuide}};
  if(section==="rubric")return{...current,rubric:next.rubric};if(section==="checklist")return{...current,observationChecklist:next.observationChecklist};return{...current,feedbackTemplates:next.feedbackTemplates};
}
export function performancePrintIssues(result:PerformanceAssessment,input:PerformanceAssessmentSelection){const issues:string[]=[];if(result.overview.unit!==input.unit||result.overview.topic!==input.topic)issues.push("선택한 단원·차시 주제가 결과와 다릅니다. 다시 생성해 주세요.");if(result.studentWorksheet.tasks.some(x=>!x.instruction.trim()))issues.push("학생용 과제 내용이 비어 있습니다.");if(result.rubric.some(x=>x.levels.length!==input.levelCount))issues.push("성취수준 단계 수를 확인해 주세요.");if(input.scoreMode==="점수와 성취수준 함께 사용"&&result.rubric.reduce((s,x)=>s+x.maxScore,0)!==input.totalScore)issues.push("평가 요소별 배점 합계가 총점과 다릅니다.");if(result.rubric.some(x=>x.levels.some((l,i)=>i>0&&l.score<x.levels[i-1].score)))issues.push("성취수준별 점수 순서를 확인해 주세요.");return issues;}
export const defaultPerformanceLevelNames=(count:3|4)=>[...DEFAULT_LEVEL_NAMES[count]];
