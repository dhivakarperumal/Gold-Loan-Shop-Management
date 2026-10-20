import { useCallback, useEffect, useRef, useState } from "react";
import { Search, ShieldCheck, Users, Clock3, CheckCircle2, XCircle, ChevronLeft, ChevronRight, FileText, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import DateRangeFilter from "../Components/DateRangeFilter";

const statusLabels = {
  pending: "Pending",
  in_review: "In review",
  verified: "Verified",
  rejected: "Rejected",
  resubmission_required: "Changes requested",
  failed: "Failed"
};

const documentLabels = {
  passport: "Passport",
  voter_id: "Voter ID",
  driving_license: "Driving licence",
  pan: "PAN",
  ration_card: "Ration card",
  aadhaar: "Aadhaar card"
};

const dateLabel = (value) => value ? new Date(value).toLocaleString() : "—";

const AdminKyc = () => {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [allowedDocumentTypes, setAllowedDocumentTypes] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [documentUrls, setDocumentUrls] = useState({});
  const documentUrlsRef = useRef({});

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get("/kyc/admin/stats", {
        params: { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }
      });
      setStats(response.data.stats || {});
      setAllowedDocumentTypes(response.data.allowedDocumentTypes || []);
      setStatsError(false);
    } catch (error) {
      setStatsError(true);
      throw error;
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const loadApplications = useCallback(async () => {
    try {
      const response = await api.get("/kyc/admin/applications", {
        params: {
          search,
          status,
          dateFrom: dateRange.startDate,
          dateTo: dateRange.endDate,
          page,
          pageSize: 15
        }
      });
      setApplications(response.data.applications || []);
      setPages(Math.max(1, response.data.pages || 1));
      setListError("");
      if (page > (response.data.pages || 1) && page > 1) setPage(response.data.pages || 1);
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load KYC applications";
      setListError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, page, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStats().catch((error) => toast.error(error.response?.data?.message || "Unable to load KYC statistics"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStats]);

  useEffect(() => {
    const timer = window.setTimeout(loadApplications, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [loadApplications, search]);

  useEffect(() => {
    documentUrlsRef.current = documentUrls;
  }, [documentUrls]);

  useEffect(() => () => {
    Object.values(documentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const openApplication = async (id) => {
    setSelected(null);
    try {
      const response = await api.get(`/kyc/admin/applications/${id}`);
      setSelected(response.data.application);
      setReason(response.data.application.review_reason || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load application details");
    }
  };

  const openDocument = async (documentId) => {
    try {
      const response = await api.get(`/kyc/admin/documents/${documentId}`, { responseType: "blob" });
      const nextUrl = URL.createObjectURL(response.data);
      setDocumentUrls((current) => {
        if (current[documentId]) URL.revokeObjectURL(current[documentId]);
        return { ...current, [documentId]: nextUrl };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to open this document");
    }
  };

  const saveReview = async (decision) => {
    if (["rejected", "resubmission_required"].includes(decision) && !reason.trim()) {
      toast.error("Add a reason for rejection or a document resubmission request");
      return;
    }
    setSaving(true);
    try {
      const response = await api.patch(`/kyc/admin/applications/${selected.id}/review`, {
        decision,
        reason: reason.trim()
      });
      setSelected(response.data.application);
      toast.success("KYC review saved");
      await Promise.all([loadStats(), loadApplications()]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save KYC review");
    } finally {
      setSaving(false);
    }
  };

  const statCards = [
    { label: "Total applications", value: statsError ? "Unavailable" : stats ? Object.values(stats).reduce((sum, count) => sum + Number(count || 0), 0) : "—", icon: Users, color: "text-slate-700 bg-slate-100" },
    { label: "Pending", value: statsError ? "Unavailable" : stats?.pending ?? "—", icon: Clock3, color: "text-amber-700 bg-amber-100" },
    { label: "In review", value: statsError ? "Unavailable" : stats?.in_review ?? "—", icon: ShieldCheck, color: "text-sky-700 bg-sky-100" },
    { label: "Verified", value: statsError ? "Unavailable" : stats?.verified ?? "—", icon: CheckCircle2, color: "text-emerald-700 bg-emerald-100" }
  ];

  return (
    <div className="min-h-[70vh] space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#087568]">Administration</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Manual KYC review</h1>
        <p className="mt-2 text-sm text-slate-500">Review customer-submitted documents and record an auditable decision.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="KYC application statistics">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}><Icon size={22} /></span>
            <div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
          </article>
        ))}
      </section>

      {allowedDocumentTypes?.length === 0 && (
        <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-semibold">Customer submissions are disabled</h2>
          <p className="mt-1 leading-6">
            No approved document types are configured. Set <code className="rounded bg-amber-100 px-1 py-0.5">KYC_ALLOWED_DOCUMENT_TYPES</code> in <code className="rounded bg-amber-100 px-1 py-0.5">Backend/.env</code> to your approved comma-separated types, then restart the backend. Until then the customer KYC form cannot submit documents.
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <DateRangeFilter onApply={(range) => {
            setLoading(true);
            setDateRange(range);
            setPage(1);
          }} />
          <label className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input value={search} onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1); }} placeholder="Search name, email, phone or ID" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#087568]" />
          </label>
          <select value={status} onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-3">Applicant</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Submitted</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-5 py-10 text-center text-slate-500">Loading applications…</td></tr>
              ) : listError ? (
                <tr><td colSpan="5" className="px-5 py-10 text-center text-rose-700">{listError}</td></tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-10 text-center">
                    <p className="font-medium text-slate-700">
                      {search || status !== "all" || dateRange.startDate || dateRange.endDate
                        ? "No KYC applications match these filters."
                        : "No KYC applications have been submitted yet."}
                    </p>
                    {!search && status === "all" && !dateRange.startDate && !dateRange.endDate && (
                      <p className="mt-2 text-sm text-slate-500">
                        {allowedDocumentTypes?.length === 0
                          ? "Configure approved document types before asking customers to submit."
                          : "Ask a customer to sign in with a customer account, open KYC Verification, and submit documents. Their application will appear here."}
                      </p>
                    )}
                  </td>
                </tr>
              ) : applications.map((application) => (
                <tr key={application.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4"><p className="font-semibold text-slate-900">{application.applicant_name}</p><p className="text-xs text-slate-500">Application #{application.id}</p></td>
                  <td className="px-5 py-4 text-slate-600">{application.applicant_email || "—"}<p className="mt-1 text-xs text-slate-400">{application.applicant_phone || "—"}</p></td>
                  <td className="px-5 py-4 text-slate-600">{dateLabel(application.created_at)}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{statusLabels[application.status] || application.status}</span></td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => openApplication(application.id)} className="rounded-lg bg-[#00675d] px-3 py-2 text-xs font-semibold text-white hover:bg-[#004d45]">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1); }} aria-label="Previous page" className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"><ChevronLeft size={18} /></button>
            <button type="button" disabled={page >= pages || loading} onClick={() => { setLoading(true); setPage((current) => current + 1); }} aria-label="Next page" className="rounded-lg border border-slate-300 p-2 disabled:opacity-40"><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="kyc-review-title">
          <section className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5">
              <div><p className="text-xs font-bold uppercase tracking-wider text-[#087568]">Application #{selected.id}</p><h2 id="kyc-review-title" className="mt-1 text-xl font-bold text-slate-900">{selected.applicant_name}</h2><p className="mt-1 text-sm text-slate-500">{selected.applicant_email} · {selected.applicant_phone || "No phone"}</p></div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close review" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X /></button>
            </header>
            <div className="space-y-6 p-5">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <span>Status: <strong className="text-slate-900">{statusLabels[selected.status] || selected.status}</strong></span>
                <span>Submitted: {dateLabel(selected.created_at)}</span>
                <span>Consent version: {selected.consent_version}</span>
              </div>
              <section>
                <h3 className="mb-3 font-semibold text-slate-900">Documents</h3>
                <ul className="space-y-2">
                  {selected.documents?.map((document) => (
                    <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                      <span className="flex items-center gap-2 text-sm text-slate-700"><FileText size={17} className="text-[#087568]" />{documentLabels[document.document_type] || document.document_type} · {(document.file_size / 1024).toFixed(0)} KB</span>
                      {documentUrls[document.id]
                        ? <a href={documentUrls[document.id]} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#087568] underline">Open private file</a>
                        : <button type="button" onClick={() => openDocument(document.id)} className="text-sm font-semibold text-[#087568] hover:underline">Load securely</button>}
                    </li>
                  ))}
                  {!selected.documents?.length && <li className="text-sm text-slate-500">No documents attached.</li>}
                </ul>
              </section>
              {selected.audit?.length > 0 && (
                <section>
                  <h3 className="mb-3 font-semibold text-slate-900">Audit history</h3>
                  <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                    {selected.audit.map((entry) => (
                      <li key={entry.id} className="text-sm">
                        <p className="font-medium text-slate-800">{entry.action.replaceAll("_", " ")}{entry.new_status ? ` · ${statusLabels[entry.new_status] || entry.new_status}` : ""}</p>
                        <p className="text-xs text-slate-500">{entry.actor_name || "System"} · {dateLabel(entry.created_at)}</p>
                        {entry.reason && <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.reason}</p>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {["pending", "in_review"].includes(selected.status) && (
                <section className="border-t border-slate-200 pt-5">
                  <label className="block text-sm font-semibold text-slate-800" htmlFor="kyc-review-reason">Message to customer</label>
                  <textarea id="kyc-review-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={3} placeholder="This message is visible to the customer. A clear reason is required for rejection or resubmission." className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#087568]" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" disabled={saving} onClick={() => saveReview("in_review")} className="rounded-lg border border-sky-300 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 disabled:opacity-50">Mark in review</button>
                    <button type="button" disabled={saving} onClick={() => saveReview("verified")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><CheckCircle2 className="mr-1 inline" size={16} />Verify manually</button>
                    <button type="button" disabled={saving} onClick={() => saveReview("resubmission_required")} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50">Request new documents</button>
                    <button type="button" disabled={saving} onClick={() => saveReview("rejected")} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"><XCircle className="mr-1 inline" size={16} />Reject</button>
                  </div>
                </section>
              )}
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Manual review is an internal shop decision, not government verification or an assessment of document authenticity.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminKyc;
