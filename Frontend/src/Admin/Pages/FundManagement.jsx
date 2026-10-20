import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote,
  Download, FileText, LayoutGrid, List, Plus, RefreshCw, Search, Wallet, X
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api";
import DateRangeFilter from "../Components/DateRangeFilter";
import { formatCurrency } from "../../utils/currency";

const CATEGORIES = {
  FUND_ADDED: ["Cash", "Bank Account", "UPI", "Owner Investment", "Business Capital", "Other"],
  DEBIT: [
    "Customer Gold Loan Disbursement", "Supplier Payment", "Gold Purchase", "Shop Expenses",
    "Employee Salary", "Rent and Electricity", "Customer Refund", "Bank Withdrawal or Transfer", "Other Expenses"
  ],
  CREDIT: [
    "Customer Loan Repayment", "Gold Sales Billing Collection", "Interest Collection",
    "Making Charges Collection", "Customer Advance", "Owner Capital", "Supplier Refund",
    "Bank Deposit", "Other Income"
  ]
};
const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque", "Other"];
const TYPE_LABELS = { FUND_ADDED: "Fund Added", DEBIT: "Debit", CREDIT: "Credit", TRANSFER_IN: "Transfer", TRANSFER_OUT: "Transfer" };
const today = () => new Date().toLocaleDateString("en-CA");

const emptyEntry = () => ({
  account_id: "", category: "", amount: "", transaction_date: today(),
  payment_method: "Cash", party_name: "", related_reference: "", reference_number: "", description: ""
});

function money(value) {
  return formatCurrency(Number(value || 0));
}

function displayDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function FundManagement() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
  const [filters, setFilters] = useState({ account_id: "", transaction_type: "ALL", search: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [entryType, setEntryType] = useState("");
  const [entry, setEntry] = useState(emptyEntry);
  const [receipt, setReceipt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState({
    source_account_id: "", destination_account_id: "", transaction_date: today(), amount: "",
    payment_method: "Bank Transfer", reference_number: "", description: ""
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionView, setTransactionView] = useState("table");

  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setLoadError("");
    try {
      const params = {
        startDate: dateRange.startDate, endDate: dateRange.endDate,
        page, page_size: 20, account_id: filters.account_id,
        transaction_type: filters.transaction_type, search: filters.search
      };
      const [accountsResponse, summaryResponse, transactionResponse] = await Promise.all([
        api.get("/funds/accounts"),
        api.get("/funds/summary", { params: dateRange }),
        api.get("/funds/transactions", { params })
      ]);
      setAccounts(accountsResponse.data);
      setSummary(summaryResponse.data);
      setTransactions(transactionResponse.data.transactions);
      setTotalTransactions(transactionResponse.data.total);
    } catch (error) {
      const message = error.response?.data?.message || "Fund management data could not be loaded.";
      setLoadError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, filters.account_id, filters.search, filters.transaction_type, page]);

  useEffect(() => { fetchData();   }, [fetchData]);

  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);
  const pageCount = Math.max(1, Math.ceil(totalTransactions / 20));

  const openEntry = (type) => {
    setEntryType(type);
    setEntry({ ...emptyEntry(), account_id: activeAccounts[0] ? String(activeAccounts[0].id) : "", category: CATEGORIES[type][0] });
    setReceipt(null);
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      let receiptUrl = "";
      if (receipt) {
        const formData = new FormData();
        formData.append("receipt", receipt);
        const upload = await api.post("/funds/receipts", formData);
        receiptUrl = upload.data.receipt_url;
      }
      await api.post(`/funds/transactions/${entryType === "FUND_ADDED" ? "fund-added" : entryType.toLowerCase()}`, {
        ...entry,
        idempotency_key: crypto.randomUUID(),
        receipt_url: receiptUrl
      });
      toast.success("Transaction recorded successfully.");
      setEntryType("");
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "The transaction could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const saveTransfer = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post("/funds/transfers", { ...transfer, idempotency_key: crypto.randomUUID() });
      toast.success("Account transfer recorded.");
      setTransferOpen(false);
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "The transfer could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const exportRows = async () => {
    try {
      const response = await api.get("/funds/transactions", {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate, ...filters, page: 1, page_size: 5000 }
      });
      return response.data.transactions;
    } catch (error) {
      toast.error(error.response?.data?.message || "Transactions could not be exported.");
      return null;
    }
  };

  const exportCsv = async () => {
    const rows = await exportRows();
    if (!rows) return;
    const columns = ["Transaction ID", "Date", "Account", "Type", "Category", "Party", "Related Reference", "Reference Number", "Payment Method", "Debit", "Credit", "Running Balance", "Status"];
    const values = rows.map((row) => [
      row.id, row.transaction_date, row.account_name, TYPE_LABELS[row.transaction_type], row.category,
      row.party_name, row.related_reference, row.reference_number, row.payment_method,
      ["DEBIT", "TRANSFER_OUT"].includes(row.transaction_type) ? row.amount : "",
      ["CREDIT", "FUND_ADDED", "TRANSFER_IN"].includes(row.transaction_type) ? row.amount : "",
      row.running_balance, row.status
    ]);
    const csv = [columns, ...values].map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fund-transactions-${today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    const rows = await exportRows();
    if (!rows) return;
    const headings = ["Transaction ID", "Date", "Account", "Type", "Category", "Party", "Reference", "Payment Method", "Debit", "Credit", "Running Balance", "Status"];
    const bodyRows = rows.map((row) => [
      row.id, row.transaction_date, row.account_name, TYPE_LABELS[row.transaction_type], row.category,
      row.party_name, row.reference_number || row.related_reference, row.payment_method,
      ["DEBIT", "TRANSFER_OUT"].includes(row.transaction_type) ? money(row.amount) : "",
      ["CREDIT", "FUND_ADDED", "TRANSFER_IN"].includes(row.transaction_type) ? money(row.amount) : "",
      money(row.running_balance), row.status
    ]);
    const html = `<table><thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const blob = new Blob([`<html><meta charset="utf-8">${html}</html>`], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fund-transactions-${today()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openReceipt = async (receiptUrl) => {
    try {
      const response = await api.get(receiptUrl, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error.response?.data?.message || "The receipt could not be opened.");
    }
  };

  const printReport = () => window.print();
  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const statCards = [
    { label: "Opening Balance", value: summary?.opening_balance, icon: Wallet, card: "border-[#267864] bg-[#103F35]", iconColor: "bg-[#007A5E] text-white", accent: "bg-emerald-300" },
    { label: "Total Fund Added", value: summary?.fund_added, icon: Plus, card: "border-[#9A7A32] bg-[#3D3218]", iconColor: "bg-gradient-to-br from-amber-300 to-amber-600 text-white", accent: "bg-amber-300" },
    { label: "Total Debit", value: summary?.total_debit, icon: ArrowUpRight, card: "border-[#2F719B] bg-[#12324B]", iconColor: "bg-[#007A67] text-white", accent: "bg-sky-300" },
    { label: "Total Credit", value: summary?.total_credit, icon: ArrowDownLeft, card: "border-[#A45945] bg-[#48281F]", iconColor: "bg-gradient-to-br from-amber-300 to-amber-600 text-white", accent: "bg-orange-300" },
    { label: "Loan Disbursed", value: summary?.loan_disbursed, icon: Banknote, card: "border-[#267864] bg-[#103F35]", iconColor: "bg-[#007A5E] text-white", accent: "bg-emerald-300" },
    { label: "Loan Repayment", value: summary?.loan_repayment_received, icon: RefreshCw, card: "border-[#9A7A32] bg-[#3D3218]", iconColor: "bg-gradient-to-br from-amber-300 to-amber-600 text-white", accent: "bg-amber-300" },
    { label: "Billing Collection", value: summary?.billing_collection, icon: FileText, card: "border-[#2F719B] bg-[#12324B]", iconColor: "bg-[#007A67] text-white", accent: "bg-sky-300" },
    { label: "Available Balance", value: summary?.current_balance, icon: Wallet, card: "border-[#267864] bg-[#103F35]", iconColor: "bg-[#007A5E] text-white", accent: "bg-emerald-300", strong: true }
  ];

  return (
    <main className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-7 print:bg-white print:text-slate-900 print:shadow-none">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200 print:text-emerald-800">Sri Gold Shop · Finance</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Fund Management</h1>
          <p className="mt-2 text-sm text-white/75 print:text-slate-600">Review cash flow, account balances, collections, and business expenses.</p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2 print:hidden">
        <DateRangeFilter onApply={(range) => { setDateRange(range); setPage(1); }} />
        <button onClick={() => { setRefreshing(true); fetchData(true); }} className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-3 py-2 text-sm font-bold hover:bg-white/10" aria-label="Refresh funds">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold hover:bg-white/20">
            <ArrowLeftRight size={16} /> Transfer
          </button>
          <button onClick={() => openEntry("FUND_ADDED")} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-[#00594f] hover:bg-emerald-50">
            <Plus size={16} /> Add Fund
          </button>
        </div>
      </header>

      {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{loadError} <button onClick={() => fetchData()} className="ml-2 underline">Retry</button></div>}

      <section aria-label="Fund summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, card, iconColor, accent, strong }) => (
          <article key={label} className={`relative flex min-h-[148px] min-w-0 items-center gap-4 overflow-hidden rounded-2xl border-l-4 border-y border-r p-4 shadow-[0_3px_12px_rgba(30,41,59,0.12)] transition-transform hover:-translate-y-0.5 sm:p-5 ${card}`}>
            <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md ${iconColor}`}><Icon size={22} /></span>
            <div className="relative z-10 min-w-0 self-center">
              <p className="truncate text-xs font-semibold text-slate-200">{label}</p>
              <p className={`mt-1 truncate text-lg font-black leading-tight tracking-tight text-white sm:text-xl ${strong ? "text-emerald-200" : ""}`}>{loading && value == null ? "—" : money(value)}</p>
              {label === "Available Balance" && summary && <p className="mt-1 truncate text-[10px] font-medium text-slate-300">Closing for this period: {money(summary.closing_balance)}</p>}
            </div>
            <div aria-hidden="true" className="absolute bottom-3 right-3 flex h-8 items-end gap-1 opacity-80">
              <span className={`h-3 w-1.5 rounded-t ${accent}`} />
              <span className={`h-5 w-1.5 rounded-t ${accent}`} />
              <span className={`h-7 w-1.5 rounded-t ${accent}`} />
            </div>
            {strong && <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border border-white/10" />}
          </article>
        ))}
      </section>

      <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 print:hidden">
        <label className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Search customer, reference..." className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm" />
        </label>
        <select value={filters.account_id} onChange={(event) => updateFilter("account_id", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
          <option value="">All accounts</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <select value={filters.transaction_type} onChange={(event) => updateFilter("transaction_type", event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
          <option value="ALL">All transaction types</option>
          <option value="FUND_ADDED">Fund Added</option><option value="DEBIT">Debit</option><option value="CREDIT">Credit</option><option value="TRANSFER_IN">Transfer In</option><option value="TRANSFER_OUT">Transfer Out</option>
        </select>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-lg font-black text-slate-900">Transaction History</h2>
            <p className="text-xs text-slate-500">{totalTransactions.toLocaleString()} records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1" role="group" aria-label="Transaction view">
              <button
                type="button"
                aria-pressed={transactionView === "table"}
                onClick={() => setTransactionView("table")}
                className={`rounded-md p-2 transition ${transactionView === "table" ? "bg-[#064A41] text-white" : "text-slate-500 hover:bg-slate-100"}`}
                aria-label="Table view"
                title="Table view"
              >
                <List size={17} />
              </button>
              <button
                type="button"
                aria-pressed={transactionView === "cards"}
                onClick={() => setTransactionView("cards")}
                className={`rounded-md p-2 transition ${transactionView === "cards" ? "bg-[#064A41] text-white" : "text-slate-500 hover:bg-slate-100"}`}
                aria-label="Card view"
                title="Card view"
              >
                <LayoutGrid size={17} />
              </button>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-[#07564B] bg-gradient-to-r from-[#07564B] to-[#064A41] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-[#064A41] hover:to-[#043D37] hover:shadow-md"><Download size={14} /> CSV</button>
            <button onClick={exportExcel} className="inline-flex items-center gap-1.5 rounded-lg border border-[#07564B] bg-gradient-to-r from-[#07564B] to-[#064A41] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-[#064A41] hover:to-[#043D37] hover:shadow-md"><Download size={14} /> Excel</button>
            <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg border border-[#07564B] bg-gradient-to-r from-[#07564B] to-[#064A41] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:from-[#064A41] hover:to-[#043D37] hover:shadow-md"><FileText size={14} /> Print / PDF</button>
          </div>
        </div>
        {transactionView === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-gradient-to-r from-[#07564B] via-[#064A41] to-[#043D37] text-[10px] uppercase tracking-wide text-white">
                <tr><th className="rounded-tl-xl px-4 py-3">ID / Date</th><th className="px-4 py-3">Type / Category</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Customer / Supplier</th><th className="px-4 py-3">Reference / Method</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Running Balance</th><th className="rounded-tr-xl px-4 py-3">Status / Details</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((transaction) => {
                  const isDebit = ["DEBIT", "TRANSFER_OUT"].includes(transaction.transaction_type);
                  const isCredit = ["CREDIT", "FUND_ADDED", "TRANSFER_IN"].includes(transaction.transaction_type);
                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3"><span className="font-extrabold text-slate-800">#{transaction.id}</span><span className="mt-1 block whitespace-nowrap text-slate-500">{displayDate(transaction.transaction_date)}</span></td>
                      <td className="px-4 py-3"><span className="font-bold text-slate-800">{TYPE_LABELS[transaction.transaction_type]}</span><span className="mt-1 block max-w-44 text-slate-500">{transaction.category}</span></td>
                      <td className="px-4 py-3 text-slate-600">{transaction.account_name}</td>
                      <td className="px-4 py-3 text-slate-600">{transaction.party_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-600"><span>{transaction.reference_number || transaction.related_reference || "—"}</span><span className="mt-1 block">{transaction.payment_method}</span></td>
                      <td className="px-4 py-3 text-right font-bold text-rose-700">{isDebit ? money(transaction.amount) : "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">{isCredit ? money(transaction.amount) : "—"}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800">{money(transaction.running_balance)}</td>
                      <td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{transaction.status}</span><div className="mt-2 flex gap-2"><button onClick={() => setSelectedTransaction(transaction)} className="font-bold text-[#00695C] hover:underline">Details</button>{transaction.receipt_url && <button onClick={() => openReceipt(transaction.receipt_url)} className="font-bold text-sky-700 hover:underline">Receipt</button>}</div></td>
                    </tr>
                  );
                })}
                {!loading && transactions.length === 0 && <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">No transactions match these filters.</td></tr>}
                {loading && <tr><td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">Loading transactions…</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {transactions.map((transaction) => {
              const isDebit = ["DEBIT", "TRANSFER_OUT"].includes(transaction.transaction_type);
              const isCredit = ["CREDIT", "FUND_ADDED", "TRANSFER_IN"].includes(transaction.transaction_type);
              return (
                <article key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Transaction #{transaction.id}</p>
                      <h3 className="mt-1 truncate text-sm font-extrabold text-slate-900">{transaction.category}</h3>
                      <p className="mt-1 text-xs text-slate-500">{displayDate(transaction.transaction_date)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">{transaction.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                    <div><p className="text-slate-500">Type</p><p className="mt-1 font-bold text-slate-800">{TYPE_LABELS[transaction.transaction_type]}</p></div>
                    <div><p className="text-slate-500">Account</p><p className="mt-1 truncate font-bold text-slate-800">{transaction.account_name}</p></div>
                    <div><p className="text-slate-500">Customer / Supplier</p><p className="mt-1 truncate font-bold text-slate-800">{transaction.party_name || "—"}</p></div>
                    <div><p className="text-slate-500">Reference / Method</p><p className="mt-1 truncate font-bold text-slate-800">{transaction.reference_number || transaction.related_reference || "—"} · {transaction.payment_method}</p></div>
                    <div><p className="text-slate-500">Debit</p><p className="mt-1 font-bold text-rose-700">{isDebit ? money(transaction.amount) : "—"}</p></div>
                    <div><p className="text-slate-500">Credit</p><p className="mt-1 font-bold text-emerald-700">{isCredit ? money(transaction.amount) : "—"}</p></div>
                    <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2"><p className="text-slate-500">Running Balance</p><p className="mt-1 font-extrabold text-slate-900">{money(transaction.running_balance)}</p></div>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3">
                    <button type="button" onClick={() => setSelectedTransaction(transaction)} className="text-xs font-bold text-[#00695C] hover:underline">Details</button>
                    {transaction.receipt_url && <button type="button" onClick={() => openReceipt(transaction.receipt_url)} className="text-xs font-bold text-sky-700 hover:underline">Receipt</button>}
                  </div>
                </article>
              );
            })}
            {loading && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">Loading transactions…</p>}
            {!loading && transactions.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">No transactions match these filters.</p>}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500 print:hidden">
          <span>Page {page} of {pageCount}</span>
          <div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Previous</button><button disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold disabled:opacity-40">Next</button></div>
        </div>
      </section>

      {entryType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEntryType(""); }}>
          <form onSubmit={saveEntry} className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{entryType === "FUND_ADDED" ? "Increase funds" : entryType === "DEBIT" ? "Money paid out" : "Money received"}</p><h2 className="mt-1 text-xl font-black">{entryType === "FUND_ADDED" ? "Add Fund" : entryType === "DEBIT" ? "Record Debit" : "Record Credit"}</h2></div><button type="button" onClick={() => setEntryType("")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Transaction Date<input required type="date" value={entry.transaction_date} onChange={(event) => setEntry({ ...entry, transaction_date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              {entryType !== "FUND_ADDED" && <label className="text-xs font-bold text-slate-600">Fund Account<select required value={entry.account_id} onChange={(event) => setEntry({ ...entry, account_id: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"><option value="">Select account</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.current_balance)}</option>)}</select></label>}
              {entryType !== "FUND_ADDED" && <label className="text-xs font-bold text-slate-600">{entryType === "DEBIT" ? "Debit Category" : "Credit Category"}<select required value={entry.category} onChange={(event) => setEntry({ ...entry, category: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal">{CATEGORIES[entryType].map((category) => <option key={category}>{category}</option>)}</select></label>}
              <label className="text-xs font-bold text-slate-600">Amount (₹)<input required min="0.01" step="0.01" type="number" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Payment Method<select required value={entry.payment_method} onChange={(event) => setEntry({ ...entry, payment_method: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal">{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
              {entryType !== "FUND_ADDED" && <label className="text-xs font-bold text-slate-600">{entryType === "DEBIT" ? "Customer / Supplier" : "Customer Name"}<input value={entry.party_name} maxLength={150} onChange={(event) => setEntry({ ...entry, party_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>}
              {entryType !== "FUND_ADDED" && <label className="text-xs font-bold text-slate-600">Related Loan ID / Bill Number<input value={entry.related_reference} maxLength={100} onChange={(event) => setEntry({ ...entry, related_reference: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>}
              {entryType !== "FUND_ADDED" && <label className="text-xs font-bold text-slate-600">Reference Number / Transaction ID<input value={entry.reference_number} maxLength={100} onChange={(event) => setEntry({ ...entry, reference_number: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>}
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Description / Notes<textarea rows="2" maxLength={2000} value={entry.description} onChange={(event) => setEntry({ ...entry, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Upload Receipt <span className="font-normal text-slate-400">(PDF, JPG, PNG, WEBP; max 10 MB)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setReceipt(event.target.files?.[0] || null)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-5"><button type="button" onClick={() => setEntryType("")} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving || !activeAccounts.length} className="rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Transaction"}</button></div>
          </form>
        </div>
      )}

      {transferOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={saveTransfer} className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">Internal movement</p><h2 className="mt-1 text-xl font-black">Transfer Between Accounts</h2></div><button type="button" onClick={() => setTransferOpen(false)} aria-label="Close"><X size={20} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">From Account<select required value={transfer.source_account_id} onChange={(event) => setTransfer({ ...transfer, source_account_id: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"><option value="">Select source</option>{activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {money(account.current_balance)}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">To Account<select required value={transfer.destination_account_id} onChange={(event) => setTransfer({ ...transfer, destination_account_id: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"><option value="">Select destination</option>{activeAccounts.filter((account) => String(account.id) !== transfer.source_account_id).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">Transfer Date<input required type="date" value={transfer.transaction_date} onChange={(event) => setTransfer({ ...transfer, transaction_date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Amount (₹)<input required min="0.01" step="0.01" type="number" value={transfer.amount} onChange={(event) => setTransfer({ ...transfer, amount: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600">Payment Method<select value={transfer.payment_method} onChange={(event) => setTransfer({ ...transfer, payment_method: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal">{PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">Reference Number<input value={transfer.reference_number} onChange={(event) => setTransfer({ ...transfer, reference_number: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Description<textarea rows="2" value={transfer.description} onChange={(event) => setTransfer({ ...transfer, description: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" /></label>
              <p className="text-xs text-slate-500 sm:col-span-2">Both ledger entries are committed atomically. Internal transfers do not count as income or expenses.</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-5"><button type="button" onClick={() => setTransferOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Transferring…" : "Confirm Transfer"}</button></div>
          </form>
        </div>
      )}

      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTransaction(null); }}>
          <article className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Transaction #{selectedTransaction.id}</p><h2 className="mt-1 text-xl font-black">{selectedTransaction.category}</h2></div><button type="button" onClick={() => setSelectedTransaction(null)} aria-label="Close"><X size={20} /></button></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-5 text-sm">
              {[["Type", TYPE_LABELS[selectedTransaction.transaction_type]], ["Date", displayDate(selectedTransaction.transaction_date)], ["Account", selectedTransaction.account_name], ["Amount", money(selectedTransaction.amount)], ["Party", selectedTransaction.party_name || "—"], ["Payment method", selectedTransaction.payment_method], ["Reference", selectedTransaction.reference_number || "—"], ["Related record", selectedTransaction.related_reference || "—"], ["Created by user ID", selectedTransaction.created_by || "—"], ["Status", selectedTransaction.status]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 font-bold text-slate-800">{value}</dd></div>)}
              <div className="col-span-2"><dt className="text-xs font-semibold text-slate-500">Notes</dt><dd className="mt-1 whitespace-pre-wrap font-medium text-slate-800">{selectedTransaction.description || "—"}</dd></div>
            </dl>
            <div className="flex justify-end gap-2 border-t border-slate-100 p-5">{selectedTransaction.receipt_url && <button onClick={() => openReceipt(selectedTransaction.receipt_url)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold">View Receipt</button>}<button onClick={() => setSelectedTransaction(null)} className="rounded-lg bg-[#00695C] px-4 py-2 text-sm font-bold text-white">Close</button></div>
          </article>
        </div>
      )}
    </main>
  );
}

export default FundManagement;
