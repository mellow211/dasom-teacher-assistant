import type { Metadata } from "next";
import "./globals.css";
import "./observation.css";
import "./writing-feedback.css";
import "./multiplication-quiz.css";
import "./daily-math.css";
import "./daily-english.css";
import "./history-quiz.css";
import "./textbook-dictation.css";
import "./attendance-assignment.css";
import "./class-role-assignment.css";
import "./class-student-manager.css";
import "./survey.css";

export const metadata: Metadata = {
  title: "다솜쌤 | AI 교사 도우미",
  description: "초등 교사의 수업 준비와 학급 운영을 돕는 통합형 AI 교사 도우미",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
