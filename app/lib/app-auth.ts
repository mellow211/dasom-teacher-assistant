import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACCESS_COOKIE = "dasom_access_token";
const REFRESH_COOKIE = "dasom_refresh_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user: { id: string; email?: string; user_metadata?: { display_name?: string } };
};

function authConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("인증 서비스 설정을 확인해 주세요.");
  return { url: url.replace(/\/$/, ""), key };
}

function cookieOptions(maxAge = COOKIE_MAX_AGE) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge };
}

export function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || ["/login", "/signup"].includes(url.pathname)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

async function authRequest(path: string, init: RequestInit) {
  const { url, key } = authConfig();
  return fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: { apikey: key, "Content-Type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export async function signUpWithPassword(email: string, password: string, displayName: string) {
  const response = await authRequest("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, data: { display_name: displayName } }),
  });
  const data = await response.json() as AuthSession & { msg?: string; message?: string };
  if (!response.ok) throw new Error(authErrorMessage(response.status, data.message || data.msg));
  if (data.access_token && data.refresh_token) await setAuthCookies(data);
  return { signedIn: Boolean(data.access_token), email: data.user?.email || email };
}

export async function signInWithPassword(email: string, password: string) {
  const response = await authRequest("/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
  const data = await response.json() as AuthSession & { error_description?: string; message?: string };
  if (!response.ok) throw new Error(authErrorMessage(response.status, data.error_description || data.message));
  await setAuthCookies(data);
  return toAppUser(data.user);
}

async function setAuthCookies(session: AuthSession) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, session.access_token, cookieOptions(session.expires_in || 3600));
  store.set(REFRESH_COOKIE, session.refresh_token, cookieOptions());
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.set(ACCESS_COOKIE, "", cookieOptions(0));
  store.set(REFRESH_COOKIE, "", cookieOptions(0));
}

async function userForToken(accessToken: string) {
  const response = await authRequest("/user", { method: "GET", headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return null;
  return toAppUser(await response.json() as AuthSession["user"]);
}

async function refreshSession(refreshToken: string) {
  const response = await authRequest("/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) });
  if (!response.ok) return null;
  const session = await response.json() as AuthSession;
  try { await setAuthCookies(session); } catch { /* Server-rendered reads cannot always rotate cookies. */ }
  return { user: toAppUser(session.user), accessToken: session.access_token };
}

export async function getAppSession(): Promise<{ user: AppUser; accessToken: string } | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    const user = await userForToken(accessToken);
    if (user) return { user, accessToken };
  }
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  return refreshToken ? refreshSession(refreshToken) : null;
}

export async function getAppUser() {
  return (await getAppSession())?.user || null;
}

export async function requireAppUser(returnTo: string) {
  const user = await getAppUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

function toAppUser(user: AuthSession["user"]): AppUser {
  const email = user.email || "";
  const displayName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name.trim() : "";
  return { id: user.id, email, displayName: displayName || email.split("@")[0] || "교사" };
}

function authErrorMessage(status: number, detail?: string) {
  const value = (detail || "").toLowerCase();
  if (value.includes("invalid login") || value.includes("invalid credentials")) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (value.includes("already registered") || value.includes("already been registered")) return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (value.includes("email not confirmed")) return "이메일 인증을 완료한 뒤 로그인해 주세요.";
  if (value.includes("password") && value.includes("characters")) return "비밀번호는 8자 이상으로 입력해 주세요.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  return "인증 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
