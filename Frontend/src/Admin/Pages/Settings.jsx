import { FiArrowRight, FiPrinter, FiSettings, FiUsers, FiLayout, FiDollarSign } from "react-icons/fi";
import { Link } from "react-router-dom";

const settingsLinks = [
    {
        title: "Fund Management",
        description: "Track business funds, balances across accounts, incoming collections, expenses, and account transfers.",
        path: "/admin/funds",
        label: "Open fund management",
        icon: <FiDollarSign />
    },
    {
        title: "Home Product Sections",
        description: "Choose which metal collections appear on the storefront home page and arrange their order.",
        path: "/admin/settings/home-sections",
        label: "Customize home page",
        icon: <FiLayout />
    },
    {
        title: "Daily Gold Rate",
        description: "Manage audited Gold, Silver, Platinum and Diamond rates used for billing and product calculations.",
        path: "/admin/settings/daily-gold-rate",
        label: "Manage rates"
    },
    {
        title: "Receipt Settings",
        description: "Configure the logo, shop name, contact information, address, and footer printed on bills.",
        path: "/admin/settings/receipt",
        label: "Configure receipt",
        icon: <FiPrinter />
    },
    {
        title: "User Management",
        description: "View and manage all registered customer accounts, contact details, and account status.",
        path: "/admin/users/all",
        label: "Manage users",
        icon: <FiUsers />
    }
];

const Settings = () => (
    <main className="space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-[#003B3B] via-[#00594f] to-[#087568] px-5 py-6 text-white shadow-lg sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Admin preferences</p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">All Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">Access and manage the settings available for your Sri Golds admin panel.</p>
        </header>

        <section aria-label="Available settings" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {settingsLinks.map((setting) => (
                <Link
                    key={setting.path}
                    to={setting.path}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
                >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-[#00695C]">
                        {setting.icon || <FiSettings />}
                    </span>
                    <h2 className="mt-4 text-base font-extrabold text-slate-900">{setting.title}</h2>
                    <p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-500">{setting.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#00695C]">
                        {setting.label}
                        <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                    </span>
                </Link>
            ))}
        </section>
    </main>
);

export default Settings;
