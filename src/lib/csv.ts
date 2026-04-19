/** Escape a single CSV field (RFC 4180-style). */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function csvRow(fields: unknown[]): string {
  return fields.map(csvField).join(",") + "\r\n";
}
