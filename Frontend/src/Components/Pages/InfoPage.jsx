import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Clock3,
  Gem,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Store
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";

const SHOP_PHONE = "9659133504";
const SHOP_PHONE_LABEL = "+91 96591 33504";
const SHOP_ADDRESS = "No.58 Vaitheeshwaran Nagar, Tirupattur - 635653";
const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SHOP_ADDRESS)}`;

function Breadcrumb({ title, dark = false }) {
  return (
    <nav className={`text-xs ${dark ? "text-white/70" : "text-[#81786b]"}`} aria-label="Breadcrumb">
      <Link to="/" className="transition hover:text-[#d9b568]">Home</Link>
      <span className="mx-2" aria-hidden="true">›</span>
      <span className={`font-semibold ${dark ? "text-white" : "text-[#30271b]"}`}>{title}</span>
    </nav>
  );
}

function AboutPage() {
  return (
    <main className="bg-[#fffaf0]">
      <section className="relative isolate min-h-[340px] overflow-hidden bg-[#003629] text-white sm:min-h-[390px]">
        <img
          src="/images/Hero/hero4.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00281f]/95 via-[#003629]/80 to-[#003629]/10" />
        <div className="absolute inset-3 border border-[#d9b568]/50 sm:inset-5" aria-hidden="true" />
        <PageContainer className="relative flex min-h-[340px] items-center py-9 sm:min-h-[390px]">
          <div className="max-w-xl">
            <Breadcrumb title="About Us" dark />
            <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.28em] text-[#e9c66d]">Our Story</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              A Legacy of Trust
              <br />
              in <span className="text-[#e9bd56]">Every Jewel</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#fff7e8]/90 sm:text-base">
              At Sri Golds, we believe jewellery is more than gold, silver or diamonds. It is a celebration of your most precious moments, crafted with care, trust and timeless elegance.
            </p>
            <Link
              to="/explore"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-5 py-3 text-sm font-bold text-[#153729] shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
            >
              Our Jewellery <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>

      <section className="border-b border-[#eee1c7] bg-white">
        <PageContainer>
          <div className="grid grid-cols-2 divide-y divide-[#eee1c7] py-2 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            {[
              { icon: Gem, value: "Since 1984", label: "A tradition of trust" },
              { icon: Sparkles, value: "Thoughtful", label: "Designs for every moment" },
              { icon: ShieldCheck, value: "Quality First", label: "Care in every detail" },
              { icon: Store, value: "Tirupattur", label: "Visit our showroom" }
            ].map(({ icon: Icon, value, label }) => (
              <div key={value} className="flex items-center gap-3 px-3 py-4 sm:justify-center sm:px-4 sm:py-5">
                <Icon size={25} className="shrink-0 text-[#b47a19]" strokeWidth={1.7} aria-hidden="true" />
                <div>
                  <p className="font-serif text-base font-bold text-[#153b2e] sm:text-lg">{value}</p>
                  <p className="text-[10px] text-[#777066] sm:text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-12 sm:py-16">
        <PageContainer>
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="grid grid-cols-2 gap-3">
              <img
                src="/images/Luxury Gold Jewelry Showcase.png"
                alt="Sri Golds jewellery showroom"
                className="h-56 w-full rounded-2xl object-cover shadow-md sm:h-72"
                loading="lazy"
              />
              <img
                src="/images/goldproduct.png"
                alt="Gold jewellery crafted with care"
                className="mt-8 h-56 w-full rounded-2xl object-cover shadow-md sm:mt-12 sm:h-72"
                loading="lazy"
              />
              <div className="col-span-2 flex items-center gap-3 rounded-xl border border-[#ead8b6] bg-gradient-to-r from-[#fff2d3] to-[#fffaf0] px-4 py-3">
                <Heart size={22} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                <p className="text-xs leading-5 text-[#665842] sm:text-sm">
                  Jewellery made to celebrate life&apos;s milestones and become part of your story.
                </p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#ae7617]">About Sri Golds</p>
              <h2 className="mt-2 font-serif text-3xl font-bold leading-tight text-[#153b2e] sm:text-4xl">
                Crafting Brighter Moments
              </h2>
              <p className="mt-4 text-sm leading-7 text-[#68645c]">
                Sri Golds is a trusted jewellery brand dedicated to offering gold, diamond and silver jewellery for every occasion. We bring together thoughtful designs and a tradition of craftsmanship to help you find pieces worth treasuring.
              </p>
              <p className="mt-3 text-sm leading-7 text-[#68645c]">
                From everyday favourites to pieces for life&apos;s biggest celebrations, we welcome you to discover jewellery chosen with care and a personal touch.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: Gem, label: "Exquisite Designs" },
                  { icon: Award, label: "Skilled Craftsmanship" },
                  { icon: ShieldCheck, label: "Quality Focused" },
                  { icon: Heart, label: "Customer First" }
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-lg border border-[#eee3d0] bg-white px-3 py-3">
                    <Icon size={19} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                    <span className="text-xs font-semibold text-[#34463b]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      <section className="relative overflow-hidden bg-[#00382a] py-12 text-white sm:py-14">
        <img
          src="/images/goldproduct.png"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[70%_55%] opacity-30"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#00291f]/95 via-[#00382a]/85 to-[#00382a]/35" />
        <PageContainer className="relative">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#e9c66d]">Our Heritage</p>
            <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Tradition Meets Modern Elegance</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
              From classic inspiration to contemporary design, we celebrate the artistry and meaning behind every piece.
            </p>
            <Link
              to="/explore"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f2cf76] to-[#d9a441] px-5 py-2.5 text-sm font-bold text-[#153729] transition hover:brightness-105"
            >
              Discover Our Collections <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>

      <section className="py-10 sm:py-12">
        <PageContainer>
          <div className="flex flex-col gap-5 rounded-2xl border border-[#ead8b6] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ae7617]">Our Vision</p>
              <h2 className="mt-1 font-serif text-2xl font-bold text-[#153b2e]">Your Most Trusted Jewellery Partner</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68645c]">
                We strive to make choosing jewellery a warm, personal experience—with thoughtful service and collections for every generation.
              </p>
            </div>
            <Link
              to="/contactus"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#c4953e] px-5 py-3 text-sm font-bold text-[#153b2e] transition hover:bg-[#fff5dc]"
            >
              Visit or Contact Us <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}

function ContactPage() {
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
      <section className="relative isolate min-h-[300px] overflow-hidden bg-[#003629] text-white sm:min-h-[340px]">
        <img
          src="/images/Hero/hero.png"
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#00281f]/95 via-[#003629]/75 to-[#003629]/10" />
        <div className="absolute inset-3 border border-[#d9b568]/50 sm:inset-5" aria-hidden="true" />
        <PageContainer className="relative flex min-h-[300px] items-center py-8 sm:min-h-[340px]">
          <div className="max-w-xl">
            <Breadcrumb title="Contact Us" dark />
            <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.28em] text-[#e9c66d]">Get in Touch</p>
            <h1 className="mt-3 font-serif text-4xl font-bold leading-[1.05] sm:text-5xl">
              We Are Here
              <br />
              <span className="text-[#e9bd56]">For You</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[#fff7e8]/90">
              Have a question or need assistance? Our team is ready to help you with a warm and friendly service.
            </p>
          </div>
        </PageContainer>
      </section>

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
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#edc264] to-[#d9a441] px-5 py-3 text-sm font-bold text-[#23382c] shadow-sm transition hover:brightness-105"
              >
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

function PrivacyPage() {
  return (
    <main className="min-h-[55vh] bg-[#fffdf8] pb-12">
      <header className="border-b border-[#f0e9dd] bg-white">
        <PageContainer className="py-8">
          <Breadcrumb title="Privacy Policy" />
          <h1 className="mt-2 font-serif text-3xl font-bold text-[#174a38]">Privacy Policy</h1>
        </PageContainer>
      </header>
      <PageContainer className="space-y-5 py-10 leading-7 text-[#514638]">
        <p>
          We respect your privacy and are committed to protecting your personal
          information. Customer data is used for order processing, delivery,
          and improving your shopping experience.
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            We collect customer details such as name, phone number, and
            delivery address when needed to serve your order.
          </li>
          <li>
            Information is used for order processing, delivery, and related
            customer support.
          </li>
          <li>We do not sell or share personal data with third parties.</li>
        </ul>
      </PageContainer>
    </main>
  );
}

const InfoPage = ({ page }) => {
  if (page === "about") return <AboutPage />;
  if (page === "contact") return <ContactPage />;
  if (page === "privacy") return <PrivacyPage />;
  return null;
};

export default InfoPage;
