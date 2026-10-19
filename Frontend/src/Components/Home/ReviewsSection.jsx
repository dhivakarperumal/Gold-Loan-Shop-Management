import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { FaStar, FaQuoteLeft } from "react-icons/fa";
import api from "../../api";
import PageContainer from "../CommenComponents/PageContainer";

import "swiper/css";

const resolveReviewImage = (image) => {
  if (!image || /^(https?:|data:|blob:)/i.test(image)) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <FaStar
        key={s}
        size={13}
        className={s <= rating ? "text-yellow-400" : "text-gray-200"}
      />
    ))}
  </div>
);

/** Returns initials for the avatar fallback */
const initials = (name = "") =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const ReviewCard = ({ review }) => (
  <div className="flex h-full w-full flex-col rounded-2xl bg-white p-5 shadow-sm"
    style={{ border: "1px solid rgba(212,160,23,0.18)" }}>

    {/* ── Top: Reviewer info + stars ── */}
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #004D40, #0F766E)" }}
      >
        {initials(review.user_name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-gray-800">{review.user_name}</p>
        {review.product_name && (
          <p className="truncate text-[11px] text-gray-400">{review.product_name}</p>
        )}
      </div>
    </div>

    {/* Stars */}
    <div className="mt-2">
      <StarRow rating={review.rating} />
    </div>

    {/* Gold divider */}
    <div
      className="my-3 h-px w-full shrink-0"
      style={{ background: "linear-gradient(90deg, transparent, #D4A017 40%, #D4A017 60%, transparent)" }}
    />

    {/* ── Middle: Quote + Comment ── */}
    <FaQuoteLeft size={16} className="mb-2 shrink-0" style={{ color: "#D4A017", opacity: 0.6 }} />
    <p className="flex-1 text-sm leading-relaxed text-gray-600 line-clamp-4 italic">
      {review.comment}
    </p>

    {/* ── Bottom: thumbnail + admin reply ── */}
    {(review.review_image || review.admin_reply) && (
      <div className="mt-4 space-y-2">
        {review.review_image && (
          <div className="flex items-center gap-3">
            <div
              className="overflow-hidden rounded-lg shrink-0"
              style={{ width: "56px", height: "56px", background: "#f9f5ee" }}
            >
              <img
                src={resolveReviewImage(review.review_image)}
                alt="Review"
                className="h-full w-full object-contain"
              />
            </div>
            <p className="text-[11px] text-gray-400 italic line-clamp-2">
              {review.product_name || "Product"}
            </p>
          </div>
        )}

        {review.admin_reply && (
          <div
            className="rounded-xl p-3 text-xs leading-snug text-gray-600 italic"
            style={{ background: "rgba(0,77,64,0.06)", borderLeft: "3px solid #004D40" }}
          >
            <span className="font-bold not-italic" style={{ color: "#004D40" }}>Sri Golds: </span>
            {review.admin_reply}
          </div>
        )}
      </div>
    )}
  </div>
);

const ReviewsSection = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get("/reviews/public", { params: { limit: 20 }, signal: controller.signal })
      .then(({ data }) => {
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch reviews:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  // Don't render the section at all if no reviews (and not loading)
  if (!loading && (error || reviews.length === 0)) return null;

  return (
    <section className="w-full py-10" style={{ background: "#fffdf8" }}>
      <PageContainer>
        {/* Section header */}
        <div className="mb-7 flex flex-col items-start text-left">
          <span className="mb-1 text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">
            Trusted by Customers
          </span>
          <h2 className="font-serif text-2xl font-bold tracking-wide text-[#201a13] sm:text-3xl">
            What Our Customers Say
          </h2>
          {/* Gold ornament divider */}
          <div className="mt-2 flex items-center justify-start gap-3" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#d9a441]" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#d9a441]" />
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#d9a441]" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div
              className="h-9 w-9 animate-spin rounded-full border-[3px]"
              style={{ borderColor: "#004D40", borderTopColor: "transparent" }}
            />
          </div>
        ) : (
          <Swiper
            modules={[Autoplay]}
            loop={reviews.length > 4}
            autoplay={
              reviews.length > 4
                ? { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true }
                : false
            }
            speed={700}
            slidesPerView={1}
            spaceBetween={16}
            breakpoints={{
              640:  { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
              1280: { slidesPerView: 4 },
            }}
            grabCursor
            centeredSlides={reviews.length === 1}
            className="!pb-2"
            style={{ alignItems: "stretch" }}
          >
            {reviews.map((review) => (
              <SwiperSlide key={review.id} style={{ height: "auto", display: "flex" }}>
                <ReviewCard review={review} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </PageContainer>
    </section>
  );
};

export default ReviewsSection;
