import { useState } from "react";
import {
  ArrowRight,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Store,
  Gem,
  ShoppingBag,
  CalendarDays,
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const SHOP_PHONE = "9659133504";
const SHOP_PHONE_LABEL = "+91 96591 33504";
const SHOP_ADDRESS = "No.58 Vaitheeshwaran Nagar, Tirupattur - 635653";
const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP_ADDRESS)}`;

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const message = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Phone: ${form.phone.trim()}`,
      `Subject: ${form.subject}`,
      "",
      form.message.trim()
    ].join("\n");
    window.open(`https://wa.me/${SHOP_PHONE}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const inputClass =
    "w-full rounded-lg border border-[#e7e0d5] bg-white px-3.5 py-3 text-sm text-[#30271b] outline-none transition placeholder:text-[#a59b8d] focus:border-[#c39543] focus:ring-2 focus:ring-[#e9d49c]/50";

  return (
    <main className="bg-[#fffaf0]">
      <PageHeader title="Contact Us" />

      <PageContainer>
        <section className="grid grid-cols-1 divide-y divide-[#eadfc8] rounded-b-2xl border border-t-0 border-[#eadfc8] bg-white shadow-sm sm:grid-cols-3 sm:divide-x sm:divide-y-0" aria-label="Contact options">
          {[
            { icon: Phone, title: "Call Us", detail: SHOP_PHONE_LABEL, href: `tel:+91${SHOP_PHONE}` },
            { icon: MessageCircle, title: "WhatsApp", detail: "Chat with our team", href: `https://wa.me/${SHOP_PHONE}` },
            { icon: MapPin, title: "Visit Us", detail: "Tirupattur Showroom", href: MAP_URL }
          ].map(({ icon: Icon, title, detail, href }) => (
            <a
              key={title}
              href={href}
              target={title === "WhatsApp" || title === "Visit Us" ? "_blank" : undefined}
              rel={title === "WhatsApp" || title === "Visit Us" ? "noreferrer" : undefined}
              className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#fffaf0] sm:justify-center sm:py-5"
            >
              <Icon size={24} className="shrink-0 text-[#bd821e]" strokeWidth={1.8} aria-hidden="true" />
              <span>
                <span className="block font-serif text-base font-bold text-[#23382c]">{title}</span>
                <span className="mt-0.5 block text-xs text-[#777066]">{detail}</span>
              </span>
            </a>
          ))}
        </section>
      </PageContainer>

      <PageContainer className="py-8 sm:py-10">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-[#eee3d0] bg-white p-4 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ae7617]">We&apos;d love to hear from you</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Send Us a Message</h2>
              <p className="mt-1 text-xs text-[#777066]">Fill in the details and continue to WhatsApp to send your message.</p>
            </div>
            <form id="contact-message-form" onSubmit={sendMessage} className="scroll-mt-24 space-y-3">
              <label className="sr-only" htmlFor="contact-name">Full name</label>
              <input id="contact-name" name="name" value={form.name} onChange={updateField} className={inputClass} placeholder="Full Name *" autoComplete="name" required />
              <label className="sr-only" htmlFor="contact-email">Email address</label>
              <input id="contact-email" name="email" type="email" value={form.email} onChange={updateField} className={inputClass} placeholder="Email Address *" autoComplete="email" required />
              <label className="sr-only" htmlFor="contact-phone">Phone number</label>
              <input id="contact-phone" name="phone" type="tel" value={form.phone} onChange={updateField} className={inputClass} placeholder="Phone Number *" autoComplete="tel" required />
              <label className="sr-only" htmlFor="contact-subject">Subject</label>
              <select id="contact-subject" name="subject" value={form.subject} onChange={updateField} className={inputClass} required>
                <option value="" disabled>Select Subject *</option>
                <option value="Product enquiry">Product enquiry</option>
                <option value="Order assistance">Order assistance</option>
                <option value="Store visit">Store visit</option>
                <option value="Other">Other</option>
              </select>
              <label className="sr-only" htmlFor="contact-message">Your message</label>
              <textarea id="contact-message" name="message" value={form.message} onChange={updateField} className={`${inputClass} min-h-28 resize-y`} placeholder="Your Message *" required />
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#edc264] to-[#d9a441] px-5 py-3 text-sm font-bold text-[#23382c] shadow-sm transition hover:brightness-105">
                Continue to WhatsApp <ArrowRight size={16} aria-hidden="true" />
              </button>
            </form>
          </section>

          <section className="min-w-0 rounded-2xl border border-[#eee3d0] bg-white p-4 shadow-sm sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ae7617]">Come see us</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Our Showroom Location</h2>
            <p className="mt-1 text-xs text-[#777066]">We look forward to welcoming you.</p>

            <a
              href={MAP_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative mt-5 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-[#d9e4d7] bg-[#eaf1e8] p-3 text-center sm:h-52 sm:p-5"
              style={{
                backgroundImage: "linear-gradient(30deg, transparent 46%, rgba(255,255,255,.85) 47%, rgba(255,255,255,.85) 50%, transparent 51%), linear-gradient(145deg, transparent 35%, rgba(255,255,255,.75) 36%, rgba(255,255,255,.75) 39%, transparent 40%), linear-gradient(90deg, transparent 70%, rgba(191,215,228,.55) 70%)"
              }}
              aria-label={`Open directions to Sri Golds, ${SHOP_ADDRESS}`}
            >
              <span className="absolute left-[18%] top-[26%] hidden rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm sm:block">Vellore</span>
              <span className="absolute right-[15%] top-[22%] hidden rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm sm:block">Chennai</span>
              <span className="absolute bottom-[22%] left-[20%] hidden rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm sm:block">Salem</span>
              <span className="relative flex max-w-full flex-col items-center gap-2 rounded-xl border border-[#ead8b6] bg-white/95 px-4 py-3 shadow-md transition group-hover:-translate-y-1 sm:px-5">
                <MapPin size={28} className="text-[#bd821e]" aria-hidden="true" />
                <span className="font-serif text-base font-bold text-[#153b2e]">Sri Golds · Tirupattur</span>
                <span className="text-xs text-[#777066]">Open directions</span>
              </span>
            </a>

            <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#fffaf0] p-4">
              <Store size={20} className="mt-0.5 shrink-0 text-[#bd821e]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-[#273a30]">Tirupattur Showroom</h3>
                <p className="mt-1 text-xs leading-5 text-[#777066]">{SHOP_ADDRESS}</p>
                <a href={MAP_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#9a6817] hover:text-[#153b2e]">
                  Get Directions <ArrowRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#eee3d0] p-4">
              <Clock3 size={20} className="mt-0.5 shrink-0 text-[#bd821e]" aria-hidden="true" />
              <div>
                <h3 className="text-sm font-bold text-[#273a30]">Need Assistance?</h3>
                <p className="mt-1 text-xs text-[#777066]">Call or WhatsApp our team for help with your enquiry.</p>
                <a href={`tel:+91${SHOP_PHONE}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#9a6817] hover:text-[#153b2e]">
                  <Phone size={13} aria-hidden="true" /> {SHOP_PHONE_LABEL}
                </a>
              </div>
            </div>
          </section>
        </div>
      </PageContainer>

      {/* How Can We Help You - Refined Premium Design */}
      <PageContainer className="py-8 sm:py-12">
        <section className="overflow-hidden rounded-2xl border border-[#e5d3ad] bg-white shadow-[0_12px_35px_rgba(50,40,20,0.07)]">
          <div className="grid lg:grid-cols-[0.82fr_1.5fr]">

            {/* Left: Emerald introduction */}
            <div className="relative isolate flex flex-col justify-center overflow-hidden bg-gradient-to-br from-[#064734] via-[#043b2c] to-[#00291f] p-6 text-white sm:p-9 lg:p-10">
              {/* Decorative circles */}
              <div className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full border border-[#e9c66d]/15" />
              <div className="pointer-events-none absolute -right-8 -top-8 -z-10 h-44 w-44 rounded-full border border-[#e9c66d]/20" />
              <div className="pointer-events-none absolute bottom-0 right-0 -z-10 h-32 w-32 rounded-tl-full bg-[#e9c66d]/5" />

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#e9c66d]/40 bg-white/[0.06] text-[#f2d58a] shadow-inner">
                <MessageCircle size={23} strokeWidth={1.5} />
              </div>

              <p className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#f2d58a] sm:text-xs">
                <span className="h-px w-6 bg-[#f2d58a]" />
                We're Here for You
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                How Can We
                <span className="mt-1 block text-[#f2d58a]">
                  Help You?
                </span>
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-7 text-white/75">
                Every jewellery journey is personal. Tell us what you need,
                and our team will help you take the next step.
              </p>

              <div className="mt-7 flex items-center gap-3 border-t border-white/15 pt-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2d58a]/10 text-[#f2d58a]">
                  <Gem size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Personal assistance
                  </p>
                  <p className="mt-0.5 text-xs text-white/60">
                    Here to help you choose with confidence
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Enquiry options */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {[
                {
                  icon: Gem,
                  number: "01",
                  title: "Product Enquiry",
                  description:
                    "Explore designs, jewellery details, and availability.",
                  subject: "Product enquiry",
                },
                {
                  icon: ShoppingBag,
                  number: "02",
                  title: "Order Assistance",
                  description:
                    "Get help with questions about your order.",
                  subject: "Order assistance",
                },
                {
                  icon: CalendarDays,
                  number: "03",
                  title: "Visit Our Showroom",
                  description:
                    "Planning a visit to our Tirupattur showroom?",
                  subject: "Store visit",
                },
                {
                  icon: MessageCircle,
                  number: "04",
                  title: "General Enquiry",
                  description:
                    "Have another question? We're happy to help.",
                  subject: "Other",
                },
              ].map(({ icon: Icon, number, title, description, subject }) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => {
                    setForm((current) => ({ ...current, subject }));
                    document
                      .getElementById("contact-message-form")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="group relative flex min-h-[132px] min-w-0 items-start gap-3 border-b border-[#eee5d5] p-4 text-left transition-colors duration-300 last:border-b-0 hover:bg-[#fffaf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#bd821e] sm:min-h-[190px] sm:gap-4 sm:border-r sm:p-6 sm:nth-[2]:border-r-0 sm:nth-[3]:border-b-0 sm:nth-[4]:border-b-0 lg:p-7"
                >
                  <span className="absolute right-5 top-3 font-serif text-3xl font-bold text-[#f1e8d7] transition-colors group-hover:text-[#e8d5ac]">
                    {number}
                  </span>

                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e7d5b0] bg-[#fff8e8] text-[#a87418] transition-all duration-300 group-hover:border-[#064734] group-hover:bg-[#064734] group-hover:text-[#f2d58a] group-hover:shadow-md">
                    <Icon size={21} strokeWidth={1.6} aria-hidden="true" />
                  </span>

                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block pr-5 font-serif text-base font-bold leading-snug text-[#153b2e] sm:text-lg">
                      {title}
                    </span>

                    <span className="mt-2 block text-xs leading-6 text-[#777066] sm:text-sm">
                      {description}
                    </span>

                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#9a6817]">
                      Get assistance
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </PageContainer>


    </main>
  );
}
