import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware/require-admin";
import { connectDB } from "@/lib/db/mongodb";
import {
  DEFAULT_STATS,
  DOWNLOAD_PAGE_SIZE,
  MAX_DOWNLOAD_PAGE_SIZE,
} from "@/lib/admin/constants";
import {
  getDateRanges,
  buildActivityMap,
  buildDownloadList,
  buildDownloadsOverview,
  buildRecentDownloadList,
  buildUserList,
} from "@/lib/admin/helpers";
import {
  getOverallStats,
  getDailyDownloads,
  getUserActivity,
  getRecentDownloads,
  countDownloads,
  countUsers,
  countNewUsers,
  findUsersByIds,
  findRecentUsers,
  getVisitorCount,
} from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInteger(value: string | null, defaultValue: number) {
  if (value === null) return defaultValue;
  if (!/^[1-9]\d*$/.test(value)) return null;

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdmin(request);
    if (!access.authorized) return access.response;

    await connectDB();

    // The Downloads page requests its records separately so it only loads one page.
    if (request.nextUrl.searchParams.get("section") === "downloads") {
      const page = parsePositiveInteger(request.nextUrl.searchParams.get("page"), 1);
      const limit = parsePositiveInteger(
        request.nextUrl.searchParams.get("limit"),
        DOWNLOAD_PAGE_SIZE
      );

      if (page === null || limit === null || limit > MAX_DOWNLOAD_PAGE_SIZE) {
        return NextResponse.json(
          { success: false, message: "Page or page size is invalid." },
          { status: 400 }
        );
      }

      const offset = (page - 1) * limit;
      if (!Number.isSafeInteger(offset) || offset > 2_147_483_647) {
        return NextResponse.json(
          { success: false, message: "Page is too large." },
          { status: 400 }
        );
      }

      const [downloads, totalRecords] = await Promise.all([
        getRecentDownloads(page, limit),
        countDownloads(),
      ]);

      const userIds = [
        ...new Set(
          downloads
            .map((download) => download.userId?.toString())
            .filter((id): id is string => Boolean(id))
        ),
      ];
      const users = await findUsersByIds(userIds);
      const usersById = new Map(users.map((user) => [user._id.toString(), user]));

      return NextResponse.json({
        success: true,
        downloads: {
          downloadList: buildDownloadList(downloads, usersById),
          pagination: {
            currentPage: page,
            pageSize: limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
          },
        },
      });
    }

    const { today, weekStart, activeSince, newUserSince } = getDateRanges();

    const [
      statsResults,
      dailyResults,
      userActivity,
      recentDownloads,
      totalDownloadRecords,
      totalUsers,
      newUsers,
      visitor,
    ] = await Promise.all([
      getOverallStats(today),
      getDailyDownloads(weekStart),
      getUserActivity(),
      getRecentDownloads(1, DOWNLOAD_PAGE_SIZE),
      countDownloads(),
      countUsers(),
      countNewUsers(newUserSince),
      getVisitorCount(),
    ]);

    const stats = statsResults[0] ?? DEFAULT_STATS;
    const downloadsOverview = buildDownloadsOverview(dailyResults, weekStart);

    const userIds = [
      ...new Set(
        recentDownloads
          .map((d) => d.userId?.toString())
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const recentUsers = await findUsersByIds(userIds);
    const usersById = new Map(recentUsers.map((u) => [u._id.toString(), u]));
    const activityByUserId = buildActivityMap(userActivity);

    const usersFromDatabase = await findRecentUsers();
    const userList = buildUserList(usersFromDatabase, activityByUserId, activeSince);

    const activeUsers = userActivity.filter(
      (a) => a.lastDownload >= activeSince
    ).length;

    const downloadList = buildDownloadList(recentDownloads, usersById);
    const recentDownloadList = buildRecentDownloadList(downloadList);

    return NextResponse.json({
      success: true,
      dashboard: {
        stats: {
          totalDownloads: stats.totalDownloads,
          successfulDownloads: stats.successfulDownloads,
          failedDownloads: stats.failedDownloads,
          downloadsToday: stats.downloadsToday,
        },
        recentDownloads: recentDownloadList,
      },
      analytics: {
        totalDownloads: stats.totalDownloads,
        successfulDownloads: stats.successfulDownloads,
        failedDownloads: stats.failedDownloads,
        downloadsToday: stats.downloadsToday,
        downloadsOverview,
        downloadStatus: {
          successful: stats.successfulDownloads,
          failed: stats.failedDownloads,
        },
        formatUsage: { mp4: stats.mp4Downloads, mp3: stats.mp3Downloads },
      },
      users: {
        totalUsers,
        activeUsers,
        newUsers,
        totalVisitors: visitor?.counter ?? 0,
        userList,
      },
      downloads: {
        totalDownloads: stats.totalDownloads,
        successfulDownloads: stats.successfulDownloads,
        failedDownloads: stats.failedDownloads,
        downloadsToday: stats.downloadsToday,
        downloadList,
        pagination: {
          currentPage: 1,
          pageSize: DOWNLOAD_PAGE_SIZE,
          totalRecords: totalDownloadRecords,
          totalPages: Math.ceil(totalDownloadRecords / DOWNLOAD_PAGE_SIZE),
        },
      },
    });
  } catch (error) {
    console.error("Admin dashboard data error:", error);
    return NextResponse.json(
      { success: false, message: "Could not load dashboard data." },
      { status: 500 }
    );
  }
}