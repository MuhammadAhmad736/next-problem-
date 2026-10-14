import { NextRequest, NextResponse } from "next/server";
import {
  getMediaMetadata,
  getMediaPlatform,
  getVidlyMediaInfo,
} from "@/lib/downloads/media-metadata";

export const runtime = "nodejs";

type YouTubeScraperMetadata = {
  status?: boolean;
  id?: string;
  message?: string;
  title?: string;
  duration?: { seconds?: number };
  thumbnails?: Array<{ quality?: string; url?: string }>;
  description?: string;
  channel_title?: string;
};

export async function GET(request: NextRequest) {
  try {
    // Get URL from query parameters
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    // Check if URL was provided
    if (!url) {
      return NextResponse.json(
        {
          success: false,
          message: "URL is required",
        },
        { status: 400 }
      );
    }

    const platform = getMediaPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { success: false, error: "Enter a valid media URL." },
        { status: 400 },
      );
    }

    if (platform !== "YouTube") {
      const [metadata, mediaMetadata] = await Promise.all([
        getVidlyMediaInfo(url),
        getMediaMetadata(url).catch((error: unknown) => {
          console.error("Non-YouTube media metadata lookup error:", error);
          return null;
        }),
      ]);
      const duration = mediaMetadata?.duration ?? 0;
      const thumbnail = mediaMetadata?.thumbnail;

      return NextResponse.json({
        success: true,
        data: {
          title: metadata.title,
          description: "",
          ...(thumbnail ? { thumbnail } : {}),
          ...(duration > 0 ? { duration } : {}),
          platform,
          uploader: "",
          size: null,
          options: {
            video: {
              format: "mp4",
              label: "MP4",
            },
          },
        },
      });
    }

    // Load the YouTube scraper only for YouTube requests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yt = require('@vreden/youtube_scraper') as {
      metadata: (videoUrl: string) => Promise<YouTubeScraperMetadata>;
    };
    const metadataStartedAt = Date.now();
    const scraperStartedAt = Date.now();
    const scraperMetadataPromise = yt.metadata(url).then(
      (result) => ({ result, elapsedMs: Date.now() - scraperStartedAt }),
      (error: unknown) => {
        console.error("YouTube scraper metadata lookup error:", error);
        return { result: null, elapsedMs: Date.now() - scraperStartedAt };
      },
    );
    const ytDlpStartedAt = Date.now();
    const ytDlpMetadataPromise = getMediaMetadata(url).then(
      (metadata) => ({ metadata, elapsedMs: Date.now() - ytDlpStartedAt }),
      (error: unknown) => {
        console.error("YouTube yt-dlp metadata lookup error:", error);
        return { metadata: null, elapsedMs: Date.now() - ytDlpStartedAt };
      },
    );
    const [
      { result, elapsedMs: scraperMs },
      { metadata, elapsedMs: ytDlpMs },
    ] = await Promise.all([
      scraperMetadataPromise,
      ytDlpMetadataPromise,
    ]);

    console.info("YouTube metadata lookup timing", {
      scraperMs,
      ytDlpMs,
      totalMs: Date.now() - metadataStartedAt,
    });

    if ((!result?.status || !result.id) && !metadata?.title) {
      return NextResponse.json(
        {
          success: false,
          error: result?.message || "Unable to retrieve YouTube metadata.",
        },
        { status: result?.status === false ? 404 : 502 }
      );
    }

    const duration =
      typeof result?.duration?.seconds === "number" &&
      Number.isFinite(result.duration.seconds)
        ? Math.max(0, result.duration.seconds)
        : metadata?.duration ?? 0;
    const title =
      typeof result?.title === "string" && result.title.trim()
        ? result.title
        : metadata?.title ?? "";

    // Get the best available thumbnail
    const thumbnail =
      result?.thumbnails?.find((item) => item.quality === "maxres")?.url ||
      result?.thumbnails?.find((item) => item.quality === "high")?.url ||
      result?.thumbnails?.[0]?.url ||
      metadata?.thumbnail ||
      "";

    // Return only the data our frontend needs
    return NextResponse.json({
      success: true,

      data: {
        title,
        description: result?.description || "",
        thumbnail,
        ...(duration > 0 ? { duration } : {}),
        ...(platform ? { platform } : {}),

        // YouTube channel/uploader
        uploader: result?.channel_title || "",

        // metadata() does not provide a reliable file size
        size: null,

        // Our application supports these two download options
        options: {
          video: {
            format: "mp4",
            label: "MP4",
          },

          audio: {
            format: "mp3",
            label: "Audio Only",
          },
        },
      },
    });
  } catch (error) {
    console.error("Media info error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to get media information",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}