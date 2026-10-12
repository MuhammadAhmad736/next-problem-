"use client"

import { LoaderCircle } from "lucide-react"
import type { AdminAuthStatus } from "@/hooks/admin/useAdminAuth"

type AdminAuthGuardProps = {
  status: AdminAuthStatus
  error: string
  onRetry: () => void
}

const AdminAuthGuard = ({
  status,
  error,
  onRetry,
}: AdminAuthGuardProps) => {
  if (status === "authenticated") {
    return null
  }

  return (
    <div className="admin-auth-backdrop fixed inset-0 z-[100] grid place-items-center bg-[#17233B]/45 px-4 py-6 backdrop-blur-md sm:px-6">
      <section
        aria-live={status === "error" ? "assertive" : "polite"}
        className="admin-auth-dialog w-full max-w-[440px] rounded-2xl border border-[#E5E9F4] bg-white p-7 text-center shadow-[0_28px_80px_rgba(19,30,63,0.25)] sm:p-8"
        role={status === "error" ? "alert" : "status"}
      >
        {status === "checking" ? (
          <>
            <LoaderCircle
              className="mx-auto animate-spin text-[#3B6BFF]"
              size={26}
              aria-hidden="true"
            />

            <h2 className="mt-4 text-lg font-semibold text-[#20253D]">
              Checking admin access
            </h2>

            <p className="mt-1 text-sm text-[#737991]">
              Connecting securely to the admin workspace.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-[#20253D]">
              Unable to verify admin access
            </h2>

            <p className="mt-2 text-sm text-[#737991]">
              {error}
            </p>

            <button
              type="button"
              onClick={onRetry}
              className="mt-5 h-10 rounded-lg bg-[#3B6BFF] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2C4DE2]"
            >
              Retry
            </button>
          </>
        )}
      </section>
    </div>
  )
}

export default AdminAuthGuard