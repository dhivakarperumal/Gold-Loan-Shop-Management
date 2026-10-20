import { Link } from "react-router-dom";
import PageContainer from "../CommenComponents/PageContainer";

export default function InfoPage() {
  return (
    <main className="min-h-[55vh] bg-[#fffdf8] pb-12">
      <header className="border-b border-[#f0e9dd] bg-white">
        <PageContainer className="py-8">
          <nav className="text-xs text-[#81786b]" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#174a38]">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-semibold text-[#30271b]">Privacy Policy</span>
          </nav>
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
