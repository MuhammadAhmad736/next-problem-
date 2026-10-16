
import { NextRequest, NextResponse } from "next/server";
import { fetch as undiciFetch, ProxyAgent } from "undici";
import { getSubtitles } from "youtube-caption-extractor";

// Run the API in Node.js.
export const runtime = "nodejs";
export const maxDuration = 60;

const CAPTION_FETCH_TIMEOUT_MS = 10_000;
let captionProxyUrl: string | undefined;
let captionProxyAgent: ProxyAgent | undefined;

// Get the video ID from a YouTube URL.
function getVideoId(url: URL): string | null {
  const host = url.hostname.toLowerCase();

  // Check whether the URL belongs to YouTube.
  const isYouTube =
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com");

  if (!isYouTube) {
    return null;
  }

  // Example: youtube.com/watch?v=VIDEO_ID
  const id = url.searchParams.get("v");

  if (id) {
    return id;
  }

  // Handle short URLs and other YouTube video formats.
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return parts[0] ?? null;
  }

  if (["shorts", "embed", "live", "v"].includes(parts[0])) {
    return parts[1] ?? null;
  }

  return null;
}

function createCaptionFetch(proxyUrl?: string): typeof fetch {
  let agent: ProxyAgent | undefined;

  if (proxyUrl) {
    const proxy = new URL(proxyUrl);
    if (proxy.protocol !== "http:" && proxy.protocol !== "https:") {
      throw new Error("YOUTUBE_CAPTIONS_PROXY_URL must use HTTP or HTTPS.");
    }

    if (!captionProxyAgent || captionProxyUrl !== proxyUrl) {
      if (captionProxyAgent) {
        void captionProxyAgent.close().catch((error: unknown) => {
          console.error("Caption proxy shutdown error:", error);
        });
      }
      captionProxyAgent = new ProxyAgent(proxyUrl);
      captionProxyUrl = proxyUrl;
    }
    agent = captionProxyAgent;
  }

  return async (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const requestHeaders = new Headers(init?.headers ?? request?.headers);
    const response = await undiciFetch(url, {
      ...(init?.method || request?.method
        ? { method: init?.method ?? request?.method }
        : {}),
      headers: Object.fromEntries(requestHeaders.entries()),
      ...(typeof init?.body === "string" ? { body: init.body } : {}),
      ...(agent ? { dispatcher: agent } : {}),
      signal: init?.signal ?? AbortSignal.timeout(CAPTION_FETCH_TIMEOUT_MS),
    });
    const responseHeaders = new Headers();
    response.headers.forEach((value, name) =>
      responseHeaders.append(name, value),
    );

    return new Response(await response.text(), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  };
}

// GET /api/getcaption?url=YOUTUBE_URL
export async function GET(request: NextRequest) {
  try {
    // Read the YouTube URL from the query parameters.
    const youtubeUrl = request.nextUrl.searchParams.get("url");

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "Please provide a YouTube URL." },
        { status: 400 }
      );
    }

    // Check whether the URL is valid.
    let parsedUrl: URL;

    try {
      parsedUrl = new URL(youtubeUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL." },
        { status: 400 }
      );
    }

    // Allow only HTTP and HTTPS URLs.
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are allowed." },
        { status: 400 }
      );
    }

    // Extract the video ID.
    const videoID = getVideoId(parsedUrl);

    // Check that the video ID is valid.
    if (!videoID || !/^[a-zA-Z0-9_-]{11}$/.test(videoID)) {
      return NextResponse.json(
        { error: "Please provide a valid YouTube video URL." },
        { status: 400 }
      );
    }

    // Fetch available subtitles without specifying a language.
    const proxyUrl = process.env.YOUTUBE_CAPTIONS_PROXY_URL?.trim();
    const subtitles = await getSubtitles({
      videoID,
      fetch: createCaptionFetch(proxyUrl),
    });

    // Check whether any subtitles were found.
    if (!subtitles || subtitles.length === 0) {
      return NextResponse.json(
        { error: "No transcript is available for this video." },
        { status: 404 }
      );
    }

    // Keep the timestamp and text of every subtitle.
    const transcript = subtitles.map((subtitle) => ({
      start: Number(subtitle.start),
      duration: Number(subtitle.dur),
      text: subtitle.text,
    }));

    // Combine all subtitle text into one string.
    const transcriptText = transcript
      .map((subtitle) => subtitle.text)
      .join(" ")
      .trim();

    // Return only the transcript and its timestamps.
    return NextResponse.json({
      transcriptText,
      subtitles: transcript,
    });
  } catch (error) {
    console.error("Caption API error:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const youtubeBlocked =
      /LOGIN_REQUIRED|confirm.{0,30}not a bot|\b(?:403|429)\b/i.test(errorMessage);

    return NextResponse.json(
      {
        error: youtubeBlocked
          ? "YouTube is blocking requests from this deployment network. Configure YOUTUBE_CAPTIONS_PROXY_URL with a trusted outbound HTTP proxy and try again."
          : "Could not retrieve the transcript.",
      },
      { status: youtubeBlocked ? 503 : 502 }
    );
  }
}
