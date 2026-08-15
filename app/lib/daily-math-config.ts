export type OperationArea =
  | "natural-add" | "natural-subtract" | "natural-multiply" | "natural-divide"
  | "fraction-add" | "fraction-subtract" | "fraction-multiply" | "fraction-divide"
  | "decimal-add" | "decimal-subtract" | "decimal-multiply" | "decimal-divide";

export type Difficulty = "basic" | "standard" | "challenge";
export type Semester = "1" | "2" | "none";

export const OPERATION_AREAS: Record<OperationArea, { label: string; operator: string; kind: "natural" | "fraction" | "decimal" }> = {
  "natural-add": { label: "자연수 덧셈", operator: "+", kind: "natural" },
  "natural-subtract": { label: "자연수 뺄셈", operator: "−", kind: "natural" },
  "natural-multiply": { label: "자연수 곱셈", operator: "×", kind: "natural" },
  "natural-divide": { label: "자연수 나눗셈", operator: "÷", kind: "natural" },
  "fraction-add": { label: "분수 덧셈", operator: "+", kind: "fraction" },
  "fraction-subtract": { label: "분수 뺄셈", operator: "−", kind: "fraction" },
  "fraction-multiply": { label: "분수 곱셈", operator: "×", kind: "fraction" },
  "fraction-divide": { label: "분수 나눗셈", operator: "÷", kind: "fraction" },
  "decimal-add": { label: "소수 덧셈", operator: "+", kind: "decimal" },
  "decimal-subtract": { label: "소수 뺄셈", operator: "−", kind: "decimal" },
  "decimal-multiply": { label: "소수 곱셈", operator: "×", kind: "decimal" },
  "decimal-divide": { label: "소수 나눗셈", operator: "÷", kind: "decimal" },
};

const NATURAL: OperationArea[] = ["natural-add", "natural-subtract", "natural-multiply", "natural-divide"];
export const GRADE_AREA_CONFIG: Record<number, OperationArea[]> = {
  1: ["natural-add", "natural-subtract"],
  2: ["natural-add", "natural-subtract", "natural-multiply"],
  3: NATURAL,
  4: [...NATURAL, "fraction-add", "fraction-subtract", "decimal-add", "decimal-subtract"],
  5: [...NATURAL, "fraction-add", "fraction-subtract", "fraction-multiply", "decimal-add", "decimal-subtract", "decimal-multiply"],
  6: [...NATURAL, "fraction-add", "fraction-subtract", "fraction-multiply", "fraction-divide", "decimal-add", "decimal-subtract", "decimal-multiply", "decimal-divide"],
};

export const DETAIL_TYPES: Record<OperationArea, string[]> = {
  "natural-add": ["받아올림 없음", "받아올림 있음", "혼합"],
  "natural-subtract": ["받아내림 없음", "받아내림 있음", "혼합"],
  "natural-multiply": ["한 자리 수 곱셈", "두 자리 수 곱셈", "혼합"],
  "natural-divide": ["나누어떨어짐", "나머지 있음", "혼합"],
  "fraction-add": ["분모가 같음", "분모가 다름", "혼합"],
  "fraction-subtract": ["분모가 같음", "분모가 다름", "혼합"],
  "fraction-multiply": ["진분수끼리", "자연수와 분수", "혼합"],
  "fraction-divide": ["분수로 나누기", "자연수로 나누기", "혼합"],
  "decimal-add": ["소수 한 자리", "소수 두 자리", "혼합"],
  "decimal-subtract": ["소수 한 자리", "소수 두 자리", "혼합"],
  "decimal-multiply": ["소수와 자연수", "소수끼리", "혼합"],
  "decimal-divide": ["소수를 자연수로", "소수끼리", "혼합"],
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = { basic: "기초", standard: "기본", challenge: "도전" };
export const availableAreas = (grade: number) => GRADE_AREA_CONFIG[grade] ?? GRADE_AREA_CONFIG[1];
export const supportsVertical = (area: OperationArea) => ["natural-add", "natural-subtract", "natural-multiply"].includes(area);
