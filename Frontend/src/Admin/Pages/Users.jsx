import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api";
import {
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiEdit2,
    FiEye,
    FiFilter,
    FiMail,
    FiPhone,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiTrash2,
    FiUser,
    FiUserCheck,
    FiUserPlus,
    FiUserX,
    FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import DateRangeFilter from "../Components/DateRangeFilter";

const PAGE_SIZE = 8;

const getUserStatus = (user) =>
    String(user?.status || "Active").toLowerCase() === "inactive" ? "Inactive" : "Active";

const formatJoinDate = (value, options) => {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleDateString("en-IN", options);
};

const getInitials = (name) =>
    String(name || "Customer")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("");

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateRange, setDateRange] = useState({ preset: "all", startDate: "", endDate: "" });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        email: "",
        phone: "",
        role: "user",
        password: "",
    });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/auth/users", {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            const data = response.data;
            const records = Array.isArray(data)
                ? data
                : Array.isArray(data?.users)
                    ? data.users
                    : Array.isArray(data?.data)
                        ? data.data
                        : null;

            if (!records) {
                throw new Error("The server returned an invalid customer list.");
            }

            const normalizedUsers = records.map((user) => ({
                ...user,
                id: user.id ?? user.user_id,
                name: user.name || user.username || "Customer",
                email: user.email || "",
                phone: user.phone || "",
                role: String(user.role || "user").toLowerCase(),
                status: getUserStatus(user),
            }));
            setUsers(normalizedUsers);
            setSelectedUserId((currentId) =>
                normalizedUsers.some((user) => String(user.id) === String(currentId))
                    ? currentId
                    : normalizedUsers[0]?.id ?? null
            );
        } catch (error) {
            console.error("Failed to fetch customers:", error);
            toast.error(error.response?.data?.message || error.message || "Failed to load customers.");
        } finally {
            setLoading(false);
        }
    }, [dateRange.startDate, dateRange.endDate]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const todayCount = users.filter((user) => {
        if (!user.created_at) return false;
        const joined = new Date(user.created_at);
        const today = new Date();
        return joined.toDateString() === today.toDateString();
    }).length;
    const activeCount = users.filter((user) => user.status === "Active").length;
    const inactiveCount = users.length - activeCount;

    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return users.filter((user) => {
            const matchesSearch = !query || [
                user.name,
                user.email,
                user.phone,
                user.id,
            ].some((value) => String(value || "").toLowerCase().includes(query));
            const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [users, searchTerm, statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    const safePage = Math.min(currentPage, Math.max(totalPages, 1));
    const currentItems = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    const selectedUser = users.find((user) => String(user.id) === String(selectedUserId)) || null;

    const openAddModal = () => {
        setFormData({ username: "", name: "", email: "", phone: "", role: "user", password: "" });
        setIsEditing(false);
        setEditUserId(null);
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setFormData({
            username: user.username || user.name,
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            role: user.role || "user",
            password: "",
        });
        setEditUserId(user.id);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const handleSaveUser = async (event) => {
        event.preventDefault();
        if (!formData.username.trim() || !formData.email.trim() || (!isEditing && !formData.password)) {
            toast.error("Please complete the required customer fields.");
            return;
        }

        setSubmitLoading(true);
        try {
            const payload = {
                ...formData,
                username: formData.username.trim(),
                name: formData.name.trim() || formData.username.trim(),
                email: formData.email.trim(),
                phone: formData.phone.trim(),
                role: formData.role.toLowerCase(),
            };
            if (isEditing) {
                delete payload.password;
                await api.put(`/auth/users/${editUserId}`, payload);
                toast.success("Customer updated successfully.");
            } else {
                await api.post("/auth/users", payload);
                toast.success("Customer added successfully.");
            }
            setIsModalOpen(false);
            await fetchUsers();
        } catch (error) {
            console.error("Failed to save customer:", error);
            toast.error(error.response?.data?.message || "Could not save this customer.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete ${user.name} from the customer list? This cannot be undone.`)) return;
        try {
            await api.delete(`/auth/users/${user.id}`);
            toast.success("Customer deleted.");
            await fetchUsers();
        } catch (error) {
            console.error("Failed to delete customer:", error);
            toast.error(error.response?.data?.message || "Could not delete this customer.");
        }
    };

    const statCards = [
        { label: "Total Customers", value: users.length, note: "Registered accounts", icon: FiUserPlus, color: "bg-emerald-100 text-emerald-700" },
        { label: "New Today", value: todayCount, note: "Joined today", icon: FiUserCheck, color: "bg-amber-100 text-amber-700" },
        { label: "Active Customers", value: activeCount, note: "Active accounts", icon: FiUser, color: "bg-sky-100 text-sky-700" },
        { label: "Inactive Customers", value: inactiveCount, note: "Inactive accounts", icon: FiUserX, color: "bg-rose-100 text-rose-600" },
    ];

    return (
        <section className="min-h-screen bg-[#F4F7F6] px-0 py-1 text-slate-800">
            <div className="mx-auto max-w-[1600px] space-y-4">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div>
                        <Link
                            to="/admin/settings"
                            className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[#00695C] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#008577]"
                        >
                            <FiChevronLeft size={16} /> Back to Settings
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <DateRangeFilter onApply={(range) => {
                            setLoading(true);
                            setCurrentPage(1);
                            setDateRange(range);
                        }} />
                        <button
                            type="button"
                            onClick={openAddModal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#008577]"
                        >
                            <FiPlus /> Add Customer
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {statCards.map(({ label, value, note, icon: Icon, color }) => (
                        <article key={label} className="flex min-h-[88px] items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${color}`}>
                                <Icon size={22} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-slate-500">{label}</p>
                                <p className="text-2xl font-extrabold leading-tight text-slate-900">{value.toLocaleString()}</p>
                                <p className="text-[11px] text-slate-400">{note}</p>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
                        <div className="flex flex-col gap-2 border-b border-slate-100 p-3 lg:flex-row lg:items-center">
                            <label className="relative min-w-0 flex-1">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search name, phone, email..."
                                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none transition placeholder:text-slate-400 focus:border-[#008577] focus:ring-2 focus:ring-emerald-100"
                                />
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                                <label className="relative">
                                    <FiFilter className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={(event) => setStatusFilter(event.target.value)}
                                        className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-8 pr-7 text-xs text-slate-600 outline-none focus:border-[#008577]"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}
                                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={fetchUsers}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#008577] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#00695C] disabled:opacity-60"
                                >
                                    <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] border-collapse text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                        <th className="px-3 py-3">#</th>
                                        <th className="px-3 py-3">Customer</th>
                                        <th className="px-3 py-3">Contact</th>
                                        <th className="px-3 py-3">Role</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3">Join Date</th>
                                        <th className="px-3 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-400">Loading customers...</td></tr>
                                    ) : currentItems.length === 0 ? (
                                        <tr><td colSpan="7" className="px-4 py-12 text-center text-sm text-slate-400">No customers match your search.</td></tr>
                                    ) : currentItems.map((user, index) => (
                                        <tr
                                            key={user.id ?? `${user.email}-${index}`}
                                            onClick={() => setSelectedUserId(user.id)}
                                            className={`cursor-pointer transition hover:bg-emerald-50/40 ${String(selectedUserId) === String(user.id) ? "bg-emerald-50/50" : ""}`}
                                        >
                                            <td className="px-3 py-3 text-xs font-medium text-slate-400">#{user.id ?? "—"}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7EBCB] text-xs font-bold text-[#795713]">{getInitials(user.name)}</div>
                                                    <span className="max-w-[150px] truncate text-xs font-bold text-slate-800">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="max-w-[190px] truncate text-xs font-medium text-slate-700">{user.email || "Email not provided"}</p>
                                                <p className="mt-0.5 text-[10px] text-slate-400">{user.phone || "Phone not provided"}</p>
                                            </td>
                                            <td className="px-3 py-3 text-xs capitalize text-slate-600">{user.role}</td>
                                            <td className="px-3 py-3">
                                                <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${user.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{user.status}</span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-500">{formatJoinDate(user.created_at, { day: "2-digit", month: "short", year: "numeric" })}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex justify-end gap-1.5">
                                                    <button type="button" title="View customer" aria-label={`View ${user.name}`} onClick={(event) => { event.stopPropagation(); setSelectedUserId(user.id); }} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:border-emerald-300 hover:text-[#008577]"><FiEye size={14} /></button>
                                                    <button type="button" title="Edit customer" aria-label={`Edit ${user.name}`} onClick={(event) => { event.stopPropagation(); openEditModal(user); }} className="rounded-md border border-slate-200 p-2 text-slate-600 hover:border-amber-300 hover:text-amber-700"><FiEdit2 size={14} /></button>
                                                    <button type="button" title="Delete customer" aria-label={`Delete ${user.name}`} onClick={(event) => { event.stopPropagation(); handleDeleteUser(user); }} className="rounded-md border border-rose-100 p-2 text-rose-500 hover:bg-rose-50"><FiTrash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs text-slate-500">
                                Showing {filteredUsers.length ? (safePage - 1) * PAGE_SIZE + 1 : 0} to {Math.min(safePage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} customers
                            </p>
                            <div className="flex items-center justify-end gap-1">
                                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safePage <= 1 || loading} aria-label="Previous page" className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><FiChevronLeft /></button>
                                <span className="min-w-9 rounded-md bg-[#008577] px-2.5 py-2 text-center text-xs font-bold text-white">{safePage}</span>
                                <span className="px-1 text-xs text-slate-400">of {Math.max(totalPages, 1)}</span>
                                <button type="button" onClick={() => setCurrentPage((page) => Math.min(Math.max(totalPages, 1), page + 1))} disabled={safePage >= totalPages || loading} aria-label="Next page" className="rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"><FiChevronRight /></button>
                            </div>
                        </div>
                    </section>

                    <aside className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-extrabold text-slate-800">Customer Details</h2>
                            {selectedUser && <button type="button" onClick={() => setSelectedUserId(null)} aria-label="Clear selected customer" className="text-slate-400 hover:text-slate-700"><FiX /></button>}
                        </div>
                        {selectedUser ? (
                            <>
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F7EBCB] text-lg font-bold text-[#795713]">{getInitials(selectedUser.name)}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-slate-800">{selectedUser.name}</p>
                                        <p className="text-xs text-slate-400">Customer #{selectedUser.id ?? "—"}</p>
                                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${selectedUser.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{selectedUser.status}</span>
                                    </div>
                                </div>
                                <dl className="space-y-3 py-4 text-xs">
                                    <div className="flex items-start gap-2"><FiMail className="mt-0.5 shrink-0 text-[#008577]" /><dt className="w-20 shrink-0 text-slate-500">Email</dt><dd className="break-all font-medium text-slate-700">{selectedUser.email || "Not provided"}</dd></div>
                                    <div className="flex items-start gap-2"><FiPhone className="mt-0.5 shrink-0 text-[#008577]" /><dt className="w-20 shrink-0 text-slate-500">Phone</dt><dd className="font-medium text-slate-700">{selectedUser.phone || "Not provided"}</dd></div>
                                    <div className="flex items-start gap-2"><FiUser className="mt-0.5 shrink-0 text-[#008577]" /><dt className="w-20 shrink-0 text-slate-500">Role</dt><dd className="font-medium capitalize text-slate-700">{selectedUser.role}</dd></div>
                                    <div className="flex items-start gap-2"><FiCalendar className="mt-0.5 shrink-0 text-[#008577]" /><dt className="w-20 shrink-0 text-slate-500">Joined</dt><dd className="font-medium text-slate-700">{formatJoinDate(selectedUser.created_at, { day: "numeric", month: "long", year: "numeric" })}</dd></div>
                                </dl>
                                <button type="button" onClick={() => openEditModal(selectedUser)} className="w-full rounded-lg bg-[#00695C] px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#008577]">Edit Customer</button>
                            </>
                        ) : (
                            <div className="py-10 text-center text-xs text-slate-400">Choose a customer to view their details.</div>
                        )}
                    </aside>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                    <form onSubmit={handleSaveUser} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                            <div>
                                <h2 className="text-lg font-extrabold text-slate-800">{isEditing ? "Edit Customer" : "Add Customer"}</h2>
                                <p className="mt-1 text-xs text-slate-500">{isEditing ? "Update the customer's account details." : "Create a customer account."}</p>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><FiX /></button>
                        </div>
                        <div className="grid gap-4 p-6 sm:grid-cols-2">
                            {[
                                { name: "username", label: "Username", required: true },
                                { name: "name", label: "Full name" },
                                { name: "email", label: "Email address", required: true, type: "email" },
                                { name: "phone", label: "Phone number", type: "tel" },
                            ].map((field) => (
                                <label key={field.name} className="text-xs font-semibold text-slate-600">
                                    {field.label}{field.required ? " *" : ""}
                                    <input
                                        name={field.name}
                                        type={field.type || "text"}
                                        required={field.required}
                                        value={formData[field.name]}
                                        onChange={(event) => setFormData((current) => ({ ...current, [field.name]: event.target.value }))}
                                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-100"
                                    />
                                </label>
                            ))}
                            <label className="text-xs font-semibold text-slate-600">
                                Role
                                <select name="role" value={formData.role} onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#008577]">
                                    <option value="user">Customer</option>
                                    <option value="manager">Manager</option>
                                    <option value="dealer">Dealer</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                            {!isEditing && (
                                <label className="text-xs font-semibold text-slate-600">
                                    Password *
                                    <input name="password" type="password" required value={formData.password} onChange={(event) => setFormData((current) => ({ ...current, password: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-100" />
                                </label>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="submit" disabled={submitLoading} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-[#008577] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#00695C] disabled:cursor-not-allowed disabled:opacity-60">
                                {submitLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                                {isEditing ? "Save Changes" : "Add Customer"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
};

export default Users;
