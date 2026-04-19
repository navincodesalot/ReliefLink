import { AdminEmergenciesPanel } from "@/components/admin-emergencies-panel";
import { AdminRegisterDriverCard } from "@/components/admin-register-driver-card";
import { DashboardHome } from "@/components/dashboard-home";

export default function AdminPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950/20 via-background to-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_-20%,rgba(99,102,241,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_20%_-20%,rgba(99,102,241,0.18),transparent)]" />
      <div className="relative space-y-10 p-4 md:p-8">
        <header className="mx-auto max-w-7xl space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            UN Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Administrator console
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            When a USB bridge registers new hardware, a prompt appears to add that device as a
            node. Respond to driver emergencies and monitor the network below.
          </p>
        </header>
        <div className="mx-auto max-w-7xl space-y-8">
          <AdminEmergenciesPanel />
          <AdminRegisterDriverCard />
          <DashboardHome mode="admin" />
        </div>
      </div>
    </div>
  );
}
