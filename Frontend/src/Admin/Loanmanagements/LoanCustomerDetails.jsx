import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiDownload, FiEdit2, FiMapPin, FiUser } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";

const DOCUMENT_TYPE_LABELS = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  voter_id: "Voter ID Card",
  driving_license: "Driving Licence",
  passport: "Passport",
  ration_card: "Ration Card",
  other: "Other Government-Issued ID"
};

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "—"
    : date.toLocaleString("en-IN", includeTime ? undefined : { dateStyle: "medium" });
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words whitespace-pre-wrap text-sm font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}

export default function LoanCustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingDocument, setOpeningDocument] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get(`/loan-customers/${id}`),
      api.get(`/loan-customers/${id}/documents`),
      api.get(`/customers/${id}/loans`)
    ])
      .then(([customerResponse, documentsResponse, loansResponse]) => {
        if (!Array.isArray(documentsResponse.data) || !Array.isArray(loansResponse.data)) {
          throw new Error("The server returned invalid customer documents or loan history.");
        }
        if (!active) return;
        setCustomer(customerResponse.data);
        setDocuments(documentsResponse.data);
        setLoans(loansResponse.data);
      })
      .catch((error) => {
        console.error("Failed to load customer details page:", error);
        if (active) toast.error(error.response?.data?.message || error.message || "Could not load customer details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!customer?.photo_url) {
      setPhotoUrl("");
      return undefined;
    }
    let active = true;
    let objectUrl = "";
    getPrivateFile(customer.photo_url, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setPhotoUrl(objectUrl);
      })
      .catch((error) => {
        console.error("Failed to load customer profile photo:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load customer photo.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [customer?.photo_url]);

  const openDocument = async (document) => {
    setOpeningDocument(String(document.id));
    try {
      const { data } = await getPrivateFile(document.file_ref, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(data);
      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Allow pop-ups to open this document.");
        return;
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error("Failed to open customer KYC document:", error);
      toast.error(error.response?.data?.message || "Could not open this document.");
    } finally {
      setOpeningDocument("");
    }
  };

  if (loading) {
    return <main className="p-6 text-sm text-slate-500">Loading customer details...</main>;
  }

  if (!customer) {
    return (
      <main className="space-y-4 p-4 sm:p-6">
        <Link to="/admin/loans/customermanagement" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> Customer Management</Link>
        <p className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm">Customer not found or could not be loaded.</p>
      </main>
    );
  }

  const address = [customer.address, customer.city, customer.district, customer.state, customer.pincode].filter(Boolean).join(", ");
  const activeLoans = loans.filter((loan) => loan.loan_status === "Active");

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/loans/customermanagement" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577] hover:text-[#003B3B]">
          <FiArrowLeft /> Customer Management
        </Link>
        <button
          type="button"
          onClick={() => navigate("/admin/loans/customermanagement", { state: { editCustomerId: customer.id } })}
          className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#008577]"
        >
          <FiEdit2 /> Edit Customer
        </button>
      </div>

      <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          {photoUrl ? (
            <img src={photoUrl} alt={`${customer.full_name} profile`} className="h-20 w-20 rounded-full border border-slate-200 object-cover" />
          ) : (
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-3xl font-bold text-[#008577]">
              {customer.full_name?.trim().charAt(0).toUpperCase() || <FiUser />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#008577]">Customer Profile</p>
            <h1 className="mt-1 break-words text-2xl font-extrabold text-[#003B3B]">{customer.full_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Customer Code: {customer.customer_code || "—"} · Customer ID: {customer.id}</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${customer.kyc_status === "Verified" ? "bg-emerald-50 text-emerald-700" : customer.kyc_status === "Rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
            KYC {customer.kyc_status}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#003B3B]"><FiUser /> Personal & Contact Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Full Name" value={customer.full_name} />
          <Detail label="Customer Type" value={customer.customer_type} />
          <Detail label="Primary Mobile" value={customer.mobile} />
          <Detail label="Alternate Mobile" value={customer.alternate_mobile} />
          <Detail label="Email" value={customer.email} />
          <Detail label="Date of Birth" value={formatDate(customer.date_of_birth)} />
          <Detail label="Gender" value={customer.gender} />
          <Detail label="Occupation" value={customer.occupation} />
          <Detail label="KYC Status" value={customer.kyc_status} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Residential Address" value={address || "Address not provided"} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Internal Notes" value={customer.notes} />
          </div>
          <Detail label="Customer Since" value={formatDate(customer.created_at, true)} />
          <Detail label="Last Updated" value={formatDate(customer.updated_at, true)} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <h2 className="mb-3 text-base font-bold text-[#003B3B]">Guarantor / Surety Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Guarantor Name" value={customer.guarantor_name} />
          <Detail label="Guarantor Mobile" value={customer.guarantor_mobile} />
          <Detail label="Relationship to Customer" value={customer.guarantor_relationship} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Guarantor Address" value={customer.guarantor_address} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <h2 className="mb-3 text-base font-bold text-[#003B3B]">KYC Documents ({documents.length})</h2>
        {documents.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-500">No KYC documents uploaded.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map((document) => (
              <article key={document.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {DOCUMENT_TYPE_LABELS[document.document_type] || document.document_type} · {document.document_side || "front"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">{document.original_name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openDocument(document)}
                  disabled={openingDocument === String(document.id)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#008577] hover:bg-emerald-50 disabled:opacity-50"
                >
                  <FiDownload /> {openingDocument === String(document.id) ? "Opening..." : "Open"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-[#003B3B]"><FiMapPin /> Loan History</h2>
        <p className="mb-3 text-xs text-slate-500">{activeLoans.length} active loan{activeLoans.length === 1 ? "" : "s"} · {loans.length} total</p>
        {loans.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-500">No loans found for this customer.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white">
            <table className="w-full min-w-[650px] border-separate border-spacing-0 text-left">
              <thead><tr className="bg-[#003B3B] text-xs font-bold uppercase text-white">
                {["Loan Number", "Pledge Number", "Principal", "Maturity", "Status"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="text-sm">
                    <td className="px-4 py-3 font-semibold text-[#008577]">{loan.loan_number}</td>
                    <td className="px-4 py-3">{loan.gold_pledge_number}</td>
                    <td className="px-4 py-3">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(loan.principal_amount))}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1"><FiCalendar /> {formatDate(loan.maturity_date)}</span></td>
                    <td className="px-4 py-3">{loan.loan_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
