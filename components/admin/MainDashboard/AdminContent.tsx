"use client"

import Dashboard from "@/components/admin/MainDashboard/Dashboard"
import Analytics from "@/components/admin/Analytics/Analytics"
import Users from "@/components/admin/Users/Users"
import Downloads from "@/components/admin/Downloads/Downloads"
import type { AdminSection } from "@/components/admin/MainDashboard/AdminSidebar"
import type { AdminDashboardData } from "@/types/admin/admin-dashboard"

type AdminContentProps = {
  activeSection: AdminSection
  data: AdminDashboardData
}

const AdminContent = ({
  activeSection,
  data,
}: AdminContentProps) => {
  switch (activeSection) {
    case "Dashboard":
      return <Dashboard data={data.dashboard} />

    case "Analytics":
      return <Analytics data={data.analytics} />

    case "Users":
      return <Users data={data.users} />

    case "Downloads":
      return <Downloads data={data.downloads} />

    default:
      return null
  }
}

export default AdminContent