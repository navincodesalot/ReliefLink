import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.TRANSFER_SECRET;

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacHex(body: string, secret = SECRET): string {
  if (!secret) throw new Error("TRANSFER_SECRET missing");
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Verify a Pi / Alexa webhook request. Accepts either:
 *  - `x-foodtrust-signature` = HMAC-SHA256(body, TRANSFER_SECRET) [preferred]
 *  - `x-foodtrust-secret`   = TRANSFER_SECRET itself [dev convenience]
 */
export function verifyTransferAuth(
  headers: Headers,
  rawBody: string,
): { ok: true } | { ok: false; reason: string } {
  if (!SECRET) return { ok: false, reason: "server missing TRANSFER_SECRET" };

  const sig = headers.get("x-foodtrust-signature");
  if (sig) {
    const expected = hmacHex(rawBody);
    try {
      const a = Buffer.from(sig, "hex");
      const b = Buffer.from(expected, "hex");
      if (a.length === b.length && timingSafeEqual(a, b)) return { ok: true };
    } catch {
      // fall through
    }
    return { ok: false, reason: "bad signature" };
  }

  const secret = headers.get("x-foodtrust-secret");
  if (secret && secret === SECRET) return { ok: true };

  return { ok: false, reason: "missing x-foodtrust-signature or x-foodtrust-secret" };
}
