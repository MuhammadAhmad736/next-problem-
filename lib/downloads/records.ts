import Download from '@/models/info';
import { connectDB } from '@/lib/db/mongodb';
import type { DownloadJob, DownloadTracking, DownloadType } from './types';

export async function saveDownloadRecordDetails(
  trackingPromise: Promise<DownloadTracking | null> | undefined,
  type: DownloadType,
  fileSize: number,
  status: 'Successful' | 'Failed',
): Promise<void> {
  if (!trackingPromise) return;

  try {
    const tracking = await trackingPromise;
    if (!tracking) return;

    await connectDB();
    await Download.create({
      ...(tracking.userId ? { userId: tracking.userId } : {}),
      title: tracking.title,
      format: type === 'mp4' ? 'MP4' : 'MP3',
      platform: tracking.platform,
      duration: tracking.duration,
      quality: tracking.quality,
      fileSize: status === 'Successful' ? fileSize : 0,
      status,
      date: new Date(),
    });
  } catch (error) {
    console.error('Download history save error:', error);
  }
}

export async function saveDownloadRecord(
  job: DownloadJob,
  status: 'Successful' | 'Failed'
): Promise<void> {
  if (!job.tracking) return;

  if (!job.recordPromise) {
    job.recordPromise = saveDownloadRecordDetails(
      job.tracking,
      job.type,
      job.size ?? 0,
      status,
    );
  }

  await job.recordPromise;
}