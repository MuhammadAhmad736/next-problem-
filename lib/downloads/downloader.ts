import fs from 'fs';
import path from 'path';
import youtubeDl, { type Flags } from 'youtube-dl-exec';

import type { DownloadJob } from './types';
import { DOWNLOAD_PROGRESS_MARKER } from './constants';
import { scheduleCleanup, scheduleErrorCleanup } from './job-store';
import { saveDownloadRecord } from './records';
import { downloadWithVidly } from './media-metadata';

const DOWNLOAD_START_MARKER = '__YT_DLP_DOWNLOAD_START__';
const MP4_FORMAT = 'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('ffmpeg-static') as string | null;

export async function runDownloadJob(
  job: DownloadJob,
  url: string
): Promise<void> {
  if (job.platform !== 'YouTube') {
    await runNonYouTubeDownloadJob(job, url);
    return;
  }

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const outputTemplate = path.join(
    job.tempDir,
    job.type === 'mp3' ? 'audio.%(ext)s' : 'video.%(ext)s'
  );

  const flags = buildFlags(job, outputTemplate);

  let pendingStdoutLine = '';
  let pendingStderrLine = '';
  let stderrTail = '';
  let mergeStartedAt: number | undefined;
  let processStartedAt: number | undefined;
  let downloadStartedAt: number | undefined;
  let firstProgressAt: number | undefined;
  let downloadedFilePath: string | undefined;

  const handleLine = (rawLine: string) => {
    const line = rawLine.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '').trim();
    if (line === DOWNLOAD_START_MARKER) {
      downloadStartedAt ??= Date.now();
      return;
    }

    if (line.startsWith('__YT_DLP_PATH__:')) {
      downloadedFilePath = line.slice('__YT_DLP_PATH__:'.length).trim();
      return;
    }

    const markerIndex = line.indexOf(DOWNLOAD_PROGRESS_MARKER);

    if (markerIndex !== -1) {
      firstProgressAt ??= Date.now();
      const [downloadedValue, estimatedValue, totalValue] = line
        .slice(markerIndex + DOWNLOAD_PROGRESS_MARKER.length)
        .split('|');
      const downloaded = Number(downloadedValue);
      const total = Number(estimatedValue) || Number(totalValue);

      if (Number.isFinite(downloaded)) job.downloadedBytes = downloaded;
      if (Number.isFinite(total) && total > 0) {
        job.totalBytes = total;
        job.percent = Math.min(
          99,
          Math.floor((job.downloadedBytes / total) * 100)
        );
      }
      return;
    }

    if (
      /Merging formats into|\[Merger\]|\[ExtractAudio\]|Postprocessing/i.test(
        line
      )
    ) {
      job.stage = 'merging';
      mergeStartedAt ??= Date.now();
    }
  };

  const consumeOutput = (chunk: Buffer, isStdout: boolean) => {
    const text = chunk.toString();
    if (!isStdout) stderrTail = `${stderrTail}${text}`.slice(-4000);

    const pendingLine = isStdout ? pendingStdoutLine : pendingStderrLine;
    const lines = `${pendingLine}${text}`.split(/\r\n|\n|\r/);
    const remainingLine = lines.pop() ?? '';

    if (isStdout) pendingStdoutLine = remainingLine;
    else pendingStderrLine = remainingLine;

    for (const line of lines) handleLine(line);
  };

  try {
    processStartedAt = Date.now();
    const subprocess = youtubeDl.exec(fullUrl, flags, {
      windowsHide: true,
    });

    subprocess.stdout?.on('data', (chunk: Buffer) =>
      consumeOutput(chunk, true),
    );
    subprocess.stderr?.on('data', (chunk: Buffer) =>
      consumeOutput(chunk, false),
    );

    await subprocess;
    if (pendingStdoutLine) handleLine(pendingStdoutLine);
    if (pendingStderrLine) handleLine(pendingStderrLine);

    const processCompletedAt = Date.now();
    const filePath = downloadedFilePath;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Downloaded file not found after merging');
    }

    const fileStats = fs.statSync(filePath);
    if (!fileStats.isFile() || fileStats.size === 0) {
      throw new Error('Downloaded file is empty or invalid after merging');
    }

    job.filePath = filePath;
    job.size = fileStats.size;
    job.stage = 'ready';
    job.percent = 100;
    const readyAt = Date.now();
    const downloadPhaseStartedAt = downloadStartedAt ?? firstProgressAt;
    console.info('YouTube download timing', {
      jobId: job.id,
      type: job.type,
      extractionAndFormatSelectionMs:
        processStartedAt !== undefined && downloadPhaseStartedAt !== undefined
          ? downloadPhaseStartedAt - processStartedAt
          : null,
      timeToFirstProgressMs:
        processStartedAt !== undefined && firstProgressAt !== undefined
          ? firstProgressAt - processStartedAt
          : null,
      downloadMs:
        downloadPhaseStartedAt !== undefined
          ? (mergeStartedAt ?? processCompletedAt) - downloadPhaseStartedAt
          : null,
      mergeMs:
        mergeStartedAt !== undefined
          ? processCompletedAt - mergeStartedAt
          : null,
      totalMs:
        processStartedAt !== undefined ? readyAt - processStartedAt : null,
    });
    scheduleCleanup(job);
  } catch (error) {
    const stderr = stderrTail.trim();
    const requiresYouTubeSignIn =
      /LOGIN_REQUIRED|sign in to confirm.{0,40}not a bot/i.test(stderr);
    const ytDlpErrorLine = stderr
      .split(/\r?\n/)
      .find((line) => /^\s*ERROR:/i.test(line))
      ?.trim();

    console.error('YouTube download preparation error:', {
      jobId: job.id,
      error,
      stderr: stderr || 'yt-dlp did not write to stderr.',
    });
    job.stage = 'error';
    job.error = requiresYouTubeSignIn
      ? 'YouTube requires sign-in verification for this video from the current server connection. Try again later; if it continues, the server may need an authorized YouTube session.'
      : ytDlpErrorLine || 'yt-dlp could not download this video. Please try again later.';
    // Save failed attempts without replacing the original download error.
    void saveDownloadRecord(job, 'Failed');
    scheduleErrorCleanup(job);
  } finally {
    job.resolveCompletion();
  }
}

async function runNonYouTubeDownloadJob(
  job: DownloadJob,
  url: string
): Promise<void> {
  try {
    job.stage = 'downloading';
    const outputPath = path.join(job.tempDir, 'video.mp4');
    const downloaded = await downloadWithVidly(url, outputPath);

    if (!fs.existsSync(downloaded.filePath) || fs.statSync(downloaded.filePath).size === 0) {
      throw new Error('Vidly did not create a video file.');
    }

    job.filePath = downloaded.filePath;
    job.size = fs.statSync(downloaded.filePath).size;
    job.stage = 'ready';
    job.percent = 100;
    scheduleCleanup(job);
  } catch (error) {
    console.error('Non-YouTube download preparation error:', error);
    job.stage = 'error';
    job.error = error instanceof Error ? error.message : 'Download failed';
    void saveDownloadRecord(job, 'Failed');
    scheduleErrorCleanup(job);
  } finally {
    job.resolveCompletion();
  }
}

function buildFlags(
  job: DownloadJob,
  outputTemplate: string
): Flags {
  return {
    output: outputTemplate,
    format: job.type === 'mp4' ? MP4_FORMAT : 'ba/b',
    ...(job.type === 'mp4' ? { mergeOutputFormat: 'mp4' } : {
      extractAudio: true,
      audioFormat: 'mp3',
    }),
    ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    noPlaylist: true,
    forceOverwrites: true,
    concurrentFragments: 4,
    retries: 3,
    fragmentRetries: 3,
    quiet: false,
    progress: true,
    newline: true,
    progressTemplate: `download:${DOWNLOAD_PROGRESS_MARKER}%(progress.downloaded_bytes)s|%(progress.total_bytes_estimate)s|%(progress.total_bytes)s`,
    print: [
      `before_dl:${DOWNLOAD_START_MARKER}`,
      'after_move:__YT_DLP_PATH__:%(filepath)s',
    ],
  };
}