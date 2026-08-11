export const MESSAGE_TYPES = ["문의 답변", "상황별 안내"] as const;
export const RECIPIENTS = ["학부모", "학생"] as const;
export const TONES = ["정중하게", "부드럽게", "간결하게"] as const;
export const LENGTHS = ["짧게", "보통", "자세하게"] as const;

export const MESSAGE_SITUATIONS = {
  "문의 답변": ["결석 문의", "친구 관계 문의", "성적 문의"],
  "상황별 안내": ["지각", "준비물 미지참", "과제 미제출"],
} as const;

export type MessageType = keyof typeof MESSAGE_SITUATIONS;
export type MessageSituation = (typeof MESSAGE_SITUATIONS)[MessageType][number];
export type MessageRecipient = (typeof RECIPIENTS)[number];
export type MessageTone = (typeof TONES)[number];
export type MessageLength = (typeof LENGTHS)[number];

export type MessageGeneratorInput = {
  messageType: MessageType;
  situation: MessageSituation;
  recipient: MessageRecipient;
  studentName?: string;
  facts: string;
  request: string;
  deadline?: string;
  tone: MessageTone;
  length: MessageLength;
};

export type ValidationErrors = Partial<Record<keyof MessageGeneratorInput, string>>;

const includes = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);

export function validateMessageInput(value: unknown): {
  data?: MessageGeneratorInput;
  errors: ValidationErrors;
} {
  if (!value || typeof value !== "object") {
    return { errors: { facts: "입력 내용을 확인해 주세요." } };
  }

  const raw = value as Record<string, unknown>;
  const errors: ValidationErrors = {};
  const messageType = raw.messageType;
  const availableSituations = includes(MESSAGE_TYPES, messageType)
    ? MESSAGE_SITUATIONS[messageType]
    : [];

  if (!includes(MESSAGE_TYPES, messageType)) errors.messageType = "메시지 유형을 선택해 주세요.";
  if (!includes(availableSituations, raw.situation)) errors.situation = "세부 상황을 선택해 주세요.";
  if (!includes(RECIPIENTS, raw.recipient)) errors.recipient = "수신 대상을 선택해 주세요.";
  if (typeof raw.facts !== "string" || !raw.facts.trim()) errors.facts = "교사가 확인한 사실을 입력해 주세요.";
  if (typeof raw.request !== "string" || !raw.request.trim()) errors.request = "전달하거나 요청할 내용을 입력해 주세요.";
  if (!includes(TONES, raw.tone)) errors.tone = "말투를 선택해 주세요.";
  if (!includes(LENGTHS, raw.length)) errors.length = "길이를 선택해 주세요.";

  const studentName = typeof raw.studentName === "string" ? raw.studentName.trim().slice(0, 40) : "";
  const facts = typeof raw.facts === "string" ? raw.facts.trim().slice(0, 2000) : "";
  const request = typeof raw.request === "string" ? raw.request.trim().slice(0, 2000) : "";
  const deadline = typeof raw.deadline === "string" ? raw.deadline.trim().slice(0, 80) : "";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    errors,
    data: {
      messageType: messageType as MessageType,
      situation: raw.situation as MessageSituation,
      recipient: raw.recipient as MessageRecipient,
      studentName: studentName || undefined,
      facts,
      request,
      deadline: deadline || undefined,
      tone: raw.tone as MessageTone,
      length: raw.length as MessageLength,
    },
  };
}

export function buildMessagePrompt(input: MessageGeneratorInput): string {
  const sentenceGuide = {
    "짧게": "2~3문장",
    "보통": "3~5문장",
    "자세하게": "5~7문장",
  }[input.length];

  return `다음 정보를 바탕으로 교사가 바로 보낼 수 있는 한국어 메시지를 작성하세요.

[입력 정보]
- 메시지 유형: ${input.messageType}
- 세부 상황: ${input.situation}
- 수신 대상: ${input.recipient}
- 학생 이름 또는 호칭: ${input.studentName || "입력되지 않음"}
- 교사가 확인한 사실: ${input.facts}
- 전달 내용 또는 요청 사항: ${input.request}
- 날짜 또는 제출 기한: ${input.deadline || "입력되지 않음"}
- 말투: ${input.tone}
- 길이: ${input.length} (${sentenceGuide})

[작성 원칙]
- 입력된 사실만 사용하고 날짜, 점수, 사유, 학생 행동을 임의로 만들지 마세요.
- 정중하고 따뜻하되 지나치게 딱딱하거나 장황하지 않게 작성하세요.
- 학생이나 학부모를 비난하거나 훈계하지 말고, 학생의 성격을 평가하지 마세요.
- 확인된 행동과 상황을 중심으로 작성하세요.
- 친구 관계 문의라면 어느 한쪽의 잘못을 단정하지 말고 상황을 확인하여 지도하겠다는 방향으로 답하세요.
- 성적 문의라면 입력된 평가 결과와 기준만 활용하고, 입력 정보로 가능한 경우에만 보완 방향을 안내하세요.
- 지각, 준비물 미지참, 과제 미제출 안내라면 입력된 준비 사항이나 기한을 명확하게 전달하세요.
- 다른 학생의 이름이나 정보를 포함하지 마세요.
- 별도의 제목, 설명, 따옴표 없이 완성된 메시지만 반환하세요.`;
}
