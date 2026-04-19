import { redirect } from "next/navigation";

/** @deprecated Use `/nodes`. */
export default function WarehouseRedirectPage() {
  redirect("/nodes");
}
