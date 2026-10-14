export type Info = {
  title: string;
  description: string;
  thumbnail: string;
  duration?: number;
  uploader: string;
  platform?: string;
  size?: number | string | null;
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

export type DownloadType = "mp4" | "mp3";
export type DownloadStage =
  | "downloading"
  | "merging"
  | "ready"
  | "transferring"
  | "complete"
  | "error";

export type DownloadProgress = {
  type: DownloadType;
  stage: DownloadStage;
  downloadedBytes: number;
  totalBytes: number | null;
  percent: number | null;
  transferredBytes: number;
  size?: number;
  error?: string;
};

export type SubtitleSegment = {
  start: number;
  duration: number;
  text: string;
};

export type TranscriptResponse = {
  transcriptText: string;
  subtitles: SubtitleSegment[];
};

export type TranscriptFormat = "plain" | "timestamps";
