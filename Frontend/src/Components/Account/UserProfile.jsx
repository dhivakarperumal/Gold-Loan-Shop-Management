import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUser, FiMail, FiPhone, FiShield, FiHeart,
  FiLogOut, FiEdit2, FiCheckCircle,
  FiAlertCircle, FiClock, FiPackage, FiTrash2,
} from "react-icons/fi";
import { FaRegGem } from "react-icons/fa";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../CommenComponents/PageContainer";
import PageHeader from "../CommenComponents/PageHeader";
import api from "../../api";
import { formatCurrency, formatAmount } from "../../utils/currency";

/* ── helpers ─────────────────────────────────── */
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const fmt = formatAmount;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const getWishlistImage = (item) => {
  const parseStored = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const variants = parseStored(item.variants);
  const productImages = parseStored(item.product_images);
  const variantImage = variants.flatMap((variant) => parseStored(variant.images))[0];
  const image = item.image || variantImage || productImages[0];
  if (!image || typeof image !== "string") return "";
  if (/^(https?:|data:|blob:)/i.test(image)) return image;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");
  return `${backendUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

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
  const { wishlist } = useContext(StoreContext);
  const navigate = useNavigate();

  const [loans, setLoans]       = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError]   = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!user?.user_id || user.role !== "user") return undefined;

    const controller = new AbortController();
    api.get("/loan-customers/me", { signal: controller.signal })
      .then(({ data: customer }) => {
        if (!customer || customer.id == null) {
          throw new TypeError("The customer profile response is invalid");
        }
        return api.get(`/customers/${customer.id}/loans`, { signal: controller.signal });
      })
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw new TypeError("The customer loans response must be an array");
        }
        setLoans(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const noCustomerProfile = err?.response?.status === 404
          && err.config?.url?.includes("/loan-customers/me");
        if (noCustomerProfile) return;
        console.error("Failed to load customer loan details:", err);
        setLoansError("Could not load loan details.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoansLoading(false); });
    return () => controller.abort();
  }, [user?.role, user?.user_id]);

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
  const isLoansLoading = user.role === "user" && loansLoading;

  return (
    <div className="min-h-screen pb-16" style={{ background: "#f8f7f2" }}>
      <PageHeader title="My Profile" />

      <PageContainer className="pt-5">
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-2xl border border-[#e9e3d7] bg-white p-2.5 shadow-sm">
          <section className="flex flex-col items-center gap-3 px-3 py-4 text-center">
            <div className="relative shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black shadow-sm"
                style={{ background: "linear-gradient(135deg,#D4A017,#F5C45E)", color: "#004D40" }}>
                {initials(name) || <FiUser />}
              </div>
              <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-400" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a67b2e]">
                {isAdmin ? "Administrator" : "Member Account"}
              </p>
              <h2 className="mt-1 truncate font-serif text-lg font-bold text-[#201a13]">{name}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>
            </div>
          </section>

        <nav aria-label="Profile sections" className="flex min-w-0 flex-col border-y border-[#eee8dc] py-2">
          {[
            { id: "profile", label: "Profile Details", icon: FiUser },
            { id: "wishlist", label: "Wishlist Products", icon: FiHeart, count: wishlist.length },
            { id: "loans", label: "Loan Details", icon: FiPackage, count: isLoansLoading ? null : loans.length }
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`profile-tab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`profile-panel-${id}`}
              onClick={() => setActiveTab(id)}
              className={`inline-flex w-full min-w-0 items-center justify-start gap-2 rounded-lg px-3 py-3 text-left text-xs font-bold transition sm:text-sm ${
                activeTab === id
                  ? "bg-[#174a3f] text-white shadow-sm"
                  : "text-[#66726c] hover:bg-[#f5f7f3] hover:text-[#174a3f]"
              }`}
            >
              <Icon />
              {label}
              {count != null && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeTab === id ? "bg-white/20 text-white" : "bg-[#edf1eb] text-[#58675f]"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
          <div className="flex flex-col gap-2 px-2 py-3">
            {isAdmin && (
              <button type="button" onClick={() => navigate("/admin")}
                className="flex items-center justify-center gap-2 rounded-full border border-[#174a3f]/20 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#174a3f] transition hover:bg-[#f4f8f5]">
                <FiShield size={14} /> Admin Panel
              </button>
            )}
            <button type="button" onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-full bg-red-500/90 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-red-600">
              <FiLogOut size={14} /> Logout
            </button>
          </div>
        </aside>

        <section
          role="tabpanel"
          id={`profile-panel-${activeTab}`}
          aria-labelledby={`profile-tab-${activeTab}`}
          className="mt-0 min-w-0"
        >
          {activeTab === "profile" && (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
              <div className="space-y-5">
                <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6"
                  style={{ border: "1px solid rgba(212,160,23,0.18)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67b2e]">Account</p>
                      <h2 className="mt-1 font-serif text-xl font-bold text-[#201a13]">Personal Details</h2>
                    </div>
                    <button type="button" onClick={() => navigate("/account/kyc")}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#dfe8e2] px-3 py-2 text-xs font-bold text-[#174a3f] transition hover:bg-[#f4f8f5]">
                      <FiEdit2 size={13} /> Edit / KYC
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <InfoRow icon={FiUser} label="Full Name" value={name} />
                    <InfoRow icon={FiMail} label="Email Address" value={email} />
                    <InfoRow icon={FiPhone} label="Phone Number" value={phone} />
                    <InfoRow icon={FiShield} label="Account Role" value={role.charAt(0).toUpperCase() + role.slice(1)} />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-[#f3f8f4] px-4 py-3">
                    <FiCheckCircle size={19} className="shrink-0 text-[#17614b]" />
                    <div>
                      <p className="text-sm font-bold text-[#174a3f]">Account overview</p>
                      <p className="text-xs text-gray-500">Member since {memberSince}</p>
                    </div>
                    <FaRegGem size={18} className="ml-auto text-[#b68b35]" />
                  </div>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="space-y-2 rounded-2xl bg-white p-5 shadow-sm"
                  style={{ border: "1px solid rgba(212,160,23,0.18)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67b2e]">Account shortcuts</p>
                  <h2 className="mb-3 font-serif text-lg font-bold text-[#201a13]">Quick Links</h2>
                  {[
                    { label: "Browse Jewellery", path: "/explore" },
                    { label: "KYC Verification", path: "/account/kyc" },
                    ...(isAdmin ? [{ label: "Admin Panel", path: "/admin" }] : [])
                  ].map(({ label, path }) => (
                    <button key={label} type="button" onClick={() => navigate(path)}
                      className="flex w-full items-center justify-between rounded-xl bg-[#f8f7f2] px-4 py-3 text-left text-sm font-semibold text-[#40514a] transition hover:bg-[#edf5ef] hover:text-[#174a3f]">
                      {label}<span className="text-lg text-[#b68b35]">›</span>
                    </button>
                  ))}
                </section>
              </aside>
            </div>
          )}

          {activeTab === "wishlist" && (
            <section className="rounded-2xl border border-[#eee8dc] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67b2e]">Saved for later</p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-[#201a13]">Wishlist Products</h2>
                </div>
                <span className="text-xs font-semibold text-[#737d77]">{wishlist.length} {wishlist.length === 1 ? "item" : "items"}</span>
              </div>
              {wishlist.length === 0 ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-[#d9d3c8] bg-[#fdfcf9] px-5 py-12 text-center">
                  <FiHeart size={30} className="text-[#b68b35]" />
                  <p className="mt-3 font-semibold text-[#35443f]">Your wishlist is empty</p>
                  <p className="mt-1 text-sm text-[#737d77]">Save products you love and they will appear here.</p>
                  <Link to="/explore" className="mt-4 rounded-lg bg-[#174a3f] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#10382f]">Explore Products</Link>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {wishlist.map((item) => {
                    const productId = item.product_id ?? item.productId ?? item.id;
                    const image = getWishlistImage(item);
                    return (
                      <article key={item.id || productId} className="overflow-hidden rounded-xl border border-[#eee8dc] bg-white transition hover:border-[#d6c59d] hover:shadow-sm">
                        <Link to={`/product/${productId}`} className="block">
                          <div className="aspect-[1.35/1] overflow-hidden bg-[#f8f6ef]">
                            {image
                              ? <img src={image} alt={item.name || "Wishlist product"} className="h-full w-full object-cover transition duration-300 hover:scale-105" />
                              : <div className="flex h-full items-center justify-center text-sm text-[#a67b2e]"><FaRegGem size={30} /></div>}
                          </div>
                          <div className="p-3">
                            <h3 className="truncate text-sm font-bold text-[#34443e]">{item.name || "Product details unavailable"}</h3>
                            <p className="mt-1 text-xs text-[#68736d]">
                              {[item.colorName, item.size].filter(Boolean).join(" · ") || "Jewellery"}
                            </p>
                            {Number(item.price) > 0 && <p className="mt-2 font-bold text-[#174a3f]">{formatCurrency(item.price)}</p>}
                          </div>
                        </Link>
                        <div className="flex items-center justify-between border-t border-[#f0ece4] px-3 py-2">
                          <Link to={`/product/${productId}`} className="text-xs font-bold text-[#174a3f] hover:underline">View product</Link>
                          <button type="button" onClick={() => toggleWishlist(item)} aria-label={`Remove ${item.name || "product"} from wishlist`} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "loans" && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a67b2e]">Gold Loan</p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-[#201a13]">Loan Details</h2>
                </div>
                {!isLoansLoading && !loansError && loans.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-green-100 px-3 py-1 font-bold text-green-700">{activeLoans} Active</span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">{completedLoans} Completed</span>
                  </div>
                )}
              </div>

              {isLoansLoading ? (
                <div className="flex items-center justify-center rounded-2xl border border-[#eee8dc] bg-white py-14">
                  <div className="h-8 w-8 animate-spin rounded-full border-[3px]" style={{ borderColor: "#004D40", borderTopColor: "transparent" }} />
                </div>
              ) : loansError ? (
                <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
                  <FiAlertCircle size={18} className="text-red-500" />
                  <p className="text-sm text-red-600">{loansError}</p>
                </div>
              ) : loans.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#d9d3c8] bg-white py-12 text-center">
                  <FaRegGem size={30} className="text-[#b68b35]" />
                  <p className="mt-3 font-semibold text-[#35443f]">No loans found</p>
                  <p className="mt-1 text-sm text-[#737d77]">There are no gold loans linked to your account.</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Total Loans", loans.length],
                      ["Total Principal", `₹${fmt(loans.reduce((sum, loan) => sum + Number(loan.principal_amount || 0), 0))}`],
                      ["Outstanding", `₹${fmt(loans.reduce((sum, loan) => sum + Number(loan.outstanding_principal ?? loan.principal_amount ?? 0), 0))}`]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#eee8dc] bg-white p-4 shadow-sm">
                        <p className="text-xs text-[#737d77]">{label}</p>
                        <p className="mt-1 text-lg font-extrabold text-[#174a3f]">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    {loans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
                  </div>
                </>
              )}
            </section>
          )}
        </section>
        </div>
      </PageContainer>
    </div>
  );
};

export default UserProfile;
