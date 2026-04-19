/** Preset units for need / want / have inventory lines (dropdown in UI). */
export const INVENTORY_UNITS = [
  "kg",
  "g",
  "lb",
  "oz",
  "L",
  "mL",
  "gal",
  "units",
  "boxes",
  "bags",
  "pallets",
  "cases",
  "meals",
  "kits",
] as const;

export function unitOptionsForLine(current?: string): string[] {
  const u = current?.trim();
  const base = [...INVENTORY_UNITS] as string[];
  if (u && !base.includes(u)) {
    return [u, ...base];
  }
  return base;
}
