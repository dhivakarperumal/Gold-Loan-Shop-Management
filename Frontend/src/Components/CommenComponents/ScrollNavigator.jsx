// src/components/ScrollNavigator.jsx
import React, { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowUp, Phone } from "lucide-react";

const ScrollNavigator = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 300);
    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollTopVisibility);
  }, []);

  return (
    <>
      <div className="fixed right-4 bottom-5 z-30 flex flex-col items-center gap-3">
        <a
          href="tel:+919659133504"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#008577] text-white shadow-md transition hover:scale-105 hover:bg-[#006b60]"
          aria-label="Call us"
          title="Call us"
        >
          <Phone size={22} aria-hidden="true" />
        </a>
        <a
          href="https://wa.me/919659133504"
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md transition hover:scale-105 hover:bg-[#1fb956]"
          aria-label="Chat with us on WhatsApp"
          title="WhatsApp"
        >
          <FaWhatsapp size={25} aria-hidden="true" />
        </a>
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition hover:scale-105 hover:bg-slate-700"
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            <ArrowUp size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
};

export default ScrollNavigator;