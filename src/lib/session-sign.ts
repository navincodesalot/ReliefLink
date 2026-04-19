import { createHmac } from "node:crypto";

import type { ReliefLinkRole } from "@/lib/roles";

const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export function signSessionToken(
  role: ReliefLinkRole,
  secret: string,
  opts?: { userId?: string; email?: string },
): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = JSON.stringify({
    role,
    exp,
    ...(opts?.userId ? { sub: opts.userId } : {}),
    ...(opts?.email ? { email: opts.email } : {}),
  });
  const p = Buffer.from(payload, "utf8").toString("base64url");
  const h = createHmac("sha256", secret).update(p).digest("hex");
  return `${p}.${h}`;
}
