"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import type {
  DownloadProgress,
  DownloadType,
  Info,
} from "../components/video-preview/types";

type UseMediaDownloadOptions = {
  url: string;
  isYouTube: boolean;
  metadataUrl: string;
  info: Info | null;
  setError: (message: string) => void;
  onComplete: () => void;
};

export function useMediaDownload({
  url,
  isYouTube,
  metadataUrl,
  info,
  setError,
  onComplete,
}: UseMediaDownloadOptions) {
  const [downloading, setDownloading] = useState<DownloadType | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);

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

    const params = new URLSearchParams({ url: trimmedUrl, type });
    if (
      isYouTube &&
      metadataUrl === trimmedUrl &&
      typeof info.title === "string" &&
      info.title.trim()
    ) {
      params.set("title", info.title.trim());
      if (typeof info.duration === "number" && Number.isFinite(info.duration)) {
        params.set("duration", String(info.duration));
      }
    }

    let iframe: HTMLIFrameElement | null = null;

    try {
      const response = await fetch(`/api/media/download?${params.toString()}`, {
        method: "POST",
      });
      const isJsonResponse = response.headers
        .get("content-type")
        ?.includes("application/json");

      if (!isYouTube || !isJsonResponse) {
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null);
          const message =
            typeof payload === "object" &&
            payload !== null &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "Unable to download this media";
          throw new Error(message);
        }

        if (!response.body) {
          throw new Error("The server returned an empty download.");
        }

        const contentLength = Number(response.headers.get("content-length"));
        const totalBytes =
          Number.isFinite(contentLength) && contentLength > 0
            ? contentLength
            : null;
        const reader = response.body.getReader();
        const chunks: ArrayBuffer[] = [];
        let transferredBytes = 0;

        setDownloadProgress({
          type,
          stage: "transferring",
          downloadedBytes: 0,
          totalBytes,
          percent: null,
          transferredBytes: 0,
          ...(totalBytes ? { size: totalBytes } : {}),
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new Uint8Array(value.byteLength);
          chunk.set(value);
          chunks.push(chunk.buffer);
          transferredBytes += value.byteLength;
          setDownloadProgress({
            type,
            stage: "transferring",
            downloadedBytes: transferredBytes,
            totalBytes,
            percent: totalBytes
              ? Math.min(99, Math.floor((transferredBytes / totalBytes) * 100))
              : null,
            transferredBytes,
            ...(totalBytes ? { size: totalBytes } : {}),
          });
        }

        if (transferredBytes === 0) {
          throw new Error("The server returned an empty download.");
        }

        const blob = new Blob(chunks, {
          type: response.headers.get("content-type") || "video/mp4",
        });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = type === "mp3" ? "audio.mp3" : "video.mp4";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);

        setDownloadProgress({
          type,
          stage: "complete",
          downloadedBytes: transferredBytes,
          totalBytes,
          percent: 100,
          transferredBytes,
          size: transferredBytes,
        });
        toast.success("Download completed successfully.");
        onComplete();
        setTimeout(() => setDownloadProgress(null), 4000);
        return;
      }

      const result = (await response.json()) as {
        success: boolean;
        jobId?: string;
        error?: string;
      };

      if (!response.ok || !result.success || !result.jobId) {
        throw new Error(result.error || "Unable to start this download");
      }

      const jobId = result.jobId;
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const progressResponse = await fetch(
          `/api/media/download?jobId=${encodeURIComponent(jobId)}`,
          { cache: "no-store" },
        );
        const progress = (await progressResponse.json()) as Omit<
          DownloadProgress,
          "type"
        > & { success: boolean };

        if (!progressResponse.ok || !progress.success) {
          throw new Error(progress.error || "Unable to read download progress");
        }
        if (progress.stage === "error") {
          throw new Error(progress.error || "Download failed");
        }

        setDownloadProgress({ ...progress, type });
        if (progress.stage === "ready" && !iframe) {
          const downloadParams = new URLSearchParams({ jobId, download: "1" });
          iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = `/api/media/download?${downloadParams.toString()}`;
          document.body.appendChild(iframe);
        }

        if (progress.stage === "complete") {
          iframe?.remove();
          toast.success("Download completed successfully.");
          onComplete();
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

  function resetDownload() {
    setDownloading(null);
    setDownloadProgress(null);
  }

  return { downloading, downloadProgress, handleDownload, resetDownload };
}
