import { safeReturnTo, signUpWithPassword } from "../../../lib/app-auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) return Response.json({ error: "이름 또는 표시 이름을 입력해 주세요." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "올바른 이메일을 입력해 주세요." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "비밀번호는 8자 이상으로 입력해 주세요." }, { status: 400 });
  try { const result = await signUpWithPassword(email, password, displayName); return Response.json({ confirmationRequired: !result.signedIn, redirectTo: safeReturnTo(String(body.returnTo || "/")) }, { status: 201 }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "회원가입하지 못했습니다." }, { status: 400 }); }
}
