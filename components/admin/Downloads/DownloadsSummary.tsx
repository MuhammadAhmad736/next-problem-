
import {
  Download,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react"

type SummaryCard = {
  title: string
  value: number
  icon: typeof Download
}

type DownloadsSummaryProps = {
  totalDownloads: number
  successfulDownloads: number
  failedDownloads: number
  downloadsToday: number
}

export default function DownloadsSummary({
  totalDownloads,
  successfulDownloads,
  failedDownloads,
  downloadsToday,
}: DownloadsSummaryProps) {
  const summaryCards: SummaryCard[] = [
    {
      title: "Total Downloads",
      value: totalDownloads,
      icon: Download,
    },
    {
      title: "Successful Downloads",
      value: successfulDownloads,
      icon: CheckCircle2,
    },
    {
      title: "Failed Downloads",
      value: failedDownloads,
      icon: XCircle,
    },
    {
      title: "Downloads Today",
      value: downloadsToday,
      icon: CalendarDays,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summaryCards.map((card) => {
        const Icon = card.icon

        return (
          <div
            key={card.title}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">
                {card.title}
              </p>

              <Icon className="h-5 w-5 text-[#4174FF]" />
            </div>

            <p className="mt-3 text-2xl font-bold text-[#0F172A]">
              {card.value.toLocaleString()}
            </p>
          </div>
        )
      })}
    </div>
  )
}