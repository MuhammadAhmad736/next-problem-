import type { TranscriptResponse } from "./types";

export function formatTranscriptTime(
  seconds: number,
  alwaysShowHours = false,
): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  return hours > 0 || alwaysShowHours
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`
    : `${String(Math.floor(totalMilliseconds / 60_000)).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}`;
}

export function isTranscriptResponse(
  value: unknown,
): value is TranscriptResponse {
  if (typeof value !== "object" || value === null || !("subtitles" in value)) {
    return false;
  }

  const response = value as { transcriptText?: unknown; subtitles?: unknown };
  return (
    typeof response.transcriptText === "string" &&
    Array.isArray(response.subtitles) &&
    response.subtitles.every(
      (subtitle) =>
        typeof subtitle === "object" &&
        subtitle !== null &&
        "start" in subtitle &&
        "duration" in subtitle &&
        "text" in subtitle &&
        typeof subtitle.start === "number" &&
        Number.isFinite(subtitle.start) &&
        typeof subtitle.duration === "number" &&
        Number.isFinite(subtitle.duration) &&
        typeof subtitle.text === "string",
    )
  );
}

export function getYouTubeId(url: string): string | null {
  try {
    const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
      ? url
      : `https://${url}`;
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = parsedUrl.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (
      ["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)
    ) {
      if (parsedUrl.pathname === "/watch") {
        videoId = parsedUrl.searchParams.get("v");
      } else {
        videoId =
          parsedUrl.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ??
          null;
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function formatFileSize(size?: number | string | null): string {
  if (size === null || size === undefined || size === "") {
    return "";
  }

  if (typeof size === "string") {
    return size;
  }

  if (size <= 0) {
    return "";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
