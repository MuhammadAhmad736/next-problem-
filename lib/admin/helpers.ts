import { DAY } from "./constants";
import type { DailyDownload, UserActivity } from "./types";

// ---------- Date ranges ----------
export function getDateRanges(now = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  return {
    today,
    weekStart: new Date(today.getTime() - 6 * DAY),
    activeSince: new Date(now.getTime() - 30 * DAY),
    newUserSince: new Date(now.getTime() - 7 * DAY),
  };
}

// ---------- Builders ----------
export function buildDownloadsOverview(
  dailyResults: DailyDownload[],
  weekStart: Date
) {
  const map = new Map(dailyResults.map((d) => [d._id, d.downloads]));

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart.getTime() + i * DAY);
    const key = date.toISOString().slice(0, 10);

    return {
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      downloads: map.get(key) ?? 0,
    };
  });
}

export function buildActivityMap(userActivity: UserActivity[]) {
  return new Map(
    userActivity.map((a) => [
      a._id.toString(),
      { downloads: a.downloads, lastDownload: a.lastDownload },
    ])
  );
}

export function buildUserList(
  users: any[],
  activityByUserId: Map<string, { downloads: number; lastDownload: Date }>,
  activeSince: Date
) {
  return users.map((user) => {
    const activity = activityByUserId.get(user._id.toString());
    const isActive = !!activity && activity.lastDownload >= activeSince;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      downloads: activity?.downloads ?? 0,
      status: isActive ? "Active" : "Inactive",
      joinedAt: user.createdAt?.toISOString() ?? null,
    };
  });
}

export function buildDownloadList(
  recentDownloads: any[],
  usersById: Map<string, any>
) {
  return recentDownloads.map((download) => {
    const userId = download.userId?.toString();
    const user = userId ? usersById.get(userId) : undefined;

    return {
      id: download._id.toString(),
      title: download.title,
      platform: download.platform === "Other" ? "" : download.platform ?? "",
      duration: download.duration ?? 0,
      user: user
        ? { id: user._id.toString(), name: user.name, email: user.email }
        : null,
      format: download.format,
      quality: download.quality,
      fileSize: download.fileSize,
      status: download.status,
      date: download.date.toISOString(),
    };
  });
}

export function buildRecentDownloadList(downloadList: any[]) {
  return downloadList.slice(0, 10).map((d) => ({
    id: d.id,
    title: d.title,
    platform: d.platform,
    duration: d.duration,
    format: d.format,
    quality: d.quality,
    status: d.status,
    date: d.date,
  }));
}