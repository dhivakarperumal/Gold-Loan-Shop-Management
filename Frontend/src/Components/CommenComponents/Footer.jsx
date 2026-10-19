
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaPinterestP,
} from "react-icons/fa";
import {
  ArrowRight,
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
  Gem,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import PageContainer from "./PageContainer";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();

    if (!email.trim()) return;

    // Connect your newsletter API here to save subscriptions.
    setSubscribed(true);
    setEmail("");
  };

  const linkClass =
    "group flex items-center justify-between gap-3 text-sm text-white/65 transition-all duration-300 hover:translate-x-1 hover:text-[#e8c77b]";

  const socialClass =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-all duration-300 hover:border-[#d7b56d] hover:bg-[#d7b56d] hover:text-[#063c32] hover:-translate-y-1";

  return (
    <footer className="relative mt-24 overflow-hidden bg-[#063c32] text-white">

      {/* Decorative background */}
      <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full border border-[#d7b56d]/10" />
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-[#d7b56d]/10" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full border border-[#d7b56d]/10" />

      <PageContainer>

        {/* Top promotional strip */}
        <div className="grid grid-cols-1 gap-5 border-b border-white/10 py-8 sm:grid-cols-3 sm:gap-8">

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d7b56d]/35 bg-[#d7b56d]/10 text-[#e8c77b]">
              <ShieldCheck size={23} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Quality Craftsmanship
              </h3>
              <p className="mt-1 text-xs text-white/55">
                Jewellery made with care
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d7b56d]/35 bg-[#d7b56d]/10 text-[#e8c77b]">
              <Truck size={23} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Reliable Delivery
              </h3>
              <p className="mt-1 text-xs text-white/55">
                Carefully packed orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d7b56d]/35 bg-[#d7b56d]/10 text-[#e8c77b]">
              <RotateCcw size={23} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Customer Support
              </h3>
              <p className="mt-1 text-xs text-white/55">
                Here to help you
              </p>
            </div>
          </div>

        </div>

        {/* Main footer */}
        <div className="grid grid-cols-1 gap-12 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-16">

          {/* Brand */}
          <div className="lg:col-span-4">

            <Link to="/" className="group mb-6 inline-flex items-center gap-4">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d7b56d]/50 bg-[#fffaf0] p-2">
                <img
                  src="/images/logo.png"
                  alt="Sri Golds logo"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <p className="font-serif text-3xl tracking-wide text-[#f0d69a]">
                  Sri Golds
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/60">
                  Jewellery & Fine Designs
                </p>
              </div>
            </Link>

            <p className="max-w-sm text-sm leading-7 text-white/65">
              Celebrate life's precious moments with timeless gold,
              diamond and silver jewellery, thoughtfully selected for
              every occasion and every generation.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className={socialClass}
              >
                <FaFacebookF size={16} />
              </a>

              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className={socialClass}
              >
                <FaInstagram size={17} />
              </a>

              <a
                href="https://www.pinterest.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
                className={socialClass}
              >
                <FaPinterestP size={16} />
              </a>

              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className={socialClass}
              >
                <FaWhatsapp size={18} />
              </a>
            </div>

            <p className="mt-6 text-xs text-white/40">
              Timeless beauty. Meaningful memories.
            </p>
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <h3 className="mb-6 font-serif text-xl text-[#f0d69a]">
              Explore
            </h3>

            <ul className="space-y-4">
              <li>
                <Link to="/" className={linkClass}>
                  <span>Home</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/about" className={linkClass}>
                  <span>Our Story</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/shop" className={linkClass}>
                  <span>Shop All</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/contactus" className={linkClass}>
                  <span>Contact Us</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Collections */}
          <div className="lg:col-span-2">
            <h3 className="mb-6 font-serif text-xl text-[#f0d69a]">
              Collections
            </h3>

            <ul className="space-y-4">
              <li>
                <Link to="/shop" className={linkClass}>
                  <span>Gold Jewellery</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/shop" className={linkClass}>
                  <span>Diamond Jewellery</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/shop" className={linkClass}>
                  <span>Silver Jewellery</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
              <li>
                <Link to="/shop" className={linkClass}>
                  <span>New Arrivals</span>
                  <ChevronRight size={14} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="mb-6 font-serif text-xl text-[#f0d69a]">
              Get in Touch
            </h3>

            <p className="mb-6 text-sm leading-6 text-white/60">
              Have a question about a design or your order? We'd love
              to hear from you.
            </p>

            <div className="space-y-4">
              <a
                href="tel:+919876543210"
                className="group flex items-start gap-3 text-sm text-white/70 transition hover:text-[#e8c77b]"
              >
                <Phone
                  size={18}
                  className="mt-0.5 shrink-0 text-[#d7b56d]"
                />
                <span>+91 98765 43210</span>
                <ArrowUpRight
                  size={14}
                  className="ml-auto opacity-0 transition group-hover:opacity-100"
                />
              </a>

              <a
                href="mailto:support@mystore.com"
                className="group flex items-start gap-3 text-sm text-white/70 transition hover:text-[#e8c77b]"
              >
                <Mail
                  size={18}
                  className="mt-0.5 shrink-0 text-[#d7b56d]"
                />
                <span className="break-all">support@mystore.com</span>
                <ArrowUpRight
                  size={14}
                  className="ml-auto shrink-0 opacity-0 transition group-hover:opacity-100"
                />
              </a>

              <div className="flex items-start gap-3 text-sm text-white/70">
                <MapPin
                  size={18}
                  className="mt-0.5 shrink-0 text-[#d7b56d]"
                />
                <span>Chennai, Tamil Nadu, India</span>
              </div>
            </div>
          </div>

        </div>

        {/* Newsletter panel */}
        <div className="relative mb-10 overflow-hidden rounded-2xl border border-[#d7b56d]/30 bg-[#0b493d]">

          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-[#d7b56d]/15" />
          <div className="pointer-events-none absolute -right-2 -top-12 h-36 w-36 rounded-full border border-[#d7b56d]/15" />

          <div className="relative grid grid-cols-1 items-center gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:p-10">

            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#e8c77b]">
                <Gem size={16} />
                The Sri Golds Edit
              </div>

              <h3 className="font-serif text-2xl leading-tight text-white sm:text-3xl">
                A little sparkle in your inbox.
              </h3>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/60">
                Discover new collections, jewellery inspiration and
                exclusive offers. Stay close to what you love.
              </p>
            </div>

            <div>
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <label
                  htmlFor="footer-subscription-email"
                  className="sr-only"
                >
                  Email address
                </label>

                <input
                  id="footer-subscription-email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSubscribed(false);
                  }}
                  placeholder="Enter your email address"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-[#d7b56d] focus:bg-white/10"
                />

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e4c47d] px-6 py-3.5 text-sm font-bold text-[#063c32] transition hover:bg-[#f1d99d]"
                >
                  Subscribe
                  <ArrowRight size={16} />
                </button>
              </form>

              {subscribed && (
                <p
                  role="status"
                  className="mt-3 text-sm text-[#f0d69a]"
                >
                  Thank you! Your subscription has been received.
                </p>
              )}

              <p className="mt-3 text-xs text-white/40">
                By subscribing, you agree to receive updates from Sri Golds.
              </p>
            </div>

          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-white/10 py-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">

          <p className="text-xs text-white/50">
            © {new Date().getFullYear()} Sri Golds. All rights reserved.
          </p>

          <p className="flex items-center justify-center gap-2 text-xs text-white/50 sm:justify-end">
            Crafted with
            <span className="text-[#e8c77b]">♥</span>
            for life's precious moments
          </p>

          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#e8c77b] transition hover:text-white"
          >
            Discover the collection
            <ArrowRight size={14} />
          </Link>

        </div>

      </PageContainer>
    </footer>
  );
};

export default Footer;
