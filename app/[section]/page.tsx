import { AppShell } from "../components/app-shell";
import { requireAppUser } from "../lib/app-auth";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const user = await requireAppUser(`/${section}`);
  return <AppShell section={section} userEmail={user.username} userName={user.displayName}/>;
}
