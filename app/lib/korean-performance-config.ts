export const PERFORMANCE_DOMAINS = ["듣기·말하기", "읽기", "쓰기", "문법", "문학", "매체", "영역 통합"] as const;
export const ASSESSMENT_METHODS = ["관찰평가", "구술평가", "실기·시연", "활동지형 수행평가", "작품 결과물", "포트폴리오", "자기평가", "동료평가"] as const;
export const ASSESSMENT_MODES = ["개인", "짝", "모둠", "개인과 모둠 혼합"] as const;
export const ASSESSMENT_TIMINGS = ["수업 중", "단원 학습 중", "단원 마무리", "직접 입력"] as const;
export const DEFAULT_LEVEL_NAMES = {
  3: ["노력 필요", "보통", "잘함"],
  4: ["노력 필요", "보통", "잘함", "매우 잘함"],
} as const;
export type PerformanceDomain = (typeof PERFORMANCE_DOMAINS)[number];
export type AssessmentMethod = (typeof ASSESSMENT_METHODS)[number];
export type AssessmentMode = (typeof ASSESSMENT_MODES)[number];
export type AssessmentTiming = (typeof ASSESSMENT_TIMINGS)[number];
