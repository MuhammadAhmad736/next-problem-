"use client"

import { Menu, ShieldCheck, X } from "lucide-react"

type AdminHeaderProps = {
  adminName: string
  isMobileSidebarOpen: boolean
  onToggleMobileSidebar: () => void
}

const AdminHeader = ({
  adminName,
  isMobileSidebarOpen,
  onToggleMobileSidebar,
}: AdminHeaderProps) => {
  return (
    <header className="sticky top-0 z-20 flex min-h-20.5 items-center gap-4 border-b border-[#E5E9F4] bg-background/90 px-4 py-4 backdrop-blur-xl sm:px-6 md:min-h-24 md:px-8 lg:px-10">
      <button
        type="button"
        aria-label={
          isMobileSidebarOpen
            ? "Close navigation menu"
            : "Open navigation menu"
        }
        aria-expanded={isMobileSidebarOpen}
        onClick={onToggleMobileSidebar}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#DDE3F2] bg-white text-[#2C4DE2] shadow-[0_4px_12px_rgba(32,37,61,0.04)] transition-colors hover:bg-[#EAEDFF] md:hidden"
      >
        {isMobileSidebarOpen ? (
          <X size={20} />
        ) : (
          <Menu size={20} />
        )}
      </button>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#737991]">
          Media Converter
        </p>

        <h1 className="mt-1 flex min-w-0 items-center gap-2 truncate text-xl font-semibold text-[#20253D] sm:text-2xl">
          Welcome,

          <span className="truncate text-[#3358E8]">
            {adminName || "Admin"}
          </span>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAF9F0] px-2 py-1 text-[10px] font-semibold text-[#1D8F5F] sm:text-xs">
            <ShieldCheck size={13} aria-hidden="true" />
            Admin
          </span>
        </h1>
      </div>
    </header>
  )
}

export default AdminHeader