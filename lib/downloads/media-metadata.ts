import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type VidlyClient = {
  getInfo: (url: string) => Promise<unknown>;
  downloadVideo: (
    url: string,
    outputPath: string,
  ) => Promise<{ title?: string; filePath: string; size: number }>;
};

function getVidlyClient(): VidlyClient {
  return require("@raihan07/vidly") as VidlyClient;
}

export type MediaMetadata = {
  title?: string;
  duration: number;
  thumbnail?: string;
};

export type VidlyMediaInfo = {
  title: string;
  highQuality?: string;
  lowQuality?: string;
};

function normalizeMediaUrl(url: string): string {
  const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
  const parsedUrl = new URL(normalizedUrl);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS media URLs are supported.");
  }
  return parsedUrl.toString();
}

export function getMediaPlatform(url: string): string | undefined {
  try {
    const parsedUrl = new URL(normalizeMediaUrl(url));
    const hostname = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

    if (
      hostname === "youtu.be" ||
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com")
    ) {
      return "YouTube";
    }
    if (hostname === "instagram.com" || hostname.endsWith(".instagram.com")) {
      return "Instagram";
    }
    if (
      hostname === "tiktok.com" ||
      hostname.endsWith(".tiktok.com") ||
      hostname === "vm.tiktok.com" ||
      hostname === "vt.tiktok.com"
    ) {
      return "TikTok";
    }
    if (
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "fb.watch"
    ) {
      return "Facebook";
    }
    if (
      hostname === "x.com" ||
      hostname.endsWith(".x.com") ||
      hostname === "twitter.com" ||
      hostname.endsWith(".twitter.com") ||
      hostname === "t.co"
    ) {
      return "X/Twitter";
    }
    if (
      hostname === "pinterest.com" ||
      hostname.endsWith(".pinterest.com") ||
      hostname === "pin.it"
    ) {
      return "Pinterest";
    }

    return hostname || undefined;
  } catch {
    return undefined;
  }
}

export async function getVidlyMediaInfo(url: string): Promise<VidlyMediaInfo> {
  const result = await getVidlyClient().getInfo(normalizeMediaUrl(url));
  if (typeof result !== "object" || result === null || !("title" in result)) {
    throw new Error("Vidly could not find media for this URL.");
  }

  const title = typeof result.title === "string" ? result.title.trim() : "";
  if (!title) {
    throw new Error("Vidly did not return a media title.");
  }

  return {
    title,
    highQuality:
      "highQuality" in result && typeof result.highQuality === "string"
        ? result.highQuality
        : undefined,
    lowQuality:
      "lowQuality" in result && typeof result.lowQuality === "string"
        ? result.lowQuality
        : undefined,
  };
}

export async function downloadWithVidly(
  url: string,
  outputPath: string,
): Promise<{ title?: string; filePath: string; size: number }> {
  return getVidlyClient().downloadVideo(normalizeMediaUrl(url), outputPath);
}

export async function getMediaMetadata(url: string): Promise<MediaMetadata> {
  const { YT_DLP_BIN_PATH } = require("@choewy/yt-dlp") as {
    YT_DLP_BIN_PATH: string;
  };
  const fullUrl = normalizeMediaUrl(url);
  const { stdout } = await execFileAsync(
    YT_DLP_BIN_PATH,
    ["--dump-single-json", "--skip-download", "--no-warnings", "--no-playlist", fullUrl],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  );
  const metadata: unknown = JSON.parse(stdout);

  if (typeof metadata !== "object" || metadata === null) {
    throw new Error("Media metadata response is invalid.");
  }

  const title =
    "title" in metadata && typeof metadata.title === "string"
      ? metadata.title.trim() || undefined
      : undefined;
  const duration =
    "duration" in metadata &&
    typeof metadata.duration === "number" &&
    Number.isFinite(metadata.duration)
      ? Math.max(0, metadata.duration)
      : 0;
  const thumbnail =
    "thumbnail" in metadata && typeof metadata.thumbnail === "string"
      ? metadata.thumbnail
      : "thumbnails" in metadata &&
          Array.isArray(metadata.thumbnails) &&
          metadata.thumbnails.length > 0 &&
          typeof metadata.thumbnails[metadata.thumbnails.length - 1]?.url === "string"
        ? metadata.thumbnails[metadata.thumbnails.length - 1].url
        : undefined;

  return { title, duration, thumbnail };
}
