
type DownloadsPaginationProps = {
  currentPage: number
  totalPages: number
  totalRecords: number
  pageSize: number
  isLoading: boolean
  onPageChange: (page: number) => void
}

export default function DownloadsPagination({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  isLoading,
  onPageChange,
}: DownloadsPaginationProps) {
  const firstRecord =
    totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1

  const lastRecord = Math.min(currentPage * pageSize, totalRecords)

  const firstPageButton = Math.max(1, currentPage - 2)
  const lastPageButton = Math.min(totalPages, currentPage + 2)

  const visiblePages = Array.from(
    { length: Math.max(0, lastPageButton - firstPageButton + 1) },
    (_, index) => firstPageButton + index
  )

  if (totalRecords === 0 || totalPages === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-800">{firstRecord}</span>
        {" "}to{" "}
        <span className="font-medium text-gray-800">{lastRecord}</span>
        {" "}of{" "}
        <span className="font-medium text-gray-800">
          {totalRecords.toLocaleString()}
        </span>{" "}
        downloads
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {visiblePages.map((page) => (
          <button
            key={page}
            type="button"
            disabled={isLoading}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? "page" : undefined}
            className={`min-w-10 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              currentPage === page
                ? "border-[#4174FF] bg-[#4174FF] text-white"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}