"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

export function AuthForm({ mode, returnTo = "/" }: { mode: "login" | "signup"; returnTo?: string }) {
  const signup = mode === "signup";
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (signup && password !== String(form.get("confirmPassword") || "")) { setError("비밀번호 확인이 일치하지 않습니다."); return; }
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password, displayName: form.get("displayName"), returnTo }) });
      const data = await response.json() as { error?: string; redirectTo?: string; confirmationRequired?: boolean };
      if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
      if (data.confirmationRequired) { setNotice("가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요."); return; }
      window.location.assign(data.redirectTo || "/");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "잠시 후 다시 시도해 주세요."); }
    finally { setLoading(false); }
  }

  return <div className="auth-page">
    <section className="auth-intro">
      <Link className="auth-brand" href="/"><span><Sparkles size={23}/></span><strong>다솜쌤</strong><small>AI 교사 도우미</small></Link>
      <div><p className="auth-eyebrow">선생님의 하루를 더 가볍게</p><h1>수업 준비와 학급 운영을<br/>한곳에서 시작하세요.</h1><p>교사 업무에 꼭 필요한 AI 도구와 학급 기록을<br/>내 계정으로 안전하게 관리할 수 있습니다.</p></div>
      <p className="auth-security"><LockKeyhole size={16}/>학급과 학생 기록은 로그인한 계정별로 구분됩니다.</p>
    </section>
    <main className="auth-main"><div className="auth-card">
      <div className="auth-heading"><span><UserRound size={21}/></span><h2>{signup ? "회원가입" : "로그인"}</h2><p>{signup ? "다솜쌤을 이용할 교사 계정을 만들어 주세요." : "가입한 이메일과 비밀번호를 입력해 주세요."}</p></div>
      <form onSubmit={submit} noValidate>
        {signup && <label>이름 또는 표시 이름<div className="auth-input"><UserRound size={17}/><input name="displayName" required maxLength={40} placeholder="예: 김다솜 선생님"/></div></label>}
        <label>이메일<div className="auth-input"><Mail size={17}/><input name="email" type="email" required autoComplete="email" placeholder="teacher@example.com"/></div></label>
        <label>비밀번호<div className="auth-input"><LockKeyhole size={17}/><input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={signup ? "new-password" : "current-password"} placeholder="8자 이상 입력"/><button type="button" aria-label="비밀번호 표시 전환" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
        {signup && <label>비밀번호 확인<div className="auth-input"><LockKeyhole size={17}/><input name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력"/></div></label>}
        {error && <p className="auth-message error" role="alert">{error}</p>}
        {notice && <p className="auth-message success" role="status">{notice}</p>}
        <button className="auth-submit" disabled={loading}>{loading ? "처리 중..." : signup ? "계정 만들기" : "로그인"}<ArrowRight size={17}/></button>
      </form>
      <p className="auth-switch">{signup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"} <Link href={`${signup?"/login":"/signup"}?returnTo=${encodeURIComponent(returnTo)}`}>{signup ? "로그인" : "회원가입"}</Link></p>
    </div></main>
  </div>;
}
