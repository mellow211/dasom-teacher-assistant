"use client";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Clock3, Delete, LoaderCircle, Trophy, UserRound, X } from "lucide-react";
import { buildPlayerResult, gradeAnswer, type AnswerRecord, type Problem } from "../lib/multiplication-quiz";

type Room = { mode: string; problems: Problem[]; timeLimit: number; status: string };
type Entry = { playerName: string; correctCount: number; totalCount: number; score: number; totalTime: number; submittedAt: string };
type Stage = "loading" | "error" | "join" | "playing" | "feedback" | "submitted";

export function MultiplicationBattleJoin() {
  const [code, setCode] = useState("");
  return <div className="mq-center"><section><span className="mq-mode-icon"><UserRound/></span><h1>대결방 입장하기</h1><p>선생님이 알려준 6자리 코드를 입력해 주세요.</p>
    <form onSubmit={e => { e.preventDefault(); if (code.trim()) location.href = `/mb/${code.trim().toUpperCase()}`; }}>
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="예: A1B2C3" style={{ textAlign: "center", fontSize: 24, letterSpacing: 4, width: "100%", border: "2px solid #b9cce0", borderRadius: 13, padding: "11px", margin: "16px 0", textTransform: "uppercase" }} maxLength={6}/>
      <button className="primary-btn" disabled={!code.trim()}>입장하기</button>
    </form>
  </section></div>;
}

export function MultiplicationBattleRoom({ code }: { code: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mine, setMine] = useState<{ correctCount: number; score: number } | null>(null);
  const resolved = useRef(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = room?.problems[index];

  useEffect(() => {
    let active = true;
    fetch(`/api/public-multiplication-battle/${code}`).then(async r => {
      const payload = await r.json() as Room & { error?: string };
      if (!r.ok) throw new Error(payload.error || "대결방을 찾을 수 없습니다.");
      if (active) { setRoom(payload); setStage("join"); }
    }).catch(e => { if (active) { setError(e instanceof Error ? e.message : "대결방을 찾을 수 없습니다."); setStage("error"); } });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (stage !== "submitted") return;
    let active = true;
    const poll = () => fetch(`/api/public-multiplication-battle/${code}/entries`).then(r => r.json()).then((raw) => { const p = raw as { entries?: Entry[] }; if (active && p.entries) setEntries(p.entries); }).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, [stage, code]);

  const clearTimers = () => { if (timer.current) clearInterval(timer.current); if (advanceTimer.current) clearTimeout(advanceTimer.current); timer.current = null; advanceTimer.current = null; };
  useEffect(() => () => clearTimers(), []);

  const begin = () => {
    if (!name.trim() || !room) return;
    resolved.current = false; startedAt.current = Date.now(); setSeconds(room.timeLimit); setInput(""); setIndex(0); setAnswers([]); setStage("playing");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submitAnswer = (timedOut = false) => {
    if (resolved.current || !current || !room) return;
    resolved.current = true;
    const elapsed = Math.max(0.1, Math.round((Date.now() - startedAt.current) / 100) / 10);
    const record = gradeAnswer(current, timedOut || input === "" ? null : Number(input), elapsed, timedOut);
    const next = [...answers, record];
    setAnswers(next);
    setStage("feedback");
    advanceTimer.current = setTimeout(() => {
      if (index + 1 < room.problems.length) { setIndex(i => i + 1); resolved.current = false; startedAt.current = Date.now(); setSeconds(room.timeLimit); setInput(""); setStage("playing"); setTimeout(() => inputRef.current?.focus(), 0); }
      else finish(next);
    }, 850);
  };

  const finish = async (finalAnswers: AnswerRecord[]) => {
    const result = buildPlayerResult(name.trim(), finalAnswers);
    setMine({ correctCount: result.correctCount, score: result.score });
    setStage("submitted");
    try {
      await fetch(`/api/public-multiplication-battle/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playerName: name.trim(), correctCount: result.correctCount, totalCount: finalAnswers.length, score: result.score, totalTime: result.totalTime }) });
    } catch { /* leaderboard submission best-effort; local result already shown */ }
  };

  useEffect(() => {
    if (stage !== "playing" || !room) return;
    timer.current = setInterval(() => {
      if (room.timeLimit === 0) setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      else setSeconds(value => { if (value <= 1) { setTimeout(() => submitAnswer(true), 0); return 0; } return value - 1; });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submitAnswer intentionally excluded to avoid resetting the interval every keystroke
  }, [stage, room]);

  const appendDigit = (digit: string) => setInput(value => value.length < 6 ? `${value}${digit}` : value);

  if (stage === "loading") return <div className="mq-center"><section><LoaderCircle className="spin"/><p>대결방을 불러오는 중입니다.</p></section></div>;
  if (stage === "error" || !room) return <div className="mq-center"><section><AlertTriangle/><h1>입장할 수 없어요</h1><p>{error}</p></section></div>;

  if (stage === "join") return <div className="mq-center"><section><span className="mq-mode-icon"><UserRound/></span><h1>대결 참가하기</h1><p>이름을 입력하고 시작하면 {room.problems.length}문제가 바로 시작돼요.</p>
    <form onSubmit={e => { e.preventDefault(); begin(); }}><input value={name} maxLength={12} onChange={e => setName(e.target.value)} placeholder="내 이름 또는 별명" style={{ width: "100%", border: "1px solid #d9e2ec", borderRadius: 10, padding: 12, fontSize: 17, margin: "16px 0" }}/><button className="primary-btn" disabled={!name.trim()}>시작하기</button></form>
  </section></div>;

  if (stage === "submitted") {
    return <div className="mq-page"><section className="mq-result"><Trophy className="mq-trophy"/><span className="mq-kicker">결과 제출 완료</span><h1>{name.trim()}님, 수고했어요!</h1>{mine && <p>정답 {mine.correctCount} / {room.problems.length}문제 · {mine.score}점</p>}
      <div className="mq-battle-leaderboard"><h2>실시간 순위</h2>{!entries.length ? <p className="mq-loading-row"><LoaderCircle className="spin" size={16}/> 순위를 불러오는 중...</p> : <ol>{entries.map((e, i) => <li key={`${e.playerName}-${e.submittedAt}`} className={e.playerName === name.trim() && e.score === mine?.score ? "me" : ""}><b>{i + 1}</b><span>{e.playerName}</span><em>{e.score}점</em><small>정답 {e.correctCount}/{e.totalCount}</small></li>)}</ol>}</div>
    </section></div>;
  }

  if (!current) return null;
  const latest = answers.at(-1);
  return <div className="mq-game"><div className="mq-game-top"><span>{name.trim()}</span><strong>{index + 1} / {room.problems.length}</strong><span><Clock3 size={16}/>{room.timeLimit ? `남은 ${seconds}초` : `${seconds}초`}</span></div>
    <div className="mq-progress"><span style={{ width: `${(index + 1) / room.problems.length * 100}%` }}/></div>
    <section className="mq-problem-card"><div className="mq-equation">{current.leftOperand} <b>×</b> {current.rightOperand} <b>=</b> ?</div>
      <form onSubmit={e => { e.preventDefault(); submitAnswer(false); }}><input ref={inputRef} aria-label="정답" inputMode="numeric" pattern="[0-9]*" value={input} disabled={stage === "feedback"} onChange={e => setInput(e.target.value.replace(/\D/g, ""))}/><button className="primary-btn" disabled={!input || stage === "feedback"}>제출</button></form>
      <div className="mq-keypad">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(number => <button key={number} disabled={stage === "feedback"} onClick={() => appendDigit(String(number))}>{number}</button>)}<button aria-label="한 글자 지우기" disabled={stage === "feedback"} onClick={() => setInput(value => value.slice(0, -1))}><Delete/></button></div>
      {stage === "feedback" && latest && <div className={`mq-feedback ${latest.isCorrect ? "correct" : "wrong"}`} aria-live="assertive">{latest.isCorrect ? <><Check/>정답이에요!</> : <><X/>{latest.timedOut ? "시간이 지났어요." : "다시 확인해 보세요."} 정답은 {latest.problem.correctAnswer}입니다.</>}</div>}
    </section>
  </div>;
}
