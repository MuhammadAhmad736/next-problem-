import type { Info } from "./types";

type VideoPlayerProps = {
  info: Info;
  youtubeId: string | null;
  playing: boolean;
  onPlay: () => void;
};

export default function VideoPlayer({
  info,
  youtubeId,
  playing,
  onPlay,
}: VideoPlayerProps) {
  return (
    <div className="w-full min-w-0 lg:w-[55%]">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black group">
        {youtubeId ? (
          playing ? (
            <iframe
              key={youtubeId}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={info.title}
              className="h-full w-full animate-fade-in"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={onPlay}
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
              <span className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )
        ) : info.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.thumbnail}
            alt={info.title}
            className="h-full w-full object-cover animate-fade-in"
            loading="lazy"
          />
        ) : null}
      </div>
    </div>
  );
}
