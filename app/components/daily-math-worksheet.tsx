"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Printer, RefreshCw, Sparkles } from "lucide-react";
import { availableAreas, DETAIL_TYPES, DIFFICULTY_LABELS, OPERATION_AREAS, supportsVertical, type Difficulty, type OperationArea, type Semester } from "../lib/daily-math-config";
import { createSeed, createWorksheet, WorksheetGenerationError, type DailyMathWorksheet as Worksheet, type WorksheetSettings } from "../lib/daily-math";

const Select = ({label,value,onChange,children}:{label:string;value:string|number;onChange:(value:string)=>void;children:React.ReactNode}) => <label className="dm-field"><span>{label}</span><select value={value} onChange={e=>onChange(e.target.value)}>{children}</select></label>;

function Problem({problem,index,answer}:{problem:Worksheet["problems"][number];index:number;answer:boolean}) {
  return <div className={`dm-problem ${problem.displayFormat}`}><span className="dm-number">{index+1}.</span><div className="dm-equation"><span>{problem.leftOperand}</span><span>{problem.operator} {problem.rightOperand}</span><b>= {answer ? problem.answer : ""}</b></div></div>;
}

function SheetPages({worksheet,answer}:{worksheet:Worksheet;answer:boolean}) {
  const perPage=Math.max(8,worksheet.settings.columns*(worksheet.settings.spacing==="narrow"?10:worksheet.settings.spacing==="normal"?8:6));
  const pages=Array.from({length:Math.ceil(worksheet.problems.length/perPage)},(_,i)=>worksheet.problems.slice(i*perPage,(i+1)*perPage));
  return <div className={`dm-print-section ${answer?"dm-print-answer":"dm-print-worksheet"}`}>{pages.map((problems,page)=><article className="dm-sheet" key={page}>
    <header><div><p>매일 차근차근, 수학 자신감!</p><h2>{worksheet.title}{answer&&" · 정답"}</h2><small>{worksheet.settings.semester==="none"?"학기 구분 없음":`${worksheet.settings.semester}학기`} · {OPERATION_AREAS[worksheet.settings.area].label} · {DIFFICULTY_LABELS[worksheet.settings.difficulty]}</small></div><div className="dm-student-lines"><span>이름 <i/></span><span>날짜 <i/></span><span>점수 <i/></span></div></header>
    <section className={`dm-problem-grid cols-${worksheet.settings.columns} space-${worksheet.settings.spacing}`}>{problems.map((problem,i)=><Problem key={problem.id} problem={problem} index={page*perPage+i} answer={answer}/>)}</section>
    <footer>{page+1} / {pages.length}</footer>
  </article>)}</div>;
}

export function DailyMathWorksheet() {
  const [grade,setGrade]=useState(3), [semester,setSemester]=useState<Semester>("none"), [area,setArea]=useState<OperationArea>("natural-add"), [detail,setDetail]=useState(DETAIL_TYPES["natural-add"][2]);
  const [difficulty,setDifficulty]=useState<Difficulty>("standard"), [count,setCount]=useState<10|20|30|40>(20), [columns,setColumns]=useState<2|3|4>(2), [format,setFormat]=useState<"horizontal"|"vertical">("horizontal"), [showNumbers,setShowNumbers]=useState(true), [spacing,setSpacing]=useState<"narrow"|"normal"|"wide">("normal"), [title,setTitle]=useState("");
  const [worksheet,setWorksheet]=useState<Worksheet|null>(null), [previous,setPrevious]=useState<Worksheet|null>(null), [view,setView]=useState<"worksheet"|"answer">("worksheet"), [error,setError]=useState(""), [copied,setCopied]=useState(false);
  const areas=useMemo(()=>availableAreas(grade),[grade]);
  const settings=():WorksheetSettings=>({grade,semester,area,detailType:detail,difficulty,count,columns,displayFormat:supportsVertical(area)?format:"horizontal",showNumbers,spacing,customTitle:title});
  const generate=(same=false)=>{try{setError("");if(worksheet)setPrevious(worksheet);setWorksheet(createWorksheet(settings(),same&&worksheet?worksheet.seed:createSeed()));setView("worksheet");}catch(e){setError(e instanceof WorksheetGenerationError?e.message:"학습지를 만들지 못했습니다. 설정을 확인한 뒤 다시 시도해 주세요.");}};
  const changeGrade=(next:number)=>{setGrade(next);const nextAreas=availableAreas(next);if(!nextAreas.includes(area)){setArea(nextAreas[0]);setDetail(DETAIL_TYPES[nextAreas[0]][0]);setFormat("horizontal");}};
  const changeArea=(next:OperationArea)=>{setArea(next);setDetail(DETAIL_TYPES[next][0]);if(!supportsVertical(next))setFormat("horizontal");};
  const print=(target:"worksheet"|"answer"|"both")=>{document.documentElement.dataset.dmPrint=target;window.addEventListener("afterprint",()=>delete document.documentElement.dataset.dmPrint,{once:true});window.print();};
  const copy=async()=>{if(!worksheet)return;const text=worksheet.problems.map((p,i)=>`${i+1}. ${p.leftOperand} ${p.operator} ${p.rightOperand} = ${p.answer}`).join("\n");await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1800);};

  return <div className="dm-page"><section className="page-head"><div><span className="eyebrow">수업 도우미 · 수학</span><h1>일일수학 연산학습지</h1><p>학년과 연산 유형을 고르면 인쇄하기 좋은 연산 문제와 정답지를 바로 만들어요.</p></div></section>
    <div className="dm-layout"><aside className="dm-controls">
      <section className="dm-card"><h2><span>1</span> 학습 범위</h2><div className="dm-form-grid"><Select label="학년" value={grade} onChange={v=>changeGrade(Number(v))}>{[1,2,3,4,5,6].map(v=><option key={v} value={v}>초등학교 {v}학년</option>)}</Select><Select label="학기" value={semester} onChange={v=>setSemester(v as Semester)}><option value="none">학기 구분 없음</option><option value="1">1학기</option><option value="2">2학기</option></Select></div>
      <label className="dm-field"><span>연산 영역</span><div className="dm-choice-grid">{areas.map(v=><button key={v} className={area===v?"selected":""} onClick={()=>changeArea(v)}>{OPERATION_AREAS[v].label}</button>)}</div></label>
      <Select label="세부 유형" value={detail} onChange={setDetail}>{DETAIL_TYPES[area].map(v=><option key={v}>{v}</option>)}</Select></section>
      <section className="dm-card"><h2><span>2</span> 학습지 설정</h2><label className="dm-field"><span>난이도</span><div className="dm-segment">{(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map(v=><button key={v} className={difficulty===v?"selected":""} onClick={()=>setDifficulty(v)}>{DIFFICULTY_LABELS[v]}</button>)}</div></label>
      <div className="dm-form-grid"><Select label="문제 수" value={count} onChange={v=>setCount(Number(v) as 10|20|30|40)}>{[10,20,30,40].map(v=><option key={v} value={v}>{v}문제</option>)}</Select><Select label="단 수" value={columns} onChange={v=>setColumns(Number(v) as 2|3|4)}>{[2,3,4].map(v=><option key={v} value={v}>{v}단</option>)}</Select><Select label="문제 간격" value={spacing} onChange={v=>setSpacing(v as typeof spacing)}><option value="narrow">좁게</option><option value="normal">보통</option><option value="wide">넓게</option></Select></div>
      <label className="dm-field"><span>배치 방식</span><div className="dm-segment"><button className={format==="horizontal"?"selected":""} onClick={()=>setFormat("horizontal")}>가로식</button><button disabled={!supportsVertical(area)} title={!supportsVertical(area)?"이 연산은 가로식만 지원합니다.":undefined} className={format==="vertical"?"selected":""} onClick={()=>setFormat("vertical")}>세로식</button></div></label>
      <label className="dm-check"><input type="checkbox" checked={showNumbers} onChange={e=>setShowNumbers(e.target.checked)}/> 문제 번호 표시</label><label className="dm-field"><span>제목 <small>선택</small></span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${grade}학년 일일수학`}/></label>
      <button className="primary-btn full dm-generate" onClick={()=>generate(false)}><Sparkles size={17}/> 학습지 만들기</button>{error&&<p className="dm-error" role="alert">{error}</p>}</section>
    </aside>
    <section className="dm-preview"><div className="dm-preview-toolbar"><div className="dm-segment"><button className={view==="worksheet"?"selected":""} disabled={!worksheet} onClick={()=>setView("worksheet")}>문제지</button><button className={view==="answer"?"selected":""} disabled={!worksheet} onClick={()=>setView("answer")}>정답지</button></div>{worksheet&&<div className="dm-actions"><button onClick={()=>generate(true)}><RefreshCw size={15}/> 같은 설정으로 다시</button>{previous&&<button onClick={()=>{setWorksheet(previous);setPrevious(worksheet)}}>이전 학습지</button>}<button onClick={copy}><Copy size={15}/>{copied?<><Check size={14}/> 복사됨</>:"정답 복사"}</button><div className="dm-print-menu"><button onClick={()=>print(view)}><Printer size={15}/> 현재 화면 인쇄</button><button onClick={()=>print("both")}>문제+정답 인쇄</button></div></div>}</div>
      {!worksheet?<div className="dm-empty"><span><Sparkles/></span><h2>오늘의 연산학습지를 만들어 보세요</h2><p>왼쪽에서 학습 범위와 난이도를 선택하면<br/>A4 인쇄 미리보기가 여기에 나타납니다.</p></div>:<div className={`dm-print-root ${showNumbers?"":"hide-numbers"}`}><div className={view==="worksheet"?"":"dm-screen-hidden"}><SheetPages worksheet={worksheet} answer={false}/></div><div className={view==="answer"?"":"dm-screen-hidden"}><SheetPages worksheet={worksheet} answer={true}/></div></div>}
    </section></div>
  </div>;
}
