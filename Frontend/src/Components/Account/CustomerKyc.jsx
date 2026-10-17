import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, FileText, ShieldCheck, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";

const statusLabels = {
  not_submitted: "Not submitted",
  pending: "Pending manual review",
  in_review: "In review",
  verified: "Verified by shop staff",
  rejected: "Rejected",
  resubmission_required: "Changes required",
  failed: "Review could not be completed"
};

const documentLabels = {
  passport: "Passport",
  voter_id: "Voter ID",
  driving_license: "Driving licence",
  pan: "PAN",
  ration_card: "Ration card",
  aadhaar: "Aadhaar card"
};

const formatDate = (value) => value
  ? new Date(value).toLocaleString()
  : "—";

const CustomerKyc = () => {
  const [statusData, setStatusData] = useState(null);
  const [uploadRows, setUploadRows] = useState([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [documentUrls, setDocumentUrls] = useState({});
  const documentUrlsRef = useRef({});

  const application = statusData?.application;
  const allowedDocumentTypes = statusData?.allowedDocumentTypes || [];
  const canSubmit = !application || ["rejected", "resubmission_required", "failed"].includes(application.status);
  const maximumFileSize = statusData?.maximumFileSizeBytes || 5 * 1024 * 1024;
  const maximumFiles = statusData?.maximumFiles || 5;
  const selectedSize = useMemo(
    () => uploadRows.reduce((total, item) => total + item.file.size, 0),
    [uploadRows]
  );

  const loadStatus = async () => {
    try {
      const response = await api.get("/kyc/status");
      setStatusData(response.data);
      setStatusError("");
    } catch (error) {
      const message = error.response?.data?.message || "Unable to load your KYC status";
      setStatusError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadStatus, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    documentUrlsRef.current = documentUrls;
  }, [documentUrls]);

  useEffect(() => () => {
    Object.values(documentUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const updateFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > maximumFiles) {
      toast.error(`Upload no more than ${maximumFiles} documents`);
      event.target.value = "";
      return;
    }
    const oversizedFile = files.find((file) => file.size > maximumFileSize);
    if (oversizedFile) {
      toast.error(`${oversizedFile.name} exceeds the ${Math.floor(maximumFileSize / (1024 * 1024))} MB limit`);
      event.target.value = "";
      return;
    }
    const acceptedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    const unsupportedFile = files.find((file) => !acceptedTypes.has(file.type));
    if (unsupportedFile) {
      toast.error("Only PDF, JPG, and PNG files are accepted");
      event.target.value = "";
      return;
    }
    setUploadRows(files.map((file) => ({
      file,
      documentType: allowedDocumentTypes[0] || ""
    })));
  };

  const submitDocuments = async (event) => {
    event.preventDefault();
    if (!consent) {
      toast.error("Please confirm the privacy notice before submitting");
      return;
    }
    if (!uploadRows.length) {
      toast.error("Select at least one document");
      return;
    }
    if (uploadRows.some((item) => !item.documentType)) {
      toast.error("Select a document type for each file");
      return;
    }
    const body = new FormData();
    body.append("consent", "true");
    body.append("document_types", JSON.stringify(uploadRows.map((item) => item.documentType)));
    uploadRows.forEach(({ file }) => body.append("documents", file));
    setSubmitting(true);
    try {
      const endpoint = application ? "/kyc/resubmit" : "/kyc";
      const response = await api.post(endpoint, body);
      setStatusData((current) => ({ ...current, application: response.data.application }));
      setUploadRows([]);
      setConsent(false);
      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "KYC submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openDocument = async (documentId) => {
    try {
      const response = await api.get(`/kyc/documents/${documentId}`, { responseType: "blob" });
      const nextUrl = URL.createObjectURL(response.data);
      setDocumentUrls((current) => {
        if (current[documentId]) URL.revokeObjectURL(current[documentId]);
        return { ...current, [documentId]: nextUrl };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to open this document");
    }
  };

  if (loading) {
    return <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-12 text-center text-slate-500">Loading your KYC status…</main>;
  }

  if (!statusData) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-4xl px-4 py-12">
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <h1 className="font-bold">KYC status unavailable</h1>
          <p className="mt-1 text-sm">{statusError || "Your status could not be loaded."}</p>
          <button type="button" onClick={() => { setLoading(true); loadStatus(); }} className="mt-4 rounded-lg bg-[#00675d] px-4 py-2 text-sm font-semibold text-white">Try again</button>
        </div>
      </main>
    );
  }

  const status = application?.status || "not_submitted";
  const statusColor = status === "verified"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : ["rejected", "resubmission_required", "failed"].includes(status)
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#003B3B] to-[#076d62] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Customer account</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Identity verification</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              Submit an approved identity document for a member of our team to review manually.
            </p>
          </div>
          <ShieldCheck className="hidden h-14 w-14 shrink-0 text-amber-300 sm:block" />
        </div>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="status-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="status-heading" className="text-lg font-bold text-slate-900">Your verification status</h2>
              <p className="mt-1 text-sm text-slate-500">
                {application ? `Application #${application.id} · Submitted ${formatDate(application.created_at)}` : "You have not submitted an application."}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${statusColor}`}>
              {status === "verified" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
              {statusLabels[status] || status}
            </span>
          </div>
          {application?.review_reason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Reviewer message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{application.review_reason}</p>
            </div>
          )}
          {application?.documents?.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Submitted documents</h3>
              <ul className="space-y-2">
                {application.documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <FileText size={17} className="text-[#087568]" />
                      {documentLabels[document.document_type] || document.document_type}
                      <span className="text-xs text-slate-400">{(document.file_size / 1024).toFixed(0)} KB</span>
                    </span>
                    {documentUrls[document.id]
                      ? <a className="text-sm font-semibold text-[#087568] underline" href={documentUrls[document.id]} target="_blank" rel="noreferrer">Open document</a>
                      : <button type="button" onClick={() => openDocument(document.id)} className="text-sm font-semibold text-[#087568] hover:underline">View securely</button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {canSubmit && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{application ? "Resubmit documents" : "Submit your documents"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {status === "resubmission_required" ? "Please address the reviewer message and upload the requested documents." : "Files are kept in private storage and are only available to you and authorized administrators."}
            </p>

            {allowedDocumentTypes.length === 0 ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                KYC document types have not been configured. Please contact the shop administrator.
              </p>
            ) : (
              <form className="mt-5 space-y-5" onSubmit={submitDocuments}>
                <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center transition hover:border-[#087568] hover:bg-emerald-50/50">
                  <UploadCloud className="mb-2 h-8 w-8 text-[#087568]" />
                  <span className="font-semibold text-slate-800">Choose identity document files</span>
                  <span className="mt-1 text-xs text-slate-500">PDF, JPG or PNG · up to {maximumFiles} files · {Math.floor(maximumFileSize / (1024 * 1024))} MB each</span>
                  <input className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple onChange={updateFiles} />
                </label>

                {uploadRows.length > 0 && (
                  <div className="space-y-3">
                    {uploadRows.map((item, index) => (
                      <div key={`${item.file.name}-${item.file.lastModified}`} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_220px] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.file.name}</p>
                          <p className="text-xs text-slate-500">{(item.file.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <select
                          value={item.documentType}
                          onChange={(event) => setUploadRows((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, documentType: event.target.value } : row))}
                          required
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                          aria-label={`Document type for ${item.file.name}`}
                        >
                          {allowedDocumentTypes.map((type) => <option key={type} value={type}>{documentLabels[type] || type}</option>)}
                        </select>
                      </div>
                    ))}
                    <p className="text-right text-xs text-slate-500">Total selected: {(selectedSize / 1024).toFixed(0)} KB</p>
                  </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  <p className="font-semibold text-slate-800">Manual review privacy notice ({statusData?.consentVersion})</p>
                  <p className="mt-1">
                    By submitting, you consent to the shop storing these documents in private storage and allowing authorized staff to review them for this account. Access is logged. The review is an internal manual decision only; it is not a government identity check or a guarantee that a document is authentic. Only submit a document type approved by the shop for its applicable KYC policy.
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Upload Aadhaar only if it is an enabled document type and you are comfortable providing it. Do not include unrelated sensitive information. Ask the shop about its retention and privacy policy before submitting if you need more information.</p>
                </div>

                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#087568]" />
                  <span>I have read this notice and consent to the manual processing described above.</span>
                </label>
                <button
                  type="submit"
                  disabled={submitting || !consent || !uploadRows.length}
                  className="w-full rounded-xl bg-[#00675d] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#004d45] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting ? "Submitting securely…" : application ? "Submit revised documents" : "Submit for review"}
                </button>
              </form>
            )}
          </section>
        )}

        {application?.status === "verified" && (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            This is an internal manual status set by shop staff. It does not represent government verification.
          </p>
        )}
      </div>
    </main>
  );
};

export default CustomerKyc;
