import { DashboardHome } from "@/components/dashboard-home";
import { WarehouseFoodWorkspace } from "@/components/warehouse-food-workspace";

/** Inventory + map for all node kinds (URL `/warehouse` kept for existing links). */
export default function WarehousePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-emerald-950/15 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_80%_-15%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_70%_40%_at_80%_-15%,rgba(16,185,129,0.18),transparent)]" />
      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <WarehouseFoodWorkspace />
        <DashboardHome mode="warehouse" />
      </div>
    </div>
  );
}
