"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, Delete, RotateCcw, Swords, Trophy, UserRound, X } from "lucide-react";
import { AnswerRecord, buildPlayerResult, decideWinner, Difficulty, GameMode, GameSettings, generateBattleProblems, generateProblems, gradeAnswer, PlayerResult, Problem, wrongProblems } from "../lib/multiplication-quiz";

type Stage = "mode-selection" | "settings" | "ready" | "playing" | "feedback" | "player-switch" | "result";
const modes: { mode: GameMode; title: string; description: string }[] = [
  { mode: "table-solo", title: "구구단 놀이 · 혼자 하기", description: "원하는 단을 골라 내 속도로 연습해요." },
  { mode: "table-battle", title: "구구단 놀이 · 대결하기", description: "한 기기에서 차례대로 풀고 결과를 비교해요." },
  { mode: "multiplication-solo", title: "곱셈 문제 · 혼자 하기", description: "난이도를 골라 다양한 곱셈을 연습해요." },
  { mode: "multiplication-battle", title: "곱셈 문제 · 대결하기", description: "같은 난이도와 문항 수로 공정하게 겨뤄요." },
];
const difficultyLabels: Record<Difficulty, string> = { easy: "쉬움", normal: "보통", hard: "어려움", challenge: "도전", mixed: "섞어서" };
const initialSettings: GameSettings = { selectedTables: [2,3,4,5,6,7,8,9], difficulty: "easy", questionCount: 10, timeLimit: 0 };

export function MultiplicationQuiz() {
  const [stage, setStage] = useState<Stage>("mode-selection");
  const [mode, setMode] = useState<GameMode>("table-solo");
  const [settings, setSettings] = useState(initialSettings);
  const [names, setNames] = useState(["", ""]);
  const [problemSets, setProblemSets] = useState<Problem[][]>([[], []]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [problemIndex, setProblemIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[][]>([[], []]);
  const [input, setInput] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const resolved = useRef(false);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBattle = mode.endsWith("battle");
  const isTable = mode.startsWith("table");
  const currentProblems = problemSets[playerIndex] ?? [];
  const currentProblem = currentProblems[problemIndex];
  const playerName = names[playerIndex].trim() || `${playerIndex + 1}번 선수`;

  const clearTimers = () => { if (timer.current) clearInterval(timer.current); if (advanceTimer.current) clearTimeout(advanceTimer.current); timer.current = null; advanceTimer.current = null; };
  useEffect(() => () => clearTimers(), []);

  const returnHome = () => { clearTimers(); setStage("mode-selection"); setAnswers([[], []]); setInput(""); };
  const openSettings = (nextMode: GameMode) => { setMode(nextMode); setStage("settings"); setAnswers([[], []]); };
  const beginPlaying = () => { resolved.current = false; startedAt.current = Date.now(); setSeconds(settings.timeLimit); setInput(""); setStage("playing"); setTimeout(() => inputRef.current?.focus(), 0); };
  const prepare = (override?: Problem[]) => {
    clearTimers(); setPlayerIndex(0); setProblemIndex(0); setAnswers([[], []]); setStreak(0);
    if (override) setProblemSets([override, []]);
    else if (isBattle) setProblemSets(generateBattleProblems(mode, settings));
    else setProblemSets([generateProblems(mode, settings), []]);
    setStage("ready");
  };

  const finishAnswer = useCallback((timedOut = false) => {
    if (resolved.current || !currentProblem) return;
    resolved.current = true;
    const elapsed = Math.max(0.1, Math.round((Date.now() - startedAt.current) / 100) / 10);
    const record = gradeAnswer(currentProblem, timedOut || input === "" ? null : Number(input), elapsed, timedOut);
    setAnswers((previous) => previous.map((list, index) => index === playerIndex ? [...list, record] : list));
    setStreak((value) => record.isCorrect ? value + 1 : 0);
    setStage("feedback");
    advanceTimer.current = setTimeout(() => {
      if (problemIndex + 1 < currentProblems.length) { setProblemIndex((value) => value + 1); resolved.current = false; startedAt.current = Date.now(); setSeconds(settings.timeLimit); setInput(""); setStage("playing"); setTimeout(() => inputRef.current?.focus(), 0); }
      else if (isBattle && playerIndex === 0) setStage("player-switch");
      else setStage("result");
    }, 850);
  }, [currentProblem, currentProblems.length, input, isBattle, playerIndex, problemIndex, settings.timeLimit]);

  useEffect(() => {
    if (stage !== "playing") return;
    timer.current = setInterval(() => {
      if (settings.timeLimit === 0) setSeconds(Math.floor((Date.now() - startedAt.current) / 1000));
      else setSeconds((value) => { if (value <= 1) { setTimeout(() => finishAnswer(true), 0); return 0; } return value - 1; });
    }, 1000);
    return () => { if (timer.current) clearInterval(timer.current); timer.current = null; };
  }, [finishAnswer, settings.timeLimit, stage]);

  const switchPlayer = () => { setPlayerIndex(1); setProblemIndex(0); setStreak(0); setStage("ready"); };
  const results: PlayerResult[] = answers.map((list, index) => buildPlayerResult(names[index].trim() || `${index + 1}번 선수`, list));
  const selectedResult = results[playerIndex];
  const appendDigit = (digit: string) => setInput((value) => value.length < 6 ? `${value}${digit}` : value);

  if (stage === "mode-selection") return <div className="mq-page"><header className="mq-heading"><span className="mq-kicker">수업 도우미 · 수학</span><h1>곱셈 퀴즈</h1><p>혼자 차근차근 연습하거나 친구와 즐겁게 대결해 보세요.</p></header><div className="mq-mode-grid">{modes.map((item) => <article className="mq-mode-card" key={item.mode}><span className="mq-mode-icon">{item.mode.endsWith("battle") ? <Swords/> : <UserRound/>}</span><h2>{item.title}</h2><p>{item.description}</p><button className="primary-btn" onClick={() => openSettings(item.mode)}>시작하기</button></article>)}</div></div>;

  if (stage === "settings") return <div className="mq-page"><button className="mq-back" onClick={returnHome}><ArrowLeft size={18}/> 곱셈 퀴즈 홈</button><section className="mq-panel"><div className="mq-heading compact"><span className="mq-kicker">게임 설정</span><h1>{modes.find((item) => item.mode === mode)?.title}</h1></div>{isBattle && <div className="mq-form-grid"><label>1번 선수 이름 (선택)<input value={names[0]} maxLength={12} placeholder="입력하지 않으면 1번 선수" onChange={(e) => setNames([e.target.value, names[1]])}/></label><label>2번 선수 이름 (선택)<input value={names[1]} maxLength={12} placeholder="입력하지 않으면 2번 선수" onChange={(e) => setNames([names[0], e.target.value])}/></label></div>}{isTable ? <fieldset><legend>연습할 단</legend><div className="mq-actions"><button onClick={() => setSettings({...settings, selectedTables:[2,3,4,5,6,7,8,9]})}>전체 선택</button><button onClick={() => setSettings({...settings, selectedTables:[]})}>전체 해제</button></div><div className="mq-choice-row">{[2,3,4,5,6,7,8,9].map((table) => <button aria-pressed={settings.selectedTables.includes(table)} className={settings.selectedTables.includes(table) ? "selected" : ""} key={table} onClick={() => setSettings({...settings, selectedTables: settings.selectedTables.includes(table) ? settings.selectedTables.filter((v) => v !== table) : [...settings.selectedTables, table]})}>{table}단</button>)}</div>{!settings.selectedTables.length && <p className="mq-error">최소 한 개의 단을 선택해 주세요.</p>}</fieldset> : <Choice title="난이도" options={(["easy","normal","hard","challenge","mixed"] as Difficulty[]).map((value) => [value,difficultyLabels[value]])} value={settings.difficulty} onChange={(value) => setSettings({...settings,difficulty:value as Difficulty})}/>}<Choice title="문제 수" options={[[10,"10문제"],[20,"20문제"],[30,"30문제"]]} value={settings.questionCount} onChange={(value) => setSettings({...settings,questionCount:Number(value) as 10|20|30})}/><Choice title="문제당 제한 시간" options={(isTable ? [[0,"없음"],[10,"10초"],[20,"20초"]] : [[0,"없음"],[10,"10초"],[20,"20초"],[30,"30초"]])} value={settings.timeLimit} onChange={(value) => setSettings({...settings,timeLimit:Number(value) as 0|10|20|30})}/><button className="primary-btn full mq-start" disabled={isTable && !settings.selectedTables.length} onClick={() => prepare()}>게임 준비하기</button></section></div>;

  if (stage === "ready") return <CenterCard icon={<UserRound/>} title={`${playerName}, 준비됐나요?`} text={`${currentProblems.length}문제를 풀어요. 준비가 되면 시작 버튼을 눌러 주세요.`}><button className="primary-btn" onClick={beginPlaying}>문제 풀기 시작</button></CenterCard>;
  if (stage === "player-switch") return <CenterCard icon={<Swords/>} title="선수를 바꿔 주세요" text={`${results[0].playerName}의 문제 풀이가 끝났어요. 결과는 잠시 숨겨 둘게요.`}><button className="primary-btn" onClick={switchPlayer}>2번 선수 준비 완료</button></CenterCard>;

  if (stage === "playing" || stage === "feedback") {
    const latest = answers[playerIndex].at(-1);
    return <div className="mq-game"><div className="mq-game-top"><span>{playerName}</span><strong>{problemIndex + 1} / {currentProblems.length}</strong><span><Clock3 size={16}/>{settings.timeLimit ? `남은 ${seconds}초` : `${seconds}초`}</span></div><div className="mq-progress"><span style={{width:`${(problemIndex + 1) / currentProblems.length * 100}%`}}/></div><div className="mq-score"><span>정답 {answers[playerIndex].filter((a) => a.isCorrect).length}개</span><span>연속 정답 {streak}개</span><strong>{answers[playerIndex].filter((a) => a.isCorrect).length * 10}점</strong></div><section className="mq-problem-card"><div className="mq-equation" aria-label={`${currentProblem.leftOperand} 곱하기 ${currentProblem.rightOperand}`}>{currentProblem.leftOperand} <b>×</b> {currentProblem.rightOperand} <b>=</b> ?</div><form onSubmit={(e) => { e.preventDefault(); finishAnswer(false); }}><input ref={inputRef} aria-label="정답" inputMode="numeric" pattern="[0-9]*" value={input} disabled={stage === "feedback"} onChange={(e) => setInput(e.target.value.replace(/\D/g,""))}/><button className="primary-btn" disabled={!input || stage === "feedback"}>제출</button></form><div className="mq-keypad">{[1,2,3,4,5,6,7,8,9,0].map((number) => <button key={number} disabled={stage === "feedback"} onClick={() => appendDigit(String(number))}>{number}</button>)}<button aria-label="한 글자 지우기" disabled={stage === "feedback"} onClick={() => setInput((value) => value.slice(0,-1))}><Delete/></button></div>{stage === "feedback" && latest && <div className={`mq-feedback ${latest.isCorrect ? "correct" : "wrong"}`} aria-live="assertive">{latest.isCorrect ? <><Check/>정답이에요!</> : <><X/>{latest.timedOut ? "시간이 지났어요." : "다시 확인해 보세요."} 정답은 {latest.problem.correctAnswer}입니다.</>}</div>}</section></div>;
  }

  const winner = isBattle ? decideWinner(results[0], results[1]) : 0;
  return <div className="mq-page"><section className="mq-result"><Trophy className="mq-trophy"/><span className="mq-kicker">게임 결과</span><h1>{isBattle ? winner === 0 ? "멋진 무승부예요!" : `${results[winner-1].playerName} 승리!` : "연습을 마쳤어요!"}</h1>{isBattle ? <div className="mq-result-grid">{results.map((result, index) => <ResultCard key={index} result={result}/>)}</div> : <ResultCard result={selectedResult}/>} {!isBattle && <WrongList answers={selectedResult.answers}/>}<div className="mq-result-actions"><button className="primary-btn" onClick={() => prepare()}>같은 설정으로 다시 하기</button>{!isBattle && wrongProblems(selectedResult.answers).length > 0 && <button onClick={() => prepare(wrongProblems(selectedResult.answers))}>틀린 문제만 다시 풀기</button>}<button onClick={() => setStage("settings")}><RotateCcw size={16}/> 설정으로 돌아가기</button><button onClick={returnHome}>곱셈 퀴즈 홈</button></div></section></div>;
}

function Choice({title, options, value, onChange}:{title:string; options:(string|number)[][]; value:string|number; onChange:(value:string|number)=>void}) { return <fieldset><legend>{title}</legend><div className="mq-choice-row">{options.map(([key,label]) => <button aria-pressed={key === value} className={key === value ? "selected" : ""} key={key} onClick={() => onChange(key)}>{label}</button>)}</div></fieldset>; }
function CenterCard({icon,title,text,children}:{icon:React.ReactNode;title:string;text:string;children:React.ReactNode}) { return <div className="mq-center"><section><span className="mq-mode-icon">{icon}</span><h1>{title}</h1><p>{text}</p>{children}</section></div>; }
function ResultCard({result}:{result:PlayerResult}) { return <article className="mq-result-card"><h2>{result.playerName}</h2><div><strong>{result.correctCount}</strong><span>/ {result.answers.length}문제 정답</span></div><p>정답률 {result.accuracy}% · {result.score}점 · 총 {result.totalTime.toFixed(1)}초</p></article>; }
function WrongList({answers}:{answers:AnswerRecord[]}) { const wrong = answers.filter((a) => !a.isCorrect); if (!wrong.length) return <p className="mq-perfect"><Check/> 틀린 문제 없이 모두 맞혔어요!</p>; return <div className="mq-wrong-list"><h2>틀린 문제</h2>{wrong.map((answer) => <div key={answer.problem.id}><span>{answer.problem.leftOperand} × {answer.problem.rightOperand}</span><span>내 답 {answer.userAnswer ?? "시간 초과"}</span><strong>정답 {answer.problem.correctAnswer}</strong></div>)}</div>; }
