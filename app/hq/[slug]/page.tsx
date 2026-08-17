import { PublicHistoryQuiz } from "../../components/public-history-quiz";
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <PublicHistoryQuiz slug={(await params).slug}/>; }
