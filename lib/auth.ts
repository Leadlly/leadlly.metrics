export const SESSION_COOKIE = "leadlly_metrics_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function encoder() {
  return new TextEncoder();
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder().encode(value));
  return toHex(digest);
}

export function credentials() {
  return {
    username: process.env.METRICS_USERNAME || "",
    password: process.env.METRICS_PASSWORD || "",
  };
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSessionToken() {
  const { username, password } = credentials();
  const secret =
    process.env.METRICS_AUTH_SECRET || `${username}:${password}:leadlly-metrics`;
  return sha256(`session:${secret}`);
}

export async function isValidSession(token?: string | null) {
  if (!token) return false;
  const expected = await createSessionToken();
  return timingSafeEqual(token, expected);
}

export async function verifyCredentials(username: string, password: string) {
  const expected = credentials();
  if (!expected.username || !expected.password) return false;
  return (
    timingSafeEqual(username, expected.username) &&
    timingSafeEqual(password, expected.password)
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
