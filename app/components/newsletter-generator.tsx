"use client";

import { useState } from "react";
import { BookOpenCheck, Check, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { FieldError, GeneratorResult } from "./generator-result";
import {
  NEWSLETTER_AUDIENCES, NEWSLETTER_LENGTHS, NEWSLETTER_TONES, NEWSLETTER_TYPES,
  validateNewsletterInput, type NewsletterErrors, type NewsletterInput,
} from "../lib/newsletter-generator";

const initialForm: NewsletterInput = {
  type: "행사 안내", audience: "전체 학생", audienceDetail: "", title: "", coreContent: "",
  organization: "", sender: "", issuedDate: "", date: "", time: "", place: "", participants: "", materials: "", cost: "", notes: "",
  needsReply: false, replyDeadline: "", replyMethod: "", contact: "", tone: "공식적으로", length: "보통",
};

export function NewsletterGenerator() {
  const [form, setForm] = useState<NewsletterInput>(initialForm);
  const [errors, setErrors] = useState<NewsletterErrors>({});
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const scheduleTypes = ["행사 안내", "교육활동 안내", "체험학습 안내", "일정 변경 안내"];
  const materialTypes = ["행사 안내", "교육활동 안내", "체험학습 안내", "준비물 안내"];
  const costTypes = ["행사 안내", "체험학습 안내", "신청·동의 안내"];
  const showSchedule = scheduleTypes.includes(form.type);
  const showMaterials = materialTypes.includes(form.type);
  const showCost = costTypes.includes(form.type);

  const update = <K extends keyof NewsletterInput>(key: K, value: NewsletterInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const generate = async () => {
    const validation = validateNewsletterInput(form);
    setErrors(validation.errors); setApiError("");
    if (!validation.data) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/newsletters/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const payload = await response.json() as { newsletter?: string; error?: string; fields?: NewsletterErrors };
      if (!response.ok || !payload.newsletter) {
        if (payload.fields) setErrors(payload.fields);
        throw new Error(payload.error || "가정통신문을 생성하지 못했습니다.");
      }
      setResult(payload.newsletter);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "가정통신문을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setIsLoading(false); }
  };

  return <>
    <div className="page-title message-page-title"><div><span className="eyebrow">FAMILY NEWSLETTER ASSISTANT</span><h1>가정통신문 생성기</h1><p>핵심 내용을 입력하면 학부모에게 배부할 수 있는 공식적인 가정통신문 초안을 작성해 드려요.</p></div><span className="privacy-note"><Check size={15}/> 입력 내용은 저장하지 않아요</span></div>
    <div className="newsletter-reference-notice"><BookOpenCheck/><div><b>공식 학교 문서 형식 참고</b><p>교육청 예시와 여러 초등학교 공개 가정통신문에서 추출한 유형별 구조·문체를 참고합니다. 원문이나 다른 학교의 개인정보는 복사하지 않습니다.</p></div><ShieldCheck/><div><b>2026 개인정보보호 지침 반영</b><p>대전광역시교육청 업무편람 등 첨부 지침을 바탕으로 최소 수집, 동의 항목 구분, 아동 개인정보 보호 원칙을 적용합니다.</p></div></div>
    <div className="message-builder newsletter-builder">
      <section className="form-panel message-form newsletter-form">
        <div className="panel-head"><div><span className="eyebrow">STEP 1</span><h3>기본 정보</h3></div><span className="required">* 필수 항목</span></div>
        <div className="field-row"><label>가정통신문 유형 *<select value={form.type} onChange={(e)=>update("type", e.target.value as NewsletterInput["type"])}>{NEWSLETTER_TYPES.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.type}/></label><label>안내 대상 *<select value={form.audience} onChange={(e)=>update("audience", e.target.value as NewsletterInput["audience"])}>{NEWSLETTER_AUDIENCES.map(x=><option key={x}>{x}</option>)}</select><FieldError message={errors.audience}/></label></div>
        {form.audience !== "전체 학생" && <label>대상 상세 *<input value={form.audienceDetail} placeholder={form.audience === "특정 학년" ? "예: 3학년" : form.audience === "특정 학급" ? "예: 3학년 2반" : "안내 대상을 입력해 주세요"} onChange={(e)=>update("audienceDetail",e.target.value)}/><FieldError message={errors.audienceDetail}/></label>}
        <label>제목 <span className="optional">선택 · 비워두면 AI가 생성</span><input value={form.title} placeholder="예: 2026학년도 가을 현장체험학습 안내" onChange={(e)=>update("title",e.target.value)}/></label>
        <label>핵심 안내 내용 *<small className="field-help">확정된 사실과 꼭 전달해야 할 내용을 적어 주세요.</small><textarea value={form.coreContent} maxLength={3000} placeholder="행사 목적, 주요 활동, 학부모 협조 사항 등을 입력해 주세요." onChange={(e)=>update("coreContent",e.target.value)}/><FieldError message={errors.coreContent}/></label>
        <div className="field-row"><label>학교명 또는 기관명 <span className="optional">선택</span><input value={form.organization} placeholder="예: 서울푸른초등학교" onChange={(e)=>update("organization",e.target.value)}/></label><label>발신자 <span className="optional">선택</span><input value={form.sender} placeholder="예: 학교장, 3학년 담임교사" onChange={(e)=>update("sender",e.target.value)}/></label></div>
        <label>작성일 <span className="optional">선택 · 행사 날짜와 별도</span><input value={form.issuedDate} placeholder="예: 2026년 9월 1일" onChange={(e)=>update("issuedDate",e.target.value)}/></label>

        {(showSchedule || showMaterials || showCost) && <><div className="divider"/><div className="panel-head option-head"><div><span className="eyebrow">STEP 2</span><h3>일정 및 세부 정보</h3></div></div></>}
        {showSchedule && <><div className="field-row"><label>날짜 <span className="optional">선택</span><input value={form.date} placeholder="예: 2026년 9월 3일" onChange={(e)=>update("date",e.target.value)}/></label><label>시간 <span className="optional">선택</span><input value={form.time} placeholder="예: 오전 9시~오후 2시" onChange={(e)=>update("time",e.target.value)}/></label></div><div className="field-row"><label>장소 <span className="optional">선택</span><input value={form.place} placeholder="예: 서울숲 체험학습장" onChange={(e)=>update("place",e.target.value)}/></label><label>참여 대상 <span className="optional">선택</span><input value={form.participants} placeholder="예: 3학년 학생 전체" onChange={(e)=>update("participants",e.target.value)}/></label></div></>}
        {showMaterials && <label>준비물 <span className="optional">선택</span><input value={form.materials} placeholder="예: 도시락, 물, 필기도구" onChange={(e)=>update("materials",e.target.value)}/></label>}
        {showCost && <label>비용 <span className="optional">선택</span><input value={form.cost} placeholder="예: 1인당 15,000원" onChange={(e)=>update("cost",e.target.value)}/></label>}
        <label>기타 유의사항 <span className="optional">선택</span><textarea value={form.notes} placeholder="안전, 복장, 일정 변경 조건 등 추가 안내를 입력해 주세요." onChange={(e)=>update("notes",e.target.value)}/></label>

        <div className="divider"/><div className="panel-head option-head"><div><span className="eyebrow">STEP 3</span><h3>신청 또는 회신 정보</h3></div></div>
        <fieldset><legend>신청·회신 필요 여부 *</legend><div className="choice-grid two"><button type="button" className={form.needsReply?"choice active":"choice"} onClick={()=>update("needsReply",true)}>신청·회신 필요</button><button type="button" className={!form.needsReply?"choice active":"choice"} onClick={()=>update("needsReply",false)}>필요 없음</button></div></fieldset>
        {form.needsReply && <div className="conditional-fields"><div className="field-row"><label>신청·회신 기한 <span className="optional">선택</span><input value={form.replyDeadline} placeholder="예: 9월 1일까지" onChange={(e)=>update("replyDeadline",e.target.value)}/></label><label>문의처 <span className="optional">선택</span><input value={form.contact} placeholder="예: 3학년 교무실 02-000-0000" onChange={(e)=>update("contact",e.target.value)}/></label></div><label>신청 방법 <span className="optional">선택</span><textarea value={form.replyMethod} placeholder="예: 학교 알림 앱의 설문에서 참여 여부를 선택해 주세요." onChange={(e)=>update("replyMethod",e.target.value)}/></label></div>}
        {!form.needsReply && <label>문의처 <span className="optional">선택</span><input value={form.contact} placeholder="문의 가능한 연락처나 담당자를 입력해 주세요." onChange={(e)=>update("contact",e.target.value)}/></label>}

        <div className="divider"/><div className="panel-head option-head"><div><span className="eyebrow">STEP 4</span><h3>문서 설정</h3></div></div>
        <fieldset><legend>말투 *</legend><div className="choice-grid three">{NEWSLETTER_TONES.map(x=><button type="button" key={x} className={form.tone===x?"choice active":"choice"} onClick={()=>update("tone",x)}>{x}</button>)}</div><FieldError message={errors.tone}/></fieldset>
        <fieldset><legend>길이 *</legend><div className="choice-grid three">{NEWSLETTER_LENGTHS.map(x=><button type="button" key={x} className={form.length===x?"choice active":"choice"} onClick={()=>update("length",x)}>{x}</button>)}</div><FieldError message={errors.length}/></fieldset>
        <button type="button" className="primary-btn generate-message" onClick={generate} disabled={isLoading}>{isLoading?<><LoaderCircle className="spin" size={17}/> 가정통신문을 작성하고 있어요</>:<><Sparkles size={17}/> 가정통신문 생성하기</>}</button>
      </section>
      <GeneratorResult eyebrow="생성 결과" title="가정통신문 초안" result={result} setResult={setResult} isLoading={isLoading} apiError={apiError} onRegenerate={generate} emptyTitle="아직 생성된 가정통신문이 없어요" emptyDescription={<>왼쪽에서 안내 정보를 입력한 뒤<br/>가정통신문 생성 버튼을 눌러 주세요.</>} editHint="배부하기 전에 날짜, 비용, 연락처 등 세부 정보를 다시 확인해 주세요." resultAriaLabel="생성된 가정통신문 수정"/>
    </div>
  </>;
}
