import type { DownloadProgress as DownloadProgressState } from "./types";
import { formatFileSize } from "./utils";

type DownloadProgressProps = {
  progress: DownloadProgressState | null;
  isYouTube: boolean;
  youtubePercent: number | null;
};

export default function DownloadProgress({
  progress,
  isYouTube,
  youtubePercent,
}: DownloadProgressProps) {
  if (!progress) return null;

  return (
    <div
      className="mt-4 space-y-2 text-sm text-gray-600"
      role="status"
      aria-live="polite"
    >
      {["downloading", "merging", "ready"].includes(progress.stage) ? (
        <div className="space-y-2 rounded-md border border-gray-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-800">
                {isYouTube
                  ? progress.stage === "downloading"
                    ? "Downloading from YouTube"
                    : progress.stage === "merging"
                      ? "Converting..."
                      : "Download ready"
                  : "Converting"}
              </p>
              <p className="text-xs text-gray-500">
                {isYouTube
                  ? progress.stage === "downloading"
                    ? "Preparing your download"
                    : progress.stage === "merging"
                      ? "Finalizing your download"
                      : "Starting your download"
                  : "Download starts within seconds"}
              </p>
            </div>
            {isYouTube && progress.stage === "downloading" && (
              <span className="shrink-0 text-xs font-semibold text-gray-700">
                {youtubePercent === null
                  ? "Estimating..."
                  : `${youtubePercent}%`}
              </span>
            )}
            {isYouTube && progress.stage === "ready" && (
              <span className="shrink-0 text-xs font-semibold text-gray-700">
                100%
              </span>
            )}
          </div>
          <div
            className="download-preparing-track"
            role="progressbar"
            aria-label={
              isYouTube && progress.stage === "downloading"
                ? "YouTube download progress"
                : "Preparing your download"
            }
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              isYouTube &&
              (progress.stage === "downloading" || progress.stage === "ready")
                ? youtubePercent ?? 0
                : undefined
            }
          >
            <div
              className="download-preparing-bar"
              aria-hidden="true"
              style={
                isYouTube &&
                (progress.stage === "downloading" || progress.stage === "ready")
                  ? {
                      width: `${youtubePercent ?? 0}%`,
                      animation: "none",
                      transform: "none",
                    }
                  : undefined
              }
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <span>
              {progress.stage === "transferring"
                ? "Sending file..."
                : "Download complete"}
            </span>
            {progress.stage === "transferring" && progress.size && (
              <span>
                {Math.min(
                  100,
                  Math.floor(
                    (progress.transferredBytes / progress.size) * 100,
                  ),
                )}
                %
              </span>
            )}
          </div>
          {progress.stage === "transferring" && progress.size && (
            <>
              <progress
                className="h-2 w-full accent-indigo-600"
                max={progress.size}
                value={progress.transferredBytes}
              />
              <p>
                {formatFileSize(progress.transferredBytes)} /{" "}
                {formatFileSize(progress.size)}
              </p>
            </>
          )}
          {progress.stage === "complete" && progress.size && (
            <p>File size: {formatFileSize(progress.size)}</p>
          )}
        </>
      )}
    </div>
  );
}
