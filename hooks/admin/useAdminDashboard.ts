import { useCallback, useEffect, useState } from "react"
import type { AdminDashboardData } from "@/types/admin/admin-dashboard"

export function useAdminDashboard(
  isAuthenticated: boolean
) {
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardData | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(
        "/api/admin/dashboard",
        {
          cache: "no-store",
          credentials: "include",
        }
      )

      const result =
        (await response.json()) as Partial<AdminDashboardData> & {
          message?: string
          success?: boolean
        }

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
            "Could not load dashboard data."
        )
      }

      if (
        !result.dashboard ||
        !result.analytics ||
        !result.users ||
        !result.downloads
      ) {
        throw new Error(
          "The dashboard response is incomplete."
        )
      }

      setDashboardData(result as AdminDashboardData)
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not load dashboard data."
      )
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  useEffect(() => {
    const refreshDashboard = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard()
      }
    }

    window.addEventListener("focus", refreshDashboard)
    return () => window.removeEventListener("focus", refreshDashboard)
  }, [loadDashboard])

  return {
    dashboardData,
    isLoading,
    error,
    retryDashboard: loadDashboard,
  }
}