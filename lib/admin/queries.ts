import Download from "@/models/info";
import User from "@/models/user";
import Visitor from "@/models/visitors";
import { DOWNLOAD_PAGE_SIZE, USER_LIMIT } from "./constants";
import type { DailyDownload, DownloadStats, UserActivity } from "./types";

export function getOverallStats(today: Date) {
  return Download.aggregate<DownloadStats>([
    {
      $group: {
        _id: null,
        totalDownloads: { $sum: 1 },
        successfulDownloads: {
          $sum: { $cond: [{ $eq: ["$status", "Successful"] }, 1, 0] },
        },
        failedDownloads: {
          $sum: { $cond: [{ $eq: ["$status", "Failed"] }, 1, 0] },
        },
        downloadsToday: {
          $sum: { $cond: [{ $gte: ["$date", today] }, 1, 0] },
        },
        mp4Downloads: {
          $sum: { $cond: [{ $eq: ["$format", "MP4"] }, 1, 0] },
        },
        mp3Downloads: {
          $sum: { $cond: [{ $eq: ["$format", "MP3"] }, 1, 0] },
        },
      },
    },
  ]);
}

export function getDailyDownloads(weekStart: Date) {
  return Download.aggregate<DailyDownload>([
    { $match: { date: { $gte: weekStart } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$date",
            timezone: "UTC",
          },
        },
        downloads: { $sum: 1 },
      },
    },
  ]);
}

export function getUserActivity() {
  return Download.aggregate<UserActivity>([
    { $match: { userId: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: "$userId",
        downloads: { $sum: 1 },
        lastDownload: { $max: "$date" },
      },
    },
  ]);
}

export function getRecentDownloads(
  page = 1,
  limit = DOWNLOAD_PAGE_SIZE
) {
  const offset = (page - 1) * limit;

  return Download.find()
    .sort({ date: -1, _id: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

export function countDownloads() {
  return Download.countDocuments();
}

export function countUsers() {
  return User.countDocuments();
}

export function countNewUsers(since: Date) {
  return User.countDocuments({ createdAt: { $gte: since } });
}

export function findUsersByIds(ids: string[]) {
  return User.find({ _id: { $in: ids } }).select("name email").lean();
}

export function findRecentUsers() {
  return User.find()
    .select("name email createdAt")
    .sort({ createdAt: -1 })
    .limit(USER_LIMIT)
    .lean();
}

export function getVisitorCount() {
  return Visitor.findOne().select("counter").lean();
}