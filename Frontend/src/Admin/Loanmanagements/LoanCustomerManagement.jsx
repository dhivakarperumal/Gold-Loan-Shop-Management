import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiDownload,
  FiEdit2,
  FiEye,
  FiFilter,
  FiGrid,
  FiList,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";

const EMPTY_CUSTOMER = {
  customer_type: "Individual",
  full_name: "",
  mobile: "",
  alternate_mobile: "",
  date_of_birth: "",
  gender: "",
  occupation: "",
  address: "",
  city: "",
  district: "",
  state: "",
  pincode: "",
  kyc_status: "Pending",
  photo_url: "",
  notes: ""
};

const DOCUMENT_TYPES = [
  { label: "Select Document Type", value: "" },
  { label: "Aadhaar Card", value: "aadhaar" },
  { label: "PAN Card", value: "pan" },
  { label: "Voter ID Card", value: "voter_id" },
  { label: "Driving Licence", value: "driving_license" },
  { label: "Passport", value: "passport" },
  { label: "Ration Card", value: "ration_card" },
  { label: "Other Government-Issued ID", value: "other" }
];
const DOCUMENT_TYPE_LABELS = new Map([
  ...DOCUMENT_TYPES.map(({ label, value }) => [value, label]),
  ...["Aadhaar", "PAN", "Voter ID", "Driving Licence", "Passport", "Other"].map((type) => [type, type])
]);
const DOCUMENT_SIDES = ["front", "back"];
const MAX_KYC_DOCUMENT_SLOTS = (DOCUMENT_TYPES.length - 1) * DOCUMENT_SIDES.length;
const documentSlotKey = (type, side) => `${type}:${side}`;

const inputClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#008577] focus:ring-2 focus:ring-emerald-100";
const labelClass = "block text-xs font-semibold text-slate-600";

function CustomerField({ label, name, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-red-500">*</span>}
      <input
        className={inputClass}
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        maxLength={name === "mobile" || name === "alternate_mobile" ? 15 : undefined}
      />
    </label>
  );
}

function CustomerSelect({ label, name, value, onChange, options }) {
  return (
    <label className={labelClass}>
      {label}
      <select className={inputClass} name={name} value={value ?? ""} onChange={onChange}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function getKycStyle(status) {
  if (status === "Verified") return "bg-emerald-50 text-emerald-700";
  if (status === "Rejected") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export default function LoanCustomerManagement() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState({ reference: "", url: "" });
  const [customerPhotoPreviews, setCustomerPhotoPreviews] = useState({});
  const [documents, setDocuments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const pendingPreviewUrls = useRef(new Set());
  const handledEditCustomerId = useRef(null);
  const [documentType, setDocumentType] = useState("");
  const [nextPendingDocumentId, setNextPendingDocumentId] = useState(0);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/loan-customers");
      if (!Array.isArray(response.data)) throw new Error("The server returned an invalid customer list.");
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to load loan customers:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  useEffect(() => {
    let active = true;
    const objectUrls = [];
    const customersWithPhotos = customers.filter((customer) => customer.photo_url);
    Promise.all(customersWithPhotos.map(async (customer) => {
      try {
        const { data } = await getPrivateFile(customer.photo_url, { responseType: "blob" });
        const url = URL.createObjectURL(data);
        objectUrls.push(url);
        return [String(customer.id), url];
      } catch (error) {
        console.error(`Failed to load profile photo for customer ${customer.customer_code}:`, error);
        return null;
      }
    })).then((entries) => {
      if (active) setCustomerPhotoPreviews(Object.fromEntries(entries.filter(Boolean)));
    });
    return () => {
      active = false;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [customers]);

  useEffect(() => {
    if (!form.photo_url) return undefined;
    let active = true;
    let previewUrl = "";
    getPrivateFile(form.photo_url, { responseType: "blob" })
      .then(({ data }) => {
        if (!active) return;
        previewUrl = URL.createObjectURL(data);
        setPhotoPreview({ reference: form.photo_url, url: previewUrl });
      })
      .catch((error) => {
        console.error("Failed to load customer photo preview:", error);
        if (active) toast.error(error.response?.data?.message || "Could not load customer photo.");
      });
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [form.photo_url]);

  useEffect(() => () => {
    pendingPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    pendingPreviewUrls.current.clear();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery = !query || [
        customer.customer_code, customer.full_name, customer.mobile,
        customer.alternate_mobile, customer.city, customer.district
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesQuery && (kycFilter === "All" || customer.kyc_status === kycFilter);
    });
  }, [customers, search, kycFilter]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setForm(EMPTY_CUSTOMER);
    setDocuments([]);
    setPendingDocuments([]);
    setDocumentType("");
    setIsFormOpen(true);
  };

  const openEditCustomer = async (customer) => {
    setEditingCustomer(customer);
    setDocuments([]);
    setPendingDocuments([]);
    setDocumentType("");
    setLoadingDocuments(true);
    setForm({
      ...EMPTY_CUSTOMER,
      ...customer,
      date_of_birth: customer.date_of_birth ? String(customer.date_of_birth).slice(0, 10) : "",
      photo_url: customer.photo_url || ""
    });
    setIsFormOpen(true);
    try {
      const response = await api.get(`/loan-customers/${customer.id}/documents`);
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to load customer documents:", error);
      toast.error(error.response?.data?.message || "Could not load KYC documents.");
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    const editCustomerId = location.state?.editCustomerId;
    if (loading || !editCustomerId || handledEditCustomerId.current === String(editCustomerId)) return;
    const customer = customers.find((item) => String(item.id) === String(editCustomerId));
    if (!customer) return;
    handledEditCustomerId.current = String(editCustomerId);
    navigate(location.pathname, { replace: true, state: null });
    openEditCustomer(customer);
  }, [loading, customers, location, navigate]);

  const closeForm = () => {
    if (saving || uploadingPhoto) return;
    setIsFormOpen(false);
    setEditingCustomer(null);
    pendingDocuments.forEach(({ previewUrl }) => {
      URL.revokeObjectURL(previewUrl);
      pendingPreviewUrls.current.delete(previewUrl);
    });
    setPendingDocuments([]);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePhotoUpload = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Choose a PNG or JPG photo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Customer photo must be 5 MB or smaller.");
      return;
    }
    const data = new FormData();
    data.append("photo", file);
    try {
      setUploadingPhoto(true);
      const response = await api.post("/loan-customers/photos", data);
      setForm((current) => ({ ...current, photo_url: response.data.photo_url }));
      toast.success("Customer photo uploaded.");
    } catch (error) {
      console.error("Failed to upload customer photo:", error);
      toast.error(error.response?.data?.message || "Could not upload customer photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDocumentUpload = async (event, side) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!documentType) {
      toast.error("Select a document type before uploading files.");
      return;
    }
    const validTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Choose PDF, PNG, or JPG documents.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Each KYC document must be 10 MB or smaller.");
      return;
    }
    const slotKey = documentSlotKey(documentType, side);
    const slotAlreadyExists = documents.some((document) =>
      documentSlotKey(document.document_type, document.document_side || "front") === slotKey
    );
    const slotAlreadyPending = pendingDocuments.some((document) =>
      documentSlotKey(document.document_type, document.document_side) === slotKey
    );
    if (!slotAlreadyExists && !slotAlreadyPending) {
      const usedSlots = new Set([
        ...documents.map((document) => documentSlotKey(document.document_type, document.document_side || "front")),
        ...pendingDocuments.map((document) => documentSlotKey(document.document_type, document.document_side))
      ]);
      if (usedSlots.size >= MAX_KYC_DOCUMENT_SLOTS) {
        toast.error(`A customer can have up to ${MAX_KYC_DOCUMENT_SLOTS} KYC document sides.`);
        return;
      }
    }
    const previewUrl = URL.createObjectURL(file);
    pendingPreviewUrls.current.add(previewUrl);
    const stagedFile = {
      id: `pending-${nextPendingDocumentId}`,
      document_type: documentType,
      document_side: side,
      file,
      previewUrl
    };
    setNextPendingDocumentId((current) => current + 1);
    setPendingDocuments((current) => {
      const replaced = current.find((document) =>
        documentSlotKey(document.document_type, document.document_side) === slotKey
      );
      if (replaced) {
        URL.revokeObjectURL(replaced.previewUrl);
        pendingPreviewUrls.current.delete(replaced.previewUrl);
      }
      return [...current.filter((document) =>
        documentSlotKey(document.document_type, document.document_side) !== slotKey
      ), stagedFile];
    });
    toast.success(`${side === "front" ? "Front" : "Back"} file ready to upload when the customer is saved.`);
  };

  const removePendingDocument = (id) => {
    setPendingDocuments((current) => {
      const removed = current.find((document) => document.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
        pendingPreviewUrls.current.delete(removed.previewUrl);
      }
      return current.filter((document) => document.id !== id);
    });
  };

  const handleOpenDocument = async (document) => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      toast.error("Allow pop-ups to open this document.");
      return;
    }
    previewWindow.opener = null;
    try {
      const response = await getPrivateFile(document.file_ref, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(response.data);
      previewWindow.location = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      previewWindow.close();
      console.error("Failed to open KYC document:", error);
      toast.error(error.response?.data?.message || "Could not open this document.");
    }
  };

  const handleDeleteDocument = async (document) => {
    if (!window.confirm(`Delete ${document.document_type} document "${document.original_name}"?`)) return;
    try {
      await api.delete(`/loan-customers/${editingCustomer.id}/documents/${document.id}`);
      setDocuments((current) => current.filter((item) => item.id !== document.id));
      toast.success("KYC document deleted.");
    } catch (error) {
      console.error("Failed to delete KYC document:", error);
      toast.error(error.response?.data?.message || "Could not delete this document.");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const stagedTypes = new Set(pendingDocuments.map((document) => document.document_type));
    for (const type of stagedTypes) {
      const savedSides = new Set(documents
        .filter((document) => document.document_type === type)
        .map((document) => document.document_side || "front"));
      pendingDocuments
        .filter((document) => document.document_type === type)
        .forEach((document) => savedSides.add(document.document_side));
      if (DOCUMENT_SIDES.some((side) => !savedSides.has(side))) {
        toast.error(`${DOCUMENT_TYPE_LABELS.get(type) || type} requires both front and back files.`);
        return;
      }
    }
    setSaving(true);
    let customerPersisted = false;
    const payload = {
      ...form,
      full_name: form.full_name.trim(),
      mobile: form.mobile.trim(),
      alternate_mobile: form.alternate_mobile.trim(),
      photo_url: form.photo_url.trim()
    };
    try {
      let savedCustomer;
      if (editingCustomer) {
        const response = await api.put(`/loan-customers/${editingCustomer.id}`, payload);
        savedCustomer = response.data;
      } else {
        const response = await api.post("/loan-customers", payload);
        savedCustomer = response.data;
      }
      customerPersisted = true;
      setEditingCustomer(savedCustomer);
      for (const document of pendingDocuments) {
        const data = new FormData();
        data.append("document_type", document.document_type);
        data.append("document_side", document.document_side);
        data.append("documents", document.file);
        const response = await api.post(`/loan-customers/${savedCustomer.id}/documents`, data);
        setDocuments(response.data);
        setPendingDocuments((current) => {
          current.filter(({ id }) => id === document.id)
            .forEach(({ previewUrl }) => {
              URL.revokeObjectURL(previewUrl);
              pendingPreviewUrls.current.delete(previewUrl);
            });
          return current.filter(({ id }) => id !== document.id);
        });
      }
      toast.success(pendingDocuments.length ? "Customer and KYC documents saved." : "Customer saved.");
      setIsFormOpen(false);
      setEditingCustomer(null);
      pendingDocuments.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
        pendingPreviewUrls.current.delete(previewUrl);
      });
      setPendingDocuments([]);
      await loadCustomers();
    } catch (error) {
      console.error("Failed to save loan customer:", error);
      const message = error.response?.data?.message || error.message;
      toast.error(customerPersisted
        ? `Customer saved, but a KYC document could not be uploaded${message ? `: ${message}` : ". Try saving again to retry."}`
        : message || "Could not save customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.full_name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/loan-customers/${customer.id}`);
      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      toast.success("Customer deleted.");
    } catch (error) {
      console.error("Failed to delete loan customer:", error);
      toast.error(error.response?.data?.message || "Could not delete customer.");
    }
  };

  const verifiedCount = customers.filter((customer) => customer.kyc_status === "Verified").length;
  const pendingCount = customers.filter((customer) => customer.kyc_status === "Pending").length;

  return (
    <main className="min-h-screen space-y-5 bg-[#F4F7F6] py-1 text-slate-800">


      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total Customers", value: customers.length, icon: FiUsers },
          { label: "KYC Verified", value: verifiedCount, icon: FiCheckCircle },
          { label: "KYC Pending", value: pendingCount, icon: FiUser }
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-[#008577]"><Icon size={20} /></span>
            <span><span className="block text-xs text-slate-500">{label}</span><strong className="text-2xl text-slate-900">{value.toLocaleString()}</strong></span>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative min-w-0 w-full flex-1 sm:max-w-xs">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClass} mt-0 pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, code, mobile, city..."
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:ml-auto sm:justify-end">
            <label className="relative">
              <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select className={`${inputClass} mt-0 pl-9`} value={kycFilter} onChange={(event) => setKycFilter(event.target.value)}>
                {["All", "Pending", "Verified", "Rejected"].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
           
            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 p-1" role="group" aria-label="Customer view mode">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
              className={`inline-flex items-center justify-center rounded-md p-2 text-xs font-semibold transition ${viewMode === "table" ? "bg-[#003B3B] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <FiList size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
              aria-pressed={viewMode === "card"}
              title="Card view"
              className={`inline-flex items-center justify-center rounded-md p-2 text-xs font-semibold transition ${viewMode === "card" ? "bg-[#003B3B] text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <FiGrid size={16} />
            </button>
            </div>
             <button
          type="button"
          onClick={openAddCustomer}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#003B3B] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#008577]"
        >
          <FiPlus /> Add New Customer
        </button>
          </div>
        </div>

        {viewMode === "table" ? <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[850px] border-separate border-spacing-0 overflow-hidden rounded-xl text-left">
            <thead>
              <tr className="bg-[#003B3B] text-[10px] font-bold uppercase tracking-wide text-white">
                <th className="px-4 py-4">S No</th>
                <th className="px-4 py-4">Customer</th>
                <th className="px-4 py-4">Mobile</th>
                <th className="px-4 py-4">Type</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4">KYC Status</th>
                <th className="px-4 py-4">Added</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-400">Loading customers...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan="8" className="px-4 py-12 text-center text-sm text-slate-400">No customers found.</td></tr>
              ) : filteredCustomers.map((customer, index) => (
                <tr key={customer.id} className="transition hover:bg-emerald-50/40">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {customerPhotoPreviews[String(customer.id)] ? (
                        <img src={customerPhotoPreviews[String(customer.id)]} alt={`${customer.full_name} profile`} className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-[#008577]">
                          {customer.full_name.trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">{customer.full_name}</p>
                        <p className="text-xs text-slate-500">{customer.customer_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p>{customer.mobile}</p>
                    {customer.alternate_mobile && <p className="text-xs text-slate-400">{customer.alternate_mobile}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">{customer.customer_type}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1"><FiMapPin className="shrink-0" />{[customer.city, customer.district].filter(Boolean).join(", ") || "—"}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getKycStyle(customer.kyc_status)}`}>{customer.kyc_status}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => navigate(`/admin/loans/customers/${customer.id}`)} aria-label={`View ${customer.full_name}`} title="View customer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><FiEye /></button>
                      <button type="button" onClick={() => openEditCustomer(customer)} aria-label={`Edit ${customer.full_name}`} className="rounded-lg p-2 text-[#008577] hover:bg-emerald-50"><FiEdit2 /></button>
                      <button type="button" onClick={() => handleDelete(customer)} aria-label={`Delete ${customer.full_name}`} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : (
          <div className="p-4">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-400">Loading customers...</p>
            ) : filteredCustomers.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-400">No customers found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCustomers.map((customer, index) => (
                  <article key={customer.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {customerPhotoPreviews[String(customer.id)] ? (
                          <img src={customerPhotoPreviews[String(customer.id)]} alt={`${customer.full_name} profile`} className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-lg font-bold text-[#008577]">
                            {customer.full_name.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-800">{customer.full_name}</h3>
                          <p className="text-xs text-slate-500">S No: {index + 1} · {customer.customer_code}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${getKycStyle(customer.kyc_status)}`}>{customer.kyc_status}</span>
                    </div>
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                      <p><span className="text-slate-500">Mobile:</span> <span className="font-medium text-slate-800">{customer.mobile}</span></p>
                      {customer.alternate_mobile && <p><span className="text-slate-500">Alternate:</span> <span className="text-slate-700">{customer.alternate_mobile}</span></p>}
                      <p><span className="text-slate-500">Type:</span> <span className="text-slate-700">{customer.customer_type}</span></p>
                      <p className="flex items-center gap-1 text-slate-600">
                        <FiMapPin className="shrink-0" />
                        {[customer.city, customer.district].filter(Boolean).join(", ") || "Location not provided"}
                      </p>
                      <p className="text-xs text-slate-400">Added {customer.created_at ? new Date(customer.created_at).toLocaleDateString("en-IN") : "—"}</p>
                    </div>
                    <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button type="button" onClick={() => navigate(`/admin/loans/customers/${customer.id}`)} aria-label={`View ${customer.full_name}`} title="View customer" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><FiEye /></button>
                      <button type="button" onClick={() => openEditCustomer(customer)} aria-label={`Edit ${customer.full_name}`} className="rounded-lg p-2 text-[#008577] hover:bg-emerald-50"><FiEdit2 /></button>
                      <button type="button" onClick={() => handleDelete(customer)} aria-label={`Delete ${customer.full_name}`} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><FiTrash2 /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Showing {filteredCustomers.length} of {customers.length} customers
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/50" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeForm();
        }}>
          <section className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="customer-form-title">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="customer-form-title" className="text-lg font-extrabold text-[#003B3B]">{editingCustomer ? "Edit Customer" : "Add New Customer"}</h2>
                <p className="text-xs text-slate-500">Enter borrower details and KYC status.</p>
              </div>
              <button type="button" onClick={closeForm} aria-label="Close form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><FiX size={20} /></button>
            </header>
            <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CustomerSelect label="Customer Type" name="customer_type" value={form.customer_type} onChange={handleChange} options={["Individual", "Business"]} />
                  <CustomerField label="Full Name" name="full_name" value={form.full_name} onChange={handleChange} required />
                  <CustomerField label="Primary Mobile" name="mobile" value={form.mobile} onChange={handleChange} required placeholder="Phone number" />
                  <CustomerField label="Alternate Mobile" name="alternate_mobile" value={form.alternate_mobile} onChange={handleChange} />
                  <CustomerField label="Date of Birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
                  <CustomerSelect label="Gender" name="gender" value={form.gender} onChange={handleChange} options={["", "Male", "Female", "Other", "Prefer not to say"]} />
                  <CustomerField label="Occupation" name="occupation" value={form.occupation} onChange={handleChange} />
                  <CustomerSelect label="KYC Status" name="kyc_status" value={form.kyc_status} onChange={handleChange} options={["Pending", "Verified", "Rejected"]} />
                  <CustomerField label="City / Town" name="city" value={form.city} onChange={handleChange} />
                  <CustomerField label="District" name="district" value={form.district} onChange={handleChange} />
                  <CustomerField label="State" name="state" value={form.state} onChange={handleChange} />
                  <CustomerField label="PIN Code" name="pincode" value={form.pincode} onChange={handleChange} />
                </div>
                <label className={labelClass}>Residential Address
                  <textarea className={`${inputClass} min-h-20`} name="address" value={form.address || ""} onChange={handleChange} rows="3" />
                </label>
                <div>
                  <p className={labelClass}>Customer Photo</p>
                  <p className="mt-1 text-xs text-slate-500">Upload a PNG or JPG (up to 5 MB). Photos are stored privately.</p>
                  {photoPreview.reference === form.photo_url && photoPreview.url && (
                    <div className="mt-3 flex items-center gap-3">
                      <img src={photoPreview.url} alt="Customer photo preview" className="h-20 w-20 rounded-lg border border-slate-200 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setForm((current) => ({ ...current, photo_url: "" }));
                          setPhotoPreview({ reference: "", url: "" });
                        }}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Remove photo
                      </button>
                    </div>
                  )}
                  <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#008577]/30 px-3 py-2 text-sm font-semibold text-[#00695C] transition hover:bg-emerald-50">
                    <FiPlus /> {uploadingPhoto ? "Uploading..." : form.photo_url ? "Replace Photo" : "Upload Photo"}
                    <input type="file" accept="image/png,image/jpeg" onChange={handlePhotoUpload} disabled={uploadingPhoto} className="sr-only" />
                  </label>
                  {form.photo_url && <p className="mt-2 break-all text-[11px] text-slate-400">Secure reference saved</p>}
                </div>
                        <section className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#003B3B]">KYC Documents</h3>
                    <p className="mt-1 text-xs text-slate-500">Select a document type, then upload both front and back as PDF, PNG, or JPG (up to 10 MB each).</p>
                  </div>
                  <>
                      <div className="space-y-2">
                        <label className={labelClass} htmlFor="kyc-document-type">1. Select document type</label>
                        <select id="kyc-document-type" className={`${inputClass} mt-0`} value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
                          {DOCUMENT_TYPES.map((document) => (
                            <option key={document.value} value={document.value}>{document.label}</option>
                          ))}
                        </select>
                        <p className={labelClass}>2. Upload front and back separately</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {DOCUMENT_SIDES.map((side) => {
                            const staged = pendingDocuments.find((document) =>
                              document.document_type === documentType && document.document_side === side
                            );
                            const saved = documents.find((document) =>
                              document.document_type === documentType
                              && (document.document_side || "front") === side
                            );
                            const isAtCapacity = !saved && !staged
                              && new Set([
                                ...documents.map((document) => documentSlotKey(document.document_type, document.document_side || "front")),
                                ...pendingDocuments.map((document) => documentSlotKey(document.document_type, document.document_side))
                              ]).size >= MAX_KYC_DOCUMENT_SLOTS;
                            return (
                              <div key={side} className="rounded-lg border border-slate-200 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{side} side</p>
                                {staged && (
                                  <div className="mt-2">
                                    <p className="truncate text-xs text-slate-500">{staged.file.name} · ready to upload</p>
                                    {staged.file.type.startsWith("image/") ? (
                                      <img src={staged.previewUrl} alt={`${side} side preview`} className="mt-2 h-24 w-full rounded border border-slate-200 bg-white object-contain" />
                                    ) : (
                                      <iframe src={staged.previewUrl} title={`${side} side document preview`} className="mt-2 h-28 w-full rounded border border-slate-200 bg-white" />
                                    )}
                                  </div>
                                )}
                                {!staged && saved && (
                                  <button type="button" onClick={() => handleOpenDocument(saved)} className="mt-2 block max-w-full truncate text-left text-xs font-medium text-[#008577] underline">
                                    Saved: {saved.original_name}
                                  </button>
                                )}
                                {!staged && !saved && <p className="mt-2 text-xs text-slate-400">No file selected</p>}
                                <label className={`mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#008577] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#00695C] ${!documentType || isAtCapacity ? "pointer-events-none opacity-50" : ""}`}>
                                  <FiPlus /> {staged || saved ? "Replace File" : "Choose File"}
                                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => handleDocumentUpload(event, side)} disabled={!documentType || isAtCapacity} className="sr-only" />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        {editingCustomer
                          ? "Selected files upload securely when you save changes."
                          : "Selected files are staged and upload securely when you save the customer."}
                      </p>
                      {pendingDocuments.length > 0 && (
                        <ul className="divide-y divide-amber-100 rounded-lg border border-amber-100 bg-amber-50/50">
                          {pendingDocuments.map((document) => (
                            <li key={document.id} className="flex items-center justify-between gap-3 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700">{DOCUMENT_TYPE_LABELS.get(document.document_type) || document.document_type} · {document.document_side}</p>
                                <p className="truncate text-xs text-slate-500">{document.file.name} · ready to upload</p>
                              </div>
                              <button type="button" onClick={() => removePendingDocument(document.id)} aria-label={`Remove ${document.file.name}`} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><FiX /></button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {editingCustomer && loadingDocuments ? (
                        <p className="text-xs text-slate-500">Loading documents...</p>
                      ) : documents.length === 0 && editingCustomer ? (
                        <p className="text-xs text-slate-500">No KYC documents uploaded yet.</p>
                      ) : documents.length > 0 ? (
                        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {documents.map((document) => (
                            <li key={document.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700">{DOCUMENT_TYPE_LABELS.get(document.document_type) || document.document_type} · {document.document_side || "front"}</p>
                                <p className="truncate text-xs text-slate-500">{document.original_name} · {(document.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button type="button" onClick={() => handleOpenDocument(document)} aria-label={`Open ${document.original_name}`} className="rounded-lg p-2 text-[#008577] hover:bg-emerald-50"><FiDownload /></button>
                                <button type="button" onClick={() => handleDeleteDocument(document)} aria-label={`Delete ${document.original_name}`} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"><FiTrash2 /></button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                </section>
                <label className={labelClass}>Internal Notes
                  <textarea className={`${inputClass} min-h-20`} name="notes" value={form.notes || ""} onChange={handleChange} rows="3" />
                </label>
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 p-4">
                <button type="button" onClick={closeForm} disabled={saving || uploadingPhoto} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
                <button type="submit" disabled={saving || uploadingPhoto} className="rounded-lg bg-[#003B3B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#008577] disabled:opacity-60">
                  {saving ? "Saving..." : editingCustomer ? "Save Changes" : "Add Customer"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
