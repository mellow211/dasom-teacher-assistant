import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "dasom_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type AppUser = { id: string; username: string; email: string; displayName: string };
type AccountRow = { account_id: string; username: string; display_name: string };
type LoginRow = AccountRow & { session_token: string; expires_at: string };

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("계정 서비스 설정을 확인해 주세요.");
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
  } catch { return "/"; }
}

async function rpc<T>(name: string, body: Record<string, string>): Promise<T[]> {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json().catch(() => null) as { message?: string } | T[] | null;
  if (!response.ok) throw new Error(accountError((data as { message?: string } | null)?.message));
  return Array.isArray(data) ? data : [];
}

export function normalizeUsername(value: string) { return value.trim().toLowerCase(); }
export function validUsername(value: string) { return /^[a-z0-9_]{4,20}$/.test(normalizeUsername(value)); }

export async function signUpWithPassword(username: string, password: string, displayName: string) {
  const normalized = normalizeUsername(username);
  await rpc<AccountRow>("register_app_account", { p_username: normalized, p_password: password, p_display_name: displayName.trim() });
  return signInWithPassword(normalized, password);
}

export async function claimLegacyAccountData(oldEmail: string, username: string) {
  const secret = process.env.SUPABASE_OWNER_SECRET;
  if (!secret || secret.length < 32 || !oldEmail.trim()) return;
  const [oldOwner, newOwner] = await Promise.all([
    ownerKey(oldEmail.trim().toLowerCase(), secret),
    ownerKey(`${normalizeUsername(username)}@accounts.dasom.local`, secret),
  ]);
  await rpc<never>("claim_legacy_teacher_data", { p_old_owner_key: oldOwner, p_new_owner_key: newOwner });
}

export async function signInWithPassword(username: string, password: string) {
  const rows = await rpc<LoginRow>("login_app_account", { p_username: normalizeUsername(username), p_password: password });
  const row = rows[0];
  if (!row) throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
  const store = await cookies();
  store.set(SESSION_COOKIE, row.session_token, cookieOptions());
  return toUser(row);
}

export async function clearAuthCookies() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await rpc<never>("logout_app_session", { p_session_token: token }).catch(() => undefined);
  store.set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function getAppSession(): Promise<{ user: AppUser; accessToken: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await rpc<AccountRow>("get_app_session", { p_session_token: token }).catch(() => []);
  return rows[0] ? { user: toUser(rows[0]), accessToken: token } : null;
}

export async function getAppUser() { return (await getAppSession())?.user || null; }
export async function requireAppUser(returnTo: string) {
  const user = await getAppUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
}

function toUser(row: AccountRow): AppUser {
  return { id: row.account_id, username: row.username, email: `${row.username}@accounts.dasom.local`, displayName: row.display_name };
}

function accountError(detail?: string) {
  const value = (detail || "").toLowerCase();
  if (value.includes("username_already_exists") || value.includes("duplicate key")) return "이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.";
  if (value.includes("invalid_username")) return "아이디는 영문 소문자, 숫자, 밑줄로 4~20자 입력해 주세요.";
  if (value.includes("invalid_password")) return "비밀번호는 8~72자로 입력해 주세요.";
  if (value.includes("invalid_display_name")) return "이름 또는 표시 이름을 확인해 주세요.";
  return "계정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

async function ownerKey(identity: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(identity));
  return Array.from(new Uint8Array(signed), byte => byte.toString(16).padStart(2, "0")).join("");
}
