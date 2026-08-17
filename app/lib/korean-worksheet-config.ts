export const KOREAN_WORKSHEET_LEVELS = ["보충", "기본", "심화"] as const;
export const KOREAN_ACTIVITY_TYPES = ["같은 글자 찾기", "글자와 소리 연결하기", "빠진 자모 또는 글자 채우기", "낱말 따라 쓰기", "낱말과 뜻 연결하기", "낱말 분류하기", "글자를 배열하여 낱말 만들기", "알맞은 낱말 고르기", "문장의 빈칸 채우기", "낱말을 배열하여 문장 만들기", "문장을 따라 쓰기", "알맞은 문장 고르기", "짧은 글을 읽고 답하기", "내용과 일치하는 것 찾기", "사건이나 내용의 순서 정하기", "인물의 말이나 행동 찾기", "생각이나 느낌 한 문장으로 쓰기", "핵심 낱말을 사용하여 문장 만들기"] as const;
export const STUDENT_LEVEL_TITLES = { 보충: "활동지 A", 기본: "활동지 B", 심화: "활동지 C" } as const;
export type KoreanWorksheetLevel = (typeof KOREAN_WORKSHEET_LEVELS)[number];
export type KoreanActivityType = (typeof KOREAN_ACTIVITY_TYPES)[number];
