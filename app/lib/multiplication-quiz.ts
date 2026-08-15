export type GameMode = "table-solo" | "table-battle" | "multiplication-solo" | "multiplication-battle";
export type Difficulty = "easy" | "normal" | "hard" | "challenge" | "mixed";
export type ProblemType = "table" | Exclude<Difficulty, "mixed">;

export type GameSettings = {
  selectedTables: number[];
  difficulty: Difficulty;
  questionCount: 10 | 20 | 30;
  timeLimit: 0 | 10 | 20 | 30;
};

export type Problem = { id: string; leftOperand: number; rightOperand: number; correctAnswer: number; problemType: ProblemType };
export type AnswerRecord = { problem: Problem; userAnswer: number | null; isCorrect: boolean; elapsedTime: number; timedOut?: boolean };
export type PlayerResult = { playerName: string; answers: AnswerRecord[]; correctCount: number; accuracy: number; totalTime: number; score: number };

const types: Exclude<Difficulty, "mixed">[] = ["easy", "normal", "hard", "challenge"];
const shuffle = <T,>(items: T[], rng = Math.random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const integer = (min: number, max: number, rng: () => number) => Math.floor(rng() * (max - min + 1)) + min;

function multiplicationProblem(type: Exclude<Difficulty, "mixed">, index: number, rng: () => number): Problem {
  const ranges: Record<typeof type, [[number, number], [number, number]]> = {
    easy: [[2, 9], [2, 9]], normal: [[10, 99], [2, 9]], hard: [[100, 999], [2, 9]], challenge: [[10, 99], [10, 99]],
  };
  const [left, right] = ranges[type];
  const leftOperand = integer(left[0], left[1], rng);
  const rightOperand = integer(right[0], right[1], rng);
  return { id: `${type}-${index}-${leftOperand}-${rightOperand}`, leftOperand, rightOperand, correctAnswer: leftOperand * rightOperand, problemType: type };
}

export function generateProblems(mode: GameMode, settings: GameSettings, rng = Math.random): Problem[] {
  if (mode.startsWith("table")) {
    if (!settings.selectedTables.length) return [];
    const pool = settings.selectedTables.flatMap((table) => Array.from({ length: 9 }, (_, i) => ({ table, multiplier: i + 1 })));
    const result: Problem[] = [];
    while (result.length < settings.questionCount) {
      for (const item of shuffle(pool, rng)) {
        if (result.length >= settings.questionCount) break;
        result.push({ id: `table-${result.length}-${item.table}-${item.multiplier}`, leftOperand: item.table, rightOperand: item.multiplier, correctAnswer: item.table * item.multiplier, problemType: "table" });
      }
    }
    return result;
  }
  const requested = settings.difficulty === "mixed"
    ? Array.from({ length: settings.questionCount }, (_, i) => types[i % types.length])
    : Array.from({ length: settings.questionCount }, () => settings.difficulty as Exclude<Difficulty, "mixed">);
  return shuffle(requested, rng).map((type, index) => multiplicationProblem(type, index, rng));
}

export function generateBattleProblems(mode: GameMode, settings: GameSettings, rng = Math.random): [Problem[], Problem[]] {
  const first = generateProblems(mode, settings, rng);
  let second = generateProblems(mode, settings, rng);
  if (second.length > 1 && first.every((problem, i) => problem.leftOperand === second[i].leftOperand && problem.rightOperand === second[i].rightOperand)) second = [...second.slice(1), second[0]];
  return [first, second];
}

export function gradeAnswer(problem: Problem, userAnswer: number | null, elapsedTime: number, timedOut = false): AnswerRecord {
  return { problem, userAnswer, elapsedTime, timedOut, isCorrect: !timedOut && userAnswer === problem.correctAnswer };
}

export function resolveAttempt(problem: Problem, alreadyResolved: boolean, userAnswer: number | null, elapsedTime: number, timedOut = false) {
  return alreadyResolved ? null : gradeAnswer(problem, userAnswer, elapsedTime, timedOut);
}

export function buildPlayerResult(playerName: string, answers: AnswerRecord[]): PlayerResult {
  const correctCount = answers.filter((answer) => answer.isCorrect).length;
  const totalTime = answers.reduce((sum, answer) => sum + answer.elapsedTime, 0);
  return { playerName, answers, correctCount, totalTime, accuracy: answers.length ? Math.round(correctCount / answers.length * 100) : 0, score: correctCount * 10 };
}

export function decideWinner(first: PlayerResult, second: PlayerResult): 0 | 1 | 2 {
  if (first.correctCount !== second.correctCount) return first.correctCount > second.correctCount ? 1 : 2;
  if (first.totalTime !== second.totalTime) return first.totalTime < second.totalTime ? 1 : 2;
  return 0;
}

export const wrongProblems = (answers: AnswerRecord[]) => answers.filter((answer) => !answer.isCorrect).map((answer) => answer.problem);
export const problemDistribution = (problems: Problem[]) => problems.reduce<Record<string, number>>((acc, p) => { const key = p.problemType === "table" ? String(p.leftOperand) : p.problemType; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {});
