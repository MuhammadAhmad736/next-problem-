
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"
import {
  formatDate,
  formatFileSize,
  shortenTitle,
} from "./downloads.utils"

export type DownloadRecord = {
  id: string
  title: string
  platform: string
  duration: number
  user: {
    id: string
    name: string
    email: string
  } | null
  format: string
  quality: string
  fileSize: number
  status: string
  date: string
}

type DownloadsTableProps = {
  downloads: DownloadRecord[]
  isLoading: boolean
  error: string
  onRetry: () => void
}

export default function DownloadsTable({
  downloads,
  isLoading,
  error,
  onRetry,
}: DownloadsTableProps) {
  const headers = [
    "YouTube Title",
    "Platform",
    "Duration",
    "User",
    "Format",
    "Quality",
    "File Size",
    "Status",
    "Date",
  ]

  // Return the user's name or email.
  const getUserName = (user: DownloadRecord["user"]) => {
    if (!user) return "-"

    return user.name || user.email || "-"
  }

  // Convert duration from seconds into minutes:seconds.
  const getDuration = (duration: number) => {
    if (!Number.isFinite(duration) || duration < 0) {
      return "-"
    }

    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)

    return `${minutes}:${String(seconds).padStart(2, "0")}`
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-4 py-4 font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center"
                >
                  <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[#4174FF]" />
                  <p className="mt-2 text-gray-500">
                    Loading downloads...
                  </p>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center"
                >
                  <p className="font-medium text-red-600">{error}</p>

                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-3 rounded-lg bg-[#4174FF] px-4 py-2 font-medium text-white transition hover:opacity-90"
                  >
                    Try Again
                  </button>
                </td>
              </tr>
            ) : downloads.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  No downloads found.
                </td>
              </tr>
            ) : (
              downloads.map((download) => {
                const successful = [
                  "successful",
                  "success",
                ].includes(download.status.toLowerCase())

                return (
                  <tr
                    key={download.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td
                      className="max-w-[220px] px-4 py-4 font-medium text-[#0F172A]"
                      title={download.title}
                    >
                      {shortenTitle(download.title)}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {download.platform || "YouTube"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {getDuration(download.duration)}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {getUserName(download.user)}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {download.format || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {download.quality || "-"}
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      {typeof download.fileSize === "number"
                        ? formatFileSize(download.fileSize)
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                          successful
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {successful ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}

                        {download.status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      {formatDate(download.date)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}