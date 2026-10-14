import type {
  DownloadProgress as DownloadProgressState,
  DownloadType,
  Info,
  TranscriptFormat,
  TranscriptResponse,
} from "./types";
import DownloadButtons from "./DownloadButtons";
import DownloadProgress from "./DownloadProgress";
import TranscriptPanel from "./TranscriptPanel";
import { formatFileSize } from "./utils";

type VideoInfoPanelProps = {
  info: Info;
  isYouTube: boolean;
  downloading: DownloadType | null;
  downloadProgress: DownloadProgressState | null;
  youtubeDownloadPercent: number | null;
  transcript: TranscriptResponse | null;
  transcriptOpen: boolean;
  transcriptLoading: boolean;
  transcriptError: string;
  transcriptFormat: TranscriptFormat;
  transcriptDuration: number;
  summaryLoading: boolean;
  onGetTranscript: () => void;
  onDownloadTranscript: () => void;
  onDownloadAiSummary: () => void;
  onTranscriptFormatChange: (format: TranscriptFormat) => void;
  onTranscriptClose: () => void;
  onDownload: (type: DownloadType) => void;
};

export default function VideoInfoPanel({
  info,
  isYouTube,
  downloading,
  downloadProgress,
  youtubeDownloadPercent,
  transcript,
  transcriptOpen,
  transcriptLoading,
  transcriptError,
  transcriptFormat,
  transcriptDuration,
  summaryLoading,
  onGetTranscript,
  onDownloadTranscript,
  onDownloadAiSummary,
  onTranscriptFormatChange,
  onTranscriptClose,
  onDownload,
}: VideoInfoPanelProps) {
  const formattedSize = formatFileSize(info.size);

  return (
    <div className="flex w-full min-w-0 flex-col lg:w-[45%]">
      <h2
        className="truncate text-base font-bold text-gray-900 animate-fade-in sm:text-xl"
        title={info.title}
      >
        {info.title}
      </h2>
      <p className="mt-1 truncate text-xs text-gray-400 animate-fade-in">
        {info.uploader || info.platform || ""}
        {info.duration &&
          info.duration > 0 &&
          ` • ${Math.floor(info.duration / 60)}m ${info.duration % 60}s`}
      </p>
      <p
        className="mt-2 line-clamp-2 text-sm text-gray-500 animate-fade-in"
        title={info.description}
      >
        {info.description || "No description available."}
      </p>

      {formattedSize && (
        <div className="mt-4 text-sm text-gray-500 animate-fade-in">
          <span className="font-semibold text-gray-700">Size:</span>{" "}
          {formattedSize}
        </div>
      )}

      {transcriptOpen ? (
        <TranscriptPanel
          open={transcriptOpen}
          transcript={transcript}
          loading={transcriptLoading}
          error={transcriptError}
          format={transcriptFormat}
          duration={transcriptDuration}
          summaryLoading={summaryLoading}
          onClose={onTranscriptClose}
          onRetry={onGetTranscript}
          onFormatChange={onTranscriptFormatChange}
          onDownload={onDownloadTranscript}
          onAiSummaryDownload={onDownloadAiSummary}
        />
      ) : (
        <div className="mt-auto pt-6">
          <DownloadButtons
            isYouTube={isYouTube}
            downloading={downloading}
            progress={downloadProgress}
            transcriptLoading={transcriptLoading}
            onGetTranscript={onGetTranscript}
            onDownload={onDownload}
          />
          <DownloadProgress
            progress={downloadProgress}
            isYouTube={isYouTube}
            youtubePercent={youtubeDownloadPercent}
          />
        </div>
      )}
    </div>
  );
}
