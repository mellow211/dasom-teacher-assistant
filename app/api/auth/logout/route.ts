import { clearAuthCookies } from "../../../lib/app-auth";

export async function POST() { await clearAuthCookies(); return Response.json({ redirectTo: "/login" }); }
