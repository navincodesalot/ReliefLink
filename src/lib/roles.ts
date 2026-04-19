export type ReliefLinkRole = "admin" | "warehouse" | "driver" | "public";

/** Roles that have a MongoDB account (not public / anonymous tracking). */
export type StaffRole = Exclude<ReliefLinkRole, "public">;

export const ROLE_DEFAULT_PATH: Record<ReliefLinkRole, `/${string}`> = {
  admin: "/admin",
  warehouse: "/warehouse",
  driver: "/driver",
  public: "/track",
};

export const ROLE_LABEL: Record<ReliefLinkRole, string> = {
  admin: "UN administrator",
  warehouse: "UN warehouse / food bank",
  driver: "Driver",
  public: "Public tracking",
};

export function isReliefLinkRole(v: string): v is ReliefLinkRole {
  return v === "admin" || v === "warehouse" || v === "driver" || v === "public";
}

export function isStaffRole(v: string): v is StaffRole {
  return v === "admin" || v === "warehouse" || v === "driver";
}
