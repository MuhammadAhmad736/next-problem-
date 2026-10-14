import type { FormEventHandler } from "react";
import Spinner from "./Spinner";

type VideoSearchBarProps = {
  url: string;
  loading: boolean;
  downloading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function VideoSearchBar({
  url,
  loading,
  downloading,
  onUrlChange,
  onSubmit,
}: VideoSearchBarProps) {
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-2xl">
      <div className="flex h-14 w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-[#C9D6FF] bg-white p-1.5 pl-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 30 30"
          fill="#6B7280"
          className="shrink-0"
        >
          <path d="M13 3C7.489 3 3 7.489 3 13s4.489 10 10 10a9.95 9.95 0 0 0 6.322-2.264l5.971 5.971a1 1 0 1 0 1.414-1.414l-5.97-5.97A9.95 9.95 0 0 0 23 13c0-5.511-4.489-10-10-10m0 2c4.43 0 8 3.57 8 8s-3.57 8-8 8-8-3.57-8-8 3.57-8 8-8" />
        </svg>
        <input
          type="text"
          placeholder="Paste the video link here..."
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none focus-visible:outline-none placeholder:text-gray-400"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || downloading || !url.trim()}
          className="flex h-10 min-w-22 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#2442C7] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1E36A7] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-24 sm:px-5"
        >
          {loading ? (
            <>
              <Spinner />
              <span>Checking…</span>
            </>
          ) : (
            "Check"
          )}
        </button>
      </div>
    </form>
  );
}
