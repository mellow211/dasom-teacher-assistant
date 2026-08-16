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
    organization: optional("organization", 100), sender: optional("sender", 100),
    date: optional("date", 100), time: optional("time", 100), place: optional("place", 200),
    participants: optional("participants", 200), materials: optional("materials", 500), cost: optional("cost", 100), notes: optional("notes", 1000),
    needsReply: raw.needsReply as boolean,
    replyDeadline: optional("replyDeadline", 100), replyMethod: optional("replyMethod", 500), contact: optional("contact", 200),
    tone: raw.tone as NewsletterInput["tone"], length: raw.length as NewsletterInput["length"],
  } };
}

export function buildNewsletterPrompt(input: NewsletterInput): string {
  const references = selectNewsletterReferences(input);
  return `다음 입력 정보만 사용하여 학부모에게 실제로 배부할 수 있는 완성된 한국어 가정통신문을 작성하세요.

[입력 정보]
- 유형: ${input.type}
- 안내 대상: ${input.audience}${input.audienceDetail ? ` (${input.audienceDetail})` : ""}
- 제목: ${input.title || "입력되지 않음 - 핵심 내용에 맞게 생성"}
- 핵심 안내 내용: ${input.coreContent}
- 학교명 또는 기관명: ${input.organization || "입력되지 않음"}
- 발신자: ${input.sender || "입력되지 않음"}
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
- 간단하게는 핵심 위주, 보통은 일반적인 분량, 자세하게는 입력된 유의사항과 협조 사항을 충분히 포함하세요.`;
}
import { selectNewsletterReferences } from "./newsletter-reference-library";
