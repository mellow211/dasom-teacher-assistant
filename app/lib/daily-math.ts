import { DETAIL_TYPES, OPERATION_AREAS, type Difficulty, type OperationArea, type Semester } from "./daily-math-config.ts";

export type MathProblem = { id: string; type: OperationArea; leftOperand: string; rightOperand: string; operator: string; answer: string; displayFormat: "horizontal" | "vertical"; metadata: Record<string, string | number | boolean> };
export type WorksheetSettings = { grade: number; semester: Semester; area: OperationArea; detailType: string; difficulty: Difficulty; count: 10 | 20 | 30 | 40; columns: 2 | 3 | 4; displayFormat: "horizontal" | "vertical"; showNumbers: boolean; spacing: "narrow" | "normal" | "wide"; customTitle?: string };
export type DailyMathWorksheet = { seed: string; title: string; settings: WorksheetSettings; problems: MathProblem[] };
export class WorksheetGenerationError extends Error {}

function hashSeed(seed: string) { let h = 2166136261; for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function randomFor(seed: string) { let a = hashSeed(seed); return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const integer = (r: () => number, min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a);
const fraction = (n: number, d: number) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
const decimals = (value: number, places: number) => (value / 10 ** places).toFixed(places).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
export function hasCarry(a: number, b: number) { while (a || b) { if (a % 10 + b % 10 >= 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }
export function hasBorrow(a: number, b: number) { while (a || b) { if (a % 10 < b % 10) return true; a = Math.floor(a / 10); b = Math.floor(b / 10); } return false; }

function naturalProblem(area: OperationArea, detail: string, difficulty: Difficulty, r: () => number) {
  const max = difficulty === "basic" ? 20 : difficulty === "standard" ? 100 : 999;
  let a = integer(r, 1, max), b = integer(r, 1, max), answer = "";
  if (area === "natural-add") {
    const want = detail === "혼합" ? r() > .5 : detail.includes("있음");
    for (let i=0;i<80 && hasCarry(a,b)!==want;i++) { a=integer(r,1,max); b=integer(r,1,max); }
    answer=String(a+b);
  } else if (area === "natural-subtract") {
    if (b>a) [a,b]=[b,a]; const want=detail === "혼합" ? r()>.5 : detail.includes("있음");
    for(let i=0;i<80 && hasBorrow(a,b)!==want;i++){a=integer(r,2,max);b=integer(r,1,a);}
    answer=String(a-b);
  } else if (area === "natural-multiply") {
    b=detail.includes("한 자리")?integer(r,2,9):integer(r,10,difficulty==="challenge"?99:30); a=integer(r,2,difficulty==="basic"?9:99); answer=String(a*b);
  } else {
    b=integer(r,2,difficulty==="challenge"?19:9); const q=integer(r,2,difficulty==="basic"?9:30); const remainder=detail.includes("나누어떨어짐")?0:detail==="혼합"?integer(r,0,b-1):integer(r,1,b-1); a=b*q+remainder; answer=remainder?`${q} … ${remainder}`:String(q);
  }
  return { left:String(a), right:String(b), answer };
}

function fractionProblem(area: OperationArea, detail: string, r: () => number) {
  let d1=integer(r,2,12), d2=detail.includes("분모가 같음")?d1:integer(r,2,12); if(detail.includes("분모가 다름") && d2===d1) d2=d1===12?11:d1+1;
  let n1=integer(r,1,d1-1), n2=integer(r,1,d2-1); let n:number,d:number;
  if(area==="fraction-add"){n=n1*d2+n2*d1;d=d1*d2;}
  else if(area==="fraction-subtract"){if(n1/d1<n2/d2){[n1,n2]=[n2,n1];[d1,d2]=[d2,d1];}n=n1*d2-n2*d1;d=d1*d2;}
  else if(area==="fraction-multiply"){n=n1*n2;d=d1*d2;}
  else {n=n1*d2;d=d1*n2;}
  return {left:`${n1}/${d1}`,right:`${n2}/${d2}`,answer:fraction(n,d)};
}

function decimalProblem(area: OperationArea, detail: string, r: () => number) {
  const places=detail.includes("두 자리")||detail.includes("끼리")?2:1, scale=10**places;
  let a=integer(r,1,20*scale), b=integer(r,1,10*scale), answer:string;
  if(area==="decimal-add") answer=decimals(a+b,places);
  else if(area==="decimal-subtract"){if(b>a)[a,b]=[b,a];answer=decimals(a-b,places);}
  else if(area==="decimal-multiply"){answer=decimals(a*b,places*2);}
  else { const divisor=integer(r,1,9), quotient=integer(r,1,20); b=divisor; a=divisor*quotient; answer=String(quotient); }
  return {left:decimals(a,places),right:decimals(b,places),answer};
}

export function createWorksheet(settings: WorksheetSettings, seed: string): DailyMathWorksheet {
  if(!DETAIL_TYPES[settings.area]?.includes(settings.detailType)) throw new WorksheetGenerationError("선택한 연산 유형을 확인해 주세요.");
  const r=randomFor(`${seed}:${JSON.stringify(settings)}`), problems:MathProblem[]=[], seen=new Set<string>();
  for(let attempts=0;problems.length<settings.count && attempts<settings.count*120;attempts++){
    const kind=OPERATION_AREAS[settings.area].kind;
    const value=kind==="natural"?naturalProblem(settings.area,settings.detailType,settings.difficulty,r):kind==="fraction"?fractionProblem(settings.area,settings.detailType,r):decimalProblem(settings.area,settings.detailType,r);
    const commutative=settings.area.endsWith("add")||settings.area.endsWith("multiply");
    const pair=commutative?[value.left,value.right].sort().join("|"):`${value.left}|${value.right}`;
    if(seen.has(pair)) continue; seen.add(pair);
    problems.push({id:`${seed}-${problems.length+1}`,type:settings.area,leftOperand:value.left,rightOperand:value.right,operator:OPERATION_AREAS[settings.area].operator,answer:value.answer,displayFormat:settings.displayFormat,metadata:{difficulty:settings.difficulty,detailType:settings.detailType}});
  }
  if(problems.length<settings.count) throw new WorksheetGenerationError("조건에 맞는 서로 다른 문제를 충분히 만들 수 없습니다. 난이도나 세부 유형을 바꿔 주세요.");
  return {seed,title:settings.customTitle?.trim()||`${settings.grade}학년 일일수학 · ${OPERATION_AREAS[settings.area].label}`,settings,problems};
}

export const createSeed = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
