import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bell, CalendarDays, Camera, Check, ChevronRight, Eye, EyeOff,
  Info, LockKeyhole, Mail, MapPin, Phone, Save, ShieldCheck, Trash2, Upload, UserRound
} from "lucide-react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../PrivateRouter/AuthContext";
import api from "../../api";

const EMPTY_PROFILE = {
  user_id: "",
  username: "",
  name: "",
  email: "",
  phone: "",
  address: "",
  role: "",
  status: "",
  created_at: "",
  updated_at: "",
  notification_preferences: { email: true, orders: true }
};
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const dateLabel = (value, options = { day: "2-digit", month: "short", year: "numeric" }) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleDateString("en-IN", options);
};

const dateTimeLabel = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const Profile = () => {
  const { user, login } = useContext(AuthContext);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeSection, setActiveSection] = useState("personal-information");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const imageInputRef = useRef(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api.get("/auth/me");
      setProfile({
        ...EMPTY_PROFILE,
        ...response.data.user,
        notification_preferences: {
          ...EMPTY_PROFILE.notification_preferences,
          ...(response.data.user?.notification_preferences || {})
        }
      });
    } catch (error) {
      setLoadError(error.response?.data?.message || "Unable to load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const initials = useMemo(() => (profile.name || profile.username || "A")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join(""), [profile.name, profile.username]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!profile.username.trim() || !profile.name.trim() || !profile.email.trim()) {
      toast.error("Name, username, and email are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await api.put("/auth/me", {
        username: profile.username,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address
      });
      const updatedProfile = {
        ...profile,
        ...response.data.user,
        notification_preferences: profile.notification_preferences
      };
      setProfile(updatedProfile);
      const token = localStorage.getItem("token");
      if (token) login({ ...user, ...response.data.user }, token);
      toast.success("Profile saved.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (!passwords.current) {
      toast.error("Enter your current password.");
      return;
    }
    if (passwords.next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("The new passwords do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await api.put("/auth/me/password", {
        currentPassword: passwords.current,
        newPassword: passwords.next
      });
      setPasswords({ current: "", next: "", confirm: "" });
      toast.success("Password updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update your password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile images must be 2 MB or smaller.");
      return;
    }
    const formData = new FormData();
    formData.append("image", file);
    setUploadingImage(true);
    try {
      const response = await api.post("/auth/me/photo", formData);
      setProfile((current) => ({ ...current, ...response.data.user }));
      toast.success("Profile photo updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to upload profile photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    setUploadingImage(true);
    try {
      const response = await api.delete("/auth/me/photo");
      setProfile((current) => ({ ...current, ...response.data.user }));
      toast.success("Profile photo removed.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove profile photo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const changePreference = async (key) => {
    const previous = profile.notification_preferences;
    const next = { ...previous, [key]: !previous[key] };
    setProfile((current) => ({ ...current, notification_preferences: next }));
    setSavingPreferences(key);
    try {
      const response = await api.put("/auth/me/notifications", next);
      setProfile((current) => ({
        ...current,
        notification_preferences: response.data.user.notification_preferences
      }));
      toast.success("Notification preference saved.");
    } catch (error) {
      setProfile((current) => ({ ...current, notification_preferences: previous }));
      toast.error(error.response?.data?.message || "Unable to save notification preference.");
    } finally {
      setSavingPreferences("");
    }
  };

  const inputClass = "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#008577] focus:ring-2 focus:ring-emerald-800/10";
  const labelClass = "block text-xs font-semibold text-slate-700";

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center text-sm font-semibold text-slate-500" role="status">Loading your profile…</div>;
  }

  if (loadError) {
    return <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm" role="alert">
      <p className="font-bold text-rose-800">{loadError}</p>
      <button type="button" onClick={() => void loadProfile()} className="mt-4 rounded-lg bg-[#00695C] px-4 py-2 text-sm font-bold text-white">Retry</button>
    </section>;
  }

  const memberSince = dateLabel(profile.created_at, { day: "2-digit", month: "short", year: "numeric" });
  const roleLabel = (profile.role || "admin").replace(/^\w/, (letter) => letter.toUpperCase());

  return <main className="space-y-4 pb-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account details, security and preferences.</p>
      </div>
      
    </header>

    <section className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:grid-cols-[1.15fr_1fr_auto] md:items-center md:px-5">
      <div className="flex min-w-0 items-center gap-4">
        <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full bg-[#003B3B] text-3xl font-semibold text-white">
          {profile.profile_image
            ? <img src={`${backendUrl}${profile.profile_image}`} alt="" className="h-full w-full rounded-full object-cover" />
            : initials}
          <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-600"><Camera size={15} /></span>
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold text-slate-900">{profile.name || profile.username}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{roleLabel}</p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800"><ShieldCheck size={12} /> {roleLabel}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Mail size={16} /></span>
          <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{profile.email || "Email not set"}</span><span className="text-[10px] text-slate-500">Email Address</span></span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Phone size={16} /></span>
          <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{profile.phone || "Phone not set"}</span><span className="text-[10px] text-slate-500">Mobile Number</span></span>
        </div>
        <div className="flex items-center gap-2.5 sm:col-span-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700"><CalendarDays size={16} /></span>
          <span><span className="block text-xs font-bold text-slate-800">{memberSince}</span><span className="text-[10px] text-slate-500">Member Since</span></span>
        </div>
      </div>
      <button type="button" onClick={() => setActiveSection("personal-information")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"><UserRound size={15} /> Edit Profile</button>
    </section>

    <nav role="tablist" aria-label="Profile sections" className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white p-1.5 shadow-sm">
      {[
        ["personal-information", UserRound, "Personal Information"],
        ["change-password", LockKeyhole, "Change Password"],
        ["notification-preferences", Bell, "Notifications"],
        ["activity-log", Activity, "Activity Log"]
      ].map(([id, Icon, label]) => <button key={id} id={`profile-tab-${id}`} type="button" role="tab" aria-selected={activeSection === id} aria-controls={`profile-panel-${id}`} onClick={() => setActiveSection(id)} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-bold transition sm:px-4 ${activeSection === id ? "bg-[#00796B] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}>
        <Icon size={15} />{label}
      </button>)}
    </nav>

    <div className={`grid items-start gap-3 ${activeSection === "personal-information" ? "lg:grid-cols-[1.15fr_0.85fr]" : "grid-cols-1"}`}>
      {activeSection === "personal-information" && <form id="profile-panel-personal-information" role="tabpanel" aria-labelledby="profile-tab-personal-information" onSubmit={saveProfile} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-extrabold text-slate-900">Personal Information</h2>
          <p className="mt-1 text-xs text-slate-500">Update your personal details and contact information.</p>
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className={labelClass}>Full Name *<input className={inputClass} value={profile.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" required /></label>
          <label className={labelClass}>Email Address *<input className={inputClass} type="email" value={profile.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" required /></label>
          <label className={labelClass}>Mobile Number<input className={inputClass} type="tel" value={profile.phone || ""} onChange={(event) => updateField("phone", event.target.value)} autoComplete="tel" /></label>
          <label className={labelClass}>Role<input className={`${inputClass} bg-slate-50 text-slate-500`} value={roleLabel} readOnly /></label>
          <label className={labelClass}>Username<input className={`${inputClass} bg-slate-50 text-slate-500`} value={profile.username} readOnly autoComplete="username" /></label>
          <div className="sm:col-span-2">
            <p className={labelClass}>Profile Image</p>
            <div className="mt-1.5 flex min-h-[68px] flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#003B3B] text-lg font-semibold text-white">
                {profile.profile_image ? <img src={`${backendUrl}${profile.profile_image}`} alt="Profile" className="h-full w-full object-cover" /> : initials}
              </span>
              <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={uploadProfileImage} />
              <button type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#00695C] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60"><Upload size={14} />{uploadingImage ? "Uploading…" : "Change Image"}</button>
              {profile.profile_image && <button type="button" disabled={uploadingImage} onClick={() => void removeProfileImage()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-60"><Trash2 size={14} />Remove</button>}
              <span className="text-[10px] text-slate-500">JPG, PNG or WEBP; max 2 MB</span>
            </div>
          </div>
          <label className={`${labelClass} sm:col-span-2`}>Address<textarea className={`${inputClass} min-h-[68px] resize-y`} value={profile.address || ""} onChange={(event) => updateField("address", event.target.value)} placeholder="Enter your address" /></label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#00695C] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#00574d] disabled:cursor-wait disabled:opacity-60"><Save size={15} />{saving ? "Saving…" : "Save Changes"}</button>
        </div>
      </form>}

      <div className="space-y-3">
        {(activeSection === "personal-information" || activeSection === "change-password") && <form id="profile-panel-change-password" role="tabpanel" aria-labelledby="profile-tab-change-password" onSubmit={changePassword} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"><LockKeyhole size={16} /></span>
            <span><h2 className="text-xs font-extrabold text-slate-900">Change Password</h2><p className="mt-0.5 text-[10px] text-slate-500">Update your password to keep your account secure.</p></span>
          </div>
          <div className="space-y-2">
            {[["current", "Current Password"], ["next", "New Password"], ["confirm", "Confirm New Password"]].map(([key, label]) => <label key={key} className="relative block">
              <span className="sr-only">{label}</span>
              <input className={`${inputClass} mt-0 pr-10 text-xs`} type={visiblePasswords[key] ? "text" : "password"} placeholder={label} value={passwords[key]} onChange={(event) => setPasswords((current) => ({ ...current, [key]: event.target.value }))} autoComplete={key === "current" ? "current-password" : "new-password"} />
              <button type="button" aria-label={visiblePasswords[key] ? `Hide ${label}` : `Show ${label}`} onClick={() => setVisiblePasswords((current) => ({ ...current, [key]: !current[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{visiblePasswords[key] ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </label>)}
          </div>
          <div className="mt-2 flex justify-end"><button type="submit" disabled={changingPassword} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#00695C] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#00574d] disabled:opacity-60"><LockKeyhole size={13} />{changingPassword ? "Updating…" : "Update Password"}</button></div>
        </form>}

        {(activeSection === "personal-information" || activeSection === "notification-preferences") && <section id="profile-panel-notification-preferences" role="tabpanel" aria-labelledby="profile-tab-notification-preferences" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><Bell size={16} /></span>
            <span><h2 className="text-xs font-extrabold text-slate-900">Notification Preferences</h2><p className="mt-0.5 text-[10px] text-slate-500">Manage how you receive notifications.</p></span>
          </div>
          {[["email", "Email Notifications", "Receive important updates via email"], ["orders", "Order Notifications", "Get notified about new orders and enquiries"]].map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-3 py-1.5">
            <span><span className="block text-[11px] font-bold text-slate-800">{label}</span><span className="text-[10px] text-slate-500">{description}</span></span>
            <button type="button" role="switch" aria-checked={Boolean(profile.notification_preferences[key])} aria-label={label} disabled={Boolean(savingPreferences)} onClick={() => void changePreference(key)} className={`relative h-5 w-10 shrink-0 rounded-full transition disabled:opacity-60 ${profile.notification_preferences[key] ? "bg-[#008577]" : "bg-slate-300"}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${profile.notification_preferences[key] ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>)}
        </section>}

        {activeSection === "personal-information" && <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-700"><Info size={16} /></span>
            <span><h2 className="text-xs font-extrabold text-slate-900">Account Information</h2><p className="text-[10px] text-slate-500">Your account and access details.</p></span>
          </div>
          <dl className="divide-y divide-slate-100 rounded-lg bg-slate-50 px-2.5 text-[10px]">
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">User ID</dt><dd className="font-semibold text-slate-700">#ADM{String(profile.user_id || "").padStart(3, "0")}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">Role</dt><dd className="font-semibold text-slate-700">{roleLabel}</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">Status</dt><dd><span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">{profile.status || "Active"}</span></dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">Last Login</dt><dd className="font-semibold text-slate-700">Not tracked</dd></div>
            <div className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">Member Since</dt><dd className="font-semibold text-slate-700">{memberSince}</dd></div>
          </dl>
        </section>}
      </div>
    </div>

    {activeSection === "activity-log" && <section id="profile-panel-activity-log" role="tabpanel" aria-labelledby="profile-tab-activity-log" className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700"><Activity size={16} /></span>
        <div><h2 className="text-xs font-extrabold text-slate-900">Activity Log</h2><p className="text-[10px] text-slate-500">Recent account activity available for this profile.</p></div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} /></span>
          <span><span className="block text-xs font-bold text-slate-800">Account created</span><span className="text-[10px] text-slate-500">{dateTimeLabel(profile.created_at)}</span></span>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700"><MapPin size={14} /></span>
          <span><span className="block text-xs font-bold text-slate-800">Profile last updated</span><span className="text-[10px] text-slate-500">{dateTimeLabel(profile.updated_at)}</span></span>
        </div>
      </div>
    </section>}
  </main>;
};

export default Profile;
