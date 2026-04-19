import { createHmac, timingSafeEqual } from "node:crypto";

import { parseSessionPayload } from "@/lib/session-payload";
import type { ReliefLinkRole } from "@/lib/roles";

/** Node.js HMAC verification for API routes and server code. */
export function verifySessionTokenSync(
  token: string,
  secret: string,
): { role: ReliefLinkRole; userId: string | null; email: string | null } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [p, h] = parts;
  if (!p || !h) return null;
  const expected = createHmac("sha256", secret).update(p).digest("hex");
  try {
    const a = Buffer.from(h, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let json: string;
  try {
    json = Buffer.from(p, "base64url").toString("utf8");
  } catch {
    return null;
  }
  let data: unknown;
  try {
    data = JSON.parse(json) as unknown;
  } catch {
    return null;
  }
  const payload = parseSessionPayload(data);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return {
    role: payload.role,
    userId: payload.sub ?? null,
    email: payload.email ?? null,
  };
}
