"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, Delete, LoaderCircle, QrCode, RotateCcw, Swords, Trophy, UserRound, X } from "lucide-react";
import { AnswerRecord, buildPlayerResult, Difficulty, GameMode, GameSettings, generateProblems, gradeAnswer, Problem, wrongProblems } from "../lib/multiplication-quiz";

type Stage = "mode-selection" | "settings" | "ready" | "playing" | "feedback" | "result" | "room";
type BattleEntry = { playerName: string; correctCount: number; totalCount: number; score: number; totalTime: number; submittedAt: string };
const modes: { mode: GameMode; title: string; description: string }[] = [
  { mode: "table-solo", title: "구구단 놀이 · 혼자 하기", description: "원하는 단을 골라 내 속도로 연습해요." },
  { mode: "table-battle", title: "구구단 놀이 · 대결하기", description: "QR이나 코드로 같은 방에 입장해 실시간 순위로 겨뤄요." },
  { mode: "multiplication-solo", title: "곱셈 문제 · 혼자 하기", description: "난이도를 골라 다양한 곱셈을 연습해요." },
  { mode: "multiplication-battle", title: "곱셈 문제 · 대결하기", description: "같은 난이도와 문항 수로 방을 만들어 실시간으로 겨뤄요." },
];
const difficultyLabels: Record<Difficulty, string> = { easy: "쉬움", normal: "보통", hard: "어려움", challenge: "도전", mixed: "섞어서" };
const initialSettings: GameSettings = { selectedTables: [2,3,4,5,6,7,8,9], difficulty: "easy", questionCount: 10, timeLimit: 0 };
const shortTitle = (mode: GameMode) => modes.find((item) => item.mode === mode)?.title.split(" · ")[0] ?? "곱셈 퀴즈";

export function MultiplicationQuiz() {
  const [stage, setStage] = useState<Stage>("mode-selection");
  const [mode, setMode] = useState<GameMode>("table-solo");
  const [settings, setSettings] = useState(initialSettings);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemIndex, setProblemIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roomCode, setRoomCode] = useState("");
  const [roomQrSvg, setRoomQrSvg] = useState("");
  const [roomCreating, setRoomCreating] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [leaderboard, setLeaderboard] = useState<BattleEntry[]>([]);
  const resolved = useRef(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBattle = mode.endsWith("battle");
  const isTable = mode.startsWith("table");
  const currentProblem = problems[problemIndex];

  const clearTimers = () => { if (timer.current) clearInterval(timer.current); if (advanceTimer.current) clearTimeout(advanceTimer.current); timer.current = null; advanceTimer.current = null; };
  useEffect(() => () => clearTimers(), []);

  const returnHome = () => { clearTimers(); setStage("mode-selection"); setAnswers([]); setInput(""); };
  const openSettings = (nextMode: GameMode) => { setMode(nextMode); setStage("settings"); setAnswers([]); };
  const beginPlaying = () => { resolved.current = false; startedAt.current = Date.now(); setSeconds(settings.timeLimit); setInput(""); setStage("playing"); setTimeout(() => inputRef.current?.focus(), 0); };
  const prepare = (override?: Problem[]) => {
    clearTimers(); setProblemIndex(0); setAnswers([]); setStreak(0);
    setProblems(override ?? generateProblems(mode, settings));
    setStage("ready");
  };

  const finishAnswer = useCallback((timedOut = false) => {
    if (resolved.current || !currentProblem) return;
    resolved.current = true;
    const elapsed = Math.max(0.1, Math.round((Date.now() - startedAt.current) / 100) / 10);
    const record = gradeAnswer(currentProblem, timedOut || input === "" ? null : Number(input), elapsed, timedOut);
    setAnswers((previous) => [...previous, record]);
    setStreak((value) => record.isCorrect ? value + 1 : 0);
    setStage("feedback");
    advanceTimer.current = setTimeout(() => {
      if (problemIndex + 1 < problems.length) { setProblemIndex((value) => value + 1); resolved.current = false; startedAt.current = Date.now(); setSeconds(settings.timeLimit); setInput(""); setStage("playing"); setTimeout(() => inputRef.current?.focus(), 0); }
      else setStage("result");
    }, 850);
  }, [currentProblem, problems.length, input, problemIndex, settings.timeLimit]);

  useEffect(() => {
    if (stage !== "playing") return;
    timer.current = setInterval(() => {
      if (settings.timeLimit === 0) setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      else setSeconds((value) => { if (value <= 1) { setTimeout(() => finishAnswer(true), 0); return 0; } return value - 1; });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  }, [finishAnswer, settings.timeLimit, stage]);

  const createRoom = async () => {
    setStage("room"); setRoomCreating(true); setRoomError(""); setRoomCode(""); setRoomQrSvg(""); setLeaderboard([]);
    try {
      const response = await fetch("/api/multiplication-battle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, settings }) });
      const payload = await response.json() as { code?: string; error?: string };
      if (!response.ok || !payload.code) throw new Error(payload.error || "방을 만들지 못했습니다.");
      setRoomCode(payload.code);
      const url = `${location.origin}/mb/${payload.code}`;
      const QRCode = (await import("qrcode")).default;
      setRoomQrSvg(await QRCode.toString(url, { type: "svg", margin: 1, width: 220 }));
    } catch (error) {
      setRoomError(error instanceof Error ? error.message : "방을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setRoomCreating(false); }
  };

  useEffect(() => {
    if (stage !== "room" || !roomCode) return;
    let active = true;
    const poll = () => fetch(`/api/public-multiplication-battle/${roomCode}/entries`).then((r) => r.json()).then((p: { entries?: BattleEntry[] }) => { if (active && p.entries) setLeaderboard(p.entries); }).catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => { active = false; clearInterval(id); };
  }, [stage, roomCode]);

  const appendDigit = (digit: string) => setInput((value) => value.length < 6 ? `${value}${digit}` : value);

  if (stage === "mode-selection") return <div className="mq-page"><header className="mq-heading"><span className="mq-kicker">수업 도우미 · 수학</span><h1>곱셈 퀴즈</h1><p>혼자 차근차근 연습하거나 친구와 즐겁게 대결해 보세요.</p></header><div className="mq-mode-grid">{modes.map((item) => <article className="mq-mode-card" key={item.mode}><span className="mq-mode-icon">{item.mode.endsWith("battle") ? <Swords/> : <UserRound/>}</span><h2>{item.title}</h2><p>{item.description}</p><button className="primary-btn" onClick={() => openSettings(item.mode)}>시작하기</button></article>)}</div></div>;

  if (stage === "settings") return <div className="mq-page"><button className="mq-back" onClick={returnHome}><ArrowLeft size={18}/> 곱셈 퀴즈 홈</button><section className="mq-panel"><div className="mq-heading compact"><span className="mq-kicker">게임 설정</span><h1>{modes.find((item) => item.mode === mode)?.title}</h1></div>{isTable ? <fieldset><legend>연습할 단</legend><div className="mq-actions"><button onClick={() => setSettings({...settings, selectedTables:[2,3,4,5,6,7,8,9]})}>전체 선택</button><button onClick={() => setSettings({...settings, selectedTables:[]})}>전체 해제</button></div><div className="mq-choice-row">{[2,3,4,5,6,7,8,9].map((table) => <button aria-pressed={settings.selectedTables.includes(table)} className={settings.selectedTables.includes(table) ? "selected" : ""} key={table} onClick={() => setSettings({...settings, selectedTables: settings.selectedTables.includes(table) ? settings.selectedTables.filter((v) => v !== table) : [...settings.selectedTables, table]})}>{table}단</button>)}</div>{!settings.selectedTables.length && <p className="mq-error">최소 한 개의 단을 선택해 주세요.</p>}</fieldset> : <Choice title="난이도" options={(["easy","normal","hard","challenge","mixed"] as Difficulty[]).map((value) => [value,difficultyLabels[value]])} value={settings.difficulty} onChange={(value) => setSettings({...settings,difficulty:value as Difficulty})}/>}<Choice title="문제 수" options={[[10,"10문제"],[20,"20문제"],[30,"30문제"]]} value={settings.questionCount} onChange={(value) => setSettings({...settings,questionCount:Number(value) as 10|20|30})}/><Choice title="문제당 제한 시간" options={(isTable ? [[0,"없음"],[10,"10초"],[20,"20초"]] : [[0,"없음"],[10,"10초"],[20,"20초"],[30,"30초"]])} value={settings.timeLimit} onChange={(value) => setSettings({...settings,timeLimit:Number(value) as 0|10|20|30})}/>
    {isBattle
      ? <button className="primary-btn full mq-start" disabled={isTable && !settings.selectedTables.length} onClick={createRoom}><QrCode size={17}/> 대결방 만들기</button>
      : <div className="mq-start-row"><button className="primary-btn full mq-start" disabled={isTable && !settings.selectedTables.length} onClick={() => prepare()}>게임 준비하기</button><button className="outline-btn full mq-start" disabled={isTable && !settings.selectedTables.length} onClick={createRoom}><QrCode size={17}/> 학생용 QR로 각자 풀기</button></div>}
  </section></div>;

  if (stage === "room") return <div className="mq-page"><button className="mq-back" onClick={returnHome}><ArrowLeft size={18}/> 곱셈 퀴즈 홈</button><section className="mq-panel mq-room"><div className="mq-heading compact"><span className="mq-kicker">{isBattle ? "대결방" : "학생용 QR"}</span><h1>{isBattle ? "학생들을 대결방으로 초대하세요" : "학생들에게 QR을 보여주세요"}</h1></div>
    {roomCreating ? <p className="mq-loading-row"><LoaderCircle className="spin"/> 방을 만드는 중...</p> : roomError ? <p className="mq-error">{roomError}</p> : <>
      <div className="mq-room-code">{roomCode}</div>
      {roomQrSvg && <div className="mq-room-qr" dangerouslySetInnerHTML={{ __html: roomQrSvg }}/>}
      <p className="mq-room-hint">학생들이 각자 기기에서 QR을 스캔하거나, <b>/mb</b> 페이지에서 코드 <b>{roomCode}</b>를 입력하면 참여할 수 있어요.</p>
    </>}
    <div className="mq-battle-leaderboard"><h2>실시간 순위 ({leaderboard.length}명 참여)</h2>{!leaderboard.length ? <p className="mq-loading-row">아직 제출한 학생이 없어요.</p> : <ol>{leaderboard.map((entry, i) => <li key={`${entry.playerName}-${entry.submittedAt}`}><b>{i + 1}</b><span>{entry.playerName}</span><em>{entry.score}점</em><small>정답 {entry.correctCount}/{entry.totalCount}</small></li>)}</ol>}</div>
    <div className="mq-result-actions"><button onClick={() => setStage("settings")}><RotateCcw size={16}/> 설정으로 돌아가기</button><button onClick={returnHome}>곱셈 퀴즈 홈</button></div>
  </section></div>;

  if (stage === "ready") return <CenterCard icon={<UserRound/>} title="준비됐나요?" text={`${problems.length}문제를 풀어요. 준비가 되면 시작 버튼을 눌러 주세요.`}><button className="primary-btn" onClick={beginPlaying}>문제 풀기 시작</button></CenterCard>;

  if (stage === "playing" || stage === "feedback") {
    const latest = answers.at(-1);
    return <div className="mq-game"><div className="mq-game-top"><span>{shortTitle(mode)}</span><strong>{problemIndex + 1} / {problems.length}</strong><span><Clock3 size={16}/>{settings.timeLimit ? `남은 ${seconds}초` : `${seconds}초`}</span></div><div className="mq-progress"><span style={{width:`${(problemIndex + 1) / problems.length * 100}%`}}/></div><div className="mq-score"><span>정답 {answers.filter((a) => a.isCorrect).length}개</span><span>연속 정답 {streak}개</span><strong>{answers.filter((a) => a.isCorrect).length * 10}점</strong></div><section className="mq-problem-card"><div className="mq-equation" aria-label={`${currentProblem.leftOperand} 곱하기 ${currentProblem.rightOperand}`}>{currentProblem.leftOperand} <b>×</b> {currentProblem.rightOperand} <b>=</b> ?</div><form onSubmit={(e) => { e.preventDefault(); finishAnswer(false); }}><input ref={inputRef} aria-label="정답" inputMode="numeric" pattern="[0-9]*" value={input} disabled={stage === "feedback"} onChange={(e) => setInput(e.target.value.replace(/\D/g,""))}/><button className="primary-btn" disabled={!input || stage === "feedback"}>제출</button></form><div className="mq-keypad">{[1,2,3,4,5,6,7,8,9,0].map((number) => <button key={number} disabled={stage === "feedback"} onClick={() => appendDigit(String(number))}>{number}</button>)}<button aria-label="한 글자 지우기" disabled={stage === "feedback"} onClick={() => setInput((value) => value.slice(0,-1))}><Delete/></button></div>{stage === "feedback" && latest && <div className={`mq-feedback ${latest.isCorrect ? "correct" : "wrong"}`} aria-live="assertive">{latest.isCorrect ? <><Check/>정답이에요!</> : <><X/>{latest.timedOut ? "시간이 지났어요." : "다시 확인해 보세요."} 정답은 {latest.problem.correctAnswer}입니다.</>}</div>}</section></div>;
  }

  const result = buildPlayerResult(shortTitle(mode), answers);
  return <div className="mq-page"><section className="mq-result"><Trophy className="mq-trophy"/><span className="mq-kicker">게임 결과</span><h1>연습을 마쳤어요!</h1><ResultCard result={result}/><WrongList answers={answers}/><div className="mq-result-actions"><button className="primary-btn" onClick={() => prepare()}>같은 설정으로 다시 하기</button>{wrongProblems(answers).length > 0 && <button onClick={() => prepare(wrongProblems(answers))}>틀린 문제만 다시 풀기</button>}<button onClick={() => setStage("settings")}><RotateCcw size={16}/> 설정으로 돌아가기</button><button onClick={returnHome}>곱셈 퀴즈 홈</button></div></section></div>;
}

function Choice({title, options, value, onChange}:{title:string; options:(string|number)[][]; value:string|number; onChange:(value:string|number)=>void}) { return <fieldset><legend>{title}</legend><div className="mq-choice-row">{options.map(([key,label]) => <button aria-pressed={key === value} className={key === value ? "selected" : ""} key={key} onClick={() => onChange(key)}>{label}</button>)}</div></fieldset>; }
function CenterCard({icon,title,text,children}:{icon:React.ReactNode;title:string;text:string;children:React.ReactNode}) { return <div className="mq-center"><section><span className="mq-mode-icon">{icon}</span><h1>{title}</h1><p>{text}</p>{children}</section></div>; }
function ResultCard({result}:{result:ReturnType<typeof buildPlayerResult>}) { return <article className="mq-result-card"><h2>{result.playerName}</h2><div><strong>{result.correctCount}</strong><span>/ {result.answers.length}문제 정답</span></div><p>정답률 {result.accuracy}% · {result.score}점 · 총 {result.totalTime.toFixed(1)}초</p></article>; }
function WrongList({answers}:{answers:AnswerRecord[]}) { const wrong = answers.filter((a) => !a.isCorrect); if (!wrong.length) return <p className="mq-perfect"><Check/> 틀린 문제 없이 모두 맞혔어요!</p>; return <div className="mq-wrong-list"><h2>틀린 문제</h2>{wrong.map((answer) => <div key={answer.problem.id}><span>{answer.problem.leftOperand} × {answer.problem.rightOperand}</span><span>내 답 {answer.userAnswer ?? "시간 초과"}</span><strong>정답 {answer.problem.correctAnswer}</strong></div>)}</div>; }
