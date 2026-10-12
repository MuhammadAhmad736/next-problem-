"use client"

import { useState } from "react"
import { CalendarDays, CheckCircle2, Download, Filter, LoaderCircle, X, XCircle } from "lucide-react"
import type { AdminDashboardData } from "@/types/admin/admin-dashboard"

type DashboardProps = { data: AdminDashboardData["dashboard"] }

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

// Keep long video titles readable in the dashboard table.
const shortenTitle = (title: string) => {
  const words = title.trim().split(/\s+/)
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}...` : title
}

const Dashboard = ({ data }: DashboardProps) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [platform, setPlatform] = useState("")
  const [filteredDownloads, setFilteredDownloads] = useState<
    DashboardProps["data"]["recentDownloads"] | null
  >(null)
  const [filteredCount, setFilteredCount] = useState<number | null>(null)
  const [filterError, setFilterError] = useState("")
  const [isFiltering, setIsFiltering] = useState(false)
  const summaryCards = [
    { label: "Total Downloads", value: data.stats.totalDownloads, icon: Download },
    { label: "Successful Downloads", value: data.stats.successfulDownloads, icon: CheckCircle2 },
    { label: "Failed Downloads", value: data.stats.failedDownloads, icon: XCircle },
    { label: "Downloads Today", value: data.stats.downloadsToday, icon: CalendarDays },
  ]
  const recentDownloads = filteredDownloads ?? data.recentDownloads

  function resetFilter() {
    setStartDate("")
    setEndDate("")
    setPlatform("")
    setFilteredDownloads(null)
    setFilteredCount(null)
    setFilterError("")
    setIsFilterModalOpen(false)
  }

  async function applyFilter() {
    if (Boolean(startDate) !== Boolean(endDate)) {
      setFilterError("Choose both a start date and an end date.")
      return
    }

    if (startDate && endDate && startDate > endDate) {
      setFilterError("The start date must be before the end date.")
      return
    }

    if (!startDate && !endDate && !platform) {
      resetFilter()
      return
    }

    setIsFiltering(true)
    setFilterError("")

    try {
      const searchParams = new URLSearchParams()
      if (startDate && endDate) {
        searchParams.set("startDate", startDate)
        searchParams.set("endDate", endDate)
      }
      if (platform) searchParams.set("platform", platform)

      const response = await fetch(`/api/media/filter?${searchParams.toString()}`, {
        cache: "no-store",
        credentials: "include",
      })
      const result = (await response.json()) as {
        success: boolean
        error?: string
        totalDownloads?: number
        downloads?: DashboardProps["data"]["recentDownloads"]
      }

      if (
        !response.ok ||
        !result.success ||
        typeof result.totalDownloads !== "number" ||
        !result.downloads
      ) {
        throw new Error(result.error || "Could not filter downloads.")
      }

      setFilteredDownloads(result.downloads)
      setFilteredCount(result.totalDownloads)
      setIsFilterModalOpen(false)
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : "Could not filter downloads.")
    } finally {
      setIsFiltering(false)
    }
  }

  const dateRangeControl = (
    <div     className="flex h-9 items-center rounded-lg border border-[#DCE5FF] bg-white px-2 focus-within:border-[#3459E9]">
      <input
        type="date"
        aria-label="Start date"
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
        className="w-[118px] bg-transparent text-xs text-[#4F586F] outline-none"
      />
      <span className="px-1 text-xs text-[#A0A6B5]">to</span>
      <input
        type="date"
        aria-label="End date"
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
        className="w-[118px] bg-transparent text-xs text-[#4F586F] outline-none"
      />
    </div>
  )
  const platformControl = (
    <select
      aria-label="Filter by platform"
      value={platform}
      onChange={(event) => setPlatform(event.target.value)}
      className="h-9 w-full rounded-lg border border-[#DCE5FF] bg-white px-2 text-xs text-[#4F586F] outline-none focus:border-[#3459E9] lg:w-32"
    >
      <option value="">All platforms</option>
      <option value="YouTube">YouTube</option>
      <option value="Instagram">Instagram</option>
      <option value="TikTok">TikTok</option>
      <option value="Facebook">Facebook</option>
      <option value="X/Twitter">X/Twitter</option>
      <option value="Pinterest">Pinterest</option>
    </select>
  )

  return (
    <div className="space-y-6">
      {isFiltering && (
        <div
          className="fixed inset-0 z-[130] grid place-items-center bg-[#17233B]/45 px-4 py-6 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#E5E9F4] bg-white px-8 py-7 text-[#737991] shadow-[0_28px_80px_rgba(19,30,63,0.25)]">
            <LoaderCircle className="animate-spin text-[#3459E9]" size={30} aria-hidden="true" />
            <span className="text-sm font-medium">Filtering downloads...</span>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#20253D] sm:text-[2rem]">Dashboard</h2>
          <p className="mt-1 text-sm text-[#737991]">Download activity at a glance.</p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {dateRangeControl}
          {platformControl}
          <button
            type="button"
            onClick={() => void applyFilter()}
            disabled={isFiltering}
            className="h-9 rounded-lg bg-[#3459E9] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#2C4DE2] disabled:cursor-wait disabled:opacity-60"
          >
            {isFiltering ? "Filtering..." : "Filter"}
          </button>
          <button
            type="button"
            onClick={resetFilter}
            disabled={isFiltering}
            className="h-9 rounded-lg border border-[#DCE5FF] bg-white px-3 text-xs font-semibold text-[#3459E9] transition-colors hover:bg-[#EEF2FF] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset filter
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className="inline-flex h-9 items-center justify-center gap-2 self-start rounded-lg border border-[#DCE1ED] bg-white px-3 text-sm font-medium text-[#3459E9] shadow-sm transition-colors hover:border-[#3459E9] hover:bg-[#F4F7FF] lg:hidden"
          aria-haspopup="dialog"
        >
          <Filter size={15} aria-hidden="true" />
          Filter
        </button>
      </div>

      {isFilterModalOpen && (
        <div
          className="fixed inset-0 z-[120] grid place-items-center bg-[#17233B]/45 px-4 py-6 backdrop-blur-sm"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-filter-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 id="dashboard-filter-title" className="text-lg font-semibold text-[#20253D]">
                Filter downloads
              </h3>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-lg p-2 text-[#737991] hover:bg-[#F4F6FA]"
                aria-label="Close filters"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-[#4F586F]">
                Date range
                {dateRangeControl}
              </label>
              <label className="block space-y-2 text-sm font-medium text-[#4F586F]">
                Platform
                {platformControl}
              </label>
              <button
                type="button"
                onClick={() => void applyFilter()}
                disabled={isFiltering}
                className="h-10 w-full rounded-lg bg-[#3459E9] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2C4DE2] disabled:cursor-wait disabled:opacity-60"
              >
                {isFiltering ? "Filtering..." : "Apply filter"}
              </button>
              <button
                type="button"
                onClick={resetFilter}
                disabled={isFiltering}
                className="h-10 w-full rounded-lg border border-[#DCE5FF] bg-white px-4 text-sm font-semibold text-[#3459E9] transition-colors hover:bg-[#EEF2FF] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset filter
              </button>
            </div>
          </section>
        </div>
      )}
      {filterError && (
        <p className="text-right text-sm text-red-600" role="alert">
          {filterError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-[#DCE5FF] bg-white p-4 shadow-[0_6px_20px_rgba(52,89,233,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[#737991]">{label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[#20253D]">{value.toLocaleString()}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#3459E9]">
                <Icon size={18} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#DCE5FF] bg-white shadow-[0_6px_20px_rgba(52,89,233,0.06)]">
        <div className="border-b border-[#EEF0F7] px-4 py-4 sm:px-5">
          <h3 className="text-lg font-semibold text-[#20253D]">
            {filteredCount === null ? "Recent Downloads" : `Filtered Downloads (${filteredCount})`}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F8F9FF] text-[#737991]">
              <tr>
                <th className="px-4 py-3.5 font-medium">YouTube Title</th>
                <th className="px-4 py-3.5 font-medium">Platform</th>
                <th className="px-4 py-3.5 font-medium">Duration</th>
                <th className="px-4 py-3.5 font-medium">Format</th>
                <th className="px-4 py-3.5 font-medium">Quality</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-4 py-3.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDownloads.length > 0 ? recentDownloads.map((download) => {
                const isFailed = download.status.toLowerCase() === "failed"
                const durationMinutes = Math.floor(download.duration / 60)
                const durationSeconds = download.duration % 60

                return (
                  <tr key={download.id} className="border-t border-[#EEF0F7]">
                    <td
                      className="max-w-xs px-4 py-3.5 font-medium text-[#20253D]"
                      title={download.title}
                    >
                      {shortenTitle(download.title)}
                    </td>
                    <td className="px-4 py-3.5 text-[#4F586F]">
                      {download.platform && download.platform !== "Other" ? download.platform : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#4F586F]">
                      {download.duration > 0
                        ? `${durationMinutes}m${Math.floor(durationSeconds)}s`
                        : ""}
                    </td>
                    <td className="px-4 py-3.5 text-[#4F586F]">{download.format}</td>
                    <td className="px-4 py-3.5 text-[#4F586F]">{download.quality}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isFailed ? "bg-[#FFF1F2] text-[#BE3455]" : "bg-[#EAF9F0] text-[#1D8F5F]"}`}>
                        {download.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[#4F586F]">{formatDate(download.date)}</td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#737991]">
                    {filteredCount === null ? "No recent downloads." : "No downloads match these filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default Dashboard