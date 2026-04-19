import { cookies } from "next/headers";

import { sessionSecret } from "@/lib/login-validation";
import { verifySessionTokenSync } from "@/lib/session-node";

export const ADMIN_SESSION_COOKIE = "relieflink-session";

export async function getAdminSession() {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;

  const verified = verifySessionTokenSync(token, secret);
  if (!verified || verified.role !== "admin") return null;

  return verified;
}
