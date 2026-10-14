import type {
  DownloadProgress,
  DownloadType,
} from "./types";
import Spinner from "./Spinner";

type DownloadButtonsProps = {
  isYouTube: boolean;
  downloading: DownloadType | null;
  progress: DownloadProgress | null;
  transcriptLoading: boolean;
  onGetTranscript: () => void;
  onDownload: (type: DownloadType) => void;
};

export default function DownloadButtons({
  isYouTube,
  downloading,
  progress,
  transcriptLoading,
  onGetTranscript,
  onDownload,
}: DownloadButtonsProps) {
  return (
    <>
      {isYouTube && (
        <button
          type="button"
          onClick={onGetTranscript}
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

      <div className="mt-3 grid grid-cols-2 gap-3 animate-fade-in-up">
        <button
          type="button"
          onClick={() => onDownload("mp4")}
          disabled={downloading !== null}
          className={`flex h-12 ${isYouTube ? "" : "col-span-2"} w-full items-center justify-center rounded-md bg-indigo-500 px-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {downloading === "mp4" ? (
            <>
              <Spinner />
              <span className="ml-2">
                {progress?.stage === "merging"
                  ? "Merging MP4..."
                  : progress?.stage === "ready"
                    ? "Starting download..."
                    : progress?.stage === "transferring"
                      ? "Downloading MP4..."
                      : "Downloading source..."}
              </span>
            </>
          ) : (
            "Download MP4"
          )}
        </button>

        {isYouTube && (
          <button
            type="button"
            onClick={() => onDownload("mp3")}
            disabled={downloading !== null}
            className="flex h-12 w-full items-center justify-center rounded-md border border-indigo-500 bg-white px-2 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading === "mp3" ? (
              <>
                <Spinner />
                <span className="ml-2">
                  {progress?.stage === "merging"
                    ? "Converting MP3..."
                    : progress?.stage === "ready"
                      ? "Starting download..."
                      : progress?.stage === "transferring"
                        ? "Downloading MP3..."
                        : "Downloading source..."}
                </span>
              </>
            ) : (
              "Download MP3"
            )}
          </button>
        )}
      </div>
    </>
  );
}
