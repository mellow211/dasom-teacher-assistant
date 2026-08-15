export const ENGLISH_TOPICS=["인사와 자기소개","학교와 교실","가족과 친구","음식과 음료","동물","색깔과 모양","숫자와 시간","요일과 날짜","날씨와 계절","감정과 상태","취미와 운동","하루 생활","장소와 방향","물건과 쇼핑","직업과 장래 희망","직접 입력"] as const;
export type EnglishLevel="basic"|"standard"|"challenge";
export const ENGLISH_LEVELS:Record<EnglishLevel,{label:string;maxSentenceWords:number;optionCount:number;readingSentences:number}>={basic:{label:"기초",maxSentenceWords:6,optionCount:3,readingSentences:2},standard:{label:"기본",maxSentenceWords:10,optionCount:4,readingSentences:3},challenge:{label:"도전",maxSentenceWords:16,optionCount:4,readingSentences:5}};
export const ENGLISH_PROBLEM_TYPES=[
  ["word-match","영어 단어와 한국어 뜻 연결하기","word"],["meaning-write","영어 단어를 보고 뜻 쓰기","word"],["word-write","한국어 뜻을 보고 영어 단어 쓰기","word"],["missing-letters","빠진 알파벳 채우기","word"],["scramble-word","철자가 섞인 단어 바르게 배열하기","word"],["choose-word","알맞은 단어 고르기","word"],
  ["sentence-order","단어를 배열하여 문장 만들기","sentence"],["sentence-blank","빈칸에 알맞은 단어 넣기","sentence"],["sentence-match","영어 문장과 한국어 뜻 연결하기","sentence"],["choose-sentence","알맞은 문장 고르기","sentence"],["sentence-meaning","영어 문장을 보고 뜻 쓰기","sentence"],["sentence-write","한국어 문장을 보고 영어 문장 쓰기","sentence"],
  ["reading-check","짧은 영어 글 읽고 내용 확인하기","reading"],["reading-true","글의 내용과 일치하는 문장 고르기","reading"],["reading-main","글의 중심 내용 고르기","reading"],["reading-short","글을 읽고 짧게 답하기","reading"],
] as const;
export type EnglishProblemType=(typeof ENGLISH_PROBLEM_TYPES)[number][0];
export const problemTypeLabel=(type:EnglishProblemType)=>ENGLISH_PROBLEM_TYPES.find(x=>x[0]===type)?.[1]||type;
export const availableEnglishTypes=(grade:string,level:EnglishLevel)=>ENGLISH_PROBLEM_TYPES.filter(x=>x[2]!=="reading"||(grade!=="foundation"&&level!=="basic"));
