"use client";

// ============================================================
// IMPORTS
// ============================================================
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";

// ============================================================
// TYPES
// ============================================================

// Information returned by /api/media/info
type Info = {
  title: string;
  description: string;
  thumbnail: string;
  duration?: number;
  uploader: string;
  platform?: string;

  // File size is optional because the provider may not return it.
  size?: number | string | null;

  // The API returns the options supported by the detected platform.
  options: {
    video?: {
      format: "mp4";
      label: string;
    };
    audio?: {
      format: "mp3";
      label: string;
    };
  };
};

// Download types supported by /api/media/download
type DownloadType = "mp4" | "mp3";
type DownloadStage = "downloading" | "merging" | "ready" | "transferring" | "complete" | "error";

type DownloadProgress = {
  type: DownloadType;
  stage: DownloadStage;
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  transferredBytes: number;
  size?: number;
  error?: string;
};

type SubtitleSegment = {
  start: number;
  duration: number;
  text: string;
};

type TranscriptResponse = {
  transcriptText: string;
  subtitles: SubtitleSegment[];
};

type TranscriptFormat = "plain" | "timestamps";

function formatTranscriptTime(
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

function isTranscriptResponse(value: unknown): value is TranscriptResponse {
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

// ============================================================
// YOUTUBE ID EXTRACTOR
// Supports:
//   https://www.youtube.com/watch?v=ID
//   https://youtu.be/ID
//   https://www.youtube.com/embed/ID
//   https://www.youtube.com/shorts/ID
// Returns null if the URL is not a YouTube link.
// ============================================================
function getYouTubeId(url: string): string | null {
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
        videoId = parsedUrl.pathname.match(
          /^\/(?:embed|shorts|live|v)\/([^/]+)/
        )?.[1] ?? null;
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

// ============================================================
// FILE SIZE FORMATTER
// Converts bytes into KB / MB / GB.
// If the API already returns a formatted string, it is returned
// as-is.
// ============================================================
function formatFileSize(size?: number | string | null): string {
  if (size === null || size === undefined || size === "") {
    return "";
  }

  // If the API already returns something like "25 MB",
  // don't try to convert it.
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

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function VideoPreview() {
  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  // URL entered by the user.
  const [url, setUrl] = useState("");

  // Information returned by the info API.
  const [info, setInfo] = useState<Info | null>(null);

  // Loading state for the Check request.
  const [loading, setLoading] = useState(false);

  // Error message.
  const [error, setError] = useState("");

  // Controls whether the YouTube iframe is loaded.
  const [playing, setPlaying] = useState(false);

  // Keeps track of which download button is currently processing.
  const [downloading, setDownloading] = useState<DownloadType | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const metadataRequest = useRef<AbortController | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [transcriptFormat, setTranscriptFormat] =
    useState<TranscriptFormat>("timestamps");
  const transcriptRequest = useRef<AbortController | null>(null);

  // ----------------------------------------------------------
  // SUBMIT HANDLER
  // ----------------------------------------------------------
  async function loadMetadata(inputUrl: string) {
    metadataRequest.current?.abort();
    transcriptRequest.current?.abort();
    transcriptRequest.current = null;
    const controller = new AbortController();
    metadataRequest.current = controller;
    setError("");
    setInfo(null);
    setPlaying(false);
    setTranscript(null);
    setTranscriptOpen(false);
    setTranscriptLoading(false);
    setTranscriptError("");
    setDownloading(null);
    setDownloadProgress(null);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/media/info?url=${encodeURIComponent(inputUrl)}`,
        { signal: controller.signal }
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Unable to fetch media information");
      }

      setInfo(json.data);
      toast.success("Video information loaded.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message
      );
      toast.error(message);
    } finally {
      if (metadataRequest.current === controller) {
        metadataRequest.current = null;
        setLoading(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (downloading) return;

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      const message = "Please paste a video link.";
      setError(message);
      toast.error(message);
      return;
    }

    await loadMetadata(trimmedUrl);
  }

  async function handleGetTranscript() {
    if (transcriptLoading || downloading || !getYouTubeId(url.trim())) return;

    setTranscriptOpen(true);
    setTranscriptError("");
    if (transcript) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setTranscriptError("Please provide a YouTube URL.");
      return;
    }

    const controller = new AbortController();
    transcriptRequest.current = controller;
    setTranscriptLoading(true);
    try {
      const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;
      const params = new URLSearchParams({ url: normalizedUrl });
      const response = await fetch(`/api/getcaption?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to fetch the transcript.";
        throw new Error(message);
      }

      if (!isTranscriptResponse(payload)) {
        throw new Error("The server returned an invalid transcript response.");
      }

      const transcriptText =
        payload.transcriptText.trim() ||
        payload.subtitles.map((subtitle) => subtitle.text).join(" ").trim();
      if (!transcriptText || payload.subtitles.length === 0) {
        throw new Error("No transcript is available for this video.");
      }

      setTranscript({ ...payload, transcriptText });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setTranscriptError(
        err instanceof Error ? err.message : "Unable to fetch the transcript.",
      );
    } finally {
      if (transcriptRequest.current === controller) {
        transcriptRequest.current = null;
        setTranscriptLoading(false);
      }
    }
  }

  function handleTranscriptDownload() {
    if (!transcript) return;

    const useHours =
      (info?.duration ?? 0) >= 3600 ||
      transcript.subtitles.some(
        (subtitle) => subtitle.start + subtitle.duration >= 3600,
      );
    const content =
      transcriptFormat === "plain"
        ? transcript.transcriptText
        : transcript.subtitles
            .map(
              (subtitle) =>
                `${formatTranscriptTime(subtitle.start, useHours)} - ${subtitle.text}`,
            )
            .join("\n");

    const safeTitle =
      info?.title
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
        .replace(/[. ]+$/g, "")
        .trim() || "video";
    const objectUrl = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${safeTitle}-transcript.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  // ----------------------------------------------------------
  // DOWNLOAD HANDLER
  // ----------------------------------------------------------
  // Start the native browser response immediately and poll yt-dlp's
  // source-download, merge, and final transfer stages in the page.
  // ----------------------------------------------------------
  async function handleDownload(type: DownloadType) {
    if (!info || downloading) return;

    const trimmedUrl = url.trim();

    if (!trimmedUrl) return;

    setDownloading(type);
    setError("");
    setDownloadProgress({
      type,
      stage: "downloading",
      downloadedBytes: 0,
      totalBytes: null,
      percent: null,
      transferredBytes: 0,
    });

    const params = new URLSearchParams({
      url: trimmedUrl,
      type,
    });

    let iframe: HTMLIFrameElement | null = null;

    try {
      const response = await fetch(`/api/media/download?${params.toString()}`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        success: boolean;
        jobId?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.jobId) {
        throw new Error(result.error || "Unable to start this download");
      }

      const jobId = result.jobId;
      const sourcePhaseStartedAt = Date.now();
      let mergePhaseStartedAt: number | undefined;

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const progressResponse = await fetch(
          `/api/media/download?jobId=${encodeURIComponent(jobId)}`,
          { cache: "no-store" }
        );
        const progress = (await progressResponse.json()) as Omit<DownloadProgress, "type"> & {
          success: boolean;
        };

        if (!progressResponse.ok || !progress.success) {
          throw new Error(progress.error || "Unable to read download progress");
        }
        if (progress.stage === "error") {
          throw new Error(progress.error || "Download failed");
        }

        const now = Date.now();
        let visibleStage = progress.stage;

        if (now - sourcePhaseStartedAt < 1000) {
          visibleStage = "downloading";
        } else if (progress.stage !== "downloading") {
          mergePhaseStartedAt ??= now;
          if (now - mergePhaseStartedAt < 800) {
            visibleStage = "merging";
          }
        }

        setDownloadProgress({ ...progress, type, stage: visibleStage });

        if (progress.stage === "ready" && visibleStage === "ready" && !iframe) {
          const downloadParams = new URLSearchParams({ jobId, download: "1" });
          iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = `/api/media/download?${downloadParams.toString()}`;
          document.body.appendChild(iframe);
        }

        if (progress.stage === "complete") {
          iframe?.remove();
          toast.success("Download completed successfully.");
          setTimeout(() => setDownloadProgress(null), 4000);
          break;
        }
      }
    } catch (err) {
      iframe?.remove();
      const message = err instanceof Error ? err.message : "Download failed";
      setError(message);
      toast.error(message);
      setDownloadProgress(null);
    } finally {
      setDownloading(null);
    }
  }

  // ----------------------------------------------------------
  // DERIVED VALUES
  // ----------------------------------------------------------

  const youtubeId = getYouTubeId(url.trim());
  const isYouTube = Boolean(youtubeId);
  const formattedSize = formatFileSize(info?.size);
  const transcriptDuration = Math.max(
    info?.duration ?? 0,
    transcript?.subtitles.reduce(
      (duration, subtitle) =>
        Math.max(duration, subtitle.start + subtitle.duration),
      0,
    ) ?? 0,
  );

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-0 sm:px-2">
      {/* ======================================================
          SEARCH BAR
          ====================================================== */}
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-2xl"
      >
        <div className="flex h-14 w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-[#C9D6FF] bg-white p-1.5 pl-3">
          {/* Search icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 30 30"
            fill="#6B7280"
            className="shrink-0"
          >
            <path d="M13 3C7.489 3 3 7.489 3 13s4.489 10 10 10a9.95 9.95 0 0 0 6.322-2.264l5.971 5.971a1 1 0 1 0 1.414-1.414l-5.97-5.97A9.95 9.95 0 0 0 23 13c0-5.511-4.489-10-10-10m0 2c4.43 0 8 3.57 8 8s-3.57 8-8 8-8-3.57-8-8 3.57-8 8-8" />
          </svg>

          {/* URL input */}
          <input
            type="text"
            placeholder="Paste the video link here..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none focus-visible:outline-none placeholder:text-gray-400"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />

          {/* Check button */}
          <button
            type="submit"
            disabled={loading || downloading !== null || !url.trim()}
            className="flex h-10 min-w-22 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#2442C7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1E36A7] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-24 sm:px-5"
          >
            {loading ? (
              <>
                <Spinner />
                <span>Checking…</span>
              </>
            ) : (
              "Check"
            )}
          </button>
        </div>
      </form>

      {/* ======================================================
          ERROR MESSAGE
          ====================================================== */}
      {error && (
        <p className="mt-4 text-center text-sm text-red-500 animate-fade-in">
          {error}
        </p>
      )}

      {/* ======================================================
          SKELETON LOADER
          ====================================================== */}
      {loading && !info && (
        <>
          <SkeletonCard />
          <p className="mt-3 text-center text-sm text-gray-500" role="status" aria-live="polite">
            Fetching video data, please wait. Longer videos may take more time.
          </p>
        </>
      )}

      {/* ======================================================
          RESULT CARD
          ====================================================== */}
      {info && !loading && (
        <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-fade-in-up sm:mt-8 sm:p-5 lg:p-6">
          <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:gap-6">

            {/* ==================================================
                LEFT: PREVIEW
                ================================================== */}
            <div className="w-full min-w-0 lg:w-[55%]">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black group">

                {youtubeId ? (
                  // ---------- YOUTUBE PREVIEW ----------
                  playing ? (
                    // Real YouTube player after clicking play.
                    <iframe
                      key={youtubeId}
                      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                      title={info.title}
                      className="h-full w-full animate-fade-in"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    // Thumbnail + play button before loading iframe.
                    <button
                      type="button"
                      onClick={() => setPlaying(true)}
                      className="absolute inset-0 flex h-full w-full items-center justify-center"
                      aria-label="Play YouTube preview"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={info.thumbnail}
                        alt={info.title}
                        className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
                        loading="lazy"
                      />

                      {/* YouTube-style play button */}
                      <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="#fff"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </button>
                  )
                ) : (
                  // ---------- NON-YOUTUBE PREVIEW ----------
                  // For non-YouTube sources we currently show
                  // the thumbnail returned by the info API.
                  info.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={info.thumbnail}
                      alt={info.title}
                      className="h-full w-full object-cover animate-fade-in"
                      loading="lazy"
                    />
                  ) : null
                )}

              </div>
            </div>

            {/* ==================================================
                RIGHT: INFO + DOWNLOAD OPTIONS
                ================================================== */}
            <div className="flex w-full min-w-0 flex-col lg:w-[45%]">

              {/* Title */}
              <h2
                className="truncate text-base font-bold text-gray-900 animate-fade-in sm:text-xl"
                title={info.title}
              >
                {info.title}
              </h2>

              {/* Uploader + duration */}
              <p className="mt-1 truncate text-xs text-gray-400 animate-fade-in">
                {info.uploader || info.platform || ""}

                {info.duration && info.duration > 0 &&
                  ` • ${Math.floor(info.duration / 60)}m ${
                    info.duration % 60
                  }s`}
              </p>

              {/* Description */}
              <p
                className="mt-2 line-clamp-2 text-sm text-gray-500 animate-fade-in"
                title={info.description}
              >
                {info.description || "No description available."}
              </p>

              {/* ==================================================
                  OPTIONAL FILE SIZE
                  Only display this when the API provides it.
                  ================================================== */}
              {formattedSize && (
                <div className="mt-4 text-sm text-gray-500 animate-fade-in">
                  <span className="font-semibold text-gray-700">
                    Size:
                  </span>{" "}
                  {formattedSize}
                </div>
              )}

              {transcriptOpen ? (
                <section
                  className="mt-6 min-w-0 animate-fade-in-up rounded-lg border border-[#C9D6FF] bg-[#F8FAFF] p-3 sm:p-4"
                  aria-label="Video transcript"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Transcript
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTranscriptOpen(false)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                      aria-label="Close transcript"
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  {transcriptLoading ? (
                    <p
                      className="flex items-center gap-2 py-6 text-sm text-gray-500"
                      role="status"
                    >
                      <Spinner />
                      Fetching transcript…
                    </p>
                  ) : transcriptError ? (
                    <div className="py-4">
                      <p className="text-sm text-red-600" role="alert">
                        {transcriptError}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleGetTranscript()}
                        disabled={transcriptLoading}
                        className="mt-3 rounded-md border border-indigo-500 bg-white px-3 py-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Try again
                      </button>
                    </div>
                  ) : transcript ? (
                    <>
                      <div className="mt-3 h-20 overflow-y-auto rounded-md border border-gray-200 bg-white p-2">
                        <div className="space-y-2">
                          {transcript.subtitles.map((subtitle, index) => (
                            <p
                              key={`${subtitle.start}-${index}`}
                              className="flex items-start gap-3 text-sm leading-relaxed text-gray-700"
                            >
                              <span className="shrink-0 font-mono text-xs text-indigo-600">
                                {formatTranscriptTime(
                                  subtitle.start,
                                  transcriptDuration >= 3600,
                                )}
                              </span>
                              <span className="min-w-0 whitespace-pre-wrap select-text">
                                {subtitle.text}
                              </span>
                            </p>
                          ))}
                        </div>
                      </div>

                      <label className="mt-3 block text-xs font-medium text-gray-600">
                        Download format
                        <select
                          value={transcriptFormat}
                          onChange={(event) =>
                            setTranscriptFormat(
                              event.target.value as TranscriptFormat,
                            )
                          }
                          className="mt-1 h-10 w-full rounded-md border border-[#C9D6FF] bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="plain">Plain Text (.txt)</option>
                          <option value="timestamps">
                            Text with Timestamps (.txt)
                          </option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={handleTranscriptDownload}
                        className="mt-3 flex h-12 w-full items-center justify-center rounded-md bg-[#2442C7] text-sm font-semibold text-white transition-colors hover:bg-[#1E36A7]"
                      >
                        Download Transcript
                      </button>
                    </>
                  ) : null}
                </section>
              ) : (
                <>
                  <div className="mt-auto pt-6">
                    {isYouTube && (
                      <button
                        type="button"
                        onClick={() => void handleGetTranscript()}
                        disabled={transcriptLoading || downloading !== null}
                        className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-[#2442C7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1E36A7] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {transcriptLoading ? (
                          <>
                            <Spinner />
                            <span>Fetching transcript…</span>
                          </>
                        ) : (
                          "Get Transcript"
                        )}
                      </button>
                    )}

                    {/* Keep the existing download actions side by side. */}
                    <div className="mt-3 grid grid-cols-2 gap-3 animate-fade-in-up">
                    <button
                      type="button"
                      onClick={() => handleDownload("mp4")}
                      disabled={downloading !== null}
                      className={`flex h-12 ${isYouTube ? "" : "col-span-2"} w-full items-center justify-center rounded-md bg-indigo-500 px-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {downloading === "mp4" ? (
                        <>
                          <Spinner />
                          <span className="ml-2">
                            {downloadProgress?.stage === "merging"
                              ? "Merging MP4..."
                              : downloadProgress?.stage === "ready"
                                ? "Starting download..."
                              : downloadProgress?.stage === "transferring"
                                ? "Downloading MP4..."
                                : "Downloading source..."}
                          </span>
                        </>
                      ) : (
                        "Download MP4"
                      )}
                    </button>

                    {isYouTube && <button
                      type="button"
                      onClick={() => handleDownload("mp3")}
                      disabled={downloading !== null}
                      className="flex h-12 w-full items-center justify-center rounded-md border border-indigo-500 bg-white px-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {downloading === "mp3" ? (
                        <>
                          <Spinner />
                          <span className="ml-2">
                            {downloadProgress?.stage === "merging"
                              ? "Converting MP3..."
                              : downloadProgress?.stage === "ready"
                                ? "Starting download..."
                              : downloadProgress?.stage === "transferring"
                                ? "Downloading MP3..."
                                : "Merging..."}
                          </span>
                        </>
                      ) : (
                        "Download MP3"
                      )}
                    </button>}

                    </div>

                  {downloadProgress && (
                    <div
                      className="mt-4 space-y-2 text-sm text-gray-600"
                      role="status"
                      aria-live="polite"
                    >
                  {["downloading", "merging", "ready"].includes(downloadProgress.stage) ? (
                    <div className="space-y-2 rounded-md border border-gray-200 bg-white px-3 py-3">
                      <div>
                        <p className="font-semibold text-gray-800">Converting</p>
                        <p className="text-xs text-gray-500">Download starts within seconds</p>
                      </div>
                      <div
                        className="download-preparing-track"
                        role="progressbar"
                        aria-label="Preparing your download"
                      >
                        <div className="download-preparing-bar" aria-hidden="true" />
                      </div>
                    </div>
                  ) : (
                    <>
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {downloadProgress.stage === "transferring"
                        ? "Sending file..."
                        : "Download complete"}
                    </span>
                    {downloadProgress.stage === "transferring" && downloadProgress.size && (
                      <span>
                        {Math.min(
                          100,
                          Math.floor((downloadProgress.transferredBytes / downloadProgress.size) * 100)
                        )}%
                      </span>
                    )}
                  </div>

                  {downloadProgress.stage === "transferring" && downloadProgress.size && (
                    <>
                      <progress
                        className="h-2 w-full accent-indigo-600"
                        max={downloadProgress.size}
                        value={downloadProgress.transferredBytes}
                      />
                      <p>
                        {formatFileSize(downloadProgress.transferredBytes)} / {formatFileSize(downloadProgress.size)}
                      </p>
                    </>
                  )}

                  {downloadProgress.stage === "complete" && downloadProgress.size && (
                      <p>File size: {formatFileSize(downloadProgress.size)}</p>
                    )}
                    </>
                  )}
                    </div>
                  )}
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />

      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

// ============================================================
// SKELETON CARD
// ============================================================
function SkeletonCard() {
  return (
    <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-fade-in sm:mt-8 sm:p-5 lg:p-6">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:gap-6">

        {/* Preview skeleton */}
        <div className="w-full min-w-0 lg:w-[55%]">
          <div className="aspect-video w-full animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Content skeleton */}
        <div className="flex w-full min-w-0 flex-col gap-3 lg:w-[45%]">
          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />

          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-200" />

          <div className="h-3 w-full animate-pulse rounded bg-gray-200" />

          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />

          {/* Optional size skeleton */}
          <div className="mt-3 h-3 w-20 animate-pulse rounded bg-gray-200" />

          {/* Download buttons skeleton */}
          <div className="mt-4 h-12 w-full animate-pulse rounded bg-gray-200" />

          <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
        </div>

      </div>
    </div>
  );
}
