
export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "-"
  }

  if (bytes === 0) {
    return "0 Bytes"
  }

  const units = ["Bytes", "KB", "MB", "GB", "TB"]

  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  const size = bytes / 1024 ** unitIndex

  return `${new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
  }).format(size)} ${units[unitIndex]}`
}

export const formatDate = (value: string) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
}

export const shortenTitle = (title: string) => {
  const words = title.trim().split(/\s+/)

  return words.length > 10
    ? `${words.slice(0, 10).join(" ")}...`
    : title
}