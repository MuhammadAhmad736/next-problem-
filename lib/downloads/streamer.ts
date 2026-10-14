import fs from 'fs';
import { Readable } from 'node:stream';
import type { DownloadJob, DownloadTracking, DownloadType } from './types';
import {
  DOWNLOAD_CHUNK_SIZE,
  MIN_VISIBLE_TRANSFER_MS,
  MAX_TRANSFER_BYTES_PER_SECOND,
  ERROR_CLEANUP_TTL_MS,
} from './constants';
import { scheduleCleanup } from './job-store';
import { saveDownloadRecord, saveDownloadRecordDetails } from './records';

type DirectFileOptions = {
  filePath: string;
  tempDir: string;
  type: DownloadType;
  fileSize: number;
  tracking: Promise<DownloadTracking | null>;
};

export function createDirectFileResponse({
  filePath,
  tempDir,
  type,
  fileSize,
  tracking,
}: DirectFileOptions): Response {
  const body = Readable.toWeb(
    Readable.from(
      (async function* () {
        let transferCompleted = false;
        try {
          const fileStream = fs.createReadStream(filePath, {
            highWaterMark: DOWNLOAD_CHUNK_SIZE,
          });

          for await (const chunk of fileStream) {
            yield chunk as Buffer;
          }
          transferCompleted = true;
        } finally {
          await saveDownloadRecordDetails(
            tracking,
            type,
            fileSize,
            transferCompleted ? 'Successful' : 'Failed',
          );
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch (error) {
            console.error('Direct download cleanup error:', error);
          }
        }
      })(),
    ),
  ) as ReadableStream<Uint8Array>;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${type === 'mp3' ? 'audio.mp3' : 'video.mp4'}"`,
      'Content-Type': type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
      'Content-Length': String(fileSize),
      'Cache-Control': 'no-store',
    },
  });
}

export function createFileResponse(job: DownloadJob): Response {
  const body = Readable.toWeb(
    Readable.from(
      (async function* () {
        await job.completion;

        if (job.stage === 'error' || !job.filePath) {
          throw new Error(job.error || 'Download preparation failed');
        }

        job.stage = 'transferring';
        clearTimeout(job.cleanupTimer);

        let transferCompleted = false;
        try {
          const fileSize = job.size ?? fs.statSync(job.filePath).size;
          const transferDurationMs =
            job.platform === 'YouTube'
              ? 0
              : Math.max(
                  MIN_VISIBLE_TRANSFER_MS,
                  (fileSize / MAX_TRANSFER_BYTES_PER_SECOND) * 1000
                );

          const fileStream = fs.createReadStream(job.filePath, {
            highWaterMark: DOWNLOAD_CHUNK_SIZE,
          });

          for await (const chunk of fileStream) {
            if (transferDurationMs > 0) {
              await new Promise((resolve) =>
                setTimeout(
                  resolve,
                  (transferDurationMs * chunk.length) / fileSize
                )
              );
            }
            job.transferredBytes += chunk.length;
            yield chunk as Buffer;
          }

          job.stage = 'complete';
          transferCompleted = true;
        } finally {
          await saveDownloadRecord(
            job,
            transferCompleted ? 'Successful' : 'Failed'
          );
          scheduleCleanup(job, ERROR_CLEANUP_TTL_MS);
        }
      })()
    )
  ) as ReadableStream<Uint8Array>;

  const headers = new Headers({
    'Content-Disposition': `attachment; filename="${
      job.type === 'mp3' ? 'audio.mp3' : 'video.mp4'
    }"`,
    'Content-Type':
      job.type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
    'Cache-Control': 'no-store',
  });

  if (job.size !== undefined) {
    headers.set('Content-Length', String(job.size));
  }

  return new Response(body, { status: 200, headers });
}