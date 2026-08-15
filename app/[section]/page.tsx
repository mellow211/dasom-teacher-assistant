import { AppShell } from "../components/app-shell";
import { requireChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

const protectedSections = new Set([
  "class-management",
  "attendance-assignments",
  "class-roles",
  "student-observations",
  "surveys",
]);

async function ProtectedSection({ section }: { section: string }) {
  const user = await requireChatGPTUser(`/${section}`);
  return <AppShell section={section} userEmail={user.email} />;
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (protectedSections.has(section)) return <ProtectedSection section={section} />;
  return <AppShell section={section} />;
}
