import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheckCircle, FiDownload, FiEye, FiFileText, FiGrid, FiList, FiPrinter, FiSearch, FiShield, FiUpload, FiUsers, FiX } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";
import { printLoanAgreement } from "./loanPrint";
import { formatCurrency as money } from "../../utils/currency";

function dateText(value) {
  if (!value) return "—";
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(text)
    ? new Date(`${text.slice(0, 10)}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.valueOf()) ? "—" : date.toLocaleDateString("en-IN");
}

const escapeHtml = (value) => String(value ?? "—")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function Info({ label, value }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || "—"}</dd></div>;
}

function printReleaseForm(loan, recipient) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Allow pop-ups to print the gold release form.");
    return;
  }
  const customerAddress = [
    loan.customer_address, loan.customer_city, loan.customer_district,
    loan.customer_state, loan.customer_pincode
  ].filter(Boolean).join(", ");
  printWindow.document.write(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><title>Gold Release - ${escapeHtml(loan.loan_number)}</title>
    <style>
      *{box-sizing:border-box}html,body{margin:0;padding:0;color:#172b28;font:10px/1.3 Arial,sans-serif}
      main{width:100%;max-width:190mm;margin:0 auto;padding:0}.brand{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #087263;padding-bottom:7px}
      h1{margin:0;color:#07564b;font:700 20px Georgia,serif}.brand p{margin:2px 0;color:#52625e}
      h2{margin:10px 0 5px;color:#07564b;font-size:12px;text-transform:uppercase}
      .notice{margin:8px 0;padding:7px;border:1px solid #a7d9c7;background:#effaf5}
      .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:14px;row-gap:0}.item{min-width:0;padding:4px 0;border-bottom:1px solid #e4ebe8;overflow-wrap:anywhere}
      .label{display:block;color:#71817c;font-size:7px;text-transform:uppercase}.value{font-weight:700}
      .declaration{margin-top:10px;padding:8px;border:1px solid #dce8e3;border-radius:6px}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:24px 24px;margin-top:32px;break-inside:avoid;page-break-inside:avoid}
      .signature{border-top:1px solid #485752;padding-top:5px;min-height:42px}.signature b,.signature span{display:block}.signature span{margin-top:2px;color:#52625e;font-size:8px}
      .footer{margin-top:12px;color:#71817c;text-align:center;font-size:7px}
      @page{size:A4 portrait;margin:10mm}
      @media print{html,body{width:190mm;height:277mm;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}main{height:277mm;overflow:hidden}}
    </style></head><body><main>
      <header class="brand"><div><h1>Sri Golds</h1><p>No.58 Vaitheeshwaran Nagar, Tirupattur - 635653</p><p>Phone: 9659133504</p></div>
      <div style="text-align:right"><strong>GOLD RELEASE FORM</strong><p>Form date: ${new Date().toLocaleDateString("en-IN")}</p></div></header>
      <div class="notice"><strong>Paid in full:</strong> The loan balance is zero. Release the pledged item only after identity verification and signing this receipt.</div>
      <h2>Loan and customer details</h2><div class="grid">
        ${[
          ["Loan number", loan.loan_number], ["Pledge number", loan.gold_pledge_number],
          ["Customer ID", loan.customer_code], ["Customer name", loan.customer_name],
          ["Customer mobile", loan.customer_mobile], ["Address", customerAddress],
          ["Jewellery", loan.jewellery_type], ["Metal", loan.metal_type || "Gold"],
          ["Purity", loan.gold_purity], ["Gross weight", `${loan.gross_weight} ${loan.rate_unit === "carat" ? "ct" : "g"}`],
          ["Stone weight", `${loan.stone_weight || 0} ${loan.rate_unit === "carat" ? "ct" : "g"}`],
          ["Net weight", `${loan.net_gold_weight} ${loan.rate_unit === "carat" ? "ct" : "g"}`],
          ["Loan amount", money(loan.principal_amount)], ["Outstanding balance", money(loan.outstanding_principal)],
          ["Loan date", dateText(loan.loan_date)], ["Maturity date", dateText(loan.maturity_date)],
          ["Released to", recipient]
        ].map(([label, value]) => `<div class="item"><span class="label">${escapeHtml(label)}</span><span class="value">${escapeHtml(value)}</span></div>`).join("")}
      </div>
      <div class="declaration">I confirm that I have received the pledged jewellery described above in satisfactory condition. The shop representative confirms handover after verifying the recipient's identity and the signed customer receipt.</div>
      <div class="signatures">
        <div class="signature"><b>${escapeHtml(recipient)}</b><span>Customer / authorized recipient signature</span><span>Date and time: ____________________</span><span>ID reference (optional): ____________________</span></div>
        <div class="signature"><b>Sri Golds</b><span>Authorized shop representative signature</span><span>Date and time: ____________________</span></div>
        <div class="signature"><b>Witness 1</b><span>Name and signature</span></div>
        <div class="signature"><b>Witness 2</b><span>Name and signature</span></div>
      </div><p class="footer">Keep this signed form with the loan record. Loan completion is recorded after the gold is physically handed over.</p>
    </main><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`);
  printWindow.document.close();
}

function GoldReleaseModal({ loan: loanRow, completionPage, onClose, onReleased }) {
  const [details, setDetails] = useState(null);
  const [recipient, setRecipient] = useState(loanRow.customer_name || "");
  const [notes, setNotes] = useState("");
  const [signedDocument, setSignedDocument] = useState(null);
  const [signatureReceived, setSignatureReceived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/loans/${loanRow.id}/gold-release`)
      .then(({ data }) => {
        if (!active) return;
        setDetails(data);
        setRecipient(data.release?.released_to || data.loan.customer_name || "");
        setNotes(data.release?.notes || "");
      })
      .catch((error) => {
        console.error("Failed to load gold release details:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load gold release details.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [loanRow.id]);

  const loan = details?.loan;
  const release = details?.release;
  const fullyPaid = loan && Number(loan.outstanding_principal ?? loan.principal_amount) === 0;

  const handleRelease = async (event) => {
    event.preventDefault();
    if (!signatureReceived || !recipient.trim() || !signedDocument || saving || release || !fullyPaid) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("released_to", recipient.trim());
      formData.append("notes", notes);
      formData.append("customer_signature_received", "true");
      formData.append("signed_document", signedDocument);
      const { data } = await api.post(`/loans/${loanRow.id}/gold-release`, formData);
      setDetails(data);
      onReleased(data.loan);
      toast.success("Gold release recorded. The loan is now completed.");
    } catch (error) {
      console.error("Failed to record gold release:", error);
      toast.error(error.response?.data?.message || "Could not record gold release.");
    } finally {
      setSaving(false);
    }
  };

  const downloadSignedDocument = async () => {
    try {
      const { data } = await api.get(`/loans/${loanRow.id}/gold-release-document`, { responseType: "blob" });
      const documentUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = documentUrl;
      const extension = data.type === "application/pdf" ? ".pdf" : data.type === "image/png" ? ".png" : ".jpg";
      anchor.download = `signed-gold-release-${loanRow.loan_number}${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(documentUrl), 1000);
    } catch (error) {
      console.error("Failed to download signed release document:", error);
      toast.error(error.response?.data?.message || "Could not download the signed release document.");
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="gold-release-modal-title" className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white p-4 sm:p-5">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{completionPage ? "Complete loan" : "Gold release"}</p>
            <h2 id="gold-release-modal-title" className="mt-1 truncate text-lg font-black text-slate-900">{loanRow.loan_number} · {loanRow.customer_name || "Customer"}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close gold release details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><FiX size={20} /></button>
        </div>
        {loading
          ? <p className="p-8 text-center text-sm text-slate-500">Loading gold release details...</p>
          : !loan
            ? <p className="p-6 text-sm text-rose-700">Gold release details are unavailable.</p>
            : <div className="space-y-4 p-4 sm:p-5">
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-800">Print and record handover</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Print the release form, collect the customer signature, scan or photograph the signed document, then upload it before confirming physical handover.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => printLoanAgreement(loan.id)} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 sm:px-4 sm:text-sm"><FiFileText className="shrink-0" /> Print Loan Agreement</button>
                  <button type="button" onClick={() => printReleaseForm(loan, recipient || loan.customer_name)} disabled={!fullyPaid} className="inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2.5 text-center text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"><FiPrinter className="shrink-0" /> Print Gold Release Form</button>
                </div>
                {!fullyPaid && <p className="mt-2 text-xs font-semibold text-rose-600">Gold release is locked until the outstanding balance is fully paid.</p>}
                {release && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900"><strong>Released to:</strong> {release.released_to}<br /><strong>Release date:</strong> {dateText(release.released_at)}<br />The loan is completed.{release.signed_document_url && <button type="button" onClick={downloadSignedDocument} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-bold text-emerald-800 hover:bg-emerald-50"><FiDownload /> Download signed document</button>}</div>}
              </section>
              {!release && <form onSubmit={handleRelease} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-800">Confirm signed handover</h3>
                <label className="block text-sm font-semibold text-slate-700">Gold received by
                  <input required maxLength={150} value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={!fullyPaid || saving} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10 disabled:bg-slate-50" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Release notes <span className="font-normal text-slate-400">(optional)</span>
                  <textarea maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!fullyPaid || saving} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10 disabled:bg-slate-50" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Upload signed release document
                  <span className="mt-1 block text-xs font-normal text-slate-500">Required before completing the loan. Accepted: PDF, JPG, or PNG (max 10 MB).</span>
                  <span className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-emerald-900">
                    <FiUpload className="shrink-0" />
                    <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required disabled={!fullyPaid || saving} onChange={(event) => setSignedDocument(event.target.files?.[0] || null)} className="min-w-0 flex-1 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-bold file:text-emerald-900" />
                  </span>
                  {signedDocument && <span className="mt-1 block truncate text-xs font-medium text-emerald-700">Selected: {signedDocument.name}</span>}
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
                  <input type="checkbox" checked={signatureReceived} onChange={(event) => setSignatureReceived(event.target.checked)} disabled={!fullyPaid || saving} className="mt-0.5 h-4 w-4 shrink-0 accent-[#008577]" />
                  I verified the signed physical release form, recipient identity, and actual handover of the pledged gold.
                </label>
                <button type="submit" disabled={!fullyPaid || !signatureReceived || !recipient.trim() || !signedDocument || saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "Recording release..." : <><FiCheckCircle /> Confirm Gold Released &amp; Complete Loan</>}
                </button>
              </form>}
            </div>}
      </section>
    </div>
  );
}

export default function GoldRelease() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const completionPage = location.pathname.includes("/completeloan");
  const pagePath = completionPage ? "/admin/loans/completeloan" : "/admin/loans/goldrelease";
  const pageTitle = completionPage ? "Complete Loan" : "Gold Release";
  const [loans, setLoans] = useState([]);
  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [releaseModalLoan, setReleaseModalLoan] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [signedDocument, setSignedDocument] = useState(null);
  const [goldImage, setGoldImage] = useState("");
  const [signedDocumentPreview, setSignedDocumentPreview] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [signatureReceived, setSignatureReceived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const request = id
      ? api.get(`/loans/${id}/gold-release`).then(({ data }) => {
        if (active) {
          setDetails(data);
          setRecipient(data.release?.released_to || data.loan.customer_name || "");
          setNotes(data.release?.notes || "");
        }
      })
      : api.get(completionPage ? "/loans" : "/loans/gold-release").then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid gold release list.");
        if (active) {
          const visibleLoans = completionPage
            ? data.filter((loan) => {
              const balance = Number(loan.outstanding_principal ?? loan.principal_amount);
              const completed = loan.release_status === "Released" || loan.loan_status === "Completed";
              const awaitingRelease = loan.release_status === "Pending Release" && !completed;
              return balance === 0 && (awaitingRelease || completed);
            })
            : data;
          setLoans(visibleLoans);
        }
      });
    request.catch((error) => {
      console.error("Failed to load gold release information:", error);
      if (active) toast.error(error.response?.data?.message || error.message || "Could not load gold release information.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, completionPage]);

  useEffect(() => {
    if (!id || !details?.loan) {
      setPaymentHistory([]);
      return undefined;
    }
    let active = true;
    setHistoryLoading(true);
    api.get(`/loans/${id}/renewals`)
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid payment history.");
        if (active) setPaymentHistory(data);
      })
      .catch((error) => {
        console.error("Failed to load loan payment history:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load loan payment history.");
      })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [id, details?.loan?.id]);

  useEffect(() => {
    if (!details?.loan?.gold_image_url) {
      setGoldImage("");
      return undefined;
    }
    let active = true;
    let imageUrl = "";
    getPrivateFile(details.loan.gold_image_url, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        imageUrl = URL.createObjectURL(data);
        setGoldImage(imageUrl);
      })
      .catch((error) => {
        console.error("Failed to load pledged gold image:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load the pledged gold image.");
      });
    return () => {
      active = false;
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [details?.loan?.gold_image_url]);

  useEffect(() => {
    if (!id || !details?.release?.signed_document_url) {
      setSignedDocumentPreview(null);
      return undefined;
    }
    let active = true;
    let documentUrl = "";
    api.get(`/loans/${id}/gold-release-document`, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        documentUrl = URL.createObjectURL(data);
        setSignedDocumentPreview({ url: documentUrl, type: data.type });
      })
      .catch((error) => {
        console.error("Failed to load signed gold release document:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load the signed release document.");
      });
    return () => {
      active = false;
      if (documentUrl) URL.revokeObjectURL(documentUrl);
    };
  }, [id, details?.release?.signed_document_url]);

  const filteredLoans = loans.filter((loan) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [loan.loan_number, loan.customer_name, loan.customer_code, loan.customer_mobile, loan.gold_pledge_number]
      .some((value) => String(value || "").toLowerCase().includes(query));
    const completed = loan.release_status === "Released" || loan.loan_status === "Completed";
    const status = completed ? "Completed" : "Awaiting Gold Release";
    const matchesStatus = statusFilter === "All" || status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const completedCount = loans.filter((loan) => loan.release_status === "Released" || loan.loan_status === "Completed").length;
  const awaitingReleaseCount = loans.length - completedCount;
  const customerCount = new Set(loans.map((loan) => loan.customer_id).filter(Boolean)).size;

  const handleRelease = async (event) => {
    event.preventDefault();
    if (!signatureReceived || !recipient.trim() || !signedDocument || saving || details?.release) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("released_to", recipient.trim());
      formData.append("notes", notes);
      formData.append("customer_signature_received", "true");
      formData.append("signed_document", signedDocument);
      const { data } = await api.post(`/loans/${id}/gold-release`, formData);
      setDetails(data);
      toast.success("Gold release recorded. The loan is now completed.");
    } catch (error) {
      console.error("Failed to record gold release:", error);
      toast.error(error.response?.data?.message || "Could not record gold release.");
    } finally {
      setSaving(false);
    }
  };

  const downloadSignedDocument = async () => {
    try {
      const { data } = await api.get(`/loans/${id}/gold-release-document`, { responseType: "blob" });
      const documentUrl = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = documentUrl;
      const extension = data.type === "application/pdf" ? ".pdf" : data.type === "image/png" ? ".png" : ".jpg";
      anchor.download = `signed-gold-release-${loan.loan_number}${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(documentUrl), 1000);
    } catch (error) {
      console.error("Failed to download signed release document:", error);
      toast.error(error.response?.data?.message || "Could not download the signed release document.");
    }
  };

  if (!id) {
    return (
      <main className="space-y-6 p-2">
        <section aria-label="Gold release summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: completionPage ? "Completion Records" : "Eligible for Release", value: loans.length, icon: FiCheckCircle, style: "border-slate-200 text-[#008577]", iconStyle: "bg-teal-50 text-[#008577]" },
            { label: "Awaiting Handover", value: awaitingReleaseCount, icon: FiCalendar, style: "border-amber-100 text-amber-700", iconStyle: "bg-amber-50 text-amber-700" },
            { label: "Customers", value: customerCount, icon: FiUsers, style: "border-emerald-100 text-emerald-700", iconStyle: "bg-emerald-50 text-emerald-700" }
          ].map(({ label, value, icon: Icon, style, iconStyle }) => (
            <article key={label} className={`flex items-center justify-between rounded-2xl border bg-white p-5 shadow-sm ${style}`}>
              <div><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold">{loading ? "—" : value}</p></div>
              <span className={`rounded-xl p-3 ${iconStyle}`}><Icon size={21} /></span>
            </article>
          ))}
        </section>
        <section aria-label="Gold release filters" className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_10px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <label className="relative min-w-0 sm:w-1/3 sm:min-w-[280px] sm:flex-none">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search gold release records</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loans by number, customer..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 py-3 pl-12 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-300 focus:border-[#008577] focus:bg-white focus:ring-4 focus:ring-emerald-700/10" />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:ml-auto sm:justify-start sm:gap-3">
            <select aria-label="Filter gold release records by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}
              className="min-w-[180px] rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-600 outline-none transition hover:border-slate-300 focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10">
              <option value="All">All Status</option>
              {completionPage && <option value="Awaiting Gold Release">Awaiting Gold Release</option>}
              {completionPage && <option value="Completed">Completed</option>}
              {!completionPage && <option value="Awaiting Gold Release">Awaiting Gold Release</option>}
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <button type="button" onClick={() => setViewMode("table")} aria-label="List view" aria-pressed={viewMode === "table"} className={`rounded-lg p-2.5 transition-all ${viewMode === "table" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiList size={17} /></button>
              <button type="button" onClick={() => setViewMode("card")} aria-label="Card view" aria-pressed={viewMode === "card"} className={`rounded-lg p-2.5 transition-all ${viewMode === "card" ? "bg-[#064A41] text-white shadow-sm" : "text-slate-400 hover:text-slate-700"}`}><FiGrid size={17} /></button>
            </div>
          </div>
        </section>
        {viewMode === "table" ? <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
            <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">{["S No", "Loan Number", "Customer", "Mobile", "Pledge Number", "Outstanding", "Maturity", ...(completionPage ? ["Status"] : []), ""].map((label, index) => <th key={`${label}-${index}`} className="whitespace-nowrap px-3 py-3 first:rounded-tl-xl first:pl-4 last:rounded-tr-xl last:pr-4">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{loading
              ? <tr><td colSpan={completionPage ? "9" : "8"} className="px-4 py-14 text-center text-sm text-slate-400">Loading loans...</td></tr>
              : !filteredLoans.length
                ? <tr><td colSpan={completionPage ? "9" : "8"} className="px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your filters." : completionPage ? "No fully paid or completed loans are available." : "No fully paid loans are awaiting gold release."}</td></tr>
                : filteredLoans.map((loan, index) => {
                  const completed = loan.release_status === "Released" || loan.loan_status === "Completed";
                  return (
                    <tr key={loan.id} className="cursor-pointer text-sm transition-colors hover:bg-emerald-50/60" onClick={() => navigate(`${pagePath}/${loan.id}`)}>
                      <td className="whitespace-nowrap px-3 py-4 pl-4 text-slate-500">{index + 1}</td>
                      <td className="whitespace-nowrap px-3 py-4 font-bold text-[#064A41]">{loan.loan_number}</td>
                      <td className="px-3 py-4"><span className="block font-semibold text-slate-800">{loan.customer_name || "—"}</span><span className="text-xs text-slate-400">{loan.customer_code || "—"}</span></td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-600">{loan.customer_mobile || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-600">{loan.gold_pledge_number || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-4 font-bold text-emerald-700">{money(loan.outstanding_principal ?? loan.principal_amount)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-600">{dateText(loan.maturity_date)}</td>
                      {completionPage && <td className="whitespace-nowrap px-3 py-4"><span className={`rounded-full px-2.5 py-1.5 text-xs font-bold ${completed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{completed ? "Completed" : "Awaiting Gold Release"}</span></td>}
                      <td className="whitespace-nowrap px-3 py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <Link to={`${pagePath}/${loan.id}`} onClick={(event) => event.stopPropagation()} aria-label={`View gold release record for ${loan.loan_number}`} title="View record" className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><FiEye size={14} /> View</Link>
                          {!completed && <button type="button" onClick={(event) => { event.stopPropagation(); setReleaseModalLoan(loan); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{completionPage ? "Complete loan" : "Prepare release form"}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table></div>
        </section> : loading
          ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">Loading loans...</section>
          : !filteredLoans.length
            ? <section className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your filters." : completionPage ? "No fully paid or completed loans are available." : "No fully paid loans are awaiting gold release."}</section>
            : <section aria-label="Gold release records in card view" className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredLoans.map((loan) => {
                const completed = loan.release_status === "Released" || loan.loan_status === "Completed";
                return <article key={loan.id} className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Loan Number</p><h2 className="mt-1 break-words font-bold text-[#064A41]">{loan.loan_number}</h2><p className="mt-2 font-semibold text-slate-800">{loan.customer_name || "—"}</p><p className="text-xs text-slate-500">{loan.customer_mobile || "Mobile unavailable"}</p></div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold ${completed ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{completed ? "Completed" : "Awaiting Gold Release"}</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                    <Info label="Pledge Number" value={loan.gold_pledge_number} /><Info label="Outstanding" value={money(loan.outstanding_principal ?? loan.principal_amount)} />
                    <Info label="Maturity" value={dateText(loan.maturity_date)} /><Info label="Customer ID" value={loan.customer_code} />
                  </dl>
                  <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <Link to={`${pagePath}/${loan.id}`} aria-label={`View gold release record for ${loan.loan_number}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"><FiEye size={14} /> View</Link>
                    {!completed && <button type="button" onClick={() => setReleaseModalLoan(loan)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">{completionPage ? "Complete loan" : "Prepare release form"}</button>}
                  </div>
                </article>;
              })}
            </section>}
        {releaseModalLoan && <GoldReleaseModal
          loan={releaseModalLoan}
          completionPage={completionPage}
          onClose={() => setReleaseModalLoan(null)}
          onReleased={(updatedLoan) => setLoans((current) => completionPage
            ? current.map((item) => item.id === updatedLoan.id ? { ...item, ...updatedLoan } : item)
            : current.filter((item) => item.id !== updatedLoan.id))}
        />}
      </main>
    );
  }

  if (loading) return <main className="p-6 text-sm text-slate-500">Loading gold release form...</main>;
  if (!details?.loan) return <main className="space-y-3 p-6"><p className="text-sm text-slate-600">Loan completion record could not be loaded.</p><Link to={pagePath} className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> {pageTitle}</Link></main>;

  const { loan, release } = details;
  const released = Boolean(release);
  const balance = Number(loan.outstanding_principal ?? loan.principal_amount);
  const fullyPaid = balance === 0;
  const unit = loan.rate_unit === "carat" ? "ct" : "g";
  const customerAddress = [
    loan.customer_address, loan.customer_city, loan.customer_district,
    loan.customer_state, loan.customer_pincode
  ].filter(Boolean).join(", ");
  const releaseStatus = released ? "Completed · Gold released"
    : fullyPaid ? "Paid · Awaiting gold release"
      : "Balance due · Not eligible";

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 p-4 sm:p-6">
      <Link to={pagePath} className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> {pageTitle} list</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#064A41] to-[#087568] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">{completionPage ? "Complete Loan" : "Gold Release Form"}</p><h1 className="mt-1 text-2xl font-extrabold">{loan.loan_number}</h1><p className="mt-1 text-sm text-white/75">{loan.customer_name} · Pledge {loan.gold_pledge_number}</p></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${released ? "bg-emerald-300/20 text-emerald-50" : fullyPaid ? "bg-amber-300/20 text-amber-50" : "bg-rose-300/20 text-rose-50"}`}>{released ? "Gold released · Loan completed" : fullyPaid ? "Paid · Awaiting gold release" : "Balance due · Not eligible"}</span>
      </header>

      {released ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div><p className="text-sm font-extrabold text-emerald-900">Completed loan file</p><p className="mt-1 text-xs text-emerald-800">Loan agreement, payment history, pledged-gold evidence, and signed release form.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => printLoanAgreement(loan.id)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100"><FiPrinter /> Print loan agreement</button>
              {release.signed_document_url && <button type="button" onClick={downloadSignedDocument} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100"><FiDownload /> Download signed release</button>}
            </div>
          </div>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><FiFileText /> Customer and loan agreement</h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Loan number" value={loan.loan_number} /><Info label="Pledge number" value={loan.gold_pledge_number} />
              <Info label="Customer ID" value={loan.customer_code} /><Info label="Customer name" value={loan.customer_name} />
              <Info label="Mobile" value={loan.customer_mobile} /><Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
              <Info label="Email" value={loan.customer_email} /><Info label="KYC status" value={loan.customer_kyc_status} />
              <Info label="Date of birth" value={dateText(loan.customer_date_of_birth)} /><Info label="Gender" value={loan.customer_gender} />
              <Info label="Occupation" value={loan.customer_occupation} />
              <div className="sm:col-span-2 xl:col-span-4"><Info label="Customer address" value={customerAddress} /></div>
              <Info label="Loan amount" value={money(loan.principal_amount)} /><Info label="Current balance" value={money(balance)} />
              <Info label="Loan date" value={dateText(loan.loan_date)} /><Info label="Maturity date" value={dateText(loan.maturity_date)} />
              <Info label="Loan status" value={releaseStatus} /><Info label="Payment frequency" value={loan.payment_frequency} />
              <Info label="Interest type" value={String(loan.interest_type || "").replaceAll("_", " ")} />
              <Info label="Interest rate" value={`${Number(loan.interest_rate || 0).toFixed(2)}% per ${String(loan.interest_frequency || "").replaceAll("_", " ")}`} />
              <Info label="Interest start date" value={dateText(loan.interest_calculation_start_date)} />
              <Info label="Day count convention" value={loan.day_count_convention} />
              <Info label="Compounding frequency" value={loan.compounding_frequency} />
              <Info label="Custom period" value={loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`} />
              <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
              <Info label="Interest-free period" value={`${loan.interest_free_days || 0} days`} />
              <Info label="Processing fee" value={money(loan.processing_fee)} /><Info label="Other charges" value={money(loan.other_charges)} />
              <Info label="Fixed interest amount" value={loan.fixed_interest_amount == null ? "—" : money(loan.fixed_interest_amount)} />
              <Info label="Late payment rate" value={loan.late_payment_interest_rate == null ? "—" : `${Number(loan.late_payment_interest_rate).toFixed(2)}%`} />
              <Info label="Minimum interest" value={loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount)} />
              <Info label="Maximum interest" value={loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount)} />
              <div className="sm:col-span-2 xl:col-span-4"><Info label="Loan notes" value={loan.notes} /></div>
              <Info label="Guarantor" value={loan.guarantor_name} /><Info label="Guarantor mobile" value={loan.guarantor_mobile} />
              <Info label="Guarantor email" value={loan.guarantor_email} /><Info label="Guarantor relationship" value={loan.guarantor_relationship} />
              <div className="sm:col-span-2 xl:col-span-4"><Info label="Guarantor address" value={loan.guarantor_address} /></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-800">Pledged jewellery and valuation</h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Jewellery type" value={loan.jewellery_type} /><Info label="Metal type" value={loan.metal_type || "Gold"} />
              <Info label="Purity / quality" value={loan.gold_purity} /><Info label="Gross weight" value={`${loan.gross_weight} ${unit}`} />
              <Info label="Stone weight" value={`${loan.stone_weight || 0} ${unit}`} /><Info label="Net weight" value={`${loan.net_gold_weight} ${unit}`} />
              <Info label="Gold valuation" value={money(loan.gold_valuation)} />
              <Info label="Rate snapshot" value={loan.gold_rate_per_gram == null ? "—" : `${money(loan.gold_rate_per_gram)} / ${unit}`} />
              <Info label="Rate date" value={dateText(loan.gold_rate_date)} />
            </dl>
            {goldImage && <img src={goldImage} alt={`Pledged ${loan.jewellery_type || "gold"}`} className="mt-4 max-h-[28rem] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-2" />}
            {!loan.gold_image_url && <p className="mt-3 text-sm text-slate-500">No pledged gold image was saved for this loan.</p>}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-slate-800"><FiCalendar /> Payment and renewal history</h2><p className="mt-1 text-xs text-slate-500">Every recorded renewal payment and principal allocation for this loan.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">{["Date", "Period start", "Payment", "Interest accrued", "Interest paid", "Principal paid", "Balance before", "Balance after", "Previous maturity", "New maturity"].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 first:pl-5">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {historyLoading ? <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">Loading payment history...</td></tr>
                    : !paymentHistory.length ? <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">No renewal payments are recorded for this loan.</td></tr>
                      : paymentHistory.map((payment) => <tr key={payment.id}>
                        <td className="whitespace-nowrap px-4 py-3 pl-5">{dateText(payment.renewal_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{dateText(payment.period_start_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold">{money(payment.payment_amount)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(payment.accrued_interest)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(payment.interest_paid)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(payment.principal_paid)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{money(payment.principal_before)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-800">{money(payment.principal_after)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{dateText(payment.previous_maturity_date)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{dateText(payment.new_maturity_date)}</td>
                      </tr>)}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-emerald-900"><FiShield /> Gold release record</h2>
            <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Info label="Release status" value={releaseStatus} /><Info label="Released to" value={release.released_to} />
              <Info label="Release date" value={dateText(release.released_at)} /><Info label="Customer signature confirmed" value={release.confirmed_customer_signature ? "Yes" : "No"} />
              <div className="sm:col-span-2 xl:col-span-4"><Info label="Release notes" value={release.notes} /></div>
            </dl>
            {signedDocumentPreview?.type === "application/pdf"
              ? <iframe title="Signed gold release form" src={signedDocumentPreview.url} className="mt-4 h-[700px] w-full rounded-xl border border-slate-200" />
              : signedDocumentPreview?.type?.startsWith("image/")
                ? <img src={signedDocumentPreview.url} alt="Signed gold release form" className="mt-4 max-h-[48rem] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-2" />
                : <p className="mt-4 text-sm text-slate-500">{release.signed_document_url ? "Loading signed release document preview..." : "No signed release document is attached."}</p>}
          </section>
        </section>
      ) : (
        <>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-800">Verify customer, loan, and pledged jewellery</h2>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Customer ID" value={loan.customer_code} /><Info label="Customer name" value={loan.customer_name} />
            <Info label="Mobile" value={loan.customer_mobile} /><Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
            <Info label="Email" value={loan.customer_email} /><Info label="Date of birth" value={dateText(loan.customer_date_of_birth)} />
            <Info label="Gender" value={loan.customer_gender} /><Info label="Occupation" value={loan.customer_occupation} />
            <Info label="KYC status" value={loan.customer_kyc_status} />
            <div className="sm:col-span-2 xl:col-span-3"><Info label="Address" value={customerAddress} /></div>
            <Info label="Loan number" value={loan.loan_number} /><Info label="Gold pledge number" value={loan.gold_pledge_number} />
            <Info label="Jewellery" value={`${loan.jewellery_type} · ${loan.metal_type || "Gold"}`} /><Info label="Purity" value={loan.gold_purity} />
            <Info label="Gross weight" value={`${loan.gross_weight} ${unit}`} />
            <Info label="Stone weight" value={`${loan.stone_weight || 0} ${unit}`} />
            <Info label="Net weight" value={`${loan.net_gold_weight} ${unit}`} />
            <Info label="Loan amount" value={money(loan.principal_amount)} /><Info label="Outstanding balance" value={money(balance)} />
            <Info label="Loan date" value={dateText(loan.loan_date)} /><Info label="Maturity date" value={dateText(loan.maturity_date)} />
            <Info label="Interest rate" value={`${Number(loan.interest_rate || 0).toFixed(2)}% per ${String(loan.interest_frequency || "").replaceAll("_", " ")}`} />
            <Info label="Interest type" value={String(loan.interest_type || "").replaceAll("_", " ")} />
            <Info label="Interest start date" value={dateText(loan.interest_calculation_start_date)} />
            <Info label="Payment frequency" value={loan.payment_frequency} />
            <Info label="Compounding frequency" value={loan.compounding_frequency} />
            <Info label="Custom interest period" value={loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`} />
            <Info label="Day-count convention" value={loan.day_count_convention} />
            <Info label="Grace period" value={`${loan.grace_period_days || 0} days`} />
            <Info label="Interest-free period" value={`${loan.interest_free_days || 0} days`} />
            <Info label="Late payment rate" value={loan.late_payment_interest_rate == null ? "—" : `${Number(loan.late_payment_interest_rate).toFixed(2)}%`} />
            <Info label="Fixed interest amount" value={loan.fixed_interest_amount == null ? "—" : money(loan.fixed_interest_amount)} />
            <Info label="Minimum interest" value={loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount)} />
            <Info label="Maximum interest" value={loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount)} />
            <Info label="Processing fee" value={money(loan.processing_fee)} /><Info label="Other charges" value={money(loan.other_charges)} />
            <Info label="Guarantor" value={loan.guarantor_name} /><Info label="Guarantor mobile" value={loan.guarantor_mobile} />
            <Info label="Guarantor email" value={loan.guarantor_email} /><Info label="Guarantor relationship" value={loan.guarantor_relationship} />
            <div className="sm:col-span-2 xl:col-span-3"><Info label="Guarantor address" value={loan.guarantor_address} /></div>
            <div className="sm:col-span-2 xl:col-span-3"><Info label="Loan notes" value={loan.notes} /></div>
          </dl>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Gold valuation" value={money(loan.gold_valuation)} />
            <Info label="Gold rate snapshot" value={loan.gold_rate_per_gram == null ? "—" : `${money(loan.gold_rate_per_gram)} / ${unit}`} />
            <Info label="Gold rate date" value={dateText(loan.gold_rate_date)} />
          </div>
          {goldImage && <img src={goldImage} alt={`Pledged ${loan.jewellery_type || "gold"}`} className="mt-4 max-h-72 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-2" />}
          {!loan.gold_image_url && <p className="mt-3 text-sm text-slate-500">No pledged gold image was saved for this loan.</p>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Print and record handover</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Print the release form, collect the customer signature, scan or photograph the signed document, then upload it before confirming physical handover.</p>
            <button type="button" onClick={() => printLoanAgreement(loan.id)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><FiFileText /> Print Loan Agreement</button>
            <button type="button" onClick={() => printReleaseForm(loan, recipient || loan.customer_name)} disabled={!fullyPaid}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><FiPrinter /> Print Gold Release Form</button>
            {!fullyPaid && <p className="mt-2 text-xs font-semibold text-rose-600">Gold release is locked until the outstanding balance is fully paid.</p>}
            {released && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900"><strong>Released to:</strong> {release.released_to}<br /><strong>Release date:</strong> {dateText(release.released_at)}<br />The loan is completed.{release.signed_document_url && <button type="button" onClick={downloadSignedDocument} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 font-bold text-emerald-800 hover:bg-emerald-50"><FiDownload /> Download signed document</button>}</div>}
          </section>
          {!released && <form onSubmit={handleRelease} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Confirm signed handover</h2>
            <label className="block text-sm font-semibold text-slate-700">Gold received by
              <input required maxLength={150} value={recipient} onChange={(event) => setRecipient(event.target.value)} disabled={!fullyPaid || saving}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10 disabled:bg-slate-50" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Release notes <span className="font-normal text-slate-400">(optional)</span>
              <textarea maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!fullyPaid || saving}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10 disabled:bg-slate-50" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">Upload signed release document
              <span className="mt-1 block text-xs font-normal text-slate-500">Required before completing the loan. Accepted: PDF, JPG, or PNG (max 10 MB).</span>
              <span className="mt-2 flex min-h-12 items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3 py-2 text-sm font-semibold text-emerald-900">
                <FiUpload className="shrink-0" />
                <input type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required={!released} disabled={!fullyPaid || saving}
                  onChange={(event) => setSignedDocument(event.target.files?.[0] || null)}
                  className="min-w-0 flex-1 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-bold file:text-emerald-900" />
              </span>
              {signedDocument && <span className="mt-1 block truncate text-xs font-medium text-emerald-700">Selected: {signedDocument.name}</span>}
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
              <input type="checkbox" checked={signatureReceived} onChange={(event) => setSignatureReceived(event.target.checked)} disabled={!fullyPaid || saving} className="mt-0.5 h-4 w-4 shrink-0 accent-[#008577]" />
              I verified the signed physical release form, recipient identity, and actual handover of the pledged gold.
            </label>
            <button type="submit" disabled={!fullyPaid || !signatureReceived || !recipient.trim() || !signedDocument || saving}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#064A41] px-4 py-3 text-sm font-bold text-white hover:bg-[#087263] disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Recording release..." : <><FiCheckCircle /> Confirm Gold Released & Complete Loan</>}
            </button>
          </form>}
          {released && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><FiShield className="mb-2" size={22} /><strong>Release complete.</strong><p className="mt-1 text-xs">This loan is now marked Completed after gold handover.</p><Link to="/admin/loans/allloans" className="mt-4 inline-flex font-bold underline">Return to All Loans</Link></div>}
        </aside>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="flex items-center gap-2 font-bold text-slate-800"><FiCalendar /> Payment and renewal history</h2><p className="mt-1 text-xs text-slate-500">Payment allocation and balance changes for this loan.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">{["Date", "Period start", "Payment", "Interest accrued", "Interest paid", "Principal paid", "Balance before", "Balance after", "Previous maturity", "New maturity"].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 first:pl-5">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {historyLoading ? <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">Loading payment history...</td></tr>
                : !paymentHistory.length ? <tr><td colSpan="10" className="px-4 py-10 text-center text-slate-400">No renewal payments are recorded for this loan.</td></tr>
                  : paymentHistory.map((payment) => <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-3 pl-5">{dateText(payment.renewal_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateText(payment.period_start_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold">{money(payment.payment_amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(payment.accrued_interest)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(payment.interest_paid)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(payment.principal_paid)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(payment.principal_before)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-emerald-800">{money(payment.principal_after)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateText(payment.previous_maturity_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{dateText(payment.new_maturity_date)}</td>
                  </tr>)}
            </tbody>
          </table>
        </div>
      </section>
      </>
      )}
    </main>
  );
}
