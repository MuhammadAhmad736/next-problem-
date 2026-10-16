import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongodb";
import {
  formatReview,
  getAuthenticatedUserId,
  parseReviewInput,
  readJsonBody,
} from "@/lib/reviews/api";
import Review from "@/models/review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewRouteContext = {
  params: Promise<{ id: string }>;
};

async function getOwnedReview(id: string, userId: string) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return {
      response: NextResponse.json(
        { success: false, error: "Invalid review ID." },
        { status: 400 },
      ),
    };
  }

  const review = await Review.findById(id);
  if (!review || review.user.toString() !== userId) {
    return {
      response: NextResponse.json(
        { success: false, error: "Review not found." },
        { status: 404 },
      ),
    };
  }

  return { review };
}

export async function PUT(request: NextRequest, context: ReviewRouteContext) {
  return updateReview(request, context, false);
}

export async function PATCH(request: NextRequest, context: ReviewRouteContext) {
  return updateReview(request, context, true);
}

async function updateReview(
  request: NextRequest,
  context: ReviewRouteContext,
  partial: boolean,
) {
  const session = getAuthenticatedUserId(request);
  if ("response" in session) return session.response;

  const { id } = await context.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid review ID." },
      { status: 400 },
    );
  }

  const parsedBody = await readJsonBody(request);
  if ("response" in parsedBody) return parsedBody.response;

  const parsedInput = parseReviewInput(parsedBody.body, partial);
  if ("error" in parsedInput) {
    return NextResponse.json(
      { success: false, error: parsedInput.error },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const result = await getOwnedReview(id, session.userId);
    if ("response" in result) return result.response;

    result.review.set(parsedInput.data);
    await result.review.save();
    await result.review.populate("user", "name");

    return NextResponse.json({
      success: true,
      review: formatReview(result.review),
    });
  } catch (error) {
    console.error("Review update error:", error);
    return NextResponse.json(
      { success: false, error: "Could not update review." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: ReviewRouteContext) {
  const session = getAuthenticatedUserId(request);
  if ("response" in session) return session.response;

  const { id } = await context.params;
  if (!mongoose.isObjectIdOrHexString(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid review ID." },
      { status: 400 },
    );
  }

  try {
    await connectDB();
    const result = await getOwnedReview(id, session.userId);
    if ("response" in result) return result.response;

    await result.review.deleteOne();
    return NextResponse.json({ success: true, message: "Review deleted." });
  } catch (error) {
    console.error("Review deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Could not delete review." },
      { status: 500 },
    );
  }
}
