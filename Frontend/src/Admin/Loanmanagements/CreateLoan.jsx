import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiCalendar, FiCheck, FiChevronDown, FiSearch, FiUserPlus } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

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
  if (!(principal > 0) || !(rate >= 0) || !form.interest_calculation_start_date || !form.maturity_date) return null;
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

function FormField({ label, name, form, onChange, type = "text", required = false, min, step, help }) {
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
      />
      {help && <span className="mt-1 block text-[11px] font-normal text-slate-400">{help}</span>}
    </label>
  );
}

function FormSelect({ label, name, form, onChange, options, required = false }) {
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-rose-500">*</span>}
      <select className={fieldClass} name={name} value={form[name] ?? ""} onChange={onChange} required={required}>
        {options.map(([value, text, disabled]) => <option key={value} value={value} disabled={disabled}>{text}</option>)}
      </select>
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
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerLoadError, setCustomerLoadError] = useState("");
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loanRecord, setLoanRecord] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);

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
        setCustomer(customerDetails.data);
        setCustomerQuery(`${customerDetails.data.customer_code || customerDetails.data.id} · ${customerDetails.data.full_name}`);
        setCustomerLoans(customerLoanResponse.data);
        setForm({
          ...initialLoan(),
          ...Object.fromEntries(Object.keys(initialLoan()).map((field) => {
            const value = loan[field];
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

  const filteredCustomers = useMemo(() => {
    const search = customerQuery.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((item) => [
      item.id, item.customer_code, item.full_name, item.mobile, item.alternate_mobile
    ].some((value) => String(value || "").toLowerCase().includes(search)));
  }, [customers, customerQuery]);

  const estimate = useMemo(
    () => calculateEstimate(form, form.interest_type),
    [form]
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
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleReset = () => {
    setForm(initialLoan());
    setCustomer(null);
    setCustomerQuery("");
    setCustomerLoans([]);
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
    setSaving(true);
    try {
      const payload = {
        ...form,
        customer_id: customer.id,
        net_gold_weight: (gross - stone).toFixed(3)
      };
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
    <main className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/loans/allloans" className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-[#008577] hover:text-[#003B3B]">
            <FiArrowLeft /> All Loans
          </Link>
          <h1 className="text-2xl font-extrabold text-[#003B3B]">{loanRecord ? `Edit Loan ${loanRecord.loan_number}` : "Create Gold Loan"}</h1>
          <p className="mt-1 text-sm text-slate-500">{loanRecord ? "Update the pledged gold and agreed contract terms." : "Select a registered customer and record the pledged gold and agreed terms."}</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-bold text-[#003B3B]">Customer</h2>
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
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
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
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left hover:bg-emerald-50"
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
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
              {loadingCustomer ? <p className="text-sm text-slate-500">Loading customer account and loan history...</p> : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Customer ID", customer.customer_code || customer.id],
                      ["Full Name", customer.full_name],
                      ["Mobile", customer.mobile],
                      ["KYC Status", customer.kyc_status]
                    ].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value || "—"}</p></div>)}
                    <div className="sm:col-span-2 lg:col-span-4">
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

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-bold text-[#003B3B]">Pledged Jewellery</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>
              Gold Pledge Number
              <input className={`${fieldClass} bg-slate-50`} value={loanRecord?.gold_pledge_number || "Auto-generated on save"} readOnly />
            </label>
            <FormField label="Jewellery Type" name="jewellery_type" form={form} onChange={handleChange} required />
            <FormField label="Gold Purity" name="gold_purity" form={form} onChange={handleChange} required help="Example: 22K or 916" />
            <FormField label="Gross Weight (g)" name="gross_weight" form={form} onChange={handleChange} type="number" min="0.001" step="0.001" required />
            <FormField label="Stone Weight (g)" name="stone_weight" form={form} onChange={handleChange} type="number" min="0" step="0.001" />
            <label className={labelClass}>Net Gold Weight (g)<input className={`${fieldClass} bg-slate-50`} value={Math.max(0, Number(form.gross_weight || 0) - Number(form.stone_weight || 0)).toFixed(3)} readOnly /></label>
            <FormField label="Gold Valuation (₹)" name="gold_valuation" form={form} onChange={handleChange} type="number" min="0.01" step="0.01" required />
            <FormField label="Loan Amount (₹)" name="principal_amount" form={form} onChange={handleChange} type="number" min="0.01" step="0.01" required />
          </div>
        </section>

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-bold text-[#003B3B]">Interest & Contract Terms</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormSelect label="Interest Type" name="interest_type" form={form} onChange={handleChange} required options={[["", "Select interest type"], ...interestTypes.map(({ type_key, label, enabled }) => [type_key, label, !enabled && type_key !== form.interest_type])]} />
            {form.interest_type !== "fixed" && <FormField label="Interest Rate (%)" name="interest_rate" form={form} onChange={handleChange} type="number" min="0" step="0.0001" required />}
            <FormSelect label="Interest Calculation Frequency" name="interest_frequency" form={form} onChange={handleChange} options={INTEREST_FREQUENCIES} required />
            {form.interest_frequency === "custom_period" && <FormField label="Custom Period (days)" name="custom_period_days" form={form} onChange={handleChange} type="number" min="1" max="3650" step="1" required />}
            {form.interest_type === "fixed" && <FormField label="Fixed Interest Amount (₹/period)" name="fixed_interest_amount" form={form} onChange={handleChange} type="number" min="0.01" step="0.01" required />}
            {form.interest_type === "compound" && <FormSelect label="Compounding Frequency" name="compounding_frequency" form={form} onChange={handleChange} options={COMPOUND_FREQUENCIES} required />}
            <FormSelect label="Day-Count Convention" name="day_count_convention" form={form} onChange={handleChange} options={[["actual_365", "Actual / 365"], ["actual_360", "Actual / 360"], ["30_360", "30 / 360"]]} />
            <FormField label="Calculation Start Date" name="interest_calculation_start_date" form={form} onChange={handleChange} type="date" required />
            <FormField label="Grace Period (days)" name="grace_period_days" form={form} onChange={handleChange} type="number" min="0" step="1" />
            <FormField label="Interest-Free Period (days)" name="interest_free_days" form={form} onChange={handleChange} type="number" min="0" step="1" />
            <FormField label="Late Payment Interest Rate (%)" name="late_payment_interest_rate" form={form} onChange={handleChange} type="number" min="0" step="0.0001" />
            <FormField label="Minimum Interest (₹)" name="minimum_interest_amount" form={form} onChange={handleChange} type="number" min="0" step="0.01" />
            <FormField label="Maximum Interest (₹)" name="maximum_interest_amount" form={form} onChange={handleChange} type="number" min="0" step="0.01" />
            <FormField label="Processing Fee (₹)" name="processing_fee" form={form} onChange={handleChange} type="number" min="0" step="0.01" />
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

        <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-4 text-base font-bold text-[#003B3B]">Loan Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className={labelClass}>Loan Number<input className={`${fieldClass} bg-slate-50`} value={loanRecord?.loan_number || "Auto-generated on save"} readOnly /></label>
            <FormField label="Loan Date" name="loan_date" form={form} onChange={handleChange} type="date" required />
            <FormField label="Maturity Date" name="maturity_date" form={form} onChange={handleChange} type="date" required />
            <FormSelect label="Payment Frequency" name="payment_frequency" form={form} onChange={handleChange} options={PAYMENT_FREQUENCIES} required />
            <FormSelect label="Loan Status" name="loan_status" form={form} onChange={handleChange} options={(loanRecord ? ["Active", "Pending", "Inactive", "Completed"] : ["Active", "Pending"]).map((status) => [status, status])} required />
          </div>
          <label className={`${labelClass} mt-4`}>Notes<textarea className={fieldClass} name="notes" rows="3" maxLength="5000" value={form.notes} onChange={handleChange} /></label>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm sm:p-5">
          <h2 className="mb-3 text-base font-bold text-[#003B3B]">Estimated Interest Preview</h2>
          {estimate ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                  ["Outstanding Principal", formatCurrency(estimate.principal)],
                  ["Total Amount Due", formatCurrency(estimate.total)],
                  ["Settlement Estimate", formatCurrency(estimate.total)]
                ].map(([label, value]) => <div key={label} className="rounded-lg bg-white/80 p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>)}
              </div>
              <div className="mt-3 rounded-lg bg-white/80 p-3 text-xs leading-relaxed text-slate-600">
                <p><FiCalendar className="mr-1 inline" />{form.interest_calculation_start_date} to {form.maturity_date}: {estimate.days} convention days; {estimate.eligibleDays} interest-bearing days after configured grace and interest-free days.</p>
                <p className="mt-1">Principal basis: {estimate.basis}. Values round to two decimal places for display. This estimate assumes no payments received and does not allocate payments; it is not a settlement quote. Review the signed contract terms before disbursement.</p>
              </div>
            </>
          ) : <p className="text-sm text-slate-500">Enter the loan amount, interest rate, and dates to see the estimate.</p>}
        </section>

        <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 rounded-xl border border-slate-100 bg-white/95 p-3 shadow-lg backdrop-blur">
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
