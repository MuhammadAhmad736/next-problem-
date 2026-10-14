"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";
import type {
  Info,
  TranscriptFormat,
  TranscriptResponse,
} from "../components/video-preview/types";
import {
  formatTranscriptTime,
  getYouTubeId,
  isTranscriptResponse,
} from "../components/video-preview/utils";

type UseTranscriptOptions = {
  url: string;
  info: Info | null;
  downloading: boolean;
};

export function useTranscript({ url, info, downloading }: UseTranscriptOptions) {
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [transcriptFormat, setTranscriptFormat] =
    useState<TranscriptFormat>("timestamps");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const transcriptRequest = useRef<AbortController | null>(null);

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

  async function handleAiSummaryDownload() {
    if (!transcript || summaryLoading) return;

    setSummaryLoading(true);
    try {
      const response = await fetch("/api/getsummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcript.transcriptText }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to generate the AI summary.";
        throw new Error(message);
      }

      if (!isSummaryResponse(payload)) {
        throw new Error("The server returned an invalid AI summary.");
      }

      const summary = payload.summary;
      const content = [
        "Video Summary",
        "",
        "Overview",
        summary.overview.trim(),
        "",
        "Key Points",
        ...(summary.keyPoints.length
          ? summary.keyPoints.map((point) => `- ${point.trim()}`)
          : ["- None provided."]),
        "",
        "Conclusion",
        summary.conclusion.trim(),
        "",
        "Important Terms",
        ...(summary.importantTerms.length
          ? summary.importantTerms.map((term) => `- ${term.trim()}`)
          : ["- None provided."]),
      ].join("\n");

      downloadTextFile(content, "video-ai-summary.txt");
      toast.success("AI summary downloaded.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to generate the AI summary.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  function resetTranscript() {
    transcriptRequest.current?.abort();
    transcriptRequest.current = null;
    setTranscript(null);
    setTranscriptOpen(false);
    setTranscriptLoading(false);
    setTranscriptError("");
  }

  return {
    transcript,
    transcriptOpen,
    setTranscriptOpen,
    transcriptLoading,
    transcriptError,
    transcriptFormat,
    setTranscriptFormat,
    summaryLoading,
    handleGetTranscript,
    handleTranscriptDownload,
    handleAiSummaryDownload,
    resetTranscript,
  };
}

type SummaryResponse = {
  summary: {
    overview: string;
    keyPoints: string[];
    conclusion: string;
    importantTerms: string[];
  };
};

function isSummaryResponse(value: unknown): value is SummaryResponse {
  if (typeof value !== "object" || value === null || !("summary" in value)) {
    return false;
  }

  const summary = value.summary;
  return (
    typeof summary === "object" &&
    summary !== null &&
    "overview" in summary &&
    typeof summary.overview === "string" &&
    Boolean(summary.overview.trim()) &&
    "keyPoints" in summary &&
    Array.isArray(summary.keyPoints) &&
    summary.keyPoints.every(
      (point) => typeof point === "string" && Boolean(point.trim()),
    ) &&
    "conclusion" in summary &&
    typeof summary.conclusion === "string" &&
    Boolean(summary.conclusion.trim()) &&
    "importantTerms" in summary &&
    Array.isArray(summary.importantTerms) &&
    summary.importantTerms.every(
      (term) => typeof term === "string" && Boolean(term.trim()),
    )
  );
}

function downloadTextFile(content: string, filename: string) {
  const objectUrl = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
