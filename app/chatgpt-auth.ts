import { getAppUser, requireAppUser, safeReturnTo } from "./lib/app-auth";

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const user = await getAppUser();
  return user ? { displayName: user.displayName, email: user.email, fullName: user.displayName } : null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await requireAppUser(returnTo);
  return { displayName: user.displayName, email: user.email, fullName: user.displayName };
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function chatGPTSignOutPath(): string {
  return "/login";
}
