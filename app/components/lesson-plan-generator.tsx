"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, ClipboardList, Copy, FileDown, FileText, LoaderCircle, Printer, RefreshCw, Sparkles } from "lucide-react";
import { FieldError } from "./generator-result";
import { formatLessonPlanText, SEMESTERS, STUDENT_LEVELS, validateLessonPlanInput, type LessonPlanData, type LessonPlanErrors, type LessonPlanSelection } from "../lib/lesson-plan-generator";
import { buildLessonPlanHwpx } from "../lib/lesson-plan-hwpx";
import { LESSON_TYPES } from "../lib/lesson-plan-reference";
import { curriculumTopics, curriculumUnits, findCurriculumSession, formatStandards, type CurriculumSemester } from "../lib/korean-curriculum-1";

type Overview = { grade:string; subject:string; semester:string; unit:string; topic:string; session:string; textbook:string; achievementStandard:string };
type Result = LessonPlanData & { overview: Overview };
const initialForm: LessonPlanSelection = { grade:"1학년", subject:"국어", semester:"1학기", unit:"", topic:"", durationMinutes:40, studentLevel:"수준 혼합", lessonType:"자동 선택", additionalRequests:"" };

const lines = (value:string) => value.split("\n").map(x=>x.trim()).filter(Boolean);
const text = (value:string[]) => value.join("\n");

export function LessonPlanGenerator() {
  const [form,setForm]=useState<LessonPlanSelection>(initialForm); const [errors,setErrors]=useState<LessonPlanErrors>({});
  const [result,setResult]=useState<Result|null>(null); const [isLoading,setIsLoading]=useState(false); const [apiError,setApiError]=useState(""); const [copied,setCopied]=useState(false); const [saveNotice,setSaveNotice]=useState(""); const [pdfLoading,setPdfLoading]=useState(false);
  const update=<K extends keyof LessonPlanSelection>(key:K,value:LessonPlanSelection[K])=>{setForm(c=>({...c,[key]:value}));setErrors(c=>({...c,[key]:undefined}));};
  const units=useMemo(()=>curriculumUnits(form.semester),[form.semester]);
  const topics=useMemo(()=>form.unit?curriculumTopics(form.semester,form.unit):[],[form.semester,form.unit]);
  const session=useMemo(()=>form.unit&&form.topic?findCurriculumSession(form.semester,form.unit,form.topic):undefined,[form.semester,form.unit,form.topic]);
  const changeSemester=(semester:CurriculumSemester)=>{setForm(c=>({...c,semester,unit:"",topic:""}));setErrors(c=>({...c,semester:undefined,unit:undefined,topic:undefined}));};
  const changeUnit=(unit:string)=>{setForm(c=>({...c,unit,topic:""}));setErrors(c=>({...c,unit:undefined,topic:undefined}));};
  const generate=async()=>{const v=validateLessonPlanInput(form);setErrors(v.errors);setApiError("");setCopied(false);setSaveNotice("");if(!v.data)return;setIsLoading(true);try{const response=await fetch("/api/lesson-plans/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(v.data)});const payload=await response.json() as {plan?:LessonPlanData;overview?:Overview;error?:string;fields?:LessonPlanErrors};if(!response.ok||!payload.plan||!payload.overview){if(payload.fields)setErrors(payload.fields);throw new Error(payload.error||"지도안을 생성하지 못했습니다.");}const full={...payload.plan,overview:payload.overview};setResult(full);fetch("/api/generated-results",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tool:"lesson-plan",title:full.title,content:formatLessonPlanText(full)})}).then(r=>setSaveNotice(r.ok?"생성 결과를 내 계정에 저장했어요.":"결과는 만들어졌지만 저장에는 실패했어요. 필요하면 복사해 두세요.")).catch(()=>setSaveNotice("결과는 만들어졌지만 저장에는 실패했어요. 필요하면 복사해 두세요."));}catch(error){setApiError(error instanceof Error?error.message:"지도안을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");}finally{setIsLoading(false);}};
  const setOverview=(key:keyof Overview,value:string)=>setResult(c=>c?{...c,overview:{...c.overview,[key]:value}}:c);
  const setArray=(key:"learningObjectives"|"teacherMaterials"|"studentMaterials",value:string)=>setResult(c=>c?{...c,[key]:lines(value)}:c);
  const setStage=(index:number,key:keyof LessonPlanData["lessonStages"][number],value:string|number)=>setResult(c=>{if(!c)return c;const lessonStages=[...c.lessonStages];const arrayKey=key==="teacherActivities"||key==="studentActivities"||key==="materialsAndNotes";lessonStages[index]={...lessonStages[index],[key]:arrayKey&&typeof value==="string"?lines(value):value} as LessonPlanData["lessonStages"][number];return{...c,lessonStages};});
  const setAssessment=(key:"content"|"method"|"observableBehaviors",value:string)=>setResult(c=>c?{...c,assessment:{...c.assessment,[key]:lines(value)}}:c);
  const setCriterion=(key:keyof LessonPlanData["assessment"]["criteria"],value:string)=>setResult(c=>c?{...c,assessment:{...c.assessment,criteria:{...c.assessment.criteria,[key]:value}}}:c);
  const setSupport=(index:number,value:string)=>setResult(c=>{if(!c)return c;const levelSupport=[...c.levelSupport];levelSupport[index]={...levelSupport[index],support:lines(value)};return{...c,levelSupport};});
  const copyAll=async()=>{if(!result)return;const out=formatLessonPlanText(result);try{await navigator.clipboard.writeText(out);setCopied(true);window.setTimeout(()=>setCopied(false),2000);}catch{setApiError("복사하지 못했습니다. 각 내용을 직접 선택해 복사해 주세요.");}};
  const printDoc=()=>{if(!result)return;document.documentElement.dataset.lpPrint="1";window.addEventListener("afterprint",()=>{delete document.documentElement.dataset.lpPrint;},{once:true});window.print();};
  const downloadPdf=async()=>{
    if(!result||pdfLoading)return;
    setPdfLoading(true);setApiError("");
    document.documentElement.dataset.lpPdf="1";
    try{
      const sheet=document.querySelector<HTMLElement>(".lp-sheet");
      if(!sheet)throw new Error("인쇄할 내용을 찾지 못했습니다.");
      const [{default:html2canvas},{jsPDF}]=await Promise.all([import("html2canvas"),import("jspdf")]);
      const canvas=await html2canvas(sheet,{scale:2,backgroundColor:"#ffffff"});
      const pdf=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
      const pageW=210,pageH=297;
      const imgW=pageW,imgH=canvas.height*imgW/canvas.width;
      const imgData=canvas.toDataURL("image/png");
      let heightLeft=imgH,position=0;
      pdf.addImage(imgData,"PNG",0,position,imgW,imgH);
      heightLeft-=pageH;
      while(heightLeft>0){position=heightLeft-imgH;pdf.addPage();pdf.addImage(imgData,"PNG",0,position,imgW,imgH);heightLeft-=pageH;}
      pdf.save(`${(result.title||"지도안").replace(/[\\/:*?"<>|]/g,"")}.pdf`);
    }catch{setApiError("PDF를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");}
    finally{delete document.documentElement.dataset.lpPdf;setPdfLoading(false);}
  };
  const downloadHwp=()=>{if(!result)return;const bytes=buildLessonPlanHwpx(result,form.durationMinutes);const blob=new Blob([bytes.buffer as ArrayBuffer],{type:"application/hwp+zip"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`${(result.title||"지도안").replace(/[\\/:*?"<>|]/g,"")}.hwpx`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);};

  return <><div className="page-title message-page-title"><div><span className="eyebrow">LESSON PLAN ASSISTANT · 1학년 국어</span><h1>1학년 국어 지도안 생성기</h1><p>참고자료의 수업 설계 원리에 따라 목표·활동·평가가 연결된 지도안을 작성해 드려요.</p></div><span className="privacy-note"><Check size={15}/> 생성 결과만 계정에 저장</span></div>
  <div className="lesson-plan-layout"><section className="form-panel message-form lesson-plan-form"><div className="panel-head"><div><span className="eyebrow">STEP 1</span><h3>기본 수업 정보</h3></div><span className="required">* 필수 항목</span></div>
    <div className="kw-fixed"><b>초등학교</b><b>1학년</b><b>국어</b></div>
    <div className="field-row"><label>학기 *<select value={form.semester} onChange={e=>changeSemester(e.target.value as CurriculumSemester)}>{SEMESTERS.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.semester}/></label><label>수업 유형 *<select value={form.lessonType} onChange={e=>update("lessonType",e.target.value as LessonPlanSelection["lessonType"])}>{LESSON_TYPES.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.lessonType}/></label></div>
    <label>단원 *<select value={form.unit} onChange={e=>changeUnit(e.target.value)}><option value="">단원을 선택하세요</option>{units.map(u=><option key={u.unit} value={u.unit}>{u.unit} ({u.totalSessions}차시)</option>)}</select><FieldError message={errors.unit}/></label>
    <label>차시 주제 *<select value={form.topic} onChange={e=>update("topic",e.target.value)} disabled={!form.unit}><option value="">차시 주제를 선택하세요</option>{topics.map(t=><option key={t.topic} value={t.topic}>{t.currentSession}차시 · {t.topic}</option>)}</select><FieldError message={errors.topic}/></label>
    {session&&<div className="lesson-auto-info"><div><span>차시</span><b>{session.currentSession}/{session.totalSessions}차시</b></div><div><span>교과서</span><b>{session.textbookName} · {session.textbookPages}쪽</b></div><div className="lesson-auto-standards"><span>성취기준</span><b>{formatStandards(session.standardCodes)}</b></div></div>}
    <label>수업 시간(분) *<input type="number" min="1" step="1" value={form.durationMinutes} onChange={e=>update("durationMinutes",Number(e.target.value))}/><FieldError message={errors.durationMinutes}/></label>
    <fieldset><legend>학생 수준 *</legend><div className="choice-grid four">{STUDENT_LEVELS.map(x=><button type="button" key={x} className={form.studentLevel===x?"choice active":"choice"} onClick={()=>update("studentLevel",x)}>{x}</button>)}</div><FieldError message={errors.studentLevel}/></fieldset>
    <div className="divider"/><div className="panel-head option-head"><div><span className="eyebrow">STEP 2</span><h3>추가 수업 정보</h3></div></div>
    <small className="field-help">이번 차시의 핵심 내용, 학급 특성, 활동, 준비물은 선택한 차시 주제와 성취기준을 바탕으로 AI가 알아서 구성합니다. 꼭 반영해야 할 요청이 있을 때만 아래에 적어 주세요.</small>
    <label>교사의 추가 요청 <span className="optional">선택</span><textarea value={form.additionalRequests} placeholder="예: 전개 단계에서 개별 활동 시간을 충분히 확보해 주세요." onChange={e=>update("additionalRequests",e.target.value)}/></label>
    <button type="button" className="primary-btn generate-message" onClick={generate} disabled={isLoading}>{isLoading?<><LoaderCircle className="spin" size={17}/> 지도안을 작성하고 있어요</>:<><Sparkles size={17}/> 지도안 생성</>}</button>
  </section>
  <section className="lesson-result" aria-live="polite"><div className="panel-head"><div><span className="eyebrow"><ClipboardList size={13}/> 생성 결과</span><h3>수업 지도안</h3></div>{result&&<span className="result-ready"><Check size={13}/> 항목별 수정 가능</span>}</div>{saveNotice&&<div className="save-notice"><Check size={15}/>{saveNotice}</div>}{apiError&&<div className="api-error"><AlertCircle size={19}/><div><b>지도안을 생성하지 못했어요</b><p>{apiError}</p><span>입력값과 수업 시간을 확인한 뒤 다시 생성해 주세요.</span></div></div>}
    {!result?<div className="message-empty lesson-empty"><span><ClipboardList size={28}/></span><b>아직 생성된 지도안이 없어요</b><p>왼쪽에서 수업 정보를 입력한 뒤<br/>지도안 생성 버튼을 눌러 주세요.</p><div><span>1</span>수업 정보<span>2</span>AI 생성<span>3</span>항목 수정</div></div>:<div className="lesson-document">
      <input className="lesson-title-input" value={result.title} onChange={e=>setResult(c=>c?{...c,title:e.target.value}:c)} aria-label="지도안 제목"/>
      <LessonSection title="1. 수업 개요"><div className="overview-grid">{(["subject","grade","semester","unit","topic","session","textbook","achievementStandard"] as const).map(key=><label key={key}><span>{{subject:"교과",grade:"학년",semester:"학기",unit:"단원",topic:"차시 주제",session:"차시",textbook:"교과서·쪽수",achievementStandard:"성취기준"}[key]}</span><textarea value={result.overview[key]} onChange={e=>setOverview(key,e.target.value)}/></label>)}</div><p className="lesson-type-note">수업 유형: <b>{result.lessonType}</b></p></LessonSection>
      <LessonSection title="2. 학습 목표"><textarea className="section-editor" value={text(result.learningObjectives)} onChange={e=>setArray("learningObjectives",e.target.value)}/></LessonSection>
      <LessonSection title="3. 준비물"><div className="field-row"><label>교사 준비물<textarea value={text(result.teacherMaterials)} onChange={e=>setArray("teacherMaterials",e.target.value)}/></label><label>학생 준비물<textarea value={text(result.studentMaterials)} onChange={e=>setArray("studentMaterials",e.target.value)}/></label></div></LessonSection>
      <LessonSection title="4. 수업 흐름"><div className="lesson-stage-table"><div className="stage-header"><span>단계·시간</span><span>학습 내용</span><span>교사 활동</span><span>학생 활동</span><span>자료 및 유의점</span></div>{result.lessonStages.map((s,i)=><div className="stage-row" key={s.stage}><div className="stage-name"><b>{s.stage}</b><label><input type="number" min="1" value={s.minutes} onChange={e=>setStage(i,"minutes",Number(e.target.value))}/>분</label></div><label data-label="학습 내용"><textarea value={s.learningContent} onChange={e=>setStage(i,"learningContent",e.target.value)}/></label><label data-label="교사 활동"><textarea value={text(s.teacherActivities)} onChange={e=>setStage(i,"teacherActivities",e.target.value)}/></label><label data-label="학생 활동"><textarea value={text(s.studentActivities)} onChange={e=>setStage(i,"studentActivities",e.target.value)}/></label><label data-label="자료 및 유의점"><textarea value={text(s.materialsAndNotes)} onChange={e=>setStage(i,"materialsAndNotes",e.target.value)}/></label></div>)}</div><p className="time-total">현재 배정 시간 합계: <b>{result.lessonStages.reduce((a,b)=>a+b.minutes,0)}분</b> · 입력 수업 시간: {form.durationMinutes}분</p></LessonSection>
      <LessonSection title="5. 평가 계획"><div className="assessment-grid">{(["content","method","observableBehaviors"] as const).map(key=><label key={key}><span>{{content:"평가 내용",method:"평가 방법",observableBehaviors:"관찰할 학생 행동"}[key]}</span><textarea value={text(result.assessment[key])} onChange={e=>setAssessment(key,e.target.value)}/></label>)}</div><div className="criteria-grid">{(["high","medium","low"] as const).map(key=><label key={key}><span>{{high:"상",medium:"중",low:"하"}[key]} 기준</span><textarea value={result.assessment.criteria[key]} onChange={e=>setCriterion(key,e.target.value)}/></label>)}</div><label className="alignment-editor"><span>목표·활동·평가 연결 근거</span><textarea value={result.assessment.alignmentEvidence} onChange={e=>setResult(c=>c?{...c,assessment:{...c.assessment,alignmentEvidence:e.target.value}}:c)}/></label></LessonSection>
      <LessonSection title="6. 수준별 지원"><div className="support-grid">{result.levelSupport.map((s,i)=><label key={s.level}><span className={`level-badge level-${s.level}`}>{s.level}</span><textarea value={text(s.support)} onChange={e=>setSupport(i,e.target.value)}/></label>)}</div></LessonSection>
      <p className="edit-hint">수업 전에 학급 상황에 맞게 시간과 활동 내용을 검토해 주세요.</p>
      <div className="preview-actions message-actions"><button className="ghost-btn" onClick={copyAll}>{copied?<><Check size={16}/> 복사 완료</>:<><Copy size={16}/> 전체 내용 복사</>}</button><button className="ghost-btn" onClick={printDoc}><Printer size={16}/> 인쇄</button><button className="ghost-btn" onClick={downloadPdf} disabled={pdfLoading}>{pdfLoading?<LoaderCircle className="spin" size={16}/>:<FileDown size={16}/>} PDF로 저장</button><button className="ghost-btn" onClick={downloadHwp}><FileText size={16}/> 한글로 저장</button><button className="primary-btn" onClick={generate} disabled={isLoading}>{isLoading?<LoaderCircle className="spin" size={16}/>:<RefreshCw size={16}/>} 다시 생성</button></div>
      <p className="edit-hint lp-export-hint">PDF로 저장과 한글로 저장 모두 화면에 보이는 편집 내용이 아니라 정식 지도안 양식으로 바로 파일이 내려받아져요(한글은 .hwpx).</p>
      <div className="lesson-print-root"><article className="lp-sheet">
        <header className="lp-header"><h1>{result.title}</h1><p>국어과 교수·학습 과정안</p></header>
        <table className="lp-meta-table"><tbody>
          <tr><th>학년·교과</th><td>{result.overview.grade} {result.overview.subject}</td><th>차시</th><td>{result.overview.session}</td></tr>
          <tr><th>단원</th><td colSpan={3}>{result.overview.unit}</td></tr>
          <tr><th>차시 주제</th><td colSpan={3}>{result.overview.topic}</td></tr>
          <tr><th>교과서</th><td>{result.overview.textbook}</td><th>수업 시간</th><td>{form.durationMinutes}분</td></tr>
          <tr><th>성취기준</th><td colSpan={3}>{result.overview.achievementStandard}</td></tr>
        </tbody></table>
        <section className="lp-block"><h2>학습 목표</h2><ul>{result.learningObjectives.map((x,i)=><li key={i}>{x}</li>)}</ul></section>
        <section className="lp-block"><h2>준비물</h2><p><b>교사</b>{result.teacherMaterials.join(", ")}</p><p><b>학생</b>{result.studentMaterials.join(", ")}</p></section>
        <section className="lp-block"><h2>수업 흐름</h2>
          <table className="lp-flow-table">
            <thead><tr><th>단계<br/>(시간)</th><th>학습 내용</th><th>교수·학습 활동</th><th>자료 및 유의점</th></tr></thead>
            <tbody>{result.lessonStages.map(s=><tr key={s.stage}><td className="lp-stage-cell"><b>{s.stage}</b><span>({s.minutes}분)</span></td><td>{s.learningContent}</td><td className="lp-activity-cell">{s.teacherActivities.map((a,i)=><p key={`t${i}`}>{a}</p>)}{s.studentActivities.map((a,i)=><p key={`s${i}`}>{a}</p>)}</td><td>{s.materialsAndNotes.map((a,i)=><p key={i}>{a}</p>)}</td></tr>)}</tbody>
          </table>
          <p className="lp-time-total">총 수업 시간: {result.lessonStages.reduce((a,b)=>a+b.minutes,0)}분</p>
        </section>
        <section className="lp-block"><h2>평가 계획</h2>
          <table className="lp-eval-table"><tbody>
            <tr><th>평가 내용</th><td colSpan={3}>{result.assessment.content.join(", ")}</td></tr>
            <tr><th>평가 방법</th><td colSpan={3}>{result.assessment.method.join(", ")}</td></tr>
            <tr><th>관찰 행동</th><td colSpan={3}>{result.assessment.observableBehaviors.join(", ")}</td></tr>
            <tr><th rowSpan={3}>평가 기준</th><td>상</td><td colSpan={2}>{result.assessment.criteria.high}</td></tr>
            <tr><td>중</td><td colSpan={2}>{result.assessment.criteria.medium}</td></tr>
            <tr><td>하</td><td colSpan={2}>{result.assessment.criteria.low}</td></tr>
          </tbody></table>
        </section>
        <section className="lp-block"><h2>수준별 지원</h2><div className="lp-support-grid">{result.levelSupport.map(s=><p key={s.level}><b className={`level-badge level-${s.level}`}>{s.level}</b>{s.support.join(", ")}</p>)}</div></section>
        <footer className="lp-footer"><p>작성일: {new Date().toLocaleDateString("ko-KR")}</p></footer>
      </article></div>
    </div>}
  </section></div></>;
}

function LessonSection({title,children}:{title:string;children:React.ReactNode}) { return <section className="lesson-section"><h4>{title}</h4>{children}</section>; }
