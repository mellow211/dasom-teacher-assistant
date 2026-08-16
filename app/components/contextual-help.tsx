"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, CircleHelp } from "lucide-react";

type Guide = { title: string; summary: string; steps: string[] };
type HelpControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const GUIDES: Record<string, Guide> = {
  messages: { title: "학부모 메시지 생성기 사용법", summary: "확인한 사실과 부탁할 내용을 한 번에 적으면 바로 보낼 수 있는 문장으로 다듬어 줍니다.", steps: ["받는 사람을 선택합니다.", "상황과 전달할 내용을 사실 중심으로 입력합니다.", "생성한 문장을 확인·수정한 뒤 복사하거나 저장합니다."] },
  newsletters: { title: "가정통신문 생성기 사용법", summary: "확정된 정보만 입력하면 학교 문서 형식에 맞춘 초안을 만듭니다.", steps: ["통신문 유형과 안내 대상을 선택합니다.", "날짜·장소·회신기한처럼 확정된 정보만 입력합니다.", "결과에서 빠진 내용과 사실관계를 확인한 뒤 수정합니다."] },
  "lesson-plans": { title: "지도안 생성기 사용법", summary: "성취기준과 수업 조건을 바탕으로 실제 한 차시에서 운영할 수 있는 흐름을 제안합니다.", steps: ["학년·교과·성취기준과 차시 정보를 입력합니다.", "학급 특성과 포함할 활동을 필요한 만큼 덧붙입니다.", "단계별 시간 합계와 활동의 적절성을 확인합니다."] },
  "student-observations": { title: "상담·학생 관찰 기록 정리 사용법", summary: "학생별로 확인한 행동을 기록하고, 선택한 학생의 기록만 객관적인 문장으로 정리합니다.", steps: ["민감정보 대신 번호나 이니셜을 사용합니다.", "날짜별로 직접 관찰한 사실을 메모합니다.", "학생과 결과 유형을 선택하고 교사가 최종 확인합니다."] },
  "writing-feedback": { title: "글쓰기 피드백 도우미 사용법", summary: "학생의 글을 대신 쓰지 않고 스스로 고칠 수 있는 영역별 조언을 만듭니다.", steps: ["학년과 글의 종류를 선택합니다.", "개인정보를 제거한 학생 원문을 붙여 넣습니다.", "피드백 영역을 선택하고 결과를 검토합니다."] },
  "attendance-assignments": { title: "출결·과제 제출 현황 사용법", summary: "학급과 날짜를 선택한 뒤 학생별 상태를 변경하고 저장합니다.", steps: ["먼저 학급·학생 관리에서 명단을 등록합니다.", "출결 날짜 또는 과제를 선택하고 상태를 변경합니다.", "변경 내용 저장 버튼을 눌러 저장합니다."] },
  "class-roles": { title: "1인 1역 배정 도우미 사용법", summary: "역할과 학생 희망을 반영해 한 학생에게 하나의 역할을 배정합니다.", steps: ["회차와 역할별 정원을 설정합니다.", "필요하면 학생 희망과 제외 역할을 입력합니다.", "자동 배정 결과를 검토한 뒤 확정합니다."] },
  "class-management": { title: "학급·학생 관리 사용법", summary: "다른 학급 운영 기능에서 함께 사용할 학급과 학생 명단을 관리합니다.", steps: ["학년도·학년·반 정보를 입력해 학급을 만듭니다.", "학생 번호와 이름을 추가합니다.", "삭제 전 연결된 기록을 확인합니다."] },
  surveys: { title: "설문 만들기·응답 분석 사용법", summary: "문항을 구성하고 공유 주소로 응답을 받은 뒤 결과를 확인합니다.", steps: ["설문 제목과 응답 방식을 정합니다.", "문항과 선택지를 추가하고 공개 기간을 확인합니다.", "공유 주소로 배포한 뒤 결과를 확인합니다."] },
  "daily-math": { title: "일일수학 사용법", summary: "학년과 연산 영역을 선택해 반복 가능한 문제지와 정답지를 만듭니다.", steps: ["학년과 연산 영역, 난이도를 선택합니다.", "문제 수와 세부 조건을 정합니다.", "미리보기 후 문제지와 정답지를 인쇄합니다."] },
  "daily-english": { title: "일일영어 사용법", summary: "학생 수준에 맞춘 단어·문장 학습지와 정답지를 만듭니다.", steps: ["학년·수준과 학습 유형을 선택합니다.", "사용할 단어나 문장을 확인합니다.", "결과를 검토하고 문제지와 정답지를 인쇄합니다."] },
  "multiplication-quiz": { title: "곱셈 퀴즈 사용법", summary: "연습할 단과 난이도를 정해 개인 또는 대결 퀴즈를 시작합니다.", steps: ["퀴즈 방식을 선택합니다.", "연습할 단·문제 수·제한 시간을 설정합니다.", "정답을 입력하고 틀린 문제를 다시 확인합니다."] },
  "history-quiz": { title: "역사 퀴즈 사용법", summary: "일반 역사 범위 또는 수업 권한이 있는 PDF 내용을 바탕으로 퀴즈를 만듭니다.", steps: ["일반 퀴즈와 PDF 기반 퀴즈 중 선택합니다.", "범위·난이도·문제 유형을 설정합니다.", "PDF 사용 시 페이지와 원문 근거를 확인합니다."] },
  "textbook-dictation": { title: "교과서 받아쓰기 사용법", summary: "교사가 제공한 교과서 글에서 받아쓰기 문장을 골라 학습지를 만듭니다.", steps: ["사용 권한이 있는 자료와 범위를 준비합니다.", "문장 수와 난이도를 설정합니다.", "선정 문장이 원문에 있는지 확인합니다."] },
};

const HELP_RULES: [RegExp, string][] = [
  [/학년/, "학생의 실제 학년을 선택하세요. 설명의 어휘와 활동 수준을 맞추는 데 사용됩니다."],
  [/교과/, "수업하거나 기록할 교과를 선택하세요. 기타라면 주제에 교과 성격도 적어 주세요."],
  [/성취기준/, "교육과정 성취기준 문구를 그대로 입력하세요. 임의로 줄이거나 여러 기준을 섞지 않는 것이 좋습니다."],
  [/단원|주제/, "교과서 단원명이나 이번 활동의 핵심 주제를 구체적으로 적어 주세요."],
  [/학생.*(글|원문)/, "이름·연락처·건강정보 등 개인정보를 지운 뒤 학생이 작성한 원문만 입력하세요."],
  [/학생.*(이름|식별|호칭)/, "가능하면 번호나 이니셜, '○○ 학생'처럼 필요한 최소한의 호칭을 사용하세요."],
  [/핵심 안내 내용/, "학부모가 반드시 알아야 할 목적과 확정된 내용을 적으세요. 날짜·장소는 전용 칸에 나누면 더 정확합니다."],
  [/날짜|작성일|기한|제시일/, "행사일·관찰일·제출일을 구분해 정확히 입력하세요. 정해지지 않았다면 비워 두세요."],
  [/시간/, "전체 수업 시간 또는 시작·종료 시간을 정확히 입력하세요."],
  [/장소/, "확정된 장소만 입력하세요. 집결 장소가 다르면 유의사항에 함께 적어 주세요."],
  [/준비물|자료/, "실제로 사용할 수 있거나 학생이 준비해야 하는 물품만 적어 주세요."],
  [/비용/, "총액인지 1인당 금액인지 알 수 있게 적고, 확정되지 않았다면 비워 두세요."],
  [/문의처/, "공개 가능한 담당 부서나 연락 방법만 입력하고 개인 연락처는 꼭 필요한 경우에만 사용하세요."],
  [/말투/, "받는 사람과 목적에 맞는 분위기를 선택하세요. 생성 후 표현을 직접 수정할 수 있습니다."],
  [/길이|상세도/, "짧은 안내는 간단하게, 배부 문서나 자세한 설명은 보통 또는 자세하게를 선택하세요."],
  [/난이도|학생 수준/, "현재 학생들이 스스로 해결할 수 있는 수준을 기준으로 선택하세요."],
  [/문제 수/, "수업 시간과 학생의 집중 시간을 고려해 선택하세요."],
  [/관찰 메모/, "해석이나 성격 평가보다 눈으로 확인한 행동과 실제 발화를 중심으로 적으세요."],
  [/관찰 상황/, "언제 어떤 활동 중에 관찰했는지 짧게 적으면 맥락이 분명해집니다."],
  [/지도.*지원/, "교사가 실제로 제공한 안내, 자료, 자리 조정 등의 지원만 기록하세요."],
  [/이후 변화|결과/, "지원 후 직접 확인한 변화가 있을 때만 적고 추측은 입력하지 마세요."],
  [/안내 대상|참여 대상|수신 대상/, "문서를 실제로 받거나 활동에 참여하는 대상을 정확히 선택하세요."],
  [/제외 페이지|출제 범위/, "PDF에 표시된 실제 쪽수를 기준으로 입력하세요. 쉼표와 하이픈으로 여러 범위를 지정할 수 있습니다."],
  [/검색|필터/, "원하는 학생이나 기록만 빠르게 찾을 때 사용합니다. 원본 데이터는 삭제되지 않습니다."],
];

function descriptionFor(label: string, control: HelpControl) {
  const normalized = label.replace(/선택|필수|\*/g, " ").replace(/\s+/g, " ").trim();
  const matched = HELP_RULES.find(([pattern]) => pattern.test(normalized));
  if (matched) return matched[1];
  if (control instanceof HTMLSelectElement) return "목적에 가장 가까운 항목을 선택하세요. 선택값에 따라 결과와 추가 입력 항목이 달라질 수 있습니다.";
  if (control instanceof HTMLTextAreaElement) return "확인된 내용을 구체적으로 적어 주세요. 입력하지 않은 사실은 임의로 추가하지 않는 것이 안전합니다.";
  return control.placeholder ? `입력 예시를 참고하세요: ${control.placeholder}` : "이 기능에 필요한 정보를 입력하세요. 선택 항목은 비워 두어도 됩니다.";
}

export function ContextualHelp({ section }: { section: string }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const guide = GUIDES[section];

  useEffect(() => {
    const main = document.querySelector(".main-wrap main");
    if (!main) return;
    let active = true;
    queueMicrotask(() => { if (active) setTarget(main as HTMLElement); });
    const enhance = () => main.querySelectorAll<HTMLLabelElement>("label:not([data-help-enhanced])").forEach(label => {
      const control = label.querySelector("input, textarea, select") as HelpControl | null;
      if (!control || ["radio", "checkbox", "hidden"].includes(control.type) || label.classList.contains("choice") || label.classList.contains("switch-row")) return;
      const text = label.textContent?.trim() || "입력 항목";
      const button = document.createElement("button");
      button.type = "button"; button.className = "field-help-trigger";
      button.setAttribute("aria-label", `${text.replace(/\s+/g, " ")} 도움말`);
      button.setAttribute("aria-expanded", "false");
      const mark = document.createElement("span"); mark.textContent = "?"; mark.setAttribute("aria-hidden", "true");
      const popup = document.createElement("span"); popup.className = "field-help-popup"; popup.setAttribute("role", "tooltip"); popup.textContent = descriptionFor(text, control);
      button.appendChild(mark); button.appendChild(popup); label.dataset.helpEnhanced = "true"; label.classList.add("help-enabled"); label.appendChild(button);
    });
    const closeOthers = (except?: globalThis.Element) => main.querySelectorAll(".field-help-trigger.open").forEach(item => { if (item !== except) { item.classList.remove("open"); item.setAttribute("aria-expanded", "false"); } });
    const click = (event: Event) => {
      const button = (event.target as HTMLElement).closest(".field-help-trigger");
      if (!button) { closeOthers(); return; }
      event.preventDefault(); event.stopPropagation();
      const next = !button.classList.contains("open"); closeOthers(button); button.classList.toggle("open", next); button.setAttribute("aria-expanded", String(next));
    };
    enhance(); const observer = new MutationObserver(enhance); observer.observe(main, { childList: true, subtree: true }); main.addEventListener("click", click);
    return () => { active = false; observer.disconnect(); main.removeEventListener("click", click); };
  }, [section]);

  if (!guide || !target) return null;
  return createPortal(<section className={`usage-guide ${open ? "open" : ""}`} aria-label="현재 기능 사용 안내">
    <button className="usage-guide-summary" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}><CircleHelp size={18}/><span><b>{guide.title}</b><small>{guide.summary}</small></span><ChevronDown size={17}/></button>
    {open && <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>}
  </section>, target);
}
