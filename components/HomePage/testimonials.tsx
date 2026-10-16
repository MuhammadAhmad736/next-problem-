"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, MessageSquarePlus, Star } from "lucide-react";
import ReviewModal from "./ReviewModal";

type Review = {
  id: string;
  rating: number;
  comment: string;
  author: { name: string } | null;
};

type ReviewsResponse = {
  success?: boolean;
  reviews?: Review[];
  error?: string;
};

const avatarColors = [
  "bg-[#0B5BE7]",
  "bg-[#087F5B]",
  "bg-[#7C3AED]",
  "bg-[#C2410C]",
];

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return initials || "U";
}

function getAvatarColor(name: string) {
  const hash = Array.from(name).reduce(
    (value, character) => value + character.charCodeAt(0),
    0,
  );

  return avatarColors[hash % avatarColors.length];
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewStartIndex, setReviewStartIndex] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadReviews() {
      try {
        const response = await fetch("/api/review?limit=50", {
          cache: "no-store",
        });
        const result = (await response.json()) as ReviewsResponse;

        if (!response.ok || !result.success || !Array.isArray(result.reviews)) {
          throw new Error(result.error || "Could not load reviews.");
        }

        if (isCurrent) setReviews(result.reviews);
      } catch (loadError) {
        if (!isCurrent) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load reviews.",
        );
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadReviews();
    return () => {
      isCurrent = false;
    };
  }, []);

  const visibleReviews = Array.from(
    { length: Math.min(3, reviews.length) },
    (_, index) => reviews[(reviewStartIndex + index) % reviews.length],
  );

  function showPreviousReviews() {
    setReviewStartIndex((index) => (index - 1 + reviews.length) % reviews.length);
  }

  function showNextReviews() {
    setReviewStartIndex((index) => (index + 1) % reviews.length);
  }

  return (
    <section id="testimonials" data-nav-section="Testimonials" className="w-full bg-background px-4 py-14 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#3B6BFF]">
            COMMUNITY REVIEWS
          </p>

          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl md:text-4xl">
            What Our Users Say
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#5B6472] md:text-base">
            Loved by content creators, students, social managers, and everyday
            video savers worldwide.
          </p>

          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3B6BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(59,107,255,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#2C4DE2] hover:shadow-[0_12px_24px_rgba(59,107,255,0.28)]"
          >
            <MessageSquarePlus size={17} aria-hidden="true" />
            Submit your feedback
          </button>
        </div>

        <div className="relative">
          <div className="stagger-children grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p
                className="col-span-full py-8 text-center text-sm text-[#5B6472]"
                role="status"
                aria-live="polite"
              >
                Loading reviews...
              </p>
            ) : error ? (
              <p
                className="col-span-full py-8 text-center text-sm text-[#A52E49]"
                role="alert"
              >
                {error}
              </p>
            ) : reviews.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-[#5B6472]">
                No reviews yet.
              </p>
            ) : (
              visibleReviews.map((review) => {
                const name = review.author?.name.trim() || "Media Converter user";

                return (
                  <div
                    key={review.id}
                    className="group flex min-h-[230px] flex-col rounded-xl border border-[#E2E8FF] bg-white p-4 shadow-[0_12px_30px_rgba(65,116,255,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-[#C9D6FF] hover:shadow-[0_20px_40px_rgba(65,116,255,0.18)] sm:min-h-[260px] sm:rounded-2xl sm:p-6"
                  >
                    <div
                      className="mb-2 flex gap-1"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          strokeWidth={star <= review.rating ? 0 : 1.5}
                          fill={star <= review.rating ? "#FF9800" : "transparent"}
                          className={
                            star <= review.rating
                              ? "text-[#FF9800]"
                              : "text-[#A1A8B9]"
                          }
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    <p className="flex-1 py-2 text-xs italic leading-5 text-[#0F172A] sm:text-sm sm:leading-6">
                      &quot;{review.comment}&quot;
                    </p>

                    <div className="my-3 h-px bg-[#E8EFFF]" />

                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(name)}`}
                      >
                        {getInitials(name)}
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-[#0F172A]">
                          {name}
                        </h3>
                        <p className="text-xs text-[#5B6472]">
                          Media Converter user
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!isLoading && !error && reviews.length > 3 && (
            <>
            <button
              type="button"
              aria-label="Show previous reviews"
              onClick={showPreviousReviews}
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDE3F2] bg-white text-[#2C4DE2] shadow-[0_6px_16px_rgba(65,116,255,0.12)] transition-[border-color,box-shadow] hover:border-[#B9C9FF] hover:shadow-[0_10px_22px_rgba(65,116,255,0.2)]"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Show next reviews"
              onClick={showNextReviews}
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDE3F2] bg-white text-[#2C4DE2] shadow-[0_6px_16px_rgba(65,116,255,0.12)] transition-[border-color,box-shadow] hover:border-[#B9C9FF] hover:shadow-[0_10px_22px_rgba(65,116,255,0.2)]"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            </>
          )}
        </div>
      </div>
      {isReviewModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <ReviewModal onClose={() => setIsReviewModalOpen(false)} />,
          document.body,
        )}
    </section>
  );
}
