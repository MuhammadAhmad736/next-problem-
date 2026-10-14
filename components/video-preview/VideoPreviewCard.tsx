import type {
  DownloadProgress,
  DownloadType,
  Info,
  TranscriptFormat,
  TranscriptResponse,
} from "./types";
import VideoInfoPanel from "./VideoInfoPanel";
import VideoPlayer from "./VideoPlayer";

type VideoPreviewCardProps = {
  info: Info;
  youtubeId: string | null;
  playing: boolean;
  isYouTube: boolean;
  downloading: DownloadType | null;
  downloadProgress: DownloadProgress | null;
  youtubeDownloadPercent: number | null;
  transcript: TranscriptResponse | null;
  transcriptOpen: boolean;
  transcriptLoading: boolean;
  transcriptError: string;
  transcriptFormat: TranscriptFormat;
  transcriptDuration: number;
  summaryLoading: boolean;
  onPlay: () => void;
  onGetTranscript: () => void;
  onDownloadTranscript: () => void;
  onDownloadAiSummary: () => void;
  onTranscriptFormatChange: (format: TranscriptFormat) => void;
  onTranscriptClose: () => void;
  onDownload: (type: DownloadType) => void;
};

export default function VideoPreviewCard(props: VideoPreviewCardProps) {
  return (
    <div className="mt-6 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm animate-fade-in-up sm:mt-8 sm:p-5 lg:p-6">
      <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:gap-6">
        <VideoPlayer
          info={props.info}
          youtubeId={props.youtubeId}
          playing={props.playing}
          onPlay={props.onPlay}
        />
        <VideoInfoPanel
          info={props.info}
          isYouTube={props.isYouTube}
          downloading={props.downloading}
          downloadProgress={props.downloadProgress}
          youtubeDownloadPercent={props.youtubeDownloadPercent}
          transcript={props.transcript}
          transcriptOpen={props.transcriptOpen}
          transcriptLoading={props.transcriptLoading}
          transcriptError={props.transcriptError}
          transcriptFormat={props.transcriptFormat}
          transcriptDuration={props.transcriptDuration}
          summaryLoading={props.summaryLoading}
          onGetTranscript={props.onGetTranscript}
          onDownloadTranscript={props.onDownloadTranscript}
          onDownloadAiSummary={props.onDownloadAiSummary}
          onTranscriptFormatChange={props.onTranscriptFormatChange}
          onTranscriptClose={props.onTranscriptClose}
          onDownload={props.onDownload}
        />
      </div>
    </div>
  );
}
