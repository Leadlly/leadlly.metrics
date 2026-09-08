import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      username?: string;
      password?: string;
    };
    const username = String(body.username || "");
    const password = String(body.password || "");

    if (!(await verifyCredentials(username, password))) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions());
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Sign in failed" }, { status: 500 });
  }
}
