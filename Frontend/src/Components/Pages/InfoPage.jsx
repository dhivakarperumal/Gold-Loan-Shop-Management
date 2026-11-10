import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Database,
  FileText,
  KeyRound,
  MessageCircle,
  Scale,
  ShieldCheck,
  UserRound
} from "lucide-react";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";

const sections = [
  { id: "information-we-collect", label: "Information we collect", icon: UserRound },
  { id: "how-we-use-information", label: "How we use it", icon: Database },
  { id: "identity-and-loan-records", label: "Identity & loan records", icon: FileText },
  { id: "sharing-information", label: "When information is shared", icon: MessageCircle },
  { id: "storage-and-security", label: "Storage & security", icon: KeyRound },
  { id: "your-choices", label: "Your choices", icon: Scale },
  { id: "retention-and-updates", label: "Retention & updates", icon: Clock3 }
];

const policySections = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>We collect information you choose to give us when you use Sri Golds services, including:</p>
        <ul>
          <li><strong>Account and profile details</strong>, such as your name, username, email address, phone number, address and profile photo.</li>
          <li><strong>Enquiry and contact details</strong>, such as your name, phone number, email address, message and the jewellery or gold-loan service you ask about.</li>
          <li><strong>Loan and customer-service records</strong>, which may include contact details, address, date of birth, customer photo, guarantor details and information needed to manage a loan or provide related service.</li>
          <li><strong>Identity documents</strong> that you choose to submit for KYC review, such as an enabled identity-document type and the related application status.</li>
          <li><strong>Sign-in information</strong> when you choose to sign in with Google, such as the account details Google supplies for sign-in.</li>
        </ul>
        <p>Please provide only information needed for your request. Do not send unrelated sensitive information.</p>
      </>
    )
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: (
      <>
        <p>We use information to operate the website and shop services, respond to enquiries, manage customer accounts and profiles, provide customer support, and administer jewellery and gold-loan services.</p>
        <p>We may also use it to review KYC submissions, keep appropriate business records, protect accounts and services, address misuse, and meet applicable legal obligations.</p>
        <p>When you sign in, the site keeps account details and an authentication token in your browser&apos;s local storage so your account can remain signed in. Sign out to remove the active sign-in from that browser.</p>
      </>
    )
  },
  {
    id: "identity-and-loan-records",
    title: "Identity documents and loan records",
    content: (
      <>
        <p>If you submit identity documents through the KYC feature, the documents are stored for manual review by authorized shop staff. Access to KYC documents is restricted and document views are logged. The review is an internal manual decision; it is not a government identity check or a guarantee that a document is authentic.</p>
        <p>Loan-service records can include information about you and, where relevant, your guarantor. We use these details to administer the service and maintain related records. Please ask us before submitting a document if you need to know whether a particular document type is required or how long a record will be kept.</p>
      </>
    )
  },
  {
    id: "sharing-information",
    title: "When information is shared",
    content: (
      <>
        <p>We do not sell your personal information. We share it only when needed to provide or operate a requested service, protect the business and its customers, or comply with law. This may include:</p>
        <ul>
          <li>Shop staff who need the information to respond to you, manage your account, or handle a customer, loan or KYC record.</li>
          <li>Service providers that support website hosting, storage, authentication or other business operations, subject to their role in providing that service.</li>
          <li>Google, if you choose Google sign-in. Google processes information under its own privacy terms.</li>
          <li>WhatsApp, if you choose to continue the Contact Us form through WhatsApp. The form opens a pre-filled message; information is sent to WhatsApp only if you choose to continue and send it there.</li>
          <li>Authorities or other parties when disclosure is required by law or needed to address a valid legal or safety concern.</li>
        </ul>
        <p>Third-party services have their own privacy practices. Review their policies before using them.</p>
      </>
    )
  },
  {
    id: "storage-and-security",
    title: "Storage and security",
    content: (
      <>
        <p>We use access controls and other safeguards intended to protect personal information. KYC documents are kept in private storage and are not intended to be publicly accessible. No website or storage method can be guaranteed completely secure.</p>
        <p>Keep your account credentials private and sign out when using a shared device. Contact us promptly if you believe your account or information has been accessed without permission.</p>
      </>
    )
  },
  {
    id: "your-choices",
    title: "Your choices and requests",
    content: (
      <>
        <p>You can review or update some account details through your profile. You may also contact us to ask about personal information we hold, request a correction or deletion, or withdraw consent where processing is based on consent.</p>
        <p>We may need to verify your identity before acting on a request, and some records may need to be retained to provide a service or meet legal and business obligations.</p>
      </>
    )
  },
  {
    id: "retention-and-updates",
    title: "Retention and policy updates",
    content: (
      <>
        <p>We keep information for as long as it is needed for the purposes described above, to provide services, resolve issues and maintain required records. The period depends on the type of information and applicable obligations; please contact us for questions about a specific record.</p>
        <p>We may update this policy when our services or practices change. The latest version and its update date will be shown on this page.</p>
      </>
    )
  }
];

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-[#fffaf0] pb-12">
      <PageHeader title="Privacy Policy" />

      <PageContainer className="py-7 sm:py-10">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#ead8b6] bg-white p-4 shadow-sm sm:p-5">
          <span className="mt-0.5 rounded-full bg-[#fff4d9] p-2 text-[#a66b00]">
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-[#665842] sm:text-sm">
              This policy applies to information handled through the Sri Golds website and related shop services. It explains our current practices in plain language; the information requested depends on the service you use.
            </p>
            <p className="shrink-0 text-[11px] font-semibold text-[#81786b]">Last updated: 10 November 2026</p>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-8">
          <aside className="lg:sticky lg:top-24">
            <nav aria-label="Privacy policy sections" className="rounded-2xl border border-[#eee3d0] bg-white p-4 shadow-sm sm:p-5">
              <h2 className="font-serif text-lg font-bold text-[#153b2e]">On this page</h2>
              <ul className="mt-3 grid grid-cols-1 gap-1 min-[480px]:grid-cols-2 lg:grid-cols-1">
                {sections.map(({ id, label, icon: Icon }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(id)?.scrollIntoView({
                          behavior: "smooth",
                          block: "start"
                        });
                      }}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-[#68645c] transition hover:bg-[#fff8e9] hover:text-[#174a38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b47a19]"
                    >
                      <Icon size={15} className="shrink-0 text-[#b47a19]" aria-hidden="true" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 rounded-2xl bg-[#073b2f] p-5 text-white">
              <MessageCircle size={21} className="text-[#f2d58a]" aria-hidden="true" />
              <h2 className="mt-3 font-serif text-lg font-bold">Questions about your data?</h2>
              <p className="mt-1 text-xs leading-5 text-white/70">Contact our team and tell us how we can help.</p>
              <Link to="/contactus" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#f2d58a] transition hover:text-white">
                Contact us <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </aside>

          <div className="space-y-4">
            {policySections.map(({ id, title, content }, index) => (
              <section
                key={id}
                id={id}
                className="scroll-mt-24 rounded-2xl border border-[#eee3d0] bg-white p-5 shadow-sm sm:p-7"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff4d9] text-xs font-bold text-[#a66b00]" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="font-serif text-xl font-bold text-[#153b2e] sm:text-2xl">{title}</h2>
                </div>
                <div className="space-y-3 pl-0 text-sm leading-7 text-[#625b50] sm:pl-11 [&_li]:relative [&_li]:pl-5 [&_li]:before:absolute [&_li]:before:left-1 [&_li]:before:top-[0.7rem] [&_li]:before:h-1.5 [&_li]:before:w-1.5 [&_li]:before:rounded-full [&_li]:before:bg-[#c39543] [&_p+p]:mt-3 [&_strong]:font-semibold [&_strong]:text-[#3f382f] [&_ul]:space-y-2 [&_ul]:pl-0">
                  {content}
                </div>
              </section>
            ))}

            <div className="rounded-2xl border border-[#dce7dc] bg-[#f2f7f1] p-5 sm:p-6">
              <p className="text-sm leading-6 text-[#45594b]">
                To ask a privacy question or make a request about your information, use our <Link to="/contactus" className="font-semibold text-[#174a38] underline decoration-[#b47a19] underline-offset-4 hover:text-[#a66b00]">Contact Us page</Link>.
              </p>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
