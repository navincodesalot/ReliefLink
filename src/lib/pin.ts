import { timingSafeEqual } from "node:crypto";

const PIN_RE = /^[12]+$/;

/**
 * When `TRANSFER_PIN` is set in the environment, hardware/voice clients must
 * send the same string in the JSON body as `pin` (only characters `1` and `2`).
 * When unset, `pin` is ignored for backward compatibility.
 */
export function verifyTransferPin(
  bodyPin: string | undefined,
): { ok: true } | { ok: false; message: string } {
  const expected = process.env.TRANSFER_PIN?.trim();
  if (!expected) return { ok: true };

  if (!bodyPin || !PIN_RE.test(bodyPin)) {
    return { ok: false, message: "invalid pin" };
  }
  if (bodyPin.length !== expected.length) {
    return { ok: false, message: "invalid pin" };
  }

  try {
    const a = Buffer.from(bodyPin, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length === b.length && timingSafeEqual(a, b)) return { ok: true };
  } catch {
    // fall through
  }
  return { ok: false, message: "invalid pin" };
}
