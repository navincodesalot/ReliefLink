import type { ReliefLinkRole } from "@/lib/roles";
import { isReliefLinkRole } from "@/lib/roles";

export type SessionPayload = {
  role: ReliefLinkRole;
  exp: number;
  /** MongoDB user id */
  sub?: string;
  email?: string;
};

export function parseSessionPayload(data: unknown): SessionPayload | null {
  if (!data || typeof data !== "object") return null;
  const roleRaw = (data as { role?: unknown }).role;
  const exp = (data as { exp?: unknown }).exp;
  const sub = (data as { sub?: unknown }).sub;
  const email = (data as { email?: unknown }).email;
  if (typeof exp !== "number") return null;
  const roleStr = String(roleRaw);
  if (!isReliefLinkRole(roleStr)) return null;
  const role: ReliefLinkRole = roleStr;
  const out: SessionPayload = { role, exp };
  if (typeof sub === "string" && sub.length > 0) out.sub = sub;
  if (typeof email === "string" && email.length > 0) out.email = email;
  return out;
}
