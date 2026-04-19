export function sessionSecret(): string | null {
  return process.env.RELIEFLINK_SESSION_SECRET ?? process.env.TRANSFER_SECRET ?? null;
}
