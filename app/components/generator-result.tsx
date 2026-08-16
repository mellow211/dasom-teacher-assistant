"use client";

import { useState } from "react";
import { AlertCircle, Check, Copy, FileText, LoaderCircle, RefreshCw, Save } from "lucide-react";

type GeneratorResultProps = {
  eyebrow: string;
  title: string;
  result: string;
  setResult: (value: string) => void;
  isLoading: boolean;
  apiError: string;
  onRegenerate: () => void;
  emptyTitle: string;
  emptyDescription: React.ReactNode;
  editHint: string;
  resultAriaLabel: string;
  onSave?: () => void;
  isSaving?: boolean;
  saveLabel?: string;
};

export function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error"><AlertCircle size={13} />{message}</span> : null;
}

export function GeneratorResult({
  eyebrow, title, result, setResult, isLoading, apiError, onRegenerate,
  emptyTitle, emptyDescription, editHint, resultAriaLabel, onSave, isSaving = false, saveLabel = "변경 내용 저장",
}: GeneratorResultProps) {
  const [copied, setCopied] = useState(false);

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return <section className="preview-panel message-result" aria-live="polite">
    <div className="panel-head"><div><span className="eyebrow"><FileText size={13} /> {eyebrow}</span><h3>{title}</h3></div>{result && <span className="result-ready"><Check size={13} /> 수정 가능</span>}</div>
    {apiError && <div className="api-error"><AlertCircle size={19} /><div><b>내용을 생성하지 못했어요</b><p>{apiError}</p><span>입력 내용을 확인한 뒤 ‘다시 생성’을 눌러 주세요.</span></div></div>}
    {result ? <>
      <textarea className="editable-result" value={result} onChange={(event) => setResult(event.target.value)} aria-label={resultAriaLabel} />
      <p className="edit-hint">{editHint}</p>
      <div className="preview-actions message-actions"><button className="ghost-btn" onClick={copyResult}>{copied ? <><Check size={16} /> 복사 완료</> : <><Copy size={16} /> 전체 내용 복사</>}</button>{onSave && <button className="ghost-btn" onClick={onSave} disabled={isSaving}>{isSaving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}{saveLabel}</button>}<button className="primary-btn" onClick={onRegenerate} disabled={isLoading}>{isLoading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} 다시 생성</button></div>
    </> : <div className="message-empty"><span><FileText size={28} /></span><b>{emptyTitle}</b><p>{emptyDescription}</p><div><span>1</span>정보 입력<span>2</span>문서 설정<span>3</span>결과 수정</div></div>}
  </section>;
}
