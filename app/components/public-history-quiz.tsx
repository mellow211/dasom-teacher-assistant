"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Trophy, XCircle } from "lucide-react";
import { gradeHistoryAnswer, type HistoryAnswer, type HistoryDifficulty, type HistoryQuestion } from "../lib/history-quiz";

type Quiz = { title: string; topic: string; difficulty: HistoryDifficulty; questions: HistoryQuestion[] };
type Stage = "loading" | "error" | "playing" | "feedback" | "result";
const labels: Record<HistoryDifficulty, string> = { basic: "기초", standard: "기본", challenge: "도전" };

export function PublicHistoryQuiz({ slug }: { slug: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<HistoryQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState("");
  const [answers, setAnswers] = useState<HistoryAnswer[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/public-history-quiz/${slug}`).then(async r => {
      const payload = await r.json() as Quiz & { error?: string };
      if (!r.ok) throw new Error(payload.error || "퀴즈를 불러오지 못했습니다.");
      if (active) { setQuiz(payload); setQuestions(payload.questions); setStage("playing"); }
    }).catch(e => { if (active) { setError(e instanceof Error ? e.message : "퀴즈를 불러오지 못했습니다."); setStage("error"); } });
    return () => { active = false; };
  }, [slug]);

  const current = questions[index];
  const submit = () => { if (!current || !choice.trim()) return; const correct = gradeHistoryAnswer(current, choice); setAnswers(a => [...a, { questionId: current.id, userAnswer: choice, correct }]); setStage("feedback"); };
  const next = () => { if (index + 1 >= questions.length) setStage("result"); else { setIndex(i => i + 1); setChoice(""); setStage("playing"); } };
  const retryWrong = () => { const wrong = new Set(answers.filter(a => !a.correct).map(a => a.questionId)), list = questions.filter(q => wrong.has(q.id)); if (!list.length) return; setQuestions(list); setIndex(0); setAnswers([]); setChoice(""); setStage("playing"); };
  const retryAll = () => { if (!quiz) return; setQuestions(quiz.questions); setIndex(0); setAnswers([]); setChoice(""); setStage("playing"); };

  if (stage === "loading") return <div className="hq-page"><div className="hq-public-state"><LoaderCircle className="spin"/><p>퀴즈를 불러오는 중입니다.</p></div></div>;
  if (stage === "error" || !quiz) return <div className="hq-page"><div className="hq-public-state"><AlertTriangle/><p>{error}</p></div></div>;

  if (stage === "result") {
    const correct = answers.filter(a => a.correct).length;
    return <div className="hq-page"><section className="hq-result"><Trophy/><h1>퀴즈 완료!</h1><strong>{correct} / {questions.length}</strong><p>정답률 {Math.round(correct / questions.length * 100)}% · {labels[quiz.difficulty]} · {quiz.topic}</p>
      <div className="hq-review">{questions.map((q, i) => { const a = answers.find(x => x.questionId === q.id); return <article key={q.id} className={a?.correct ? "correct" : "wrong"}><b>{i + 1}. {a?.correct ? "정답" : "오답"}</b><p>{q.question}</p><small>내 답: {a?.userAnswer || "없음"} · 정답: {q.type === "multiple" ? q.options.find(x => x.id === q.correctAnswer)?.text : q.correctAnswer}</small><em>{q.explanation}</em></article>; })}</div>
      <div className="hq-actions">{answers.some(a => !a.correct) && <button className="primary-btn" onClick={retryWrong}>틀린 문제만 다시 풀기</button>}<button className="outline-btn" onClick={retryAll}>처음부터 다시 풀기</button></div>
    </section></div>;
  }

  if (!current) return null;
  const answered = answers.at(-1), correctText = current.type === "multiple" ? current.options.find(x => x.id === current.correctAnswer)?.text : current.correctAnswer;
  return <div className="hq-page"><section className="hq-game"><div className="hq-game-head"><span>{index + 1} / {questions.length}</span><b>{quiz.title}</b><i><em style={{ width: `${(index + (stage === "feedback" ? 1 : 0)) / questions.length * 100}%` }}/></i></div>
    <article><span className="eyebrow">{current.type === "multiple" ? "객관식" : current.type === "ox" ? "OX" : "단답형"}</span><h2>{current.question}</h2>
      {current.type === "short" ? <input value={choice} disabled={stage === "feedback"} onChange={e => setChoice(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="정답을 입력하세요"/> : <div className="hq-options">{current.options.map(o => <button key={o.id} disabled={stage === "feedback"} className={choice === o.id ? "selected" : ""} onClick={() => setChoice(o.id)}>{o.text}</button>)}</div>}
      {stage === "playing" ? <button className="primary-btn" disabled={!choice.trim()} onClick={submit}>답 제출</button> : <div className={`hq-feedback ${answered?.correct ? "correct" : "wrong"}`}>{answered?.correct ? <CheckCircle2/> : <XCircle/>}<div><h3>{answered?.correct ? "정답입니다!" : "다시 확인해 볼까요?"}</h3><b>정답: {correctText}</b><p>{current.explanation}</p><button className="primary-btn" onClick={next}>{index + 1 === questions.length ? "결과 보기" : "다음 문제"}</button></div></div>}
    </article>
  </section></div>;
}
