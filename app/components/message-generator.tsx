"use client";

import { useState } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import {
  LENGTHS, MESSAGE_SITUATIONS, MESSAGE_TYPES, RECIPIENTS, TONES,
  validateMessageInput, type MessageGeneratorInput, type MessageType, type ValidationErrors,
} from "../lib/message-generator";
import { FieldError, GeneratorResult } from "./generator-result";

const initialForm: MessageGeneratorInput = {
  messageType: "문의 답변",
  situation: "결석 문의",
  recipient: "학부모",
  studentName: "",
  facts: "",
  request: "",
  deadline: "",
  tone: "정중하게",
  length: "보통",
};

export function MessageGenerator() {
  const [form, setForm] = useState<MessageGeneratorInput>(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const situations = MESSAGE_SITUATIONS[form.messageType];
  const needsDate = ["결석 문의", "지각", "준비물 미지참", "과제 미제출"].includes(form.situation);

  const update = <K extends keyof MessageGeneratorInput>(key: K, value: MessageGeneratorInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const changeType = (messageType: MessageType) => {
    setForm((current) => ({
      ...current,
      messageType,
      situation: MESSAGE_SITUATIONS[messageType][0],
      deadline: "",
    }));
    setErrors((current) => ({ ...current, messageType: undefined, situation: undefined }));
  };

  const generate = async () => {
    const validation = validateMessageInput(form);
    setErrors(validation.errors);
    setApiError("");
    if (!validation.data) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const payload = await response.json() as { message?: string; error?: string; fields?: ValidationErrors };
      if (!response.ok || !payload.message) {
        if (payload.fields) setErrors(payload.fields);
        throw new Error(payload.error || "메시지를 생성하지 못했습니다.");
      }
      setResult(payload.message);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return <>
    <div className="page-title message-page-title">
      <div><span className="eyebrow">COMMUNICATION ASSISTANT</span><h1>메시지 생성기</h1><p>확인한 사실을 입력하면 학부모나 학생에게 보낼 정중한 메시지를 작성해 드려요.</p></div>
      <span className="privacy-note"><Check size={15} /> 입력 내용은 저장하지 않아요</span>
    </div>

    <div className="message-builder">
      <section className="form-panel message-form">
        <div className="panel-head"><div><span className="eyebrow">STEP 1</span><h3>메시지 정보 입력</h3></div><span className="required">* 필수 항목</span></div>

        <fieldset><legend>메시지 유형 *</legend><div className="choice-grid two">{MESSAGE_TYPES.map((type) => <button type="button" key={type} className={form.messageType === type ? "choice active" : "choice"} onClick={() => changeType(type)}>{type}</button>)}</div><FieldError message={errors.messageType} /></fieldset>
        <fieldset><legend>세부 상황 *</legend><div className="choice-grid three">{situations.map((situation) => <button type="button" key={situation} className={form.situation === situation ? "choice active" : "choice"} onClick={() => update("situation", situation)}>{situation}</button>)}</div><FieldError message={errors.situation} /></fieldset>

        <div className="field-row">
          <label>수신 대상 *<select value={form.recipient} onChange={(event) => update("recipient", event.target.value as MessageGeneratorInput["recipient"])}>{RECIPIENTS.map((recipient) => <option key={recipient}>{recipient}</option>)}</select><FieldError message={errors.recipient} /></label>
          <label>학생 이름 또는 호칭 <span className="optional">선택</span><input value={form.studentName} maxLength={40} placeholder="예: 민준이, 3학년 2반 학생" onChange={(event) => update("studentName", event.target.value)} /></label>
        </div>

        <label>전달할 상황 *<small className="field-help">직접 확인한 사실만 구체적으로 적어 주세요.</small><textarea value={form.facts} maxLength={2000} placeholder="예: 오늘 1교시 시작 후 10분 뒤에 교실에 도착했습니다." onChange={(event) => update("facts", event.target.value)} /><FieldError message={errors.facts} /></label>
        <label>전달하고 싶은 내용 또는 요청 사항 *<textarea value={form.request} maxLength={2000} placeholder="예: 내일부터는 수업 시작 전까지 등교할 수 있도록 가정에서도 확인 부탁드립니다." onChange={(event) => update("request", event.target.value)} /><FieldError message={errors.request} /></label>
        {needsDate && <label>날짜 또는 제출 기한 <span className="optional">필요한 경우</span><input value={form.deadline} maxLength={80} placeholder="예: 8월 14일 금요일까지" onChange={(event) => update("deadline", event.target.value)} /></label>}

        <div className="divider" />
        <div className="panel-head option-head"><div><span className="eyebrow">STEP 2</span><h3>표현 방식 선택</h3></div></div>
        <fieldset><legend>말투 *</legend><div className="choice-grid three">{TONES.map((tone) => <button type="button" key={tone} className={form.tone === tone ? "choice active" : "choice"} onClick={() => update("tone", tone)}>{tone}</button>)}</div><FieldError message={errors.tone} /></fieldset>
        <fieldset><legend>길이 *</legend><div className="choice-grid three">{LENGTHS.map((length) => <button type="button" key={length} className={form.length === length ? "choice active" : "choice"} onClick={() => update("length", length)}>{length}</button>)}</div><FieldError message={errors.length} /></fieldset>

        <button type="button" className="primary-btn generate-message" onClick={generate} disabled={isLoading}>{isLoading ? <><LoaderCircle className="spin" size={17} /> 메시지를 작성하고 있어요</> : <><Sparkles size={17} /> 메시지 생성하기</>}</button>
      </section>

      <GeneratorResult eyebrow="생성 결과" title="보낼 메시지" result={result} setResult={setResult} isLoading={isLoading} apiError={apiError} onRegenerate={generate} emptyTitle="아직 생성된 메시지가 없어요" emptyDescription={<>왼쪽에서 상황과 전달할 내용을 입력한 뒤<br />메시지 생성 버튼을 눌러 주세요.</>} editHint="내용을 확인하고 필요한 부분을 직접 수정한 뒤 사용해 주세요." resultAriaLabel="생성된 메시지 수정" />
    </div>
  </>;
}
