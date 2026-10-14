import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { requireUser } from '@/lib/middleware/require-user';
import {
  downloadWithVidly,
  getMediaMetadata,
  getMediaPlatform,
  getVidlyMediaInfo,
} from '@/lib/downloads/media-metadata';
import { createDirectFileResponse, createFileResponse } from '@/lib/downloads/streamer';
import type { DownloadTracking, DownloadType } from '@/lib/downloads/types';
import { createJob, getJob } from '@/lib/downloads/job-store';
import { runDownloadJob } from '@/lib/downloads/downloader';
import { saveDownloadRecordDetails } from '@/lib/downloads/records';

export const runtime = 'nodejs';
export const maxDuration = 300;

type YouTubeScraperMetadata = {
  title?: string;
};

function isValidType(t: string | null): t is DownloadType {
  return t === 'mp4' || t === 'mp3';
}

async function getDownloadTracking(
  url: string,
  type: DownloadType,
  userId?: string,
  knownMetadata?: { title?: string; duration?: number },
): Promise<DownloadTracking | null> {
  const platform = getMediaPlatform(url);
  if (!platform) return null;

  if (platform !== 'YouTube') {
    let duration = 0;
    let title = 'Unknown title';
    try {
      const [metadata, vidlyMetadata] = await Promise.all([
        getMediaMetadata(url).catch((error: unknown) => {
          console.error('Non-YouTube duration lookup error:', error);
          return null;
        }),
        getVidlyMediaInfo(url).catch((error: unknown) => {
          console.error('Non-YouTube title lookup error:', error);
          return null;
        }),
      ]);
      duration = metadata?.duration ?? 0;
      title = vidlyMetadata?.title ?? title;
    } catch (error) {
      console.error('Non-YouTube download tracking error:', error);
    }

    return {
      ...(userId ? { userId } : {}),
      title,
      platform,
      duration,
      quality: 'Best available',
    };
  }

  let duration = knownMetadata?.duration ?? 0;
  let title = knownMetadata?.title?.trim() || 'Unknown title';

  if (!knownMetadata || title === 'Unknown title') {
    const metadataStartedAt = Date.now();
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const scraperMetadataPromise =
      title === 'Unknown title'
        ? Promise.resolve()
            .then(() => {
              // The scraper is only needed when no title came from the info request.
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const yt = require('@vreden/youtube_scraper') as {
                metadata: (videoUrl: string) => Promise<YouTubeScraperMetadata>;
              };
              return yt.metadata(fullUrl);
            })
            .catch((error: unknown) => {
              console.error('Download metadata lookup error:', error);
              return null;
            })
        : Promise.resolve(null);
    const ytDlpMetadataPromise =
      duration === 0 || title === 'Unknown title'
        ? getMediaMetadata(url).catch((error: unknown) => {
            console.error('Download metadata lookup error:', error);
            return null;
          })
        : Promise.resolve(null);
    const [scraperMetadata, ytDlpMetadata] = await Promise.all([
      scraperMetadataPromise,
      ytDlpMetadataPromise,
    ]);
    console.info('YouTube tracking metadata timing', {
      scraperRequested: title === 'Unknown title',
      ytDlpRequested: duration === 0 || title === 'Unknown title',
      totalMs: Date.now() - metadataStartedAt,
    });

    if (
      title === 'Unknown title' &&
      typeof scraperMetadata?.title === 'string' &&
      scraperMetadata.title.trim()
    ) {
      title = scraperMetadata.title.trim();
    }
    if (duration === 0 && typeof ytDlpMetadata?.duration === 'number') {
      duration = ytDlpMetadata.duration;
    }
    if (title === 'Unknown title' && ytDlpMetadata?.title) {
      title = ytDlpMetadata.title;
    }
  }

  return {
    ...(userId ? { userId } : {}),
    title,
    platform,
    duration,
    quality: type === 'mp3' ? 'Audio' : 'Best available',
  };
}

function getOptionalUserId(request: NextRequest):
  | { userId?: string }
  | { response: NextResponse } {
  const session = requireUser(request);
  if (session.authenticated) return { userId: session.userId };

  if (session.response.status === 401) return {};
  return { response: session.response };
}

function getKnownYouTubeMetadata(
  request: NextRequest,
): { title?: string; duration?: number } | undefined {
  const title = request.nextUrl.searchParams.get('title')?.trim();
  const durationValue = request.nextUrl.searchParams.get('duration');
  const duration = durationValue ? Number(durationValue) : undefined;

  if ((!title || title.length > 500) && duration === undefined) return undefined;

  return {
    ...(title && title.length <= 500 ? { title } : {}),
    ...(duration !== undefined && Number.isFinite(duration) && duration > 0
      ? { duration }
      : {}),
  };
}

async function createNonYouTubeDownloadResponse(
  url: string,
  type: DownloadType,
  userId?: string,
): Promise<Response> {
  const tempDir = path.join(os.tmpdir(), `vidly-${randomUUID()}`);
  const tracking = getDownloadTracking(url, type, userId);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const downloaded = await downloadWithVidly(
      url,
      path.join(tempDir, 'video.mp4'),
    );
    const fileStats = fs.statSync(downloaded.filePath);
    if (!fileStats.isFile() || fileStats.size === 0) {
      throw new Error('Vidly did not create a valid video file.');
    }

    return createDirectFileResponse({
      filePath: downloaded.filePath,
      tempDir,
      type,
      fileSize: fileStats.size,
      tracking,
    });
  } catch (error) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Direct download cleanup error:', cleanupError);
    }
    await saveDownloadRecordDetails(tracking, type, 0, 'Failed');
    console.error('Non-YouTube direct download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  const session = getOptionalUserId(request);
  if ('response' in session) return session.response;

  const sp = request.nextUrl.searchParams;
  const jobId = sp.get('jobId');

  // ----------------------------------------------------------
  // POLL JOB STATUS OR DOWNLOAD THE FILE
  // ----------------------------------------------------------
  if (jobId) {
    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    if (job.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'Download job not found' },
        { status: 404 }
      );
    }

    return sp.get('download') === '1'
      ? createFileResponse(job)
      : NextResponse.json({
          success: true,
          jobId: job.id,
          stage: job.stage,
          downloadedBytes: job.downloadedBytes,
          totalBytes: job.totalBytes,
          transferredBytes: job.transferredBytes,
          percent: job.percent,
          size: job.size,
          error: job.error,
        });
  }

  // ----------------------------------------------------------
  // DIRECT DOWNLOAD (no jobId supplied)
  // ----------------------------------------------------------
  const url = sp.get('url');
  const type = sp.get('type');

  if (!url || !isValidType(type)) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid url/type' },
      { status: 400 }
    );
  }

  const platform = getMediaPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid media URL.' },
      { status: 400 },
    );
  }
  if (platform !== 'YouTube' && type !== 'mp4') {
    return NextResponse.json(
      { success: false, error: 'Non-YouTube videos can only be downloaded as MP4.' },
      { status: 400 },
    );
  }

  if (platform !== 'YouTube') {
    return createNonYouTubeDownloadResponse(url, type, session.userId);
  }

  // 1. Create the job synchronously (fast — just a temp dir + Map entry)
  const job = createJob(platform === 'YouTube' ? type : 'mp4');
  job.userId = session.userId;
  job.platform = platform;
  job.tracking = getDownloadTracking(url, type, session.userId);

  // 2. Kick off the long-running download in the background
  void runDownloadJob(job, url);

  // 3. Return a response that waits for the job to finish, then streams
  return createFileResponse(job);
}

export async function POST(request: NextRequest) {
  const session = getOptionalUserId(request);
  if ('response' in session) return session.response;

  const sp = request.nextUrl.searchParams;
  const url = sp.get('url');
  const type = sp.get('type');

  if (!url || !isValidType(type)) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid url/type' },
      { status: 400 }
    );
  }

  const platform = getMediaPlatform(url);
  if (!platform) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid media URL.' },
      { status: 400 },
    );
  }
  if (platform !== 'YouTube' && type !== 'mp4') {
    return NextResponse.json(
      { success: false, error: 'Non-YouTube videos can only be downloaded as MP4.' },
      { status: 400 },
    );
  }

  if (platform !== 'YouTube') {
    return createNonYouTubeDownloadResponse(url, type, session.userId);
  }

  // 1. Create the job
  const job = createJob(platform === 'YouTube' ? type : 'mp4');
  job.userId = session.userId;
  job.platform = platform;
  job.tracking = getDownloadTracking(
    url,
    type,
    session.userId,
    platform === 'YouTube' ? getKnownYouTubeMetadata(request) : undefined,
  );

  // 2. Start the download in the background
  void runDownloadJob(job, url);

  // 3. Return the jobId immediately so the frontend can poll
  return NextResponse.json({ success: true, jobId: job.id });
}