import { X } from "lucide-react";
import type {
  TranscriptFormat,
  TranscriptResponse,
} from "./types";
import { formatTranscriptTime } from "./utils";
import Spinner from "./Spinner";

type TranscriptPanelProps = {
  open: boolean;
  transcript: TranscriptResponse | null;
  loading: boolean;
  error: string;
  format: TranscriptFormat;
  duration: number;
  summaryLoading: boolean;
  onClose: () => void;
  onRetry: () => void;
  onFormatChange: (format: TranscriptFormat) => void;
  onDownload: () => void;
  onAiSummaryDownload: () => void;
};

export default function TranscriptPanel({
  open,
  transcript,
  loading,
  error,
  format,
  duration,
  summaryLoading,
  onClose,
  onRetry,
  onFormatChange,
  onDownload,
  onAiSummaryDownload,
}: TranscriptPanelProps) {
  if (!open) return null;

  return (
    <section
      className="mt-6 min-w-0 animate-fade-in-up rounded-lg border border-[#C9D6FF] bg-[#F8FAFF] p-3 sm:p-4"
      aria-label="Video transcript"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-800">Transcript</h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
          aria-label="Close transcript"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <p
          className="flex items-center gap-2 py-6 text-sm text-gray-500"
          role="status"
        >
          <Spinner />
          Fetching transcript…
        </p>
      ) : error ? (
        <div className="py-4">
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
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
                    {formatTranscriptTime(subtitle.start, duration >= 3600)}
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
              value={format}
              onChange={(event) =>
                onFormatChange(event.target.value as TranscriptFormat)
              }
              className="mt-1 h-10 w-full rounded-md border border-[#C9D6FF] bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="plain">Plain Text (.txt)</option>
              <option value="timestamps">Text with Timestamps (.txt)</option>
            </select>
          </label>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
            <button
              type="button"
              onClick={onDownload}
              className="flex h-12 w-full items-center justify-center rounded-md bg-[#2442C7] text-sm font-semibold text-white transition-colors hover:bg-[#1E36A7]"
            >
              Download Transcript
            </button>
            <button
              type="button"
              onClick={onAiSummaryDownload}
              disabled={summaryLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-indigo-500 bg-white text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {summaryLoading ? (
                <>
                  <Spinner />
                  Generating AI Summary...
                </>
              ) : (
                "Download AI Summary"
              )}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
