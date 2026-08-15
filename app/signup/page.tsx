import { AuthForm } from "../components/auth-form";
import { getAppUser, safeReturnTo } from "../lib/app-auth";
import { redirect } from "next/navigation";
import "../auth.css";

export const dynamic = "force-dynamic";
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if (await getAppUser()) redirect(returnTo);
  return <AuthForm mode="signup" returnTo={returnTo}/>;
}
