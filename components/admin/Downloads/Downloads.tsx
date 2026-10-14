
"use client"

import { useEffect, useState } from "react"
import type { AdminDashboardData } from "@/types/admin/admin-dashboard"
import DownloadsSummary from "./DownloadsSummary"
import DownloadsTable from "./DownloadsTable"
import DownloadsPagination from "./DownloadsPagination"

type DownloadsProps = {
  data: AdminDashboardData["downloads"]
}

type DownloadsPageResponse = {
  success: true
  downloads: {
    downloadList: AdminDashboardData["downloads"]["downloadList"]
    pagination: AdminDashboardData["downloads"]["pagination"]
  }
}

type DownloadRecord = AdminDashboardData["downloads"]["downloadList"][number]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDownloadRecord(value: unknown): value is DownloadRecord {
  if (!isObject(value)) return false

  const user = value.user
  const hasValidUser =
    user === null ||
    (isObject(user) &&
      typeof user.id === "string" &&
      typeof user.name === "string" &&
      typeof user.email === "string")

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.platform === "string" &&
    typeof value.duration === "number" &&
    Number.isFinite(value.duration) &&
    hasValidUser &&
    typeof value.format === "string" &&
    typeof value.quality === "string" &&
    typeof value.fileSize === "number" &&
    Number.isFinite(value.fileSize) &&
    typeof value.status === "string" &&
    typeof value.date === "string"
  )
}

function isDownloadsPageResponse(value: unknown): value is DownloadsPageResponse {
  if (!isObject(value) || value.success !== true || !isObject(value.downloads)) {
    return false
  }

  const downloads = value.downloads
  const pagination = downloads.pagination

  if (
    !Array.isArray(downloads.downloadList) ||
    !downloads.downloadList.every(isDownloadRecord) ||
    !isObject(pagination)
  ) {
    return false
  }

  return (
    Number.isSafeInteger(pagination.currentPage) &&
    Number(pagination.currentPage) > 0 &&
    Number.isSafeInteger(pagination.pageSize) &&
    Number(pagination.pageSize) > 0 &&
    Number.isSafeInteger(pagination.totalRecords) &&
    Number(pagination.totalRecords) >= 0 &&
    Number.isSafeInteger(pagination.totalPages) &&
    Number(pagination.totalPages) >= 0 &&
    Number(pagination.totalPages) ===
      Math.ceil(Number(pagination.totalRecords) / Number(pagination.pageSize))
  )
}

function getApiErrorMessage(value: unknown): string | undefined {
  if (!isObject(value)) return undefined
  if (typeof value.message === "string") return value.message
  if (typeof value.error === "string") return value.error
  return undefined
}

export default function Downloads({ data }: DownloadsProps) {
  // Store the downloads currently displayed in the table.
  const [downloadList, setDownloadList] = useState(data.downloadList)

  // Store pagination information returned by the API.
  const [pagination, setPagination] = useState(data.pagination)

  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const refreshDownloads = () => {
      if (document.visibilityState === "visible") {
        setRetryCount((count) => count + 1)
      }
    }

    window.addEventListener("focus", refreshDownloads)
    return () => window.removeEventListener("focus", refreshDownloads)
  }, [])

  // Fetch downloads whenever the page changes or retry is requested.
  useEffect(() => {
    const controller = new AbortController()

    const fetchDownloads = async () => {
      setIsLoading(true)
      setError("")

      try {
        const response = await fetch(
          `/api/admin/dashboard?section=downloads&page=${currentPage}&limit=${pagination.pageSize}`,
          {
            method: "GET",
            cache: "no-store",
            credentials: "include",
            signal: controller.signal,
          }
        )

        let result: unknown
        try {
          result = await response.json()
        } catch {
          throw new Error("The server returned an invalid downloads response.")
        }

        if (!response.ok) {
          throw new Error(
            getApiErrorMessage(result) || "Failed to load downloads. Please try again."
          )
        }

        if (!isDownloadsPageResponse(result)) {
          throw new Error(
            getApiErrorMessage(result) || "The server returned an invalid downloads response."
          )
        }

        setDownloadList(result.downloads.downloadList)
        setPagination(result.downloads.pagination)
      } catch (err) {
        // Ignore errors caused by cleanup or a new request.
        if (err instanceof Error && err.name === "AbortError") {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading downloads."
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchDownloads()

    return () => {
      controller.abort()
    }
  }, [currentPage, pagination.pageSize, retryCount])

  // Change the page only when the requested page is valid.
  const changePage = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === currentPage
    ) {
      return
    }

    setCurrentPage(page)
  }

  // Retry the request without changing the current page.
  const retryLoading = () => {
    setRetryCount((previousCount) => previousCount + 1)
  }

  return (
    <section className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
          Downloads
        </h1>

        <p className="mt-2 text-sm text-[#5B6472] sm:text-base">
          Monitor download activity, formats, quality, and download status.
        </p>
      </div>

      {/* Summary cards */}
      <DownloadsSummary
        totalDownloads={data.totalDownloads}
        successfulDownloads={data.successfulDownloads}
        failedDownloads={data.failedDownloads}
        downloadsToday={data.downloadsToday}
      />

      {/* Downloads table */}
      <DownloadsTable
        downloads={downloadList}
        isLoading={isLoading}
        error={error}
        onRetry={retryLoading}
      />

      {/* Pagination controls */}
      {!isLoading && !error && (
        <DownloadsPagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalRecords={pagination.totalRecords}
          pageSize={pagination.pageSize}
          isLoading={isLoading}
          onPageChange={changePage}
        />
      )}
    </section>
  )
}