/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useEffect, useState } from "react";
import {
  Bell, BookOpen, BriefcaseBusiness, CalendarDays, ChevronDown, ChevronRight,
  CircleHelp, Clock3, FileText, FolderOpen, Grid2X2, Heart,
  Home, LayoutTemplate, LoaderCircle, Menu, MessageCircleMore, MoreHorizontal, Plus, Search,
  Sparkles, Star, Users, X, Check, Save, SlidersHorizontal,
  ClipboardCheck, ChartNoAxesColumnIncreasing, UserRound, UserRoundCog, Calculator
} from "lucide-react";
import { MessageGenerator } from "./message-generator";
import { NewsletterGenerator } from "./newsletter-generator";
import { LessonPlanGenerator } from "./lesson-plan-generator";
import { StudentObservationOrganizer } from "./student-observation-organizer";
import { WritingFeedbackAssistant } from "./writing-feedback-assistant";
import { MultiplicationQuiz } from "./multiplication-quiz";
import { DailyMathWorksheet } from "./daily-math-worksheet";
import { DailyEnglishWorksheet } from "./daily-english-worksheet";
import { HistoryQuiz } from "./history-quiz";
import { TextbookDictation } from "./textbook-dictation";
import { AttendanceAssignmentManager } from "./attendance-assignment-manager";
import { ClassRoleAssignment } from "./class-role-assignment";
import { ClassStudentManager } from "./class-student-manager";
import { SurveyManager } from "./survey-manager";
import { ContextualHelp } from "./contextual-help";
import { LeveledKoreanWorksheetGenerator } from "./leveled-korean-worksheet-generator";
import { KoreanPerformanceAssessmentGenerator } from "./korean-performance-assessment-generator";
import { TemplateLibrary } from "./template-library";
import type { TeacherTemplate } from "../lib/template-store";
import type { SavedMessage } from "../lib/saved-message-store";
import type { GeneratedResult, GeneratedResultTool } from "../lib/generated-result-store";

type Section = "dashboard" | "operations" | "lessons" | "templates" | "workspace" | "help" | "messages" | "newsletters" | "lesson-plans" | "student-observations" | "writing-feedback" | "leveled-korean-worksheets" | "korean-performance-assessments" | "multiplication-quiz" | "daily-math" | "daily-english" | "history-quiz" | "textbook-dictation" | "attendance-assignments" | "class-roles" | "class-management" | "surveys";
type Tool = { title: string; desc: string; category: string; icon: React.ElementType; color: string; badge?: string };

const nav = [
  { id: "dashboard", label: "대시보드", icon: Home, href: "/" },
  { id: "class-management", label: "학급·학생 관리", icon: Users, href: "/class-management" },
  { id: "operations", label: "업무·학급 운영", icon: BriefcaseBusiness, href: "/operations" },
  { id: "lessons", label: "수업 도우미", icon: BookOpen, href: "/lessons" },
  { id: "templates", label: "자료·템플릿", icon: LayoutTemplate, href: "/templates" },
  { id: "workspace", label: "내 작업공간", icon: FolderOpen, href: "/workspace" },
];

const operationTools: Tool[] = [
  { title: "학부모 메시지 생성기", desc: "상황에 맞는 따뜻하고 정확한 안내 메시지", category: "소통", icon: MessageCircleMore, color: "blue", badge: "자주 사용" },
  { title: "가정통신문 생성기", desc: "학교 행사와 안내 내용을 정돈된 문서로", category: "소통", icon: FileText, color: "mint" },
  { title: "상담·학생 관찰 기록 정리", desc: "상담과 관찰 메모를 객관적인 기록 문장으로 정리", category: "기록/행정", icon: Users, color: "orange" },
  { title: "설문 만들기·응답 분석", desc: "설문을 만들고 공유하여 응답 현황과 통계를 확인", category: "분석", icon: ChartNoAxesColumnIncreasing, color: "blue" },
  { title: "출석·제출물 관리", desc: "출결과 과제 제출 현황을 간편하게 확인", category: "학급관리", icon: ClipboardCheck, color: "mint" },
  { title: "1인 1역 배정 도우미", desc: "모두가 참여하는 공정한 역할 배정", category: "학급관리", icon: UserRoundCog, color: "orange" },
];

const lessonTools: Tool[] = [
  { title: "지도안 생성기", desc: "1학년 국어 목표·활동·평가가 연결된 수업 흐름", category: "국어", icon: BookOpen, color: "blue", badge: "추천" },
  { title: "수준별 활동지 생성기", desc: "학급 수준에 맞는 활동지를 빠르게", category: "공통", icon: FileText, color: "mint" },
  { title: "수행평가 생성기", desc: "1학년 국어 과제와 관찰 가능한 채점기준", category: "국어", icon: ClipboardCheck, color: "purple", badge: "NEW" },
  { title: "교과서 받아쓰기 생성기", desc: "교과서 PDF 원문만 사용하는 받아쓰기 학습지", category: "국어", icon: FileText, color: "blue", badge: "NEW" },
  { title: "글쓰기 피드백", desc: "학생 눈높이에 맞춘 친절한 첨삭", category: "국어", icon: MessageCircleMore, color: "purple" },
  { title: "곱셈 퀴즈", desc: "구구단과 곱셈 문제를 혼자 또는 친구와 연습", category: "수학", icon: Calculator, color: "blue", badge: "NEW" },
];

lessonTools.push({ title: "일일수학 연산학습지", desc: "학년과 수준에 맞는 연산 문제와 정답지를 인쇄", category: "수학", icon: Calculator, color: "mint", badge: "NEW" });
lessonTools.push({ title: "역사 퀴즈", desc: "일반 역사 또는 선택한 교과서 PDF 범위로 혼자 풀기", category: "통합", icon: BookOpen, color: "orange", badge: "NEW" });

type RecentItem = { id: string; title: string; toolLabel: string; route: string; updatedAt: string; kind: "template" | "message" | "result"; isFavorite?: boolean };

const GENERATED_RESULT_ROUTES: Record<GeneratedResultTool, string> = {
  "newsletter": "/newsletters", "lesson-plan": "/lesson-plans",
  "korean-performance-assessment": "/korean-performance-assessments", "leveled-korean-worksheet": "/leveled-korean-worksheets",
};
const GENERATED_RESULT_LABELS: Record<GeneratedResultTool, string> = {
  "newsletter": "가정통신문 생성기", "lesson-plan": "지도안 생성기",
  "korean-performance-assessment": "수행평가 생성기", "leveled-korean-worksheet": "수준별 활동지 생성기",
};

function buildRecentItems(templates: TeacherTemplate[], messages: SavedMessage[], results: GeneratedResult[]): RecentItem[] {
  const templateItems: RecentItem[] = templates.map(t => ({ id: `template-${t.id}`, title: t.title, toolLabel: `템플릿 · ${t.resourceType}`, route: "/templates", updatedAt: t.updatedAt, kind: "template", isFavorite: t.isFavorite }));
  const messageItems: RecentItem[] = messages.map(m => ({ id: `message-${m.id}`, title: m.studentName ? `${m.studentName} 학생 관련 메시지` : `${m.recipient} 대상 메시지`, toolLabel: "학부모 메시지 생성기", route: "/messages", updatedAt: m.updatedAt, kind: "message" }));
  const resultItems: RecentItem[] = results.map(r => ({ id: `result-${r.id}`, title: r.title, toolLabel: GENERATED_RESULT_LABELS[r.tool], route: GENERATED_RESULT_ROUTES[r.tool], updatedAt: r.updatedAt, kind: "result" }));
  return [...templateItems, ...messageItems, ...resultItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function Select({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <button className={`select ${wide ? "wide" : ""}`}>{children}<ChevronDown size={15} /></button>;
}

function ToolCard({ tool, selected, onClick }: { tool: Tool; selected?: boolean; onClick?: () => void }) {
  const Icon = tool.icon;
  return <button className={`tool-card ${selected ? "selected" : ""}`} onClick={onClick}>
    <span className={`tool-icon ${tool.color}`}><Icon size={21} /></span>
    <span className="tool-copy"><span className="tool-title">{tool.title}{tool.badge && <em>{tool.badge}</em>}</span><span>{tool.desc}</span></span>
    <ChevronRight className="tool-arrow" size={18} />
  </button>;
}

const toolRoutes: Record<string, string> = {
  "학부모 메시지 생성기": "/messages", "가정통신문 생성기": "/newsletters", "상담·학생 관찰 기록 정리": "/student-observations",
  "설문 만들기·응답 분석": "/surveys", "출석·제출물 관리": "/attendance-assignments", "1인 1역 배정 도우미": "/class-roles",
  "지도안 생성기": "/lesson-plans", "수준별 활동지 생성기": "/leveled-korean-worksheets", "수행평가 생성기": "/korean-performance-assessments", "글쓰기 피드백": "/writing-feedback", "교과서 받아쓰기 생성기": "/textbook-dictation", "곱셈 퀴즈": "/multiplication-quiz",
  "일일수학 연산학습지": "/daily-math", "일일영어": "/daily-english", "역사 퀴즈": "/history-quiz",
};

function openTool(tool: Tool, setSelected: (tool: Tool) => void) {
  const route = toolRoutes[tool.title];
  if (route) window.location.assign(route); else setSelected(tool);
}

function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return <div className="empty"><span><FolderOpen size={25} /></span><b>아직 저장된 자료가 없어요</b><p>마음에 드는 결과물을 저장하면<br />이곳에서 다시 확인할 수 있어요.</p><button className="outline-btn" onClick={onCreate}><Plus size={16} /> 새 자료 만들기</button></div>;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(iso));
}

function RecentList({ items, go, loading, emptyText }: { items: RecentItem[]; go: (href: string) => void; loading: boolean; emptyText: string }) {
  if (loading) return <p className="recent-list-status"><LoaderCircle className="spin" size={15} /> 불러오는 중이에요.</p>;
  if (!items.length) return <p className="recent-list-status">{emptyText}</p>;
  const badgeLabel = { template: "템플릿", message: "메시지", result: "생성 결과" } as const;
  return <div className="recent-list">{items.map((item, i) => <button key={item.id} onClick={() => go(item.route)}><span className={`file-icon f${i % 3}`}><FileText size={18} /></span><span><b>{item.title}</b><small>{item.toolLabel} · {timeAgo(item.updatedAt)}</small></span><span className="subject-badge">{badgeLabel[item.kind]}</span><ChevronRight size={18} /></button>)}</div>;
}

function Dashboard({ go, userName, recentItems, activityLoading }: { go: (href: string) => void; userName: string; recentItems: RecentItem[]; activityLoading: boolean }) {
  const greetingName = userName.endsWith("선생님") ? userName : `${userName} 선생님`;
  return <>
    <div className="welcome"><div><span className="date"><CalendarDays size={14} /> {new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(new Date())}</span><h1>{greetingName}, 반가워요 👋</h1><p>오늘도 다솜쌤과 함께 여유롭게 수업을 준비해 보세요.</p></div><div className="weather"><span>☀️</span><div><b>오늘의 수업 준비</b><small>차근차근 시작해 보세요</small></div></div></div>
    <section className="hero-cards">
      <button className="hero-card blue" onClick={() => go("/operations")}><span className="hero-icon"><BriefcaseBusiness /></span><span><small>학급 운영을 더 가볍게</small><b>업무·학급 운영 도우미</b><em>소통, 기록, 학급관리 업무를 도와드려요 <ChevronRight size={17} /></em></span><span className="orb" /></button>
      <button className="hero-card green" onClick={() => go("/lessons")}><span className="hero-icon"><BookOpen /></span><span><small>수업 준비를 더 알차게</small><b>수업 도우미</b><em>지도안부터 평가까지 한 번에 준비해요 <ChevronRight size={17} /></em></span><span className="orb" /></button>
    </section>
    <div className="section-heading"><div><h2>오늘의 바로가기</h2><p>자주 사용하는 기능을 빠르게 시작하세요.</p></div><button className="text-btn" onClick={() => go("/lessons")}>전체 기능 보기 <ChevronRight size={15} /></button></div>
    <div className="quick-grid">{[[operationTools[0],"/messages"],[lessonTools[0],"/lesson-plans"],[lessonTools[1],"/leveled-korean-worksheets"],[lessonTools[2],"/korean-performance-assessments"]].map(([tool,route]) => {const t=tool as Tool;return <button className="quick-card" key={t.title} onClick={() => go(route as string)}><span className={`tool-icon ${t.color}`}><t.icon size={22} /></span><span><b>{t.title}</b><small>{t.desc}</small></span><Plus size={17} /></button>})}</div>
    <div className="dashboard-grid">
      <section className="card"><div className="card-head"><div><h2>최근 작업</h2><p>사용했던 도구를 빠르게 다시 열어 보세요.</p></div><button className="text-btn" onClick={() => go("/workspace")}>모두 보기</button></div><RecentList items={recentItems.slice(0,3)} go={go} loading={activityLoading} emptyText="아직 저장한 메시지나 템플릿이 없어요. 도구를 사용하고 결과를 저장해 보세요."/></section>
      <section className="card recommendation"><div className="card-head"><div><span className="eyebrow"><Sparkles size={13} /> 선생님을 위한 추천</span><h2>1학년 국어 수행평가,<br />기준부터 관찰표까지 준비해요</h2></div></div><p>성취기준과 평가 요소를 입력하면<br />학생용·교사용 자료를 함께 만들어요.</p><button className="primary-btn" onClick={() => go("/korean-performance-assessments")}>수행평가 만들기 <ChevronRight size={16} /></button><span className="seat-art"><i /><i /><i /><i /><i /><i /></span></section>
    </div>
    <div className="section-heading"><div><h2>카테고리 한눈에 보기</h2><p>필요한 도움을 바로 찾아보세요.</p></div></div>
    <div className="category-summary">{[["소통", "학부모 메시지, 가정통신문", MessageCircleMore, "blue", "/messages"],["수업 설계", "지도안, 일일수학", BookOpen, "mint", "/lesson-plans"],["평가", "1학년 국어 수행평가", ClipboardCheck, "purple", "/korean-performance-assessments"],["학급관리", "출석, 역할 배정", Users, "orange", "/attendance-assignments"]].map(([a,b,I,c,route]) => { const Icon=I as React.ElementType; return <button key={a as string} onClick={() => go(route as string)}><span className={`tool-icon ${c}`}><Icon size={20}/></span><span><b>{a as string}</b><small>{b as string}</small></span><ChevronRight size={17}/></button>})}</div>
  </>;
}

function ToolsPage({ kind }: { kind: "operations" | "lessons" }) {
  const isLesson = kind === "lessons"; const tools = isLesson ? lessonTools : operationTools;
  const categories = isLesson ? ["전체", "공통", "국어", "수학", "통합/사회/과학", "영어"] : ["전체", "소통", "기록/행정", "학급관리", "분석"];
  const [category, setCategory] = useState("전체"); const [selected, setSelected] = useState(tools[0]);
  const selectedRoute = toolRoutes[selected.title];
  const visible = category === "전체" ? tools : tools.filter(t => t.category === category || (category === "통합/사회/과학" && t.category === "통합"));
  return <>
    <div className="page-title"><div><span className="eyebrow">{isLesson ? "LESSON ASSISTANT" : "CLASS ASSISTANT"}</span><h1>{isLesson ? "수업 도우미" : "업무·학급 운영 도우미"}</h1><p>{isLesson ? "교과와 학년에 맞는 수업 자료를 쉽고 빠르게 준비하세요." : "반복되는 학급 업무는 줄이고, 아이들에게 더 집중하세요."}</p></div><button className="outline-btn"><Clock3 size={16}/> 최근 작업</button></div>
    {isLesson && <div className="filter-bar"><span><SlidersHorizontal size={17}/> 수업 정보</span><Select>3학년</Select><Select>1학기</Select><Select>수학</Select><button className="filter-reset">초기화</button></div>}
    <div className="tabs">{categories.map(c => <button className={category === c ? "active" : ""} onClick={() => setCategory(c)} key={c}>{c}</button>)}</div>
    <div className="tools-layout">
      <section className="tool-list-section"><div className="section-heading compact"><div><h2>{category === "전체" ? "전체 기능" : category}</h2><p>{visible.length}개의 도구가 있어요.</p></div><div className="view-toggle"><button className="active"><Grid2X2 size={16}/></button><button><Menu size={16}/></button></div></div><div className="tool-grid">{visible.map(t => <ToolCard key={t.title} tool={t} selected={selected.title === t.title} onClick={() => openTool(t, setSelected)}/>)}</div></section>
      <aside className="detail-card"><span className={`tool-icon large ${selected.color}`}><selected.icon size={26}/></span><span className="eyebrow">{selected.category}</span><h2>{selected.title}</h2><p>{selected.desc}. 선생님이 입력한 내용을 바탕으로 알맞은 초안을 제안합니다.</p><div className="detail-example"><b>이런 내용을 입력해요</b><ul><li><Check size={14}/> {isLesson ? "대상 학년과 교과 정보" : "대상과 기본 정보"}</li><li><Check size={14}/> 전달하고 싶은 핵심 내용</li><li><Check size={14}/> 원하는 말투와 길이</li></ul></div><button className="primary-btn full" disabled={!selectedRoute} onClick={() => selectedRoute && window.location.assign(selectedRoute)}><Sparkles size={16}/> {selectedRoute ? "이 도구 사용하기" : "준비 중"}</button></aside>
    </div>
  </>;
}

function WorkspacePage({ go, templates, messages, results, recentItems, activityLoading }: { go: (href: string) => void; templates: TeacherTemplate[]; messages: SavedMessage[]; results: GeneratedResult[]; recentItems: RecentItem[]; activityLoading: boolean }) {
  const favorites = templates.filter(t => t.isFavorite);
  const recentActivityCount = recentItems.filter(item => Date.now() - new Date(item.updatedAt).getTime() <= 7 * 24 * 60 * 60 * 1000).length;
  const savedResultItems: RecentItem[] = [
    ...templates.map(t => ({ id: `template-${t.id}`, title: t.title, toolLabel: t.scope, route: "/templates", updatedAt: t.updatedAt, kind: "template" as const })),
    ...results.map(r => ({ id: `result-${r.id}`, title: r.title, toolLabel: GENERATED_RESULT_LABELS[r.tool], route: GENERATED_RESULT_ROUTES[r.tool], updatedAt: r.updatedAt, kind: "result" as const })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <><div className="page-title"><div><span className="eyebrow">MY WORKSPACE</span><h1>내 작업공간</h1><p>최근 작업과 즐겨찾기 자료를 편리하게 관리하세요.</p></div><button className="primary-btn" onClick={()=>go("/templates")}><Plus size={17}/> 새 템플릿 만들기</button></div>
  <div className="stats-row">{[["최근 7일 작업",String(recentActivityCount),Clock3,"blue"],["즐겨찾기 템플릿",String(favorites.length),Heart,"orange"],["저장한 메시지",String(messages.length),Save,"mint"],["저장한 생성 결과물",String(results.length),Sparkles,"purple"],["내 템플릿",String(templates.length),LayoutTemplate,"purple"]].map(([a,b,I,c])=>{const Icon=I as React.ElementType;return <div className="stat-card" key={a as string}><span className={`tool-icon ${c}`}><Icon size={20}/></span><span><small>{a as string}</small><b>{b as string}</b></span></div>})}</div>
  <div className="workspace-layout">
    <section className="card"><div className="card-head"><div><h2>이어서 작업하기</h2><p>최근 저장한 메시지, 생성 결과, 템플릿이에요.</p></div></div><RecentList items={recentItems} go={go} loading={activityLoading} emptyText="아직 저장한 자료가 없어요. 도구를 사용하고 결과를 저장해 보세요."/></section>
    <section className="card folders"><div className="card-head"><div><h2>즐겨찾기 템플릿</h2><p>별표로 표시해 둔 템플릿이에요.</p></div><button className="text-btn" onClick={()=>go("/templates")}>전체 보기</button></div>{activityLoading ? <p className="recent-list-status"><LoaderCircle className="spin" size={15}/> 불러오는 중이에요.</p> : favorites.length ? favorites.slice(0,5).map((t,i)=><button key={t.id} onClick={()=>go("/templates")}><span className={`folder f${i%3}`}><Star size={18} fill="currentColor"/></span><span><b>{t.title}</b><small>{t.resourceType} · {t.grade}</small></span><ChevronRight size={17}/></button>) : <p className="recent-list-status">템플릿 보관함에서 별 아이콘을 눌러 즐겨찾기에 추가해 보세요.</p>}</section>
  </div>
  <section className="card empty-card"><div className="card-head"><div><h2>저장한 결과물</h2><p>내 계정에 저장한 템플릿과 생성 결과가 표시됩니다.</p></div>{templates.length+results.length>0 && <button className="text-btn" onClick={()=>go("/templates")}>전체 보기</button>}</div>{activityLoading ? <p className="recent-list-status"><LoaderCircle className="spin" size={15}/> 불러오는 중이에요.</p> : savedResultItems.length ? <div className="recent-list">{savedResultItems.slice(0,5).map((item,i)=><button key={item.id} onClick={()=>go(item.route)}><span className={`file-icon f${i%3}`}><FileText size={18}/></span><span><b>{item.title}</b><small>{item.toolLabel} · {timeAgo(item.updatedAt)}</small></span><span className="subject-badge">{item.kind==="template"?"템플릿":"생성 결과"}</span><ChevronRight size={18}/></button>)}</div> : <EmptyState onCreate={()=>go("/templates")}/>}</section></>;
}

function HelpPage({userName,userId}:{userName:string;userId:string}) {
  const [open, setOpen] = useState(0);
  return <><div className="page-title"><div><span className="eyebrow">SETTINGS & HELP</span><h1>설정·도움말</h1><p>다솜쌤을 더 편리하게 사용하는 방법을 알아보세요.</p></div></div>
  <section className="card account-summary"><span className="tool-icon blue"><UserRound size={21}/></span><div><small>현재 로그인 계정</small><b>{userName}</b><em>@{userId}</em></div><button className="outline-btn" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.assign("/login")}}>로그아웃</button></section>
  <div className="help-grid"><section className="card intro-card"><span className="logo-mark"><Sparkles/></span><div><span className="eyebrow">서비스 소개</span><h2>선생님의 하루에<br/>작은 여유를 더해요</h2><p>다솜쌤은 수업 준비와 학급 운영에 필요한 도구를 한곳에 모은 AI 교사 도우미입니다.</p></div></section><section className="card"><div className="card-head"><div><h2>빠른 사용 가이드</h2><p>세 단계면 충분해요.</p></div></div><ol className="guide"><li><span>1</span><div><b>필요한 도구 선택</b><p>카테고리에서 원하는 도구를 찾아요.</p></div></li><li><span>2</span><div><b>간단한 정보 입력</b><p>학년, 교과, 상황을 알려주세요.</p></div></li><li><span>3</span><div><b>결과 확인 및 저장</b><p>내용을 다듬어 바로 활용해요.</p></div></li></ol></section></div>
  <section className="card faq"><div className="card-head"><div><h2>자주 묻는 질문</h2><p>궁금한 내용을 확인해 보세요.</p></div></div>{["AI가 만든 결과를 바로 사용해도 되나요?","입력한 학생 정보는 안전하게 보호되나요?","생성 결과를 수정하거나 다시 만들 수 있나요?","새로운 기능은 언제 추가되나요?"].map((q,i)=><button key={q} onClick={()=>setOpen(open===i?-1:i)}><span>{q}{open===i&&<small>현재는 디자인 프로토타입이며, 실제 서비스에서는 선생님이 내용을 확인하고 자유롭게 수정한 뒤 사용할 수 있어요.</small>}</span><ChevronDown className={open===i?"rotate":""} size={18}/></button>)}</section>
  <section className="update-banner"><span><Sparkles size={22}/></span><div><b>더 많은 기능을 준비하고 있어요</b><p>학교 일정 연동, 협업 공간, 맞춤형 추천 기능이 순차적으로 추가될 예정입니다.</p></div><span className="subject-badge">업데이트 예정</span></section></>;
}

export function AppShell({ section: raw, userEmail, userName }: { section: string; userEmail?: string; userName?: string }) {
  const section: Section = (["dashboard","operations","lessons","templates","workspace","help","messages","newsletters","lesson-plans","student-observations","writing-feedback","leveled-korean-worksheets","korean-performance-assessments","multiplication-quiz","daily-math","daily-english","history-quiz","textbook-dictation","attendance-assignments","class-roles","class-management","surveys"] as string[]).includes(raw) ? raw as Section : "dashboard";
  const [mobile, setMobile] = useState(false); const [notice, setNotice] = useState(false);
  const [currentClass, setCurrentClass] = useState<{grade:number;classNumber:number;name?:string}|null>(null);
  const [templates, setTemplates] = useState<TeacherTemplate[]>([]);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [generatedResults, setGeneratedResults] = useState<GeneratedResult[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  useEffect(()=>{let active=true;fetch("/api/attendance-assignments",{cache:"no-store"}).then(r=>r.ok?r.json():null).then((data)=>{const result=data as {classes?:{grade:number;classNumber:number;name?:string}[]}|null;if(active)setCurrentClass(result?.classes?.[0]||null)}).catch(()=>undefined);return()=>{active=false}},[]);
  useEffect(()=>{let active=true;Promise.all([
    fetch("/api/templates",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/messages",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
    fetch("/api/generated-results",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
  ]).then(([templatePayload,messagePayload,resultPayload])=>{
    if(!active)return;
    setTemplates((templatePayload as {templates?:TeacherTemplate[]}|null)?.templates||[]);
    setMessages((messagePayload as {messages?:SavedMessage[]}|null)?.messages||[]);
    setGeneratedResults((resultPayload as {results?:GeneratedResult[]}|null)?.results||[]);
    setActivityLoading(false);
  });return()=>{active=false}},[]);
  const recentItems = buildRecentItems(templates, messages, generatedResults);
  const go = (href:string) => { window.location.href = href; };
  return <div className="app-shell">
    <aside className={`sidebar ${mobile ? "open" : ""}`}><div className="brand"><span className="logo-mark"><Sparkles size={21}/></span><span><b>다솜쌤</b><small>AI 교사 도우미</small></span><button onClick={()=>setMobile(false)} className="mobile-close"><X/></button></div><nav>{nav.map(n=>{const active=section===n.id || ((section==="messages" || section==="newsletters" || section==="student-observations" || section==="attendance-assignments" || section==="class-roles" || section==="surveys") && n.id==="operations") || ((section==="lesson-plans" || section==="writing-feedback" || section==="leveled-korean-worksheets" || section==="korean-performance-assessments" || section==="multiplication-quiz") && n.id==="lessons");return <a key={n.id} href={n.href} className={`${active?"active":""} ${n.id==="class-management"?"standalone-nav":""}`}><n.icon size={19}/><span>{n.label}</span>{n.id==="lessons"&&<em>NEW</em>}</a>})}</nav><div className="side-bottom"><a href="/help" className={section==="help"?"active":""}><CircleHelp size={19}/>설정·도움말</a><div className="support"><span><Sparkles size={17}/></span><b>무엇을 도와드릴까요?</b><p>사용 중 궁금한 점을<br/>편하게 알려주세요.</p><button>도움말 보기</button></div><div className="profile"><span>{(userName||userEmail||"교").slice(0,1)}</span><div><b>{userName||"로그인한 교사"}</b><small>{userEmail||""}</small></div><button className="logout-button" aria-label="로그아웃" title="로그아웃" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});window.location.assign("/login")}}><MoreHorizontal size={18}/></button></div></div></aside>
    <div className="main-wrap"><header><button className="menu-button" onClick={()=>setMobile(true)}><Menu/></button><div className="global-search"><Search size={18}/><input placeholder="기능이나 자료를 검색해 보세요"/><kbd>⌘ K</kbd></div><div className="header-actions"><button className="icon-button" onClick={()=>setNotice(!notice)}><Bell size={19}/><i/></button><span className="header-divider"/><button className="school" onClick={()=>go("/class-management")}><span>{currentClass?`${currentClass.grade}-${currentClass.classNumber}`:"+"}</span><div><small>현재 학급</small><b>{currentClass?`${currentClass.grade}학년 ${currentClass.classNumber}반${currentClass.name?` · ${currentClass.name}`:""}`:"학급을 등록해 주세요"}</b></div><ChevronRight size={15}/></button></div>{notice&&<div className="notice-pop"><b>알림</b><button onClick={()=>setNotice(false)}><X size={15}/></button><p>{userName||"선생님"} 계정으로 안전하게 로그인되어 있어요.</p><small>@{userEmail}</small></div>}</header>
      <main>{section==="dashboard"&&<Dashboard go={go} userName={userName||userEmail||"선생님"} recentItems={recentItems} activityLoading={activityLoading}/>} {section==="operations"&&<ToolsPage kind="operations"/>}{section==="lessons"&&<ToolsPage kind="lessons"/>}{section==="templates"&&<TemplateLibrary/>}{section==="workspace"&&<WorkspacePage go={go} templates={templates} messages={messages} results={generatedResults} recentItems={recentItems} activityLoading={activityLoading}/>}{section==="help"&&<HelpPage userName={userName||"선생님"} userId={userEmail||""}/>} {section==="messages"&&<MessageGenerator/>}{section==="newsletters"&&<NewsletterGenerator/>}{section==="lesson-plans"&&<LessonPlanGenerator/>}{section==="student-observations"&&<StudentObservationOrganizer/>}{section==="writing-feedback"&&<WritingFeedbackAssistant/>}{section==="leveled-korean-worksheets"&&<LeveledKoreanWorksheetGenerator/>}{section==="korean-performance-assessments"&&<KoreanPerformanceAssessmentGenerator/>}{section==="multiplication-quiz"&&<MultiplicationQuiz/>}{section==="daily-math"&&<DailyMathWorksheet/>}{section==="daily-english"&&<DailyEnglishWorksheet/>}{section==="history-quiz"&&<HistoryQuiz/>}{section==="textbook-dictation"&&<TextbookDictation/>}{section==="attendance-assignments"&&<AttendanceAssignmentManager/>}{section==="class-roles"&&<ClassRoleAssignment/>}{section==="class-management"&&<ClassStudentManager/>}{section==="surveys"&&<SurveyManager/>}</main>
    </div><ContextualHelp section={section}/>{mobile&&<button className="overlay" onClick={()=>setMobile(false)} aria-label="메뉴 닫기"/>}
  </div>;
}
