import { LoaderCircle } from "lucide-react"

type AdminLogoutOverlayProps = {
  isOpen: boolean
}

const AdminLogoutOverlay = ({ isOpen }: AdminLogoutOverlayProps) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-120 grid place-items-center bg-[#17233B]/45 px-4 py-6 backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E9F4] bg-white px-8 py-7 text-[#737991] shadow-[0_28px_80px_rgba(19,30,63,0.25)]">
        <LoaderCircle className="animate-spin text-[#3B6BFF]" size={30} aria-hidden="true" />
        <span className="text-sm font-medium">Signing out...</span>
      </div>
    </div>
  )
}

export default AdminLogoutOverlay