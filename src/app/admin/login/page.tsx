import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth/admin-session";
import { AdminLoginBackLink } from "@/components/admin-login-back-link";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminLoginHero } from "@/components/admin-login-hero";
import { PageBackdrop } from "@/components/page-backdrop";

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) {
    redirect("/admin");
  }

  return (
    <PageBackdrop>
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-8 px-4 py-14 md:px-8">
        <AdminLoginHero />
        <AdminLoginForm />
        <AdminLoginBackLink />
      </div>
    </PageBackdrop>
  );
}
