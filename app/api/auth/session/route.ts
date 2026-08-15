import { getAppUser } from "../../../lib/app-auth";

export async function GET() { const user = await getAppUser(); return user ? Response.json({ user }) : Response.json({ user: null }, { status: 401 }); }
