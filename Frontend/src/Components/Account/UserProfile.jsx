import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser, FiMail, FiPhone, FiShield, FiHeart,
  FiShoppingBag, FiLogOut, FiEdit2, FiCheckCircle,
  FiAlertCircle, FiClock, FiPackage,
} from "react-icons/fi";
import { FaRegGem } from "react-icons/fa";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../CommenComponents/PageContainer";
import api from "../../api";

/* ── helpers ─────────────────────────────────── */
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_STYLES = {
  Active:    { bg: "rgba(0,100,60,0.1)",  text: "#006430", dot: "#22c55e" },
  Pending:   { bg: "rgba(217,164,65,0.15)", text: "#8c5e13", dot: "#f59e0b" },
  Inactive:  { bg: "rgba(100,116,139,0.12)", text: "#475569", dot: "#94a3b8" },
  Completed: { bg: "rgba(59,130,246,0.1)", text: "#1d4ed8", dot: "#3b82f6" },
};

/* ── sub-components ───────────────────────────── */
const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
    style={{ border: "1px solid rgba(212,160,23,0.15)" }}>
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: "linear-gradient(135deg,#004D40,#0F766E)" }}>
      <Icon size={16} color="#fff" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-gray-800">{value || "—"}</p>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, onClick }) => (
  <button type="button" onClick={onClick}
    className="flex flex-col items-center gap-1 rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 w-full"
    style={{ border: "1px solid rgba(212,160,23,0.18)" }}>
    <div className="flex h-12 w-12 items-center justify-center rounded-full"
      style={{ background: "linear-gradient(135deg,#004D40,#0F766E)" }}>
      <Icon size={20} color="#D4A017" />
    </div>
    <p className="mt-1 text-2xl font-black text-gray-800">{value}</p>
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
  </button>
);

const LoanCard = ({ loan }) => {
  const style = STATUS_STYLES[loan.loan_status] || STATUS_STYLES.Inactive;
  const outstanding = Number(loan.outstanding_principal ?? loan.principal_amount);
  const principal   = Number(loan.principal_amount);
  const paid        = Math.max(0, principal - outstanding);
  const pct         = principal > 0 ? Math.min(100, Math.round((paid / principal) * 100)) : 0;
  const isOverdue   = loan.loan_status === "Active" && new Date(loan.maturity_date) < new Date();

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden"
      style={{ border: "1px solid rgba(212,160,23,0.18)" }}>

      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3"
        style={{ background: "linear-gradient(135deg,#003D2E,#004D40)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#F5C45E" }}>
            {loan.loan_number}
          </p>
          <p className="text-xs text-white/70 mt-0.5">{loan.gold_pledge_number}</p>
        </div>
        <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase"
          style={{ background: style.bg, color: style.text, border: `1px solid ${style.dot}30` }}>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ background: style.dot }} />
          {loan.loan_status}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 space-y-3">
        {/* Jewellery details */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FiPackage size={12} />
          <span className="font-semibold text-gray-700">{loan.jewellery_type}</span>
          <span>·</span>
          <span>{loan.metal_type} · {loan.gold_purity}</span>
          <span>·</span>
          <span>{Number(loan.net_gold_weight || 0).toFixed(2)}g</span>
        </div>

        {/* Amount row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "#f9f5ee" }}>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Principal</p>
            <p className="text-sm font-black mt-0.5" style={{ color: "#004D40" }}>₹{fmt(loan.principal_amount)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: outstanding > 0 ? "rgba(220,38,38,0.06)" : "rgba(22,163,74,0.06)" }}>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Outstanding</p>
            <p className="text-sm font-black mt-0.5" style={{ color: outstanding > 0 ? "#dc2626" : "#16a34a" }}>
              ₹{fmt(outstanding)}
            </p>
          </div>
        </div>

        {/* Repayment progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-gray-400 mb-1">
            <span>Repaid: ₹{fmt(paid)}</span>
            <span>{pct}% done</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : "linear-gradient(90deg,#004D40,#D4A017)" }} />
          </div>
        </div>

        {/* Dates row */}
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <FiClock size={11} />
            <span>Start: <strong>{fmtDate(loan.loan_date)}</strong></span>
          </div>
          <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500" : "text-gray-500"}`}>
            {isOverdue && <FiAlertCircle size={11} />}
            <span>Due: <strong>{fmtDate(loan.maturity_date)}</strong></span>
            {isOverdue && <span className="font-bold">(Overdue)</span>}
          </div>
        </div>

        {/* Interest rate */}
        <p className="text-[11px] text-gray-400">
          Interest: <span className="font-semibold text-gray-700">{loan.interest_type?.replace("_", " ")} · {Number(loan.interest_rate || 0).toFixed(2)}%</span>
        </p>
      </div>
    </div>
  );
};

/* ── main component ───────────────────────────── */
const UserProfile = () => {
  const { user, logout } = useAuth();
  const { wishlist, cart } = useContext(StoreContext);
  const navigate = useNavigate();

  const [loans, setLoans]       = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError]   = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api.get("/loans/my-loans", { signal: controller.signal })
      .then(({ data }) => setLoans(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (!controller.signal.aborted) {
          // 404 just means no loan customer record linked yet — not a real error
          if (err?.response?.status !== 404) setLoansError("Could not load loan details.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoansLoading(false); });
    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const name       = user.username || user.name || "Guest";
  const email      = user.email    || "";
  const phone      = user.phone    || "";
  const role       = user.role     || "user";
  const isAdmin    = role.toLowerCase() === "admin";
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : "Member";

  const activeLoans    = loans.filter((l) => l.loan_status === "Active").length;
  const completedLoans = loans.filter((l) => l.loan_status === "Completed").length;

  return (
    <div className="min-h-screen pb-16" style={{ background: "#fffdf8" }}>

      {/* ── Hero banner ── */}
      <div className="relative w-full py-14"
        style={{ background: "linear-gradient(135deg,#003D2E 0%,#004D40 60%,#1a5c42 100%)" }}>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg,transparent,#D4A017 30%,#F5C45E 50%,#D4A017 70%,transparent)" }} />

        <PageContainer>
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-xl ring-4 ring-white/20"
                style={{ background: "linear-gradient(135deg,#D4A017,#F5C45E)" }}>
                <span style={{ color: "#004D40" }}>{initials(name) || <FiUser />}</span>
              </div>
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-green-400" />
            </div>

            {/* Name & role */}
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "#F5C45E" }}>
                {isAdmin ? "Administrator" : "Member Account"}
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-white sm:text-4xl">{name}</h1>
              <p className="mt-1 text-sm text-white/60">{email}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {isAdmin && (
                <button type="button" onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
                  <FiShield size={14} /> Admin Panel
                </button>
              )}
              <button type="button" onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-600">
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left col ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">Account</span>
                  <h2 className="font-serif text-xl font-bold text-[#201a13]">Personal Details</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d9a441]" />
                    <span className="h-1 w-1 rotate-45 bg-[#d9a441]" />
                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d9a441]" />
                  </div>
                </div>
                <button type="button" onClick={() => navigate("/account/kyc")}
                  className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition hover:bg-gray-50"
                  style={{ borderColor: "#004D40", color: "#004D40" }}>
                  <FiEdit2 size={13} /> Edit / KYC
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoRow icon={FiUser}   label="Full Name"     value={name} />
                <InfoRow icon={FiMail}   label="Email Address" value={email} />
                <InfoRow icon={FiPhone}  label="Phone Number"  value={phone} />
                <InfoRow icon={FiShield} label="Account Role"  value={role.charAt(0).toUpperCase() + role.slice(1)} />
              </div>
              <div className="flex items-center gap-3 rounded-xl px-5 py-4"
                style={{ background: "linear-gradient(135deg,rgba(0,77,64,0.06),rgba(0,77,64,0.03))", border: "1px solid rgba(0,77,64,0.12)" }}>
                <FiCheckCircle size={20} style={{ color: "#004D40" }} />
                <div>
                  <p className="text-sm font-bold" style={{ color: "#004D40" }}>Verified Member</p>
                  <p className="text-xs text-gray-500">Joined {memberSince}</p>
                </div>
                <FaRegGem size={18} className="ml-auto" style={{ color: "#D4A017" }} />
              </div>
            </div>

            {/* ── Loans section ── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">Gold Loan</span>
                  <h2 className="font-serif text-xl font-bold text-[#201a13]">My Loans</h2>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d9a441]" />
                    <span className="h-1 w-1 rotate-45 bg-[#d9a441]" />
                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d9a441]" />
                  </div>
                </div>
                {loans.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">{activeLoans} Active</span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">{completedLoans} Completed</span>
                  </div>
                )}
              </div>

              {loansLoading ? (
                <div className="flex items-center justify-center rounded-2xl bg-white py-12"
                  style={{ border: "1px solid rgba(212,160,23,0.18)" }}>
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px]"
                    style={{ borderColor: "#004D40", borderTopColor: "transparent" }} />
                </div>
              ) : loansError ? (
                <div className="flex items-center gap-3 rounded-2xl bg-red-50 px-5 py-4"
                  style={{ border: "1px solid rgba(220,38,38,0.2)" }}>
                  <FiAlertCircle size={18} className="text-red-500" />
                  <p className="text-sm text-red-600">{loansError}</p>
                </div>
              ) : loans.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 text-center"
                  style={{ border: "1px dashed rgba(212,160,23,0.4)" }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full mb-3"
                    style={{ background: "rgba(0,77,64,0.08)" }}>
                    <FaRegGem size={28} style={{ color: "#004D40", opacity: 0.4 }} />
                  </div>
                  <p className="text-sm font-bold text-gray-600">No loans found</p>
                  <p className="text-xs text-gray-400 mt-1">You don't have any gold loans linked to your account.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {loans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
                </div>
              )}
            </div>
          </div>

          {/* ── Right col ── */}
          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">Overview</span>
              <h2 className="font-serif text-xl font-bold text-[#201a13]">My Activity</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d9a441]" />
                <span className="h-1 w-1 rotate-45 bg-[#d9a441]" />
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d9a441]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={FiHeart}       label="Wishlist"   value={wishlist.length} onClick={() => navigate("/")} />
              <StatCard icon={FiShoppingBag} label="Cart Items" value={cart.length}     onClick={() => navigate("/")} />
            </div>

            {/* Loan summary stat */}
            {!loansLoading && loans.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3"
                style={{ border: "1px solid rgba(212,160,23,0.18)" }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#004D40" }}>Loan Summary</p>
                <div className="space-y-2">
                  {[
                    { label: "Total Loans",    value: loans.length },
                    { label: "Active",         value: activeLoans, color: "#16a34a" },
                    { label: "Completed",      value: completedLoans, color: "#3b82f6" },
                    { label: "Total Principal", value: `₹${fmt(loans.reduce((s, l) => s + Number(l.principal_amount || 0), 0))}` },
                    { label: "Outstanding",    value: `₹${fmt(loans.reduce((s, l) => s + Number(l.outstanding_principal ?? l.principal_amount ?? 0), 0))}`, color: "#dc2626" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-bold" style={{ color: color || "#201a13" }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="rounded-2xl p-5 space-y-2"
              style={{ background: "linear-gradient(135deg,#003D2E,#004D40)" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F5C45E" }}>Quick Links</p>
              {[
                { label: "Browse Jewellery", path: "/explore" },
                { label: "My Wishlist",      path: "/" },
                { label: "KYC Verification", path: "/account/kyc" },
                ...(isAdmin ? [{ label: "Admin Panel", path: "/admin" }] : []),
              ].map(({ label, path }) => (
                <button key={label} type="button" onClick={() => navigate(path)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-white/10">
                  {label} <span style={{ color: "#D4A017" }}>›</span>
                </button>
              ))}
              <button type="button" onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl bg-red-500/20 px-4 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/30 mt-1">
                Sign Out <FiLogOut size={14} />
              </button>
            </div>
          </div>

        </div>
      </PageContainer>
    </div>
  );
};

export default UserProfile;
