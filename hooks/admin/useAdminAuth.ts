import { useCallback, useEffect, useState } from "react"

export type AdminAuthStatus =
  | "checking"
  | "authenticated"
  | "error"

type AdminUser = {
  name?: string
  isAdmin?: boolean
}

type AdminAuthResponse = {
  authenticated?: boolean
  error?: string
  user?: AdminUser
}

export function useAdminAuth() {
  const [authStatus, setAuthStatus] =
    useState<AdminAuthStatus>("checking")

  const [authError, setAuthError] = useState("")
  const [adminName, setAdminName] = useState("")

  const checkAdminAccess = useCallback(async () => {
    setAuthStatus("checking")
    setAuthError("")

    try {
      const response = await fetch("/api/user/login", {
        cache: "no-store",
        credentials: "include",
      })

      const result =
        (await response.json()) as AdminAuthResponse

      if (
        !response.ok ||
        !result.authenticated ||
        result.user?.isAdmin !== true
      ) {
        throw new Error(
          result.error || "Could not verify admin access."
        )
      }

      setAdminName(
        result.user?.name?.trim() || "Admin"
      )

      setAuthStatus("authenticated")
    } catch (error: unknown) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not verify admin access."
      )

      setAuthStatus("error")
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkAdminAccess()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [checkAdminAccess])

  return {
    authStatus,
    authError,
    adminName,
    retryAuth: checkAdminAccess,
  }
}