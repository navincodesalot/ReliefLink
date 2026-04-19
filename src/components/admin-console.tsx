"use client";

import { useState } from "react";

import { AdminEmergenciesPanel } from "@/components/admin-emergencies-panel";
import { AdminExportPanel } from "@/components/admin-export-panel";
import { AdminRegisterDriverCard } from "@/components/admin-register-driver-card";
import { DashboardHome } from "@/components/dashboard-home";

export function AdminConsole() {
  const [driversRefreshKey, setDriversRefreshKey] = useState(0);

  return (
    <>
      <AdminEmergenciesPanel />
      <AdminExportPanel />
      <AdminRegisterDriverCard
        onRegistered={() => setDriversRefreshKey((k) => k + 1)}
      />
      <DashboardHome mode="admin" driversRefreshKey={driversRefreshKey} />
    </>
  );
}
