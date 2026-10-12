
import { NextRequest, NextResponse } from "next/server";
import { getSubtitles } from "youtube-caption-extractor";

// Run the API in Node.js.
export const runtime = "nodejs";

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
    const subtitles = await getSubtitles({ videoID });

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
    // Log the error in your terminal.
    console.error("Caption API error:", error);

    return NextResponse.json(
      { error: "Could not retrieve the transcript." },
      { status: 502 }
    );
  }
}
