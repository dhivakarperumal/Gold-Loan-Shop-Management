
import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaPinterestP,
  FaYoutube,
} from "react-icons/fa";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Gem,
  Sparkles,
  ShieldCheck,
  Truck,
  Headset,
  ChevronRight,
} from "lucide-react";
import PageContainer from "./PageContainer";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!email.trim()) return;

    // Connect your newsletter API here.
    setSubscribed(true);
    setEmail("");
  };

  const links = [
    { label: "Home", to: "/" },
    { label: "About Us", to: "/about" },
    { label: "Explore", to: "/explore" },
    { label: "Metal Rates", to: "/metal" },
    { label: "Contact Us", to: "/contactus" },
  ];

  const collections = [
    { label: "Gold Jewellery", to: "/explore?category=Gold%20Jewellery" },
    { label: "Diamond Jewellery", to: "/explore?category=Diamond%20Jewellery" },
    { label: "Silver Articles", to: "/explore?category=Silver%20Articles" },
    { label: "Bridal Collection", to: "/explore?search=Bridal%20Collection" },
    { label: "Earrings & Pendants", to: "/explore?search=Earrings%20%26%20Pendants" },
    { label: "New Arrivals", to: "/explore" },
  ];

  const socialLinks = [
    {
      label: "Facebook",
      href: "https://www.facebook.com/",
      icon: <FaFacebookF />,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/",
      icon: <FaInstagram />,
    },
    {
      label: "WhatsApp",
      href: "https://wa.me/919876543210",
      icon: <FaWhatsapp />,
    },
    {
      label: "Pinterest",
      href: "https://www.pinterest.com/",
      icon: <FaPinterestP />,
    },
    {
      label: "YouTube",
      href: "https://www.youtube.com/",
      icon: <FaYoutube />,
    },
  ];

  const columnHeading =
    "font-serif text-xl font-semibold text-[#f5d994]";

  const goldDivider =
    "relative mb-6 mt-4 h-px w-full bg-gradient-to-r from-[#b88a37]/20 via-[#e5c477] to-[#b88a37]/20";

  const footerLink =
    "group flex items-center gap-2.5 text-[14px] text-white/75 transition-all duration-300 hover:translate-x-1 hover:text-[#f5d994]";

  return (
    <footer className="relative mt-24 overflow-hidden bg-[#003b30] text-white">

      {/* Luxury background decoration */}
      <div className="pointer-events-none absolute -left-28 top-20 h-72 w-72 rounded-full border border-[#d9b568]/10" />
      <div className="pointer-events-none absolute -right-28 bottom-12 h-80 w-80 rounded-full border border-[#d9b568]/10" />

      <div className="pointer-events-none absolute left-0 top-0 h-full w-24 opacity-[0.08]">
        <div className="h-full border-r border-[#e5c477]" />
      </div>

      <PageContainer>

        {/* Trust strip */}
        <div className="grid grid-cols-1 border-b border-[#d9b568]/50 sm:grid-cols-2 lg:grid-cols-4">

          {[
            {
              icon: <Sparkles size={25} strokeWidth={1.5} />,
              title: "TIMELESS DESIGNS",
              subtitle: "Traditional styles for every occasion",
            },
            {
              icon: <ShieldCheck size={25} strokeWidth={1.5} />,
              title: "CERTIFIED JEWELLERY",
              subtitle: "Quality you can trust",
            },
            {
              icon: <Gem size={25} strokeWidth={1.5} />,
              title: "PREMIUM COLLECTIONS",
              subtitle: "Gold · Diamond · Silver",
            },
            {
              icon: <Headset size={25} strokeWidth={1.5} />,
              title: "CUSTOMER SUPPORT",
              subtitle: "Here whenever you need us",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`flex items-center justify-center gap-4 px-3 py-6 ${
                index !== 3
                  ? "lg:border-r lg:border-[#d9b568]/40"
                  : ""
              }`}
            >
              <span className="shrink-0 text-[#e6c16e]">
                {item.icon}
              </span>

              <div>
                <h3 className="text-[11px] font-bold tracking-[0.12em] text-[#f5d994] sm:text-xs">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-white/65">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}

        </div>

        {/* Main footer columns */}
        <div className="grid grid-cols-1 gap-x-9 gap-y-12 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-8 lg:py-16">

          {/* Brand */}
          <div className="lg:col-span-3">

            <Link to="/" className="inline-flex items-center">
              <img
                src="/images/logo.png"
                alt="Sri Golds"
                className="h-24 w-60 object-contain object-left"
              />
            </Link>

            <p className="mt-5 max-w-sm text-sm leading-7 text-white/75">
              Where tradition meets timeless beauty. Explore our
              exquisite collection of gold, diamond and silver jewellery,
              crafted for your most cherished moments.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  title={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9b568]/70 text-[#f5d994] transition-all duration-300 hover:-translate-y-1 hover:bg-[#e5c477] hover:text-[#003b30]"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="lg:col-span-2">

            <h3 className={columnHeading}>Quick Links</h3>
            <div className={goldDivider}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#003b30] px-2 text-[#e5c477]">
                ❖
              </span>
            </div>

            <ul className="space-y-4">
              {links.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={footerLink}>
                    <ChevronRight
                      size={15}
                      className="shrink-0 text-[#e5c477]"
                    />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Collections */}
          <div className="lg:col-span-2">

            <h3 className={columnHeading}>Our Collections</h3>
            <div className={goldDivider}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#003b30] px-2 text-[#e5c477]">
                ❖
              </span>
            </div>

            <ul className="space-y-4">
              {collections.map((collection) => (
                <li key={collection.label}>
                  <Link to={collection.to} className={footerLink}>
                    <ChevronRight
                      size={15}
                      className="shrink-0 text-[#e5c477]"
                    />
                    {collection.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-2">

            <h3 className={columnHeading}>Contact Us</h3>
            <div className={goldDivider}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#003b30] px-2 text-[#e5c477]">
                ❖
              </span>
            </div>

            <div className="space-y-5">

              <a
                href="tel:+919876543210"
                className="group flex items-start gap-3 text-sm leading-6 text-white/80 transition hover:text-[#f5d994]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9b568]/60 text-[#e5c477]">
                  <Phone size={16} />
                </span>
                <span className="break-words pt-1">
                  +91 98765 43210
                </span>
              </a>

              <a
                href="mailto:support@mystore.com"
                className="group flex items-start gap-3 text-sm leading-6 text-white/80 transition hover:text-[#f5d994]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9b568]/60 text-[#e5c477]">
                  <Mail size={16} />
                </span>
                <span className="break-all pt-1">
                  support@mystore.com
                </span>
              </a>

              <div className="flex items-start gap-3 text-sm leading-6 text-white/80">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d9b568]/60 text-[#e5c477]">
                  <MapPin size={16} />
                </span>
                <span className="pt-1">
                  Chennai, Tamil Nadu,
                  <br />
                  India
                </span>
              </div>

            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">

            <h3 className={columnHeading}>
              Subscribe to Our Newsletter
            </h3>

            <div className={goldDivider}>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#003b30] px-2 text-[#e5c477]">
                ❖
              </span>
            </div>

            <p className="text-sm leading-7 text-white/75">
              Get the latest collections, exclusive offers and jewellery
              inspiration delivered to your inbox.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="mt-6 flex overflow-hidden rounded-full border border-[#e5c477] bg-white/5 p-1"
            >
              <label
                htmlFor="footer-subscription-email"
                className="sr-only"
              >
                Email address
              </label>

              <span className="flex shrink-0 items-center pl-3 text-[#e5c477]">
                <Mail size={19} />
              </span>

              <input
                id="footer-subscription-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setSubscribed(false);
                }}
                placeholder="Your email address"
                required
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-xs text-white outline-none placeholder:text-white/55"
              />

              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e8ca83] px-4 py-3 text-xs font-bold text-[#063b30] transition hover:bg-[#f5dfa7]"
              >
                <span>Subscribe</span>
                <ArrowRight size={15} />
              </button>
            </form>

            {subscribed && (
              <p role="status" className="mt-3 text-xs text-[#f5d994]">
                Thank you for subscribing!
              </p>
            )}

            {/* Newsletter benefits */}
            <div className="mt-7 grid grid-cols-2 gap-y-5">

              <div className="flex items-center gap-2 text-xs text-white/80">
                <Gem size={18} className="text-[#e5c477]" />
                <span>Exclusive Offers</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/80">
                <ShieldCheck size={18} className="text-[#e5c477]" />
                <span>New Arrivals</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/80">
                <Truck size={18} className="text-[#e5c477]" />
                <span>Special Collections</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-white/80">
                <Gem size={18} className="text-[#e5c477]" />
                <span>Member Updates</span>
              </div>

            </div>
          </div>

        </div>

        {/* Ornamental bottom divider */}
        <div className="relative flex items-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#d9b568] to-[#d9b568]" />
          <span className="px-4 font-serif text-2xl text-[#e5c477]">
            ❋
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#d9b568] to-[#d9b568]" />
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-5 py-6 text-center sm:flex-row sm:text-left">

          <p className="text-xs text-white/65">
            © {new Date().getFullYear()} Sri Golds. All Rights Reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/65">
            <Link
              to="/privacy-policy"
              className="transition hover:text-[#f5d994]"
            >
              Privacy Policy
            </Link>

            <span className="hidden h-3 w-px bg-[#d9b568]/60 sm:block" />

            <Link
              to="/terms"
              className="transition hover:text-[#f5d994]"
            >
              Terms & Conditions
            </Link>

            <span className="hidden h-3 w-px bg-[#d9b568]/60 sm:block" />

            <Link
              to="/return-policy"
              className="transition hover:text-[#f5d994]"
            >
              Return Policy
            </Link>
          </div>

        </div>

      </PageContainer>
    </footer>
  );
};

export default Footer;
