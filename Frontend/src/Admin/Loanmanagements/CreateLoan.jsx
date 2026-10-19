import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCamera, FiCheck, FiChevronDown, FiSearch, FiUploadCloud, FiUserPlus } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";
import { formatRateDate, getRateForPurity } from "../../PrivateRouter/goldRateUtils";
import useGoldRates from "../../PrivateRouter/useGoldRates";

const INTEREST_FREQUENCIES = [
  ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"],
  ["quarterly", "Quarterly"], ["half_yearly", "Half-Yearly"], ["yearly", "Yearly"],
  ["custom_period", "Custom Period"]
];
const PAYMENT_FREQUENCIES = [
  ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"],
  ["quarterly", "Quarterly"], ["half_yearly", "Half-Yearly"], ["yearly", "Yearly"],
  ["bullet", "At Maturity (Bullet)"]
];
const COMPOUND_FREQUENCIES = [
  ["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"],
  ["quarterly", "Quarterly"], ["half_yearly", "Half-Yearly"], ["yearly", "Yearly"]
];
const GOLD_PURITY_OPTIONS = [
  ["24K / 999", "24K (999)"],
  ["22K / 916", "22K (916)"],
  ["20K / 833", "20K (833)"],
  ["18K / 750", "18K (750)"],
  ["14K / 585", "14K (585)"]
];
const METAL_OPTIONS = {
  Gold: GOLD_PURITY_OPTIONS,
  Silver: [["999", "999 Fine"]],
  Platinum: [["950", "950"], ["900", "900"]],
  Diamond: [["D-F / VVS", "D-F / VVS"], ["G-H / VS", "G-H / VS"], ["I-J / SI", "I-J / SI"]]
};
const JEWELLERY_TYPE_OPTIONS = [
  ["Bangles", "Bangles"],
  ["Chains", "Chains"],
  ["Necklaces", "Necklaces"],
  ["Earrings", "Earrings"],
  ["Rings", "Rings"],
  ["Bracelets", "Bracelets"],
  ["Coins & Bars", "Coins & Bars"],
  ["Other", "Other"]
];
const fieldClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#008577] focus:ring-2 focus:ring-emerald-100";
const labelClass = "block text-xs font-semibold text-slate-600";

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formDate(value) {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  const text = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : formDate(parsed);
}

function initialLoan() {
  const today = localDate();
  const maturity = new Date(`${today}T00:00:00`);
  maturity.setMonth(maturity.getMonth() + 12);
  return {
    jewellery_type: "",
    metal_type: "Gold",
    gold_purity: "",
    gross_weight: "",
    stone_weight: "0",
    gold_valuation: "",
    principal_amount: "",
    interest_type: "",
    interest_rate: "",
    fixed_interest_amount: "",
    interest_frequency: "monthly",
    custom_period_days: "30",
    interest_calculation_start_date: today,
    compounding_frequency: "monthly",
    day_count_convention: "actual_365",
    grace_period_days: "0",
    late_payment_interest_rate: "",
    interest_free_days: "0",
    minimum_interest_amount: "",
    maximum_interest_amount: "",
    processing_fee: "0",
    other_charges: "0",
    loan_date: today,
    maturity_date: localDate(maturity),
    payment_frequency: "monthly",
    loan_status: "Active",
    notes: ""
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function elapsedDays(from, to, convention) {
  if (!from || !to || to <= from) return 0;
  if (convention === "30_360") {
    const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
    const [toYear, toMonth, toDay] = to.split("-").map(Number);
    return Math.max(0, (toYear - fromYear) * 360 + (toMonth - fromMonth) * 30 + Math.min(toDay, 30) - Math.min(fromDay, 30));
  }
  return Math.max(0, (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

function periodCount(days, frequency, convention = "actual_365", customDays = 30) {
  const yearDays = convention === "actual_365" ? 365 : 360;
  const divisor = {
    daily: 1, weekly: 7, monthly: yearDays / 12, quarterly: yearDays / 4,
    half_yearly: yearDays / 2, yearly: yearDays, custom_period: Math.max(1, Number(customDays) || 30)
  }[frequency] || yearDays / 12;
  return days / divisor;
}

function calculateEstimate(form, interestType) {
  const principal = Number(form.principal_amount);
  const rate = Number(form.interest_rate);
  if (!interestType || !(principal > 0) || !(rate >= 0) || !form.interest_calculation_start_date || !form.maturity_date) return null;
  const days = elapsedDays(form.interest_calculation_start_date, form.maturity_date, form.day_count_convention);
  const eligibleDays = Math.max(0, days - Number(form.interest_free_days || 0) - Number(form.grace_period_days || 0));
  const periods = periodCount(eligibleDays, form.interest_frequency, form.day_count_convention, form.custom_period_days);
  let interest = 0;
  let basis = "Original principal";
  if (interestType === "compound") {
    const compoundPeriods = periodCount(eligibleDays, form.compounding_frequency || "monthly", form.day_count_convention, form.custom_period_days);
    const ratePerCompoundPeriod = rate / 100 * periods / Math.max(compoundPeriods, Number.EPSILON);
    interest = principal * ((1 + ratePerCompoundPeriod) ** compoundPeriods - 1);
    basis = `Original principal, compounded ${compoundPeriods.toFixed(2)} periods`;
  } else if (interestType === "fixed") {
    interest = Number(form.fixed_interest_amount || 0) * periods;
    basis = "Configured fixed amount per interest period";
  } else if (interestType === "reducing_balance") {
    const paymentPeriods = form.payment_frequency === "bullet" ? 1 : Math.max(1, periodCount(eligibleDays, form.payment_frequency, form.day_count_convention, form.custom_period_days));
    const principalPerPeriod = principal / paymentPeriods;
    for (let i = 0; i < paymentPeriods; i += 1) {
      const outstanding = Math.max(0, principal - principalPerPeriod * i);
      interest += outstanding * rate / 100 * (periods / paymentPeriods);
    }
    basis = `Estimated equal-principal schedule across ${paymentPeriods.toFixed(0)} payment periods`;
  } else {
    interest = principal * rate / 100 * periods;
    if (interestType === "flat") basis = "Original principal for the full agreed term";
    else if (interestType === "slab_based") basis = "Rate entered for the selected principal slab";
    else if (interestType === "custom") basis = "Administrator-entered rate and selected period";
    else basis = `Original principal, ${form.interest_frequency.replaceAll("_", " ")} rate period`;
  }
  if (Number(form.minimum_interest_amount) > 0) interest = Math.max(interest, Number(form.minimum_interest_amount));
  if (Number(form.maximum_interest_amount) > 0) interest = Math.min(interest, Number(form.maximum_interest_amount));
  interest = Math.round(interest * 100) / 100;
  const fee = Number(form.processing_fee || 0);
  const charges = Number(form.other_charges || 0);
  return {
    principal, interest, fee, charges,
    total: principal + interest + fee + charges,
    days, eligibleDays, basis
  };
}

function FormField({ label, name, form, onChange, type = "text", required = false, min, step, help, readOnly = false, placeholder }) {
  const fieldPlaceholder = placeholder || (type === "date"
    ? `Select ${label.toLowerCase()}`
    : type === "number"
      ? `Enter ${label.toLowerCase()}`
      : `Enter ${label.toLowerCase()}`);
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-rose-500">*</span>}
      <input
        className={fieldClass}
        name={name}
        type={type}
        value={form[name] ?? ""}
        onChange={onChange}
        required={required}
        min={min}
        step={step}
        readOnly={readOnly}
        placeholder={fieldPlaceholder}
        title={type === "date" ? fieldPlaceholder : undefined}
      />
      {help && <span className="mt-1 block text-[11px] font-normal text-slate-400">{help}</span>}
    </label>
  );
}

function FormSelect({ label, name, form, onChange, options, required = false, disabled = false, help, placeholder }) {
  const selectOptions = options.some(([value]) => value === "")
    ? options
    : [["", placeholder || `Select ${label.toLowerCase()}`], ...options];
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-rose-500">*</span>}
      <select className={fieldClass} name={name} value={form[name] ?? ""} onChange={onChange} required={required} disabled={disabled}>
        {selectOptions.map(([value, text, disabled]) => <option key={value} value={value} disabled={disabled}>{text}</option>)}
      </select>
      {help && <span className="mt-1 block text-[11px] font-normal text-slate-400">{help}</span>}
    </label>
  );
}

export default function CreateLoan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [interestTypes, setInterestTypes] = useState([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState(null);
  const [customerLoans, setCustomerLoans] = useState([]);
  const [form, setForm] = useState(initialLoan);
  const [otherJewelleryType, setOtherJewelleryType] = useState("");
  const [loanAmountMode, setLoanAmountMode] = useState("auto");
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState("");
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loanRecord, setLoanRecord] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const [goldImageFile, setGoldImageFile] = useState(null);
  const [goldImagePreview, setGoldImagePreview] = useState(null);
  const goldImageInput = useRef(null);
  const goldImageCameraInput = useRef(null);
  const selectedGoldImagePreview = useRef("");
  const { current: activeRateSet, loading: ratesLoading, error: ratesError } = useGoldRates();

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/customers"),
      api.get("/loans/interest-types"),
      id ? api.get(`/loans/${id}`) : Promise.resolve(null)
    ])
      .then(async ([customerResponse, interestResponse, loanResponse]) => {
        if (!active) return;
        if (!Array.isArray(customerResponse.data) || !Array.isArray(interestResponse.data)) {
          throw new Error("The server returned invalid customer or interest-method data.");
        }
        setCustomers(customerResponse.data);
        setInterestTypes(interestResponse.data.filter((type) => (
          type.enabled || (loanResponse && type.type_key === loanResponse.data.interest_type)
        )));
        if (!loanResponse) {
          setLoanRecord(null);
          setCustomer(null);
          setCustomerQuery("");
          setCustomerLoans([]);
          setLoanAmountMode("auto");
          setOtherJewelleryType("");
          setForm({
            ...initialLoan(),
            interest_type: interestResponse.data.find((type) => type.enabled)?.type_key || ""
          });
          return;
        }

        const loan = loanResponse.data;
        const [customerDetails, customerLoanResponse] = await Promise.all([
          api.get(`/customers/${loan.customer_id}`),
          api.get(`/customers/${loan.customer_id}/loans`)
        ]);
        if (!active) return;
        setLoanRecord(loan);
        setLoanAmountMode("manual");
        const savedJewelleryType = String(loan.jewellery_type || "");
        const isKnownJewelleryType = JEWELLERY_TYPE_OPTIONS.some(([value]) => value === savedJewelleryType && value !== "Other");
        setOtherJewelleryType(isKnownJewelleryType ? "" : savedJewelleryType);
        setCustomer(customerDetails.data);
        setCustomerQuery(`${customerDetails.data.customer_code || customerDetails.data.id} · ${customerDetails.data.full_name}`);
        setCustomerLoans(customerLoanResponse.data);
        setForm({
          ...initialLoan(),
          ...Object.fromEntries(Object.keys(initialLoan()).map((field) => {
            const value = loan[field];
            if (field === "metal_type") return [field, loan.metal_type || "Gold"];
            if (field === "jewellery_type") {
              return [field, !savedJewelleryType ? "" : isKnownJewelleryType ? savedJewelleryType : "Other"];
            }
            if (value == null) return [field, ""];
            if (["loan_date", "maturity_date", "interest_calculation_start_date"].includes(field)) {
              return [field, formDate(value)];
            }
            return [field, String(value)];
          }))
        });
      })
      .catch((error) => {
        console.error("Failed to load create-loan options:", error);
        if (active) {
          if (id) setLoanRecord(null);
          setCustomerLoadError(error.response?.data?.message || "Could not load customers or interest methods.");
          toast.error(error.response?.data?.message || "Could not load customers or interest methods.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCustomers(false);
          setLoadedFor(id);
        }
      });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    let previewUrl = "";
    if (goldImageFile || !loanRecord?.gold_image_url) return undefined;
    if (loanRecord?.gold_image_url) {
      getPrivateFile(loanRecord.gold_image_url, { responseType: "blob" })
        .then(({ data }) => {
          if (!active) return;
          previewUrl = URL.createObjectURL(data);
          setGoldImagePreview({ key: loanRecord.gold_image_url, url: previewUrl });
        })
        .catch((error) => {
          console.error("Failed to load pledged gold image:", error);
          if (active) toast.error(error.response?.data?.message || "Could not load the saved gold image.");
        });
    }
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [goldImageFile, loanRecord?.gold_image_url]);

  useEffect(() => () => {
    if (selectedGoldImagePreview.current) URL.revokeObjectURL(selectedGoldImagePreview.current);
  }, []);

  const goldImagePreviewUrl = goldImageFile
    ? (goldImagePreview && goldImagePreview.key === goldImageFile ? goldImagePreview.url : "")
    : (goldImagePreview && goldImagePreview.key === loanRecord?.gold_image_url ? goldImagePreview.url : "");

  const handleGoldImageSelect = (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Choose a PNG or JPG gold image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Gold image must be 5 MB or smaller.");
      return;
    }
    if (selectedGoldImagePreview.current) URL.revokeObjectURL(selectedGoldImagePreview.current);
    selectedGoldImagePreview.current = URL.createObjectURL(file);
    setGoldImagePreview({ key: file, url: selectedGoldImagePreview.current });
    setGoldImageFile(file);
  };

  const filteredCustomers = useMemo(() => {
    const search = customerQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((item) => [
      item.id, item.customer_code, item.full_name, item.mobile, item.alternate_mobile
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [customers, customerQuery]);

  const activeGoldRate = getRateForPurity(activeRateSet, form.gold_purity, form.metal_type);
  const savedPurityUnchanged = (loanRecord?.metal_type || "Gold") === form.metal_type
    && loanRecord?.gold_purity === form.gold_purity;
  const appliedGoldRate = loanRecord && savedPurityUnchanged
    ? (loanRecord.gold_rate_per_gram == null ? null : Number(loanRecord.gold_rate_per_gram))
    : activeGoldRate?.rate_per_gram;
  const appliedRateUnit = loanRecord && savedPurityUnchanged
    ? loanRecord.rate_unit || "gram"
    : activeGoldRate?.rate_unit || (form.metal_type === "Diamond" ? "carat" : "gram");
  const weightUnit = appliedRateUnit === "carat" ? "ct" : "g";
  const estimatedGoldValuation = loanRecord && savedPurityUnchanged && loanRecord.gold_rate_per_gram == null
    ? Number(form.gold_valuation) || 0
    : Math.max(0, Number(form.gross_weight || 0) - Number(form.stone_weight || 0)) * Number(appliedGoldRate || 0);
  const calculatedLoanAmount = (Math.round(estimatedGoldValuation * 50) / 100).toFixed(2);
  const estimate = useMemo(
    () => calculateEstimate({
      ...form,
      principal_amount: loanAmountMode === "auto" ? calculatedLoanAmount : form.principal_amount
    }, form.interest_type),
    [form, loanAmountMode, calculatedLoanAmount]
  );
  const selectCustomer = async (selected) => {
    setCustomer(selected);
    setCustomerQuery(`${selected.customer_code || selected.id} · ${selected.full_name}`);
    setShowCustomerMenu(false);
    setLoadingCustomer(true);
    try {
      const [customerResponse, loansResponse] = await Promise.all([
        api.get(`/customers/${selected.id}`),
        api.get(`/customers/${selected.id}/loans`)
      ]);
      setCustomer(customerResponse.data);
      setCustomerLoans(loansResponse.data);
    } catch (error) {
      console.error("Failed to load selected customer details:", error);
      toast.error(error.response?.data?.message || "Could not load customer details and loan history.");
      setCustomer(null);
      setCustomerLoans([]);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => name === "metal_type"
      ? { ...current, metal_type: value, gold_purity: "" }
      : { ...current, [name]: value });
  };

  const handleLoanAmountModeChange = (mode) => {
    setLoanAmountMode(mode);
    if (mode === "manual") {
      setForm((current) => ({
        ...current,
        principal_amount: current.principal_amount || calculatedLoanAmount
      }));
    }
  };

  const handleReset = () => {
    setForm(initialLoan());
    setOtherJewelleryType("");
    setLoanAmountMode("auto");
    setCustomer(null);
    setCustomerQuery("");
    setCustomerLoans([]);
    setGoldImageFile(null);
    if (selectedGoldImagePreview.current) URL.revokeObjectURL(selectedGoldImagePreview.current);
    selectedGoldImagePreview.current = "";
    setGoldImagePreview(null);
    if (goldImageInput.current) goldImageInput.current.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!customer || loadingCustomer) {
      toast.error("Select a registered customer before saving the loan.");
      return;
    }
    const gross = Number(form.gross_weight);
    const stone = Number(form.stone_weight || 0);
    if (gross <= 0 || stone < 0 || stone >= gross) {
      toast.error("Enter valid weights. Net gold weight must be greater than zero.");
      return;
    }
    if (form.maturity_date <= form.loan_date) {
      toast.error("Maturity date must be after the loan date.");
      return;
    }
    if (form.jewellery_type === "Other" && !otherJewelleryType.trim()) {
      toast.error("Enter the jewellery type.");
      return;
    }
    if (!loanRecord && !(appliedGoldRate > 0)) {
      toast.error("An active daily gold rate for the selected purity is required before creating a loan.");
      return;
    }
    setSaving(true);
    try {
      const loanData = {
        ...form,
        jewellery_type: form.jewellery_type === "Other" ? otherJewelleryType.trim() : form.jewellery_type,
        customer_id: String(customer.id),
        net_gold_weight: (gross - stone).toFixed(3),
        gold_valuation: estimatedGoldValuation.toFixed(2),
        principal_amount: loanAmountMode === "auto" ? calculatedLoanAmount : form.principal_amount,
        loan_amount_mode: loanAmountMode
      };
      let payload = loanData;
      if (goldImageFile) {
        payload = new FormData();
        Object.entries(loanData).forEach(([key, value]) => payload.append(key, value ?? ""));
        payload.append("gold_image", goldImageFile);
      }
      const response = loanRecord
        ? await api.put(`/loans/${loanRecord.id}`, payload)
        : await api.post("/loans", payload);
      toast.success(loanRecord
        ? `Loan ${response.data.loan_number} updated successfully.`
        : `Loan ${response.data.loan_number} created successfully.`);
      navigate(`/admin/loans/details/${response.data.id}`);
    } catch (error) {
      console.error(loanRecord ? "Failed to update loan:" : "Failed to create loan:", error);
      toast.error(error.response?.data?.message || `Could not ${loanRecord ? "update" : "create"} loan. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const activeLoans = customerLoans.filter((loan) => loan.loan_status === "Active");

  const loadingForm = loadingCustomers || loadedFor !== id;
  if (loadingForm) {
    return <main className="p-6 text-sm text-slate-500">{id ? "Loading loan details..." : "Loading loan options..."}</main>;
  }
  if (id && !loanRecord) {
    return (
      <main className="space-y-3 p-6">
        <p className="text-sm text-rose-600">{customerLoadError || "Loan not found."}</p>
        <Link to="/admin/loans/allloans" className="inline-flex items-center gap-2 text-sm font-semibold text-[#008577]"><FiArrowLeft /> All Loans</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[30px] border-white/5" />
        <div>
          <Link to="/admin/loans/allloans" className="relative mb-3 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 transition hover:bg-white/20">
            <FiArrowLeft /> Back to All Loans
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">Loan Management</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{loanRecord ? `Edit Loan ${loanRecord.loan_number}` : "Create Gold Loan"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">{loanRecord ? "Update the customer, pledged jewellery and agreed loan terms." : "Add customer details, record pledged jewellery and define the loan terms."}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-sm font-black text-[#006b62]">01</span>
            <div>
              <h2 className="text-base font-bold text-[#003B3B]">Customer</h2>
              <p className="mt-0.5 text-xs text-slate-500">Choose the registered customer for this loan.</p>
            </div>
          </div>
          <div className="relative max-w-2xl">
            <label className={labelClass}>
              Select Customer<span className="ml-1 text-rose-500">*</span>
              <div className="relative mt-1.5">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${fieldClass} mt-0 pl-9 pr-10`}
                  value={customerQuery}
                  placeholder={loadingCustomers ? "Loading customers..." : "Select a Customer"}
                  disabled={Boolean(id)}
                  onFocus={() => setShowCustomerMenu(true)}
                  onChange={(event) => {
                    setCustomerQuery(event.target.value);
                    setCustomer(null);
                    setCustomerLoans([]);
                    setShowCustomerMenu(true);
                  }}
                  autoComplete="off"
                  aria-expanded={showCustomerMenu}
                  aria-label="Search customers by ID, name, or mobile"
                />
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
            {showCustomerMenu && !id && (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10">
                {loadingCustomers ? (
                  <p className="p-3 text-sm text-slate-500">Loading registered customers...</p>
                ) : customerLoadError ? (
                  <p className="p-3 text-sm text-rose-600">{customerLoadError}</p>
                ) : customers.length === 0 ? (
                  <div className="p-3 text-sm text-slate-600">
                    <p>No customers are registered yet.</p>
                    <Link to="/admin/loans/customermanagement" className="mt-2 inline-flex items-center gap-1 font-bold text-[#008577]">
                      <FiUserPlus /> Add New Customer
                    </Link>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No customers match your search.</p>
                ) : filteredCustomers.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectCustomer(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-emerald-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">{item.full_name}</span>
                      <span className="block text-xs text-slate-500">{item.customer_code || `ID ${item.id}`} · {item.mobile}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">ID {item.id}</span>
                  </button>
                ))}
                        {customers.length > 0 && (
                  <Link to="/admin/loans/customermanagement" className="flex items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-sm font-bold text-[#008577] hover:bg-emerald-50">
                    <FiUserPlus /> + Add New Customer
                  </Link>
                )}
              </div>
            )}
          </div>
          {customer && (
            <div className="mt-5 rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 sm:p-5">
              {loadingCustomer ? <p className="text-sm text-slate-500">Loading customer account and loan history...</p> : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                    {[
                      ["Customer ID", customer.customer_code || customer.id],
                      ["Full Name", customer.full_name],
                      ["Mobile", customer.mobile],
                      ["KYC Status", customer.kyc_status]
                    ].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p></div>)}
                    <div className="sm:col-span-2 lg:col-span-2">
                      <p className="text-xs text-slate-500">Address</p>
                      <p className="mt-1 text-sm text-slate-800">{[customer.address, customer.city, customer.district, customer.state, customer.pincode].filter(Boolean).join(", ") || "Address not provided"}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 border-t border-emerald-100 pt-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Active loans ({activeLoans.length})</h3>
                      {activeLoans.length ? activeLoans.map((loan) => (
                        <Link key={loan.id} to={`/admin/loans/details/${loan.id}`} className="mb-1 flex justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs hover:bg-emerald-100">
                          <span className="font-semibold">{loan.loan_number}</span><span>{formatCurrency(Number(loan.principal_amount))}</span>
                        </Link>
                      )) : <p className="text-xs text-slate-500">No active loans.</p>}
                    </div>
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Previous loan history ({customerLoans.length})</h3>
                      {customerLoans.length ? customerLoans.slice(0, 4).map((loan) => (
                        <Link key={loan.id} to={`/admin/loans/details/${loan.id}`} className="mb-1 flex justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs hover:bg-emerald-100">
                          <span className="font-semibold">{loan.loan_number}</span><span>{loan.loan_status}</span>
                        </Link>
                      )) : <p className="text-xs text-slate-500">No previous loan history.</p>}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sm font-black text-sky-700">03</span>
            <div>
              <h2 className="text-base font-bold text-[#003B3B]">Interest & Contract Terms</h2>
              <p className="mt-0.5 text-xs text-slate-500">Set the interest method, rate and authorized charges.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <FormSelect label="Interest Type" name="interest_type" form={form} onChange={handleChange} required options={[["", "Select interest type"], ...interestTypes.map(({ type_key, label, enabled }) => [type_key, label, !enabled && type_key !== form.interest_type])]} />
            {form.interest_type !== "fixed" && <FormField label="Interest Rate (%)" name="interest_rate" form={form} onChange={handleChange} type="number" min="0" step="0.0001" required />}
            <FormSelect label="Interest Calculation Frequency" name="interest_frequency" form={form} onChange={handleChange} options={INTEREST_FREQUENCIES} required />
            {form.interest_frequency === "custom_period" && <FormField label="Custom Period (days)" name="custom_period_days" form={form} onChange={handleChange} type="number" min="1" max="3650" step="1" required />}
            {form.interest_type === "fixed" && <FormField label="Fixed Interest Amount (₹/period)" name="fixed_interest_amount" form={form} onChange={handleChange} type="number" min="0.01" step="0.01" required />}
            {form.interest_type === "compound" && <FormSelect label="Compounding Frequency" name="compounding_frequency" form={form} onChange={handleChange} options={COMPOUND_FREQUENCIES} required />}
            <FormField label="Calculation Start Date" name="interest_calculation_start_date" form={form} onChange={handleChange} type="date" required />
            <FormSelect label="Loan Status" name="loan_status" form={form} onChange={handleChange} options={(loanRecord ? ["Active", "Pending", "Inactive", "Completed"] : ["Active", "Pending"]).map((status) => [status, status])} required />
            <FormField label="Other Authorized Charges (₹)" name="other_charges" form={form} onChange={handleChange} type="number" min="0" step="0.01" />
          </div>
          {!loadingCustomers && interestTypes.length === 0 && (
            <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
              No interest methods are enabled. An administrator must enable at least one in Interest Management before creating a loan.
            </p>
          )}
          {(form.interest_type === "slab_based" || form.interest_type === "custom") && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              {form.interest_type === "slab_based"
                ? "Enter the applicable authorized slab rate above. Verify the customer's principal falls within the configured slab before saving."
                : "Enter the authorized custom rate and record the governing terms in Notes."}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-amber-100 pb-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-sm font-black text-amber-800">05</span>
            <div>
              <h2 className="text-base font-bold text-[#003B3B]">Estimated Interest Preview</h2>
              <p className="mt-0.5 text-xs text-slate-600">Review the estimated amount due at maturity before saving.</p>
            </div>
          </div>
          {estimate ? (
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-white shadow-sm">
              <div className="grid gap-x-6 px-4 sm:grid-cols-2 sm:px-5">
                {[
                  ["Principal Amount", formatCurrency(estimate.principal)],
                  ["Interest Type", interestTypes.find((type) => type.type_key === form.interest_type)?.label || "—"],
                  ["Applicable Rate", form.interest_type === "fixed"
                    ? `${formatCurrency(Number(form.fixed_interest_amount || 0))} / ${form.interest_frequency.replaceAll("_", " ")}`
                    : `${Number(form.interest_rate || 0)}% / ${form.interest_frequency.replaceAll("_", " ")}`],
                  ["Accrued Interest at Maturity", formatCurrency(estimate.interest)],
                  ["Processing Fee", formatCurrency(estimate.fee)],
                  ["Other Charges", formatCurrency(estimate.charges)],
                  ["Payments Received", formatCurrency(0)],
                  ["Outstanding Principal", formatCurrency(estimate.principal)]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-right text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 bg-amber-50/70 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-xs font-bold text-slate-600">Total Amount Due · Settlement Estimate</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-[#003B3B]">{formatCurrency(estimate.total)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">Estimated at maturity</span>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-5">
                <p><FiCalendar className="mr-1 inline" />{form.interest_calculation_start_date} to {form.maturity_date}: {estimate.days} convention days; {estimate.eligibleDays} interest-bearing days after configured grace and interest-free days.</p>
                <p className="mt-1">Principal basis: {estimate.basis}. Values round to two decimal places for display. This estimate assumes no payments received and does not allocate payments; it is not a settlement quote. Review the signed contract terms before disbursement.</p>
              </div>
            </div>
          ) : <p className="text-sm text-slate-500">Enter the loan amount, interest rate, and dates to see the estimate.</p>}
        </section>
        </div>

        <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">02</span>
            <div>
              <h2 className="text-base font-bold text-[#003B3B]">Pledged Jewellery</h2>
              <p className="mt-0.5 text-xs text-slate-500">Enter the collateral details to calculate its current valuation.</p>
            </div>
          </div>
          {activeRateSet && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            Global rate set effective {formatRateDate(activeRateSet.rate_date)}. Valuation uses eligible net {form.metal_type.toLowerCase()} weight × its configured rate; retail charges are excluded.
          </p>}
          {ratesError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Could not refresh rates: {ratesError}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <FormSelect
              label="Jewellery Type"
              name="jewellery_type"
              form={form}
              onChange={handleChange}
              required
              options={[["", "Select jewellery category"], ...JEWELLERY_TYPE_OPTIONS]}
            />
            {form.jewellery_type === "Other" && (
              <FormField
                label="Specify Jewellery Type"
                name="jewellery_type_other"
                form={{ jewellery_type_other: otherJewelleryType }}
                onChange={(event) => setOtherJewelleryType(event.target.value)}
                required
              />
            )}
            <FormSelect label="Metal Type" name="metal_type" form={form} onChange={handleChange} required disabled={Boolean(loanRecord && loanRecord.gold_rate_per_gram == null)} options={["Gold", "Silver", "Platinum", "Diamond"].map((metal) => [metal, metal])} />
            <FormSelect
              label={`${form.metal_type} Purity / Quality`}
              name="gold_purity"
              form={form}
              onChange={handleChange}
              required
              disabled={Boolean(loanRecord && loanRecord.gold_rate_per_gram == null)}
              help={loanRecord && loanRecord.gold_rate_per_gram == null
                ? "This legacy loan has no rate snapshot; its saved purity and valuation are preserved."
                : `Select the ${form.metal_type.toLowerCase()} purity or quality matching its active rate.`}
              options={[
                ["", `Select ${form.metal_type.toLowerCase()} purity / quality`],
                ...(!(METAL_OPTIONS[form.metal_type] || []).some(([value]) => value === form.gold_purity) && form.gold_purity
                  ? [[form.gold_purity, `${form.gold_purity} (saved)`]]
                  : []),
                ...(METAL_OPTIONS[form.metal_type] || [])
              ]}
            />
            <FormField label={`Gross Weight (${weightUnit})`} name="gross_weight" form={form} onChange={handleChange} type="number" min="0.001" step="0.001" required />
            <FormField label={`Stone Weight (${weightUnit})`} name="stone_weight" form={form} onChange={handleChange} type="number" min="0" step="0.001" />
            <label className={labelClass}>Net {form.metal_type} Weight ({weightUnit})<input className={`${fieldClass} bg-slate-50`} value={Math.max(0, Number(form.gross_weight || 0) - Number(form.stone_weight || 0)).toFixed(3)} readOnly placeholder="Calculated from gross and stone weight" /></label>
            <FormField label={`${form.metal_type} Rate / ${appliedRateUnit === "carat" ? "Carat" : "Gram"} (₹)`} name="gold_rate_per_gram" form={{ gold_rate_per_gram: appliedGoldRate ?? "" }} onChange={() => {}} readOnly help={loanRecord && savedPurityUnchanged && loanRecord.gold_rate_per_gram != null ? `Saved loan rate from ${formatRateDate(loanRecord.gold_rate_date)}; today's changes do not alter it.` : loanRecord && savedPurityUnchanged ? "Legacy loan; its saved valuation is preserved." : ratesLoading ? "Loading today's active rate..." : "Selected by the configured metal purity or quality."} />
            <FormField label={`${form.metal_type} Valuation (₹)`} name="gold_valuation" form={{ gold_valuation: estimatedGoldValuation.toFixed(2) }} onChange={() => {}} readOnly required min="0.01" step="0.01" help={`Eligible net weight (${weightUnit}) × the applied ${appliedRateUnit} rate snapshot; retail charges are excluded.`} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <span className={labelClass}>Loan Amount (₹)<span className="ml-1 text-rose-500">*</span></span>
              <div className="mt-1.5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="radiogroup" aria-label="Loan amount calculation mode">
                {[
                  ["auto", "Auto calculate (50%)"],
                  ["manual", "Enter manually"]
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={loanAmountMode === mode}
                    onClick={() => handleLoanAmountModeChange(mode)}
                    className={`rounded-md px-3 py-2 text-xs font-semibold transition ${loanAmountMode === mode ? "bg-[#003B3B] text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {loanAmountMode === "auto" ? (
                <>
                  <input className={`${fieldClass} bg-slate-50`} type="number" value={calculatedLoanAmount} readOnly aria-label="Automatically calculated loan amount" placeholder="Calculated from gold valuation" />
                  <p className="mt-1 text-[11px] font-normal text-slate-400">Automatically calculated as 50% of the pledged gold valuation ({formatCurrency(estimatedGoldValuation)}).</p>
                </>
              ) : (
                <FormField label="Loan Amount (₹)" name="principal_amount" form={form} onChange={handleChange} type="number" min="0.01" step="0.01" required placeholder="Enter loan amount" help="Enter the loan amount to disburse." />
              )}
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <p className={labelClass}>Gold Image <span className="font-normal text-slate-400">(optional, PNG or JPG up to 5 MB)</span></p>
              <input
                ref={goldImageInput}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg"
                title="Choose a PNG or JPG image of the pledged gold"
                onChange={handleGoldImageSelect}
              />
              <input
                ref={goldImageCameraInput}
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg"
                capture="environment"
                title="Take a photo of the pledged gold"
                onChange={handleGoldImageSelect}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => goldImageInput.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                >
                  <FiUploadCloud className="text-[#008577]" />
                  {goldImageFile ? "Choose a different image" : loanRecord?.gold_image_url ? "Replace gold image" : "Upload gold image"}
                </button>
                <button
                  type="button"
                  onClick={() => goldImageCameraInput.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#008577]/30 px-3 py-2 text-sm font-semibold text-[#00695C] hover:bg-emerald-50"
                >
                  <FiCamera />
                  Take photo
                </button>
              </div>
              {goldImagePreviewUrl && (
                <img src={goldImagePreviewUrl} alt="Pledged gold preview" className="mt-3 h-40 w-40 rounded-lg border border-slate-200 object-cover" />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-sm font-black text-violet-700">04</span>
            <div>
              <h2 className="text-base font-bold text-[#003B3B]">Loan Schedule</h2>
              <p className="mt-0.5 text-xs text-slate-500">Choose the loan dates and repayment frequency.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <label className={labelClass}>Loan Number<input className={`${fieldClass} bg-slate-50`} value={loanRecord?.loan_number || "Auto-generated on save"} readOnly placeholder="Auto-generated on save" /></label>
            <FormField label="Loan Date" name="loan_date" form={form} onChange={handleChange} type="date" required />
            <FormField label="Maturity Date" name="maturity_date" form={form} onChange={handleChange} type="date" required />
            <FormSelect label="Payment Frequency" name="payment_frequency" form={form} onChange={handleChange} options={PAYMENT_FREQUENCIES} required />
          </div>
          <label className={`${labelClass} mt-4`}>Notes<textarea className={fieldClass} name="notes" rows="3" maxLength="5000" value={form.notes} onChange={handleChange} placeholder="Enter any additional loan notes (optional)" /></label>
        </section>
        </div>

        <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-md sm:p-4 lg:col-span-2">
          <button type="button" onClick={() => navigate("/admin/loans/allloans")} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
          {!loanRecord && <button type="button" onClick={handleReset} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Reset</button>}
          <button type="submit" disabled={saving || loadingCustomer || !customer || interestTypes.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-[#003B3B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-50">
            <FiCheck /> {saving ? (loanRecord ? "Updating Loan..." : "Saving Loan...") : (loanRecord ? "Update Loan" : "Save Loan")}
          </button>
        </div>
      </form>
    </main>
  );
}
