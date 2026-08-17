import { MultiplicationBattleRoom } from "../../components/multiplication-battle-room";
export default async function Page({ params }: { params: Promise<{ code: string }> }) { return <MultiplicationBattleRoom code={(await params).code}/>; }
