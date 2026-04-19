import { AdminConsole } from "@/components/admin-console";
import { PageBackdrop } from "@/components/page-backdrop";

export default function AdminPage() {
  return (
    <PageBackdrop>
      <div className="space-y-10 p-4 md:p-8">
        <header className="mx-auto max-w-7xl space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">
            UN Operations
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Administrator console
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            When a USB bridge registers new hardware, a prompt appears to add that device as a
            node. Respond to driver emergencies and monitor the network below.
          </p>
        </header>
        <div className="mx-auto max-w-7xl space-y-8">
          <AdminConsole />
        </div>
      </div>
    </PageBackdrop>
  );
}
