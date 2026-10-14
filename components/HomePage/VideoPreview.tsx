"use client";

import { useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { useMediaDownload } from "../../hooks/useMediaDownload";
import { useMediaMetadata } from "../../hooks/useMediaMetadata";
import { useTranscript } from "../../hooks/useTranscript";
import SkeletonCard from "../video-preview/SkeletonCard";
import VideoPreviewCard from "../video-preview/VideoPreviewCard";
import VideoSearchBar from "../video-preview/VideoSearchBar";
import type { DownloadType } from "../video-preview/types";
import { getYouTubeId } from "../video-preview/utils";

export default function VideoPreview() {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const metadata = useMediaMetadata();
  const downloads = useMediaDownload({
    url,
    isYouTube: Boolean(getYouTubeId(url.trim())),
    metadataUrl: metadata.metadataUrl,
    info: metadata.info,
    setError: metadata.setError,
  });
  const transcripts = useTranscript({
    url,
    info: metadata.info,
    downloading: downloads.downloading !== null,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (downloads.downloading) return;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      const message = "Please paste a video link.";
      metadata.setError(message);
      toast.error(message);
      return;
    }

    transcripts.resetTranscript();
    downloads.resetDownload();
    setPlaying(false);
    await metadata.loadMetadata(trimmedUrl);
  }

  const youtubeId = getYouTubeId(url.trim());
  const isYouTube = Boolean(youtubeId);
  const youtubeDownloadPercent =
    downloads.downloadProgress?.stage === "ready"
      ? 100
      : typeof downloads.downloadProgress?.percent === "number"
        ? Math.min(99, Math.max(0, Math.floor(downloads.downloadProgress.percent)))
        : null;
  const transcriptDuration = Math.max(
    metadata.info?.duration ?? 0,
    transcripts.transcript?.subtitles.reduce(
      (duration, subtitle) =>
        Math.max(duration, subtitle.start + subtitle.duration),
      0,
    ) ?? 0,
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-0 sm:px-2">
      <VideoSearchBar
        url={url}
        loading={metadata.loading}
        downloading={downloads.downloading !== null}
        onUrlChange={setUrl}
        onSubmit={handleSubmit}
      />

      {metadata.error && (
        <p className="mt-4 text-center text-sm text-red-500 animate-fade-in">
          {metadata.error}
        </p>
      )}

      {metadata.loading && !metadata.info && (
        <>
          <SkeletonCard />
          <p
            className="mt-3 text-center text-sm text-gray-500"
            role="status"
            aria-live="polite"
          >
            Fetching video data, please wait. Longer videos may take more time.
          </p>
        </>
      )}

      {metadata.info && !metadata.loading && (
        <VideoPreviewCard
          info={metadata.info}
          youtubeId={youtubeId}
          playing={playing}
          isYouTube={isYouTube}
          downloading={downloads.downloading}
          downloadProgress={downloads.downloadProgress}
          youtubeDownloadPercent={youtubeDownloadPercent}
          transcript={transcripts.transcript}
          transcriptOpen={transcripts.transcriptOpen}
          transcriptLoading={transcripts.transcriptLoading}
          transcriptError={transcripts.transcriptError}
          transcriptFormat={transcripts.transcriptFormat}
          transcriptDuration={transcriptDuration}
          summaryLoading={transcripts.summaryLoading}
          onPlay={() => setPlaying(true)}
          onGetTranscript={() => void transcripts.handleGetTranscript()}
          onDownloadTranscript={transcripts.handleTranscriptDownload}
          onDownloadAiSummary={() =>
            void transcripts.handleAiSummaryDownload()
          }
          onTranscriptFormatChange={transcripts.setTranscriptFormat}
          onTranscriptClose={() => transcripts.setTranscriptOpen(false)}
          onDownload={(type: DownloadType) =>
            void downloads.handleDownload(type)
          }
        />
      )}
    </div>
  );
}
