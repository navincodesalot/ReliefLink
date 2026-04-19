import { redirect } from "next/navigation";

import { AdminConsole } from "@/components/admin-console";
import { AdminDashboardHeader } from "@/components/admin-dashboard-header";
import { PageBackdrop } from "@/components/page-backdrop";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <PageBackdrop>
      <div className="space-y-10 p-4 md:p-8">
        <AdminDashboardHeader />
        <div className="mx-auto max-w-7xl space-y-8">
          <AdminConsole />
        </div>
      </div>
    </PageBackdrop>
  );
}
