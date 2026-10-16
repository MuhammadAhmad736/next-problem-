import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import { requireUser } from "@/lib/middleware/require-user";
import {
  formatReview,
  getAuthenticatedUserId,
  parseReviewInput,
  readJsonBody,
  type ReviewRecord,
} from "@/lib/reviews/api";
import Review from "@/models/review";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

function parsePositiveInteger(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^[1-9]\d*$/.test(value)) return null;

  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export async function GET(request: NextRequest) {
  const page = parsePositiveInteger(
    request.nextUrl.searchParams.get("page"),
    1,
  );
  const limit = parsePositiveInteger(
    request.nextUrl.searchParams.get("limit"),
    DEFAULT_PAGE_SIZE,
  );

  if (page === null || limit === null || limit > MAX_PAGE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: `Page must be positive and limit must be between 1 and ${MAX_PAGE_SIZE}.`,
      },
      { status: 400 },
    );
  }

  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) {
    return NextResponse.json(
      { success: false, error: "Page is too large." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const session = requireUser(request);
    const [reviews, total, ownReview] = await Promise.all([
      Review.find()
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name")
        .lean<ReviewRecord[]>(),
      Review.countDocuments(),
      session.authenticated
        ? Review.findOne({ user: session.userId })
            .sort({ createdAt: -1, _id: -1 })
            .populate("user", "name")
            .lean<ReviewRecord | null>()
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      success: true,
      authenticated: session.authenticated,
      reviews: reviews.map(formatReview),
      myReview: ownReview ? formatReview(ownReview) : null,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Review list error:", error);
    return NextResponse.json(
      { success: false, error: "Could not retrieve reviews." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = getAuthenticatedUserId(request);
  if ("response" in session) return session.response;

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedInput = parseReviewInput(parsedBody.body);
  if ("error" in parsedInput) {
    return NextResponse.json(
      { success: false, error: parsedInput.error },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const user = await User.findById(session.userId).select("name").lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authenticated user was not found." },
        { status: 401 },
      );
    }

    const existingReview = await Review.findOne({ user: session.userId })
      .sort({ createdAt: -1, _id: -1 })
      .populate("user", "name");
    if (existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already submitted a review.",
          review: formatReview(existingReview),
        },
        { status: 409 },
      );
    }

    const review = await Review.create({
      user: session.userId,
      userName: user.name,
      rating: parsedInput.data.rating,
      comment: parsedInput.data.comment,
    });
    await review.populate("user", "name");

    return NextResponse.json(
      { success: true, review: formatReview(review) },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      try {
        const existingReview = await Review.findOne({ user: session.userId })
          .sort({ createdAt: -1, _id: -1 })
          .populate("user", "name");
        return NextResponse.json(
          {
            success: false,
            error: "You have already submitted a review.",
            ...(existingReview ? { review: formatReview(existingReview) } : {}),
          },
          { status: 409 },
        );
      } catch (lookupError) {
        console.error("Existing review lookup after duplicate error:", lookupError);
        return NextResponse.json(
          { success: false, error: "You have already submitted a review." },
          { status: 409 },
        );
      }
    }
    console.error("Review creation error:", error);
    return NextResponse.json(
      { success: false, error: "Could not create review." },
      { status: 500 },
    );
  }
}