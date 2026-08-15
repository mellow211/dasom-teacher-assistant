import { AppShell } from "./components/app-shell";
import { requireAppUser } from "./lib/app-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser("/");
  return <AppShell section="dashboard" userEmail={user.email} userName={user.displayName}/>;
}
