import test from "node:test";
import assert from "node:assert/strict";
import { availableAreas } from "../app/lib/daily-math-config.ts";
import { createWorksheet, hasBorrow, hasCarry } from "../app/lib/daily-math.ts";

const base = { grade:3, semester:"none", area:"natural-add", detailType:"혼합", difficulty:"standard", count:20, columns:2, displayFormat:"horizontal", showNumbers:true, spacing:"normal" };

test("학년별 연산 영역이 분리된다",()=>{
  assert.deepEqual(availableAreas(1),["natural-add","natural-subtract"]);
  assert.ok(!availableAreas(4).includes("fraction-multiply"));
  assert.ok(availableAreas(6).includes("decimal-divide"));
});

test("같은 설정과 시드는 같은 문제를 만든다",()=>{
  assert.deepEqual(createWorksheet(base,"seed-1").problems,createWorksheet(base,"seed-1").problems);
});

test("문제는 중복되지 않고 정답이 정확하다",()=>{
  const sheet=createWorksheet(base,"seed-2");
  assert.equal(new Set(sheet.problems.map(p=>`${p.leftOperand}|${p.rightOperand}`)).size,20);
  for(const p of sheet.problems) assert.equal(Number(p.answer),Number(p.leftOperand)+Number(p.rightOperand));
});

test("받아올림과 받아내림 판별 및 음수 방지",()=>{
  assert.equal(hasCarry(18,7),true); assert.equal(hasBorrow(31,12),true);
  const sheet=createWorksheet({...base,area:"natural-subtract",detailType:"받아내림 있음"},"seed-3");
  for(const p of sheet.problems){assert.ok(Number(p.leftOperand)>=Number(p.rightOperand));assert.equal(hasBorrow(Number(p.leftOperand),Number(p.rightOperand)),true);}
});

test("나눗셈은 0으로 나누지 않고 몫과 나머지가 맞다",()=>{
  const sheet=createWorksheet({...base,area:"natural-divide",detailType:"나머지 있음"},"seed-4");
  for(const p of sheet.problems){const [q,r]=p.answer.split(" … ").map(Number);assert.ok(Number(p.rightOperand)>0);assert.equal(Number(p.leftOperand),Number(p.rightOperand)*q+r);}
});

test("분수 답은 기약분수이고 소수 계산은 정확하다",()=>{
  const fractions=createWorksheet({...base,grade:6,area:"fraction-add",detailType:"분모가 다름"},"seed-5");
  for(const p of fractions.problems){const [n,d]=p.answer.split("/").map(Number);let a=n,b=d;while(b)[a,b]=[b,a%b];assert.equal(Math.abs(a),1);}
  const decimals=createWorksheet({...base,grade:6,area:"decimal-add",detailType:"소수 두 자리"},"seed-6");
  for(const p of decimals.problems) assert.ok(Math.abs(Number(p.leftOperand)+Number(p.rightOperand)-Number(p.answer))<1e-9);
});
