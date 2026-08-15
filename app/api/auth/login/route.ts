import { safeReturnTo, signInWithPassword } from "../../../lib/app-auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "입력 내용을 확인해 주세요." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return Response.json({ error: "이메일과 비밀번호를 확인해 주세요." }, { status: 400 });
  try { await signInWithPassword(email, password); return Response.json({ redirectTo: safeReturnTo(String(body.returnTo || "/")) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "로그인하지 못했습니다." }, { status: 401 }); }
}
