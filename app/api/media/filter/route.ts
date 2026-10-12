import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireAdmin } from "@/lib/middleware/require-admin";
import Download from "@/models/info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Only allow admins to view filtered download activity.
    const access = await requireAdmin(request);
    if (!access.authorized) return access.response;

    const startDateText = request.nextUrl.searchParams.get("startDate");
    const endDateText = request.nextUrl.searchParams.get("endDate");
    const platform = request.nextUrl.searchParams.get("platform")?.trim();

    // The platform or date range can be used alone, or they can be combined.
    if (!platform && !startDateText && !endDateText) {
      return NextResponse.json(
        { success: false, error: "Choose a platform or a date range to filter downloads." },
        { status: 400 },
      );
    }

    // If the user starts entering a date range, they must provide both dates.
    if (Boolean(startDateText) !== Boolean(endDateText)) {
      return NextResponse.json(
        { success: false, error: "Choose both a start date and an end date." },
        { status: 400 },
      );
    }

    const downloadQuery: {
      date?: { $gte: Date; $lt: Date };
      platform?: string;
    } = {};

    if (startDateText && endDateText) {
      const startDate = new Date(`${startDateText}T00:00:00.000Z`);
      const endDate = new Date(`${endDateText}T00:00:00.000Z`);

      // Check the dates before using them in the database query.
      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        startDate.toISOString().slice(0, 10) !== startDateText ||
        endDate.toISOString().slice(0, 10) !== endDateText
      ) {
        return NextResponse.json(
          { success: false, error: "Enter valid dates." },
          { status: 400 },
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { success: false, error: "The start date must be before the end date." },
          { status: 400 },
        );
      }

      // Add one day so the selected end date is included in the results.
      const endDateExclusive = new Date(endDate);
      endDateExclusive.setUTCDate(endDateExclusive.getUTCDate() + 1);
      downloadQuery.date = { $gte: startDate, $lt: endDateExclusive };
    }

    // Add the platform when one is selected.
    if (platform) {
      downloadQuery.platform = platform;
    }

    await connectDB();

    // Load the total count and the newest matching downloads.
    const [totalDownloads, downloads] = await Promise.all([
      Download.countDocuments(downloadQuery),
      Download.find(downloadQuery).sort({ date: -1 }).limit(500).lean(),
    ]);

    return NextResponse.json({
      success: true,
      totalDownloads,
      downloads: downloads.map((download) => ({
        id: download._id.toString(),
        title: download.title,
        platform: download.platform ?? "",
        duration: download.duration ?? 0,
        format: download.format,
        quality: download.quality,
        status: download.status,
        date: download.date.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Dashboard download filter error:", error);
    return NextResponse.json(
      { success: false, error: "Could not filter downloads." },
      { status: 500 },
    );
  }
}