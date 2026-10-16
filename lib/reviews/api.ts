import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/middleware/require-user";

export type ReviewInput = {
  rating: number;
  comment: string;
};

export type ReviewRecord = {
  _id: { toString: () => string };
  rating: number;
  comment: string;
  createdAt: Date;
  userName?: string;
  user: { name?: string } | null;
};

export function getAuthenticatedUserId(request: NextRequest) {
  const session = requireUser(request);
  if (session.authenticated) return { userId: session.userId };

  if (session.response.status === 401) {
    return {
      response: NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  return { response: session.response };
}

export async function readJsonBody(request: NextRequest): Promise<
  | { body: unknown }
  | { response: NextResponse }
> {
  try {
    return { body: await request.json() };
  } catch {
    return {
      response: NextResponse.json(
        { success: false, error: "Request body must be valid JSON." },
        { status: 400 },
      ),
    };
  }
}

export function parseReviewInput(
  body: unknown,
  partial = false,
): { data: Partial<ReviewInput> } | { error: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }

  const input = body as Record<string, unknown>;
  const keys = Object.keys(input);
  if (
    keys.some((key) => key !== "rating" && key !== "comment") ||
    (!partial && (!("rating" in input) || !("comment" in input))) ||
    (partial && keys.length === 0)
  ) {
    return { error: "Provide only rating and comment fields." };
  }

  const data: Partial<ReviewInput> = {};
  if ("rating" in input) {
    if (
      typeof input.rating !== "number" ||
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    ) {
      return { error: "Rating must be an integer between 1 and 5." };
    }
    data.rating = input.rating;
  }

  if ("comment" in input) {
    if (typeof input.comment !== "string") {
      return { error: "Comment must be a string." };
    }
    const comment = input.comment.trim();
    if (!comment) return { error: "Comment cannot be empty." };
    if (comment.length > 1000) {
      return { error: "Comment cannot exceed 1000 characters." };
    }
    data.comment = comment;
  }

  return { data };
}

export function formatReview(review: ReviewRecord) {
  return {
    id: review._id.toString(),
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    author: review.userName
      ? { name: review.userName }
      : review.user
        ? { name: review.user.name ?? "" }
        : null,
  };
}
