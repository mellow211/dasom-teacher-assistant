import { AppShell } from "../components/app-shell";
import { requireAppUser } from "../lib/app-auth";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ resultId?: string }> }) {
  const { section } = await params;
  const { resultId } = await searchParams;
  const user = await requireAppUser(`/${section}`);
  return <AppShell section={section} userEmail={user.username} userName={user.displayName} resultId={resultId}/>;
}
