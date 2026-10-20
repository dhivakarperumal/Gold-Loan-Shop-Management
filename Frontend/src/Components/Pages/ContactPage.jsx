import { useState } from "react";
import {
  ArrowRight,
  Clock3,
  MapPin,
  MessageCircle,
  Phone,
  Store
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
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#eee3d0] bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ae7617]">We&apos;d love to hear from you</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Send Us a Message</h2>
              <p className="mt-1 text-xs text-[#777066]">Fill in the details and continue to WhatsApp to send your message.</p>
            </div>
            <form onSubmit={sendMessage} className="space-y-3">
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

          <section className="rounded-2xl border border-[#eee3d0] bg-white p-5 shadow-sm sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ae7617]">Come see us</p>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Our Showroom Location</h2>
            <p className="mt-1 text-xs text-[#777066]">We look forward to welcoming you.</p>

            <a
              href={MAP_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative mt-5 flex h-52 items-center justify-center overflow-hidden rounded-xl border border-[#d9e4d7] bg-[#eaf1e8] p-5 text-center"
              style={{
                backgroundImage: "linear-gradient(30deg, transparent 46%, rgba(255,255,255,.85) 47%, rgba(255,255,255,.85) 50%, transparent 51%), linear-gradient(145deg, transparent 35%, rgba(255,255,255,.75) 36%, rgba(255,255,255,.75) 39%, transparent 40%), linear-gradient(90deg, transparent 70%, rgba(191,215,228,.55) 70%)"
              }}
              aria-label={`Open directions to Sri Golds, ${SHOP_ADDRESS}`}
            >
              <span className="absolute left-[18%] top-[26%] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm">Vellore</span>
              <span className="absolute right-[15%] top-[22%] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm">Chennai</span>
              <span className="absolute bottom-[22%] left-[20%] rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#526253] shadow-sm">Salem</span>
              <span className="relative flex flex-col items-center gap-2 rounded-xl border border-[#ead8b6] bg-white/95 px-5 py-3 shadow-md transition group-hover:-translate-y-1">
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

      <section className="relative overflow-hidden bg-[#00382a] py-8 text-white">
        <img src="/images/diamondproduct.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-25" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#00291f]/95 via-[#00382a]/80 to-[#00382a]/35" />
        <PageContainer className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-bold">We&apos;re Here to Help</h2>
            <p className="mt-1 text-sm text-white/80">Reach our team for product enquiries and store assistance.</p>
          </div>
          <a href={`tel:+91${SHOP_PHONE}`} className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-5 py-3 text-sm font-bold text-[#153729]">
            <Phone size={16} aria-hidden="true" /> Call Now
          </a>
        </PageContainer>
      </section>
    </main>
  );
}
