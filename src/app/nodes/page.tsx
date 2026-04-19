import { NodesPageIntro } from "@/components/nodes-page-intro";
import { PageBackdrop } from "@/components/page-backdrop";
import { WarehouseFoodWorkspace } from "@/components/warehouse-food-workspace";

/** Node-operator portal: inventory & late alerts per site (not the UN admin console). */
export default function NodesPage() {
  return (
    <PageBackdrop>
      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
        <NodesPageIntro />
        <WarehouseFoodWorkspace />
      </div>
    </PageBackdrop>
  );
}
