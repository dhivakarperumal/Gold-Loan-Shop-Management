import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUser, FiMail, FiPhone, FiShield, FiHeart,
  FiShoppingBag, FiLogOut, FiEdit2, FiCheckCircle,
} from "react-icons/fi";
import { FaRegGem } from "react-icons/fa";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { StoreContext } from "../../PrivateRouter/StoreContext";
import PageContainer from "../CommenComponents/PageContainer";

/* ── helpers ─────────────────────────────────── */
const initials = (name = "") =>
  name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
    style={{ border: "1px solid rgba(212,160,23,0.15)" }}>
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ background: "linear-gradient(135deg,#004D40,#0F766E)" }}
    >
      <Icon size={16} color="#fff" />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-gray-800">{value || "—"}</p>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-col items-center gap-1 rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 w-full"
    style={{ border: "1px solid rgba(212,160,23,0.18)" }}
  >
    <div
      className="flex h-12 w-12 items-center justify-center rounded-full"
      style={{ background: "linear-gradient(135deg,#004D40,#0F766E)" }}
    >
      <Icon size={20} color="#D4A017" />
    </div>
    <p className="mt-1 text-2xl font-black text-gray-800">{value}</p>
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
  </button>
);

/* ── component ───────────────────────────────── */
const UserProfile = () => {
  const { user, logout } = useAuth();
  const { wishlist, cart } = useContext(StoreContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const name     = user.username || user.name || "Guest";
  const email    = user.email    || "";
  const phone    = user.phone    || "";
  const role     = user.role     || "user";
  const isAdmin  = role.toLowerCase() === "admin";
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : "Member";

  return (
    <div className="min-h-screen pb-16" style={{ background: "#fffdf8" }}>

      {/* ── Hero banner ── */}
      <div
        className="relative w-full py-14"
        style={{
          background: "linear-gradient(135deg,#003D2E 0%,#004D40 60%,#1a5c42 100%)",
        }}
      >
        {/* Gold bottom border */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px]"
          style={{ background: "linear-gradient(90deg,transparent,#D4A017 30%,#F5C45E 50%,#D4A017 70%,transparent)" }}
        />

        <PageContainer>
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-left">

            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-black text-white shadow-xl ring-4 ring-white/20"
                style={{ background: "linear-gradient(135deg,#D4A017,#F5C45E)" }}
              >
                <span style={{ color: "#004D40" }}>{initials(name) || <FiUser />}</span>
              </div>
              {/* Online dot */}
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
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:opacity-90"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}
                >
                  <FiShield size={14} /> Admin Panel
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-red-600"
              >
                <FiLogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </PageContainer>
      </div>

      <PageContainer>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* ── Left col: details ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Section title */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#a67b2e]">Account</span>
                <h2 className="font-serif text-xl font-bold text-[#201a13]">Personal Details</h2>
                {/* gold ornament */}
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#d9a441]" />
                  <span className="h-1 w-1 rotate-45 bg-[#d9a441]" />
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#d9a441]" />
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/account/kyc")}
                className="flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition hover:bg-gray-50"
                style={{ borderColor: "#004D40", color: "#004D40" }}
              >
                <FiEdit2 size={13} /> Edit / KYC
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoRow icon={FiUser}    label="Full Name"     value={name} />
              <InfoRow icon={FiMail}    label="Email Address" value={email} />
              <InfoRow icon={FiPhone}   label="Phone Number"  value={phone} />
              <InfoRow icon={FiShield}  label="Account Role"  value={role.charAt(0).toUpperCase() + role.slice(1)} />
            </div>

            {/* Member badge */}
            <div
              className="flex items-center gap-3 rounded-xl px-5 py-4"
              style={{ background: "linear-gradient(135deg,rgba(0,77,64,0.06),rgba(0,77,64,0.03))", border: "1px solid rgba(0,77,64,0.12)" }}
            >
              <FiCheckCircle size={20} style={{ color: "#004D40" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#004D40" }}>Verified Member</p>
                <p className="text-xs text-gray-500">Joined {memberSince}</p>
              </div>
              <FaRegGem size={18} className="ml-auto" style={{ color: "#D4A017" }} />
            </div>
          </div>

          {/* ── Right col: quick stats ── */}
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
              <StatCard
                icon={FiHeart}
                label="Wishlist"
                value={wishlist.length}
                onClick={() => navigate("/")}
              />
              <StatCard
                icon={FiShoppingBag}
                label="Cart Items"
                value={cart.length}
                onClick={() => navigate("/")}
              />
            </div>

            {/* Quick links */}
            <div
              className="rounded-2xl p-5 space-y-2"
              style={{ background: "linear-gradient(135deg,#003D2E,#004D40)", border: "none" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F5C45E" }}>Quick Links</p>

              {[
                { label: "Browse Jewellery",      path: "/explore" },
                { label: "My Wishlist",            path: "/" },
                { label: "KYC Verification",       path: "/account/kyc" },
                ...(isAdmin ? [{ label: "Admin Panel", path: "/admin" }] : []),
              ].map(({ label, path }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate(path)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {label}
                  <span style={{ color: "#D4A017" }}>›</span>
                </button>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-xl bg-red-500/20 px-4 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/30 mt-1"
              >
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
