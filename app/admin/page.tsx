"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import AdminAuthGuard from "@/components/admin/MainDashboard/AdminAuthGuard"
import AdminContent from "@/components/admin/MainDashboard/AdminContent"
import AdminHeader from "@/components/admin/MainDashboard/AdminHeader"
import AdminLogoutOverlay from "@/components/admin/MainDashboard/AdminLogoutOverlay"
import AdminSidebar, { type AdminSection } from "@/components/admin/MainDashboard/AdminSidebar"
import PasswordSettingsModal from "@/components/admin/MainDashboard/PasswordSettingsModal"
import { useAdminAuth } from "@/hooks/admin/useAdminAuth"
import { useAdminDashboard } from "@/hooks/admin/useAdminDashboard"
import { toast } from "react-toastify"

const Page = () => {
  const router = useRouter()
  const { authStatus, authError, adminName, retryAuth } = useAdminAuth()
  const {
    dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
    retryDashboard,
  } = useAdminDashboard(authStatus === "authenticated")
  const [activeSection, setActiveSection] = useState<AdminSection>("Dashboard")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSectionLoading, setIsSectionLoading] = useState(false)
  const sectionLoadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (authStatus === "authenticated") return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [authStatus])

  useEffect(() => {
    return () => {
      if (sectionLoadingTimer.current) {
        clearTimeout(sectionLoadingTimer.current)
      }
    }
  }, [])

  const handleSectionChange = (section: AdminSection) => {
    if (section === activeSection) return
    if (sectionLoadingTimer.current) {
      clearTimeout(sectionLoadingTimer.current)
    }

    setActiveSection(section)
    setIsSectionLoading(true)
    sectionLoadingTimer.current = setTimeout(() => {
      setIsSectionLoading(false)
      sectionLoadingTimer.current = null
    }, 400)
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      const response = await fetch("/api/user/login", {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Could not close the admin session. Try again.")
      }

      router.replace("/")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Could not close the admin session."
      setIsLoggingOut(false)
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen bg-background text-[#20253D]">
      <div className="flex min-h-screen">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isExpanded={isSidebarExpanded}
          isMobileOpen={isMobileSidebarOpen}
          onToggleExpanded={() => setIsSidebarExpanded((expanded) => !expanded)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onLogout={() => void handleLogout()}
        />
        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-[#20253D]/25 backdrop-blur-[2px] md:hidden"
          />
        )}
        <main className="min-w-0 flex-1">
          <AdminHeader
            adminName={adminName}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen((open) => !open)}
          />
          <div className="px-4 py-6 sm:px-6 md:px-8 md:py-8 lg:px-10">
            {authStatus === "authenticated" && (
              isDashboardLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-[#737991]" role="status">
                  <LoaderCircle className="animate-spin text-[#3B6BFF]" size={22} aria-hidden="true" />
                  Loading dashboard data...
                </div>
              ) : dashboardError ? (
                <div className="rounded-xl border border-[#F5CBD3] bg-white p-5 text-sm text-[#A52E49]" role="alert">
                  <p>{dashboardError}</p>
                  <button
                    type="button"
                    onClick={() => void retryDashboard()}
                    className="mt-3 rounded-lg bg-[#3B6BFF] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#2C4DE2]"
                  >
                    Retry
                  </button>
                </div>
              ) : dashboardData ? (
                isSectionLoading ? (
                  <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-sm font-medium text-[#737991]" role="status" aria-live="polite">
                    <LoaderCircle className="animate-spin text-[#3B6BFF]" size={30} aria-hidden="true" />
                    <span>Loading {activeSection}...</span>
                  </div>
                ) : (
                  <AdminContent activeSection={activeSection} data={dashboardData} />
                )
              ) : null
            )}
          </div>
        </main>
      </div>

      {isSettingsOpen && (
        <PasswordSettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onPasswordUpdated={() => {
            setIsSettingsOpen(false)
            setActiveSection("Dashboard")
          }}
        />
      )}

      <AdminLogoutOverlay isOpen={isLoggingOut} />
      <AdminAuthGuard
        status={authStatus}
        error={authError}
        onRetry={() => void retryAuth()}
      />
    </div>
  )
}

export default Page
