export const NEWSLETTER_TYPES = ["행사 안내", "교육활동 안내", "체험학습 안내", "신청·동의 안내", "준비물 안내", "일정 변경 안내", "생활 안내", "기타"] as const;
export const NEWSLETTER_AUDIENCES = ["전체 학생", "특정 학년", "특정 학급", "직접 입력"] as const;
export const NEWSLETTER_TONES = ["공식적으로", "친절하게", "간결하게"] as const;
export const NEWSLETTER_LENGTHS = ["간단하게", "보통", "자세하게"] as const;

export type NewsletterInput = {
  type: (typeof NEWSLETTER_TYPES)[number];
  audience: (typeof NEWSLETTER_AUDIENCES)[number];
  audienceDetail?: string;
  title?: string;
  coreContent: string;
  organization?: string;
  sender?: string;
  issuedDate?: string;
  date?: string;
  time?: string;
  place?: string;
  participants?: string;
  materials?: string;
  cost?: string;
  notes?: string;
  needsReply: boolean;
  replyDeadline?: string;
  replyMethod?: string;
  contact?: string;
  tone: (typeof NEWSLETTER_TONES)[number];
  length: (typeof NEWSLETTER_LENGTHS)[number];
};

export type NewsletterErrors = Partial<Record<keyof NewsletterInput, string>>;

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";

export function validateNewsletterInput(value: unknown): { data?: NewsletterInput; errors: NewsletterErrors } {
  if (!value || typeof value !== "object") return { errors: { coreContent: "입력 내용을 확인해 주세요." } };
  const raw = value as Record<string, unknown>;
  const errors: NewsletterErrors = {};

  if (!includes(NEWSLETTER_TYPES, raw.type)) errors.type = "가정통신문 유형을 선택해 주세요.";
  if (!includes(NEWSLETTER_AUDIENCES, raw.audience)) errors.audience = "안내 대상을 선택해 주세요.";
  if (raw.audience !== "전체 학생" && !clean(raw.audienceDetail, 100)) errors.audienceDetail = "안내할 학년, 학급 또는 대상을 입력해 주세요.";
  if (!clean(raw.coreContent, 3000)) errors.coreContent = "학부모에게 안내할 핵심 내용을 입력해 주세요.";
  if (!includes(NEWSLETTER_TONES, raw.tone)) errors.tone = "말투를 선택해 주세요.";
  if (!includes(NEWSLETTER_LENGTHS, raw.length)) errors.length = "길이를 선택해 주세요.";
  if (typeof raw.needsReply !== "boolean") errors.needsReply = "신청·회신 필요 여부를 선택해 주세요.";
  if (Object.keys(errors).length) return { errors };

  const optional = (key: keyof NewsletterInput, max = 500) => clean(raw[key], max) || undefined;
  return { errors, data: {
    type: raw.type as NewsletterInput["type"],
    audience: raw.audience as NewsletterInput["audience"],
    audienceDetail: optional("audienceDetail", 100),
    title: optional("title", 150),
    coreContent: clean(raw.coreContent, 3000),
    organization: optional("organization", 100), sender: optional("sender", 100), issuedDate: optional("issuedDate", 100),
    date: optional("date", 100), time: optional("time", 100), place: optional("place", 200),
    participants: optional("participants", 200), materials: optional("materials", 500), cost: optional("cost", 100), notes: optional("notes", 1000),
    needsReply: raw.needsReply as boolean,
    replyDeadline: optional("replyDeadline", 100), replyMethod: optional("replyMethod", 500), contact: optional("contact", 200),
    tone: raw.tone as NewsletterInput["tone"], length: raw.length as NewsletterInput["length"],
  } };
}

export function buildNewsletterPrompt(input: NewsletterInput): string {
  const references = selectNewsletterReferences(input);
  const formatGuide = newsletterFormatGuide(input);
  return `다음 입력 정보만 사용하여 학부모에게 실제로 배부할 수 있는 완성된 한국어 가정통신문을 작성하세요.

[입력 정보]
- 유형: ${input.type}
- 안내 대상: ${input.audience}${input.audienceDetail ? ` (${input.audienceDetail})` : ""}
- 제목: ${input.title || "입력되지 않음 - 핵심 내용에 맞게 생성"}
- 핵심 안내 내용: ${input.coreContent}
- 학교명 또는 기관명: ${input.organization || "입력되지 않음"}
- 발신자: ${input.sender || "입력되지 않음"}
- 작성일: ${input.issuedDate || "입력되지 않음"}
- 날짜: ${input.date || "입력되지 않음"}
- 시간: ${input.time || "입력되지 않음"}
- 장소: ${input.place || "입력되지 않음"}
- 참여 대상: ${input.participants || "입력되지 않음"}
- 준비물: ${input.materials || "입력되지 않음"}
- 비용: ${input.cost || "입력되지 않음"}
- 기타 유의사항: ${input.notes || "입력되지 않음"}
- 신청·회신 필요: ${input.needsReply ? "예" : "아니요"}
- 신청·회신 기한: ${input.replyDeadline || "입력되지 않음"}
- 신청 방법: ${input.replyMethod || "입력되지 않음"}
- 문의처: ${input.contact || "입력되지 않음"}
- 말투: ${input.tone}
- 길이: ${input.length}

${references}

[반드시 지킬 최종 문서 형식]
${formatGuide}

[작성 원칙]
- 제목, 학부모 인사말, 안내 목적과 주요 내용, 입력된 세부 정보, 신청 또는 협조 요청, 마무리 인사 순으로 구성하세요.
- 세부 정보가 여러 개면 날짜·시간·장소·대상·준비물·비용 등을 읽기 쉬운 항목 형태로 정리하세요.
- 공식적인 문서 형식을 유지하되 지나치게 권위적이거나 딱딱하지 않게 작성하세요.
- 입력된 사실만 사용하고 날짜, 요일, 시간, 장소, 비용, 준비물, 신청 방법을 추측하거나 만들지 마세요.
- 제목은 입력된 경우 그대로 사용하고, 비어 있을 때만 핵심 내용을 반영해 간결하게 생성하세요.
- 학부모를 존중하고 협조 요청은 명확하고 정중하게 작성하세요. 책임을 돌리거나 불안감을 주는 표현은 쓰지 마세요.
- 같은 내용을 반복하거나 불필요하게 긴 인사말을 쓰지 마세요.
- 신청이나 회신이 필요한 경우 입력된 기한과 방법이 한눈에 보이게 작성하세요.
- 입력되지 않은 항목은 자연스럽게 생략하세요.
- 작성일, 학교명, 발신자는 해당 정보가 입력된 경우에만 표시하세요.
- 학교장, 담당자, 전화번호 등 입력되지 않은 정보를 추가하지 마세요.
- 참고 패턴은 구조와 표현 방식에만 활용하고 사례의 학교명·날짜·연락처·비용·고유 문장을 복사하지 마세요.
- 개인정보 동의에 필요한 목적·항목·보유기간·제공받는 자가 입력되지 않았다면 임의로 완성하지 말고 해당 동의 문구를 생략하세요.
- 공개 게시될 수 있는 문서이므로 개별 학생이나 학부모를 식별할 수 있는 정보를 포함하지 마세요.
- 내부 설명, 작성 과정, 주의사항 없이 완성된 가정통신문만 반환하세요.
- Markdown 문법(**, #, ---, 대괄호 제목), 코드 블록, 이모지, 장식용 구분선을 사용하지 마세요.
- 세부 정보는 학교 문서에서 일반적으로 쓰는 '1.', '2.' 번호와 필요한 경우 '가.', '나.' 하위 항목으로 정리하세요.
- 제목은 문서 첫 줄에 한 번만 쓰고, 본문에서 같은 제목을 반복하지 마세요.
- '날짜'는 행사·활동 날짜이며 작성일로 사용하지 마세요. 문서 하단 작성일은 작성일 입력값이 있을 때만 표시하세요.
- 세부 정보 항목(일시·장소·대상·준비물·비용 등)은 값이 입력되지 않아도 항목 제목과 번호를 그대로 유지하고 '추후 확정 후 별도 안내드리겠습니다'처럼 정직한 안내 문구로 채우세요. 항목을 통째로 삭제하거나 번호를 다시 매기지 마세요. 단, 학교명·발신자·작성일처럼 문서 상하단의 발신 정보는 값이 없으면 표시하지 않습니다.
- 실제 학교 가정통신문 관행에 따라 본문 마지막에는 붙임 문서가 있으면 '붙임  1. ○○ 1부.' 형식으로 표시한 뒤, 붙임 유무와 관계없이 그 다음 줄에 '끝.'을 표시하세요.
- 신청·회신이 필요한 문서는 본문과 '끝.' 뒤에 절취선(예: -------✂-------)으로 구분한 회신서를 추가하고, 학년·반·번호, 학생 성명, 참가 또는 신청 여부 체크란, 보호자 성명(서명) 칸을 포함하세요. 회신 기한이 입력된 경우 회신서에도 표시하세요.
- 간단하게는 핵심 위주, 보통은 일반적인 분량, 자세하게는 입력된 유의사항과 협조 사항을 충분히 포함하세요.`;
}

function newsletterFormatGuide(input: NewsletterInput): string {
  const details = input.type === "체험학습 안내"
    ? "1. 일시\n2. 장소\n3. 대상\n4. 주요 활동 또는 일정\n5. 준비물 및 유의사항\n6. 참가 동의·회신 안내"
    : input.type === "신청·동의 안내"
      ? "1. 안내 목적\n2. 대상 및 운영 내용\n3. 신청 기간\n4. 신청 방법\n5. 유의사항 및 문의처"
      : "1. 안내 개요\n2. 입력된 일정·장소·대상 등 세부 정보\n3. 협조 또는 신청 사항\n4. 유의사항 및 문의처";
  const closing = [
    input.needsReply ? "붙임  1. 참가(신청) 회신서 1부." : null,
    "끝.",
  ].filter(Boolean).join("\n");
  const senderBlock = [
    input.issuedDate ? "작성일" : "작성일은 표시하지 않음",
    input.organization ? "학교명 또는 기관명" : "학교명은 표시하지 않음",
    input.sender ? "발신자" : "발신자는 표시하지 않음",
  ].join("\n");
  const replySlip = input.needsReply
    ? `\n\n(문서 맨 끝에 절취선으로 구분한 회신서 추가)\n-------------------------- ✂ 절취선 --------------------------\n${input.title || "회신서"}\n\n학년 반 번호:                 학생 성명:\n참가(신청) 여부: [   ] 참가   [   ] 불참\n보호자 성명(서명 또는 인):\n\n위와 같이 회신합니다.${input.replyDeadline ? `  (제출 기한: ${input.replyDeadline})` : ""}`
    : "";
  return `제목\n\n학부모 인사말과 안내 목적을 자연스러운 1~2개 문단으로 작성\n\n${details}\n\n협조에 대한 감사와 마무리 인사\n\n${closing}\n\n${senderBlock}${replySlip}\n\n세부 정보 항목은 값이 없어도 항목 제목(번호)을 유지하고 '추후 안내' 취지의 문구로 채우세요. 항목을 삭제하거나 번호를 다시 매기지 마세요.`;
}

export function normalizeNewsletterOutput(value: string): string {
  return value
    .replace(/```(?:text|markdown)?\s*/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/^\s*\[([^\]]+)]\s*$/gm, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
import { selectNewsletterReferences } from "./newsletter-reference-library";
