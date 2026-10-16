"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CloudDownload, LoaderCircle, Star, Trash2, X } from "lucide-react";
import { toast } from "react-toastify";

type Review = {
  id: string;
  rating: number;
  comment: string;
};

type ReviewResponse = {
  success?: boolean;
  authenticated?: boolean;
  myReview?: Review | null;
  review?: Review;
  error?: string;
};

type ReviewModalProps = {
  onClose: () => void;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export default function ReviewModal({ onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [ratingError, setRatingError] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error" | "info";
    message: string;
  } | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadOwnReview() {
      try {
        const response = await fetch("/api/review?limit=1", {
          cache: "no-store",
          credentials: "include",
        });
        const result = (await response.json()) as ReviewResponse;

        if (!response.ok || !result.success || typeof result.authenticated !== "boolean") {
          throw new Error(result.error || "Could not check your review.");
        }
        if (!isCurrent) return;

        if (!result.authenticated) {
          setAuthStatus("unauthenticated");
          setFeedback({
            kind: "info",
            message: "Please sign in to submit or update a review.",
          });
          return;
        }

        setAuthStatus("authenticated");
        const ownReview = result.myReview ?? null;
        setExistingReview(ownReview);
        if (ownReview) {
          setRating(ownReview.rating);
          setReview(ownReview.comment);
        }
      } catch (error) {
        if (!isCurrent) return;
        setAuthStatus("error");
        setFeedback({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load your review.",
        });
      }
    }

    void loadOwnReview();
    return () => {
      isCurrent = false;
    };
  }, []);

  function handleRequestLogin() {
    window.dispatchEvent(new Event("media-converter:request-login"));
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (authStatus !== "authenticated") {
      if (authStatus === "unauthenticated") {
        handleRequestLogin();
      } else {
        setFeedback({
          kind: "info",
          message: "Please sign in to submit or update a review.",
        });
      }
      return;
    }

    const hasRating = rating > 0;
    const hasReview = review.trim().length > 0;
    setRatingError(!hasRating);
    setReviewError(!hasReview);
    setFeedback(null);

    if (!hasRating || !hasReview) return;

    setIsSubmitting(true);
    let isUnauthorized = false;
    try {
      const response = await fetch(
        existingReview
          ? `/api/review/${encodeURIComponent(existingReview.id)}`
          : "/api/review",
        {
          method: existingReview ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, comment: review.trim() }),
        },
      );
      const result = (await response.json()) as ReviewResponse;

      if (!response.ok || !result.success || !result.review) {
        if (response.status === 401) {
          isUnauthorized = true;
          setAuthStatus("unauthenticated");
        }
        if (response.status === 409 && result.review) {
          setExistingReview(result.review);
          setRating(result.review.rating);
          setReview(result.review.comment);
        }
        throw new Error(
          result.error ||
            (response.status === 401
              ? "Your session expired. Please sign in again."
              : "Could not save your review."),
        );
      }

      setExistingReview(result.review);
      setRating(result.review.rating);
      setReview(result.review.comment);
      toast.success(existingReview ? "Your review was updated." : "Your review was submitted.");
      onClose();
    } catch (error) {
      setFeedback({
        kind: isUnauthorized ? "info" : "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not save your review. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!existingReview || isSubmitting || isDeleting) return;
    if (!window.confirm("Are you sure you want to delete your review?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/review/${encodeURIComponent(existingReview.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      const result = (await response.json()) as ReviewResponse;
      if (!response.ok || !result.success) {
        if (response.status === 401) setAuthStatus("unauthenticated");
        throw new Error(result.error || "Could not delete your review.");
      }

      toast.success("Your review was deleted.");
      onClose();
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete your review. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const formDisabled =
    authStatus !== "authenticated" || isSubmitting || isDeleting;
  const feedbackClass =
    feedback?.kind === "success"
      ? "border-[#BDE8D2] bg-[#F0FBF5] text-[#176B45]"
      : feedback?.kind === "info"
        ? "border-[#DDE3F2] bg-[#F4F7FF] text-[#343B55]"
        : "border-[#F5CBD3] bg-[#FFF1F2] text-[#A52E49]";

  return (
    <div
      className="fixed inset-0 z-100 grid min-h-screen place-items-center overflow-y-auto bg-[#17233B]/45 px-4 py-6 backdrop-blur-md sm:px-6"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="relative w-full max-w-110 overflow-hidden rounded-2xl border border-[#E5E9F4] bg-white shadow-[0_28px_80px_rgba(19,30,63,0.25)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close review dialog"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-lg text-[#737991] transition-colors hover:bg-[#F4F7FF] hover:text-[#2C4DE2]"
        >
          <X size={19} aria-hidden="true" />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(145deg,#4B7BFF,#2C4DE2)] text-white">
              <CloudDownload size={22} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#20253D]">Media Converter</p>
              <p className="mt-0.5 text-xs font-medium text-[#737991]">
                Share your feedback
              </p>
            </div>
          </div>

          <h2 id="review-modal-title" className="text-2xl font-semibold text-[#20253D]">
            Enjoying our Media Converter?
          </h2>
          <p className="mt-1 text-sm text-[#737991]">
            Let us know what you think. Your feedback helps us improve.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={handleSubmit}
            aria-busy={isSubmitting || authStatus === "loading"}
            noValidate
          >
            <fieldset disabled={formDisabled}>
              <legend className="text-sm font-medium text-[#343B55]">
                Your rating
              </legend>
              <div className="mt-2 flex gap-1" aria-label="Rating from 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
                    aria-pressed={rating === star}
                    onClick={() => {
                      setRating(star);
                      setRatingError(false);
                    }}
                    className="rounded-md p-1 text-[#A1A8B9] transition-colors hover:bg-[#FFF8E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B6BFF] disabled:cursor-not-allowed"
                  >
                    <Star
                      size={28}
                      fill={star <= rating ? "#FF9800" : "transparent"}
                      stroke={star <= rating ? "#FF9800" : "currentColor"}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              {ratingError && (
                <p className="mt-1 text-sm text-[#A52E49]" role="alert">
                  Please select a star rating.
                </p>
              )}
            </fieldset>

            <label className="block space-y-1.5 text-sm font-medium text-[#343B55]">
              <span>Your review</span>
              <textarea
                disabled={formDisabled}
                value={review}
                onChange={(event) => {
                  setReview(event.target.value);
                  if (event.target.value.trim()) setReviewError(false);
                }}
                rows={4}
                maxLength={1000}
                placeholder="Write a few words about your experience..."
                aria-invalid={reviewError}
                className="w-full resize-y rounded-lg border border-[#DDE3F2] bg-white px-3.5 py-3 text-sm text-[#20253D] outline-none transition-colors placeholder:text-[#A1A8B9] focus:border-[#6C82F5] focus:ring-4 focus:ring-[#3B6BFF]/10 disabled:bg-[#F8F9FF]"
              />
              {reviewError && (
                <span className="block text-sm font-normal text-[#A52E49]" role="alert">
                  Please enter a review comment.
                </span>
              )}
            </label>

            {authStatus === "loading" && (
              <p className="flex items-center gap-2 text-sm text-[#737991]" role="status">
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                Checking your account and review...
              </p>
            )}

            {authStatus === "unauthenticated" && (
              <button
                type="button"
                onClick={handleRequestLogin}
                className="text-sm font-semibold text-[#2C4DE2] hover:underline"
              >
                Log in or sign up to leave a review
              </button>
            )}

            {feedback && (
              <p
                className={`rounded-lg border px-3.5 py-2.5 text-sm ${feedbackClass}`}
                role={feedback.kind === "error" ? "alert" : "status"}
              >
                {feedback.message}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 items-center justify-center rounded-lg border border-[#DDE3F2] bg-white px-3 text-sm font-semibold text-[#343B55] transition-colors hover:bg-[#F8F9FF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  authStatus === "loading" ||
                  authStatus === "error"
                }
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#3B6BFF] px-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(59,107,255,0.2)] transition-colors hover:bg-[#2C4DE2] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    {existingReview ? "Updating..." : "Submitting..."}
                    <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                  </>
                ) : existingReview ? (
                  "Update"
                ) : (
                  "Submit"
                )}
              </button>
              {existingReview && (
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={formDisabled}
                  className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#BE3455] bg-[#BE3455] px-3 text-sm font-semibold text-white transition-colors hover:border-[#A52E49] hover:bg-[#A52E49] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      Deleting...
                      <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} aria-hidden="true" />
                      Delete
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
