import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../CommenComponents/PageHeader";

const PAGE_CONTENT = {
  about: {
    title: "About Us",
    content: (
      <>
        <p>
          Sri Golds has been creating memorable jewellery experiences since
          1984. We bring together traditional designs and carefully curated
          collections for life’s special moments.
        </p>
        <p>
          Explore our collection of gold, diamond, and silver jewellery, and
          find designs made to be treasured for years to come.
        </p>
        <Link
          to="/explore"
          className="inline-flex rounded-lg bg-[#174a38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#10382b]"
        >
          Explore our collection
        </Link>
      </>
    ),
  },
  contact: {
    title: "Contact Us",
    content: (
      <>
        <p>
          We’re here to help with questions about our jewellery and your
          shopping experience. Get in touch using the details below.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href="tel:+919876543210"
            className="rounded-xl border border-[#eee7dc] bg-[#fffdf8] p-5 transition hover:border-[#d8b46c]"
          >
            <h2 className="font-semibold text-[#174a38]">Call us</h2>
            <p className="mt-2 text-sm text-[#514638]">+91 98765 43210</p>
          </a>
          <a
            href="mailto:support@mystore.com"
            className="rounded-xl border border-[#eee7dc] bg-[#fffdf8] p-5 transition hover:border-[#d8b46c]"
          >
            <h2 className="font-semibold text-[#174a38]">Email us</h2>
            <p className="mt-2 break-all text-sm text-[#514638]">support@mystore.com</p>
          </a>
          <div className="rounded-xl border border-[#eee7dc] bg-[#fffdf8] p-5">
            <h2 className="font-semibold text-[#174a38]">Visit us</h2>
            <p className="mt-2 text-sm text-[#514638]">Chennai, Tamil Nadu, India</p>
          </div>
        </div>
      </>
    ),
  },
  privacy: {
    title: "Privacy Policy",
    content: (
      <>
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
      </>
    ),
  },
};

const InfoPage = ({ page }) => {
  const pageContent = PAGE_CONTENT[page];

  if (!pageContent) {
    return null;
  }

  return (
    <main className="min-h-[55vh] bg-[#fffdf8] pb-12">
      <PageHeader title={pageContent.title} />
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-10 leading-7 text-[#514638] sm:px-6 lg:px-8">
        {pageContent.content}
      </div>
    </main>
  );
};

export default InfoPage;
