import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiDownload, FiPrinter, FiSearch, FiShield, FiUpload } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));

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
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [signedDocument, setSignedDocument] = useState(null);
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
      : api.get("/loans/gold-release").then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The server returned an invalid gold release list.");
        if (active) setLoans(data);
      });
    request.catch((error) => {
      console.error("Failed to load gold release information:", error);
      if (active) toast.error(error.response?.data?.message || error.message || "Could not load gold release information.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const filteredLoans = loans.filter((loan) => {
    const query = search.trim().toLowerCase();
    return !query || [loan.loan_number, loan.customer_name, loan.customer_code, loan.customer_mobile]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

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
      <main className="space-y-6 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#008577]">Loan Management</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{pageTitle}</h1><p className="mt-1 text-sm text-slate-500">Fully paid loans awaiting signed documents and physical gold handover.</p></div>
          <span className="text-xs font-semibold text-slate-400">{loans.length} eligible loans</span>
        </header>
        <label className="relative block max-w-xl"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search eligible loans</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search loan number, customer, mobile..." className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#008577] focus:ring-4 focus:ring-emerald-700/10" /></label>
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold text-slate-800">Loans ready to complete</h2><p className="mt-0.5 text-xs text-slate-500">Select a fully paid loan, upload the signed form, and confirm gold handover.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
            <thead><tr className="bg-[#064A41] text-[11px] font-bold uppercase tracking-wide text-emerald-50/90">{["Loan Number", "Customer", "Mobile", "Pledge Number", "Outstanding", "Maturity", ""].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 first:pl-5">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{loading
              ? <tr><td colSpan="7" className="px-4 py-14 text-center text-sm text-slate-400">Loading eligible loans...</td></tr>
              : !filteredLoans.length
                ? <tr><td colSpan="7" className="px-4 py-14 text-center text-sm text-slate-400">{loans.length ? "No loans match your search." : "No fully paid loans are awaiting gold release."}</td></tr>
                : filteredLoans.map((loan) => <tr key={loan.id} className="cursor-pointer text-sm transition-colors hover:bg-emerald-50/60" onClick={() => navigate(`${pagePath}/${loan.id}`)}>
                  <td className="whitespace-nowrap px-4 py-4 pl-5 font-bold text-[#064A41]">{loan.loan_number}</td>
                  <td className="px-4 py-4"><span className="block font-semibold text-slate-800">{loan.customer_name || "—"}</span><span className="text-xs text-slate-400">{loan.customer_code || "—"}</span></td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{loan.customer_mobile || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{loan.gold_pledge_number}</td>
                  <td className="whitespace-nowrap px-4 py-4 font-bold text-emerald-700">{money(loan.outstanding_principal)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">{dateText(loan.maturity_date)}</td>
                  <td className="px-4 py-4 pr-5"><Link to={`${pagePath}/${loan.id}`} onClick={(event) => event.stopPropagation()} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">Complete loan</Link></td>
                </tr>)}
            </tbody>
          </table></div>
        </section>
      </main>
    );
  }

  if (loading) return <main className="p-6 text-sm text-slate-500">Loading gold release form...</main>;
  if (!details?.loan) return <main className="space-y-3 p-6"><p className="text-sm text-slate-600">Loan completion record could not be loaded.</p><Link to={pagePath} className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> {pageTitle}</Link></main>;

  const { loan, release } = details;
  const released = Boolean(release);
  const balance = Number(loan.outstanding_principal ?? loan.principal_amount);
  const fullyPaid = balance === 0;

  return (
    <main className="mx-auto max-w-[1280px] space-y-5 p-4 sm:p-6">
      <Link to={pagePath} className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> {pageTitle} list</Link>
      <header className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-[#064A41] to-[#087568] p-5 text-white shadow-lg sm:flex-row sm:items-center sm:p-6">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">{completionPage ? "Complete Loan" : "Gold Release Form"}</p><h1 className="mt-1 text-2xl font-extrabold">{loan.loan_number}</h1><p className="mt-1 text-sm text-white/75">{loan.customer_name} · Pledge {loan.gold_pledge_number}</p></div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${released ? "bg-emerald-300/20 text-emerald-50" : fullyPaid ? "bg-amber-300/20 text-amber-50" : "bg-rose-300/20 text-rose-50"}`}>{released ? "Gold released · Loan completed" : fullyPaid ? "Paid · Awaiting gold release" : "Balance due · Not eligible"}</span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-800">Verify customer, loan, and pledged jewellery</h2>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Info label="Customer ID" value={loan.customer_code} /><Info label="Customer name" value={loan.customer_name} />
            <Info label="Mobile" value={loan.customer_mobile} /><Info label="Alternate mobile" value={loan.customer_alternate_mobile} />
            <Info label="Email" value={loan.customer_email} />
            <div className="sm:col-span-2 xl:col-span-3"><Info label="Address" value={[loan.customer_address, loan.customer_city, loan.customer_district, loan.customer_state, loan.customer_pincode].filter(Boolean).join(", ")} /></div>
            <Info label="Loan number" value={loan.loan_number} /><Info label="Gold pledge number" value={loan.gold_pledge_number} />
            <Info label="Jewellery" value={`${loan.jewellery_type} · ${loan.metal_type || "Gold"}`} /><Info label="Purity" value={loan.gold_purity} />
            <Info label="Gross weight" value={`${loan.gross_weight} ${loan.rate_unit === "carat" ? "ct" : "g"}`} />
            <Info label="Stone weight" value={`${loan.stone_weight || 0} ${loan.rate_unit === "carat" ? "ct" : "g"}`} />
            <Info label="Net weight" value={`${loan.net_gold_weight} ${loan.rate_unit === "carat" ? "ct" : "g"}`} />
            <Info label="Loan amount" value={money(loan.principal_amount)} /><Info label="Outstanding balance" value={money(balance)} />
            <Info label="Loan date" value={dateText(loan.loan_date)} /><Info label="Maturity date" value={dateText(loan.maturity_date)} />
            <Info label="Interest rate" value={`${Number(loan.interest_rate || 0).toFixed(2)}% per ${String(loan.interest_frequency || "").replaceAll("_", " ")}`} />
          </dl>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Print and record handover</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Print the release form, collect the customer signature, scan or photograph the signed document, then upload it before confirming physical handover.</p>
            <button type="button" onClick={() => printReleaseForm(loan, recipient || loan.customer_name)} disabled={!fullyPaid}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"><FiPrinter /> Print Gold Release Form</button>
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
    </main>
  );
}
