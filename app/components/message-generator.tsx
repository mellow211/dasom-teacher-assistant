"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, LoaderCircle, MessageSquareText, Sparkles, Trash2 } from "lucide-react";
import { LENGTHS, RECIPIENTS, TONES, validateMessageInput, type MessageGeneratorInput, type ValidationErrors } from "../lib/message-generator";
import type { SavedMessage } from "../lib/saved-message-store";
import { FieldError, GeneratorResult } from "./generator-result";

const initialForm: MessageGeneratorInput = { recipient: "학부모", studentName: "", content: "", deadline: "", tone: "정중하게", length: "보통" };

export function MessageGenerator() {
  const [form, setForm] = useState<MessageGeneratorInput>(initialForm);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [result, setResult] = useState("");
  const [savedId, setSavedId] = useState("");
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");
  const [saveNotice, setSaveNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/messages", { cache: "no-store" }).then(async response => {
      const payload = await response.json() as { messages?: SavedMessage[]; error?: string };
      if (!response.ok || !payload.messages) throw new Error(payload.error || "저장된 메시지를 불러오지 못했습니다.");
      if (active) setMessages(payload.messages);
    }).catch((error: unknown) => { if (active) setApiError(error instanceof Error ? error.message : "저장된 메시지를 불러오지 못했습니다."); });
    return () => { active = false; };
  }, []);

  const update = <K extends keyof MessageGeneratorInput>(key: K, value: MessageGeneratorInput[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };

  const generate = async () => {
    const validation = validateMessageInput(form);
    setErrors(validation.errors); setApiError(""); setSaveNotice("");
    if (!validation.data) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) });
      const payload = await response.json() as { message?: string; savedMessage?: SavedMessage; error?: string; fields?: ValidationErrors };
      if (!response.ok || !payload.message || !payload.savedMessage) {
        if (payload.fields) setErrors(payload.fields);
        throw new Error(payload.error || "메시지를 생성하지 못했습니다.");
      }
      setResult(payload.message); setSavedId(payload.savedMessage.id);
      setMessages(current => [payload.savedMessage!, ...current.filter(message => message.id !== payload.savedMessage!.id)]);
      setSaveNotice("생성된 메시지를 내 계정에 저장했어요.");
    } catch (error) { setApiError(error instanceof Error ? error.message : "메시지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setIsLoading(false); }
  };

  const saveChanges = async () => {
    if (!savedId || !result.trim()) return;
    setIsSaving(true); setApiError("");
    try {
      const response = await fetch("/api/messages", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: savedId, message: result }) });
      const payload = await response.json() as { message?: SavedMessage; error?: string };
      if (!response.ok || !payload.message) throw new Error(payload.error || "변경 내용을 저장하지 못했습니다.");
      setMessages(current => [payload.message!, ...current.filter(message => message.id !== savedId)]);
      setSaveNotice("수정한 메시지를 저장했어요.");
    } catch (error) { setApiError(error instanceof Error ? error.message : "변경 내용을 저장하지 못했습니다."); }
    finally { setIsSaving(false); }
  };

  const openSaved = (message: SavedMessage) => { setResult(message.message); setSavedId(message.id); setApiError(""); setSaveNotice("저장된 메시지를 불러왔어요."); };
  const removeSaved = async (message: SavedMessage) => {
    if (!window.confirm("이 저장 메시지를 삭제할까요?")) return;
    try {
      const response = await fetch("/api/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: message.id }) });
      if (!response.ok) throw new Error("저장 메시지를 삭제하지 못했습니다.");
      setMessages(current => current.filter(item => item.id !== message.id));
      if (savedId === message.id) { setSavedId(""); setResult(""); }
      setSaveNotice("저장 메시지를 삭제했어요.");
    } catch (error) { setApiError(error instanceof Error ? error.message : "저장 메시지를 삭제하지 못했습니다."); }
  };

  return <>
    <div className="page-title message-page-title"><div><span className="eyebrow">COMMUNICATION ASSISTANT</span><h1>메시지 생성기</h1><p>전달할 내용을 한 번에 입력하면 학부모나 학생에게 보낼 정중한 메시지를 작성해 드려요.</p></div><span className="privacy-note"><Check size={15} /> 생성 결과만 계정에 저장</span></div>
    <div className="message-builder">
      <section className="form-panel message-form">
        <div className="panel-head"><div><span className="eyebrow">STEP 1</span><h3>메시지 정보 입력</h3></div><span className="required">* 필수 항목</span></div>
        <div className="field-row aligned-fields">
          <label><span className="field-label">수신 대상 *</span><select value={form.recipient} onChange={event => update("recipient", event.target.value as MessageGeneratorInput["recipient"])}>{RECIPIENTS.map(recipient => <option key={recipient}>{recipient}</option>)}</select><FieldError message={errors.recipient} /></label>
          <label><span className="field-label">학생 이름 또는 호칭 <em>선택</em></span><input value={form.studentName} maxLength={40} placeholder="예: 민준이, 3학년 2반 학생" onChange={event => update("studentName", event.target.value)} /></label>
        </div>
        <label>전달할 상황과 내용 *<small className="field-help">확인한 사실과 전달하거나 요청할 내용을 함께 적어 주세요.</small><textarea className="message-content-input" value={form.content} maxLength={3000} placeholder="예: 오늘 준비물을 가져오지 않아 활동에 참여하기 어려웠습니다. 내일은 준비물을 챙겨 올 수 있도록 가정에서도 확인 부탁드립니다." onChange={event => update("content", event.target.value)} /><FieldError message={errors.content} /></label>
        <label>날짜 또는 제출 기한 <span className="optional">필요한 경우</span><input value={form.deadline} maxLength={80} placeholder="예: 8월 14일 금요일까지" onChange={event => update("deadline", event.target.value)} /></label>
        <div className="divider" /><div className="panel-head option-head"><div><span className="eyebrow">STEP 2</span><h3>표현 방식 선택</h3></div></div>
        <fieldset><legend>말투 *</legend><div className="choice-grid three message-option-grid">{TONES.map(tone => <button type="button" key={tone} aria-pressed={form.tone === tone} className={form.tone === tone ? "choice active" : "choice"} onClick={() => update("tone", tone)}>{tone}</button>)}</div><FieldError message={errors.tone} /></fieldset>
        <fieldset><legend>길이 *</legend><div className="choice-grid three message-option-grid">{LENGTHS.map(length => <button type="button" key={length} aria-pressed={form.length === length} className={form.length === length ? "choice active" : "choice"} onClick={() => update("length", length)}>{length}</button>)}</div><FieldError message={errors.length} /></fieldset>
        <button type="button" className="primary-btn generate-message" onClick={generate} disabled={isLoading}>{isLoading ? <><LoaderCircle className="spin" size={17} /> 메시지를 작성하고 있어요</> : <><Sparkles size={17} /> 메시지 생성하기</>}</button>
      </section>
      <div className="message-output-column">
        {saveNotice && <div className="save-notice"><Check size={15} />{saveNotice}</div>}
        <GeneratorResult eyebrow="생성 결과" title="보낼 메시지" result={result} setResult={setResult} isLoading={isLoading} apiError={apiError} onRegenerate={generate} onSave={savedId ? saveChanges : undefined} isSaving={isSaving} emptyTitle="아직 생성된 메시지가 없어요" emptyDescription={<>왼쪽에서 전달할 내용을 입력한 뒤<br />메시지 생성 버튼을 눌러 주세요.</>} editHint="생성 결과는 자동 저장됩니다. 직접 수정한 뒤에는 ‘변경 내용 저장’을 눌러 주세요." resultAriaLabel="생성된 메시지 수정" />
        <section className="saved-message-panel"><div className="panel-head"><div><span className="eyebrow"><Clock3 size={13} /> SAVED</span><h3>최근 저장 메시지</h3></div><b>{messages.length}개</b></div>{messages.length ? <div className="saved-message-list">{messages.map(message => <div key={message.id} className={message.id === savedId ? "active" : ""}><button type="button" onClick={() => openSaved(message)}><MessageSquareText size={17} /><span><b>{message.studentName || message.recipient}</b><small>{message.message}</small><time>{new Date(message.updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</time></span></button><button type="button" aria-label="저장 메시지 삭제" onClick={() => removeSaved(message)}><Trash2 size={15} /></button></div>)}</div> : <p className="saved-message-empty">생성한 메시지가 여기에 계정별로 저장됩니다.</p>}</section>
      </div>
    </div>
  </>;
}
