import { useMemo, useState } from "react";
import api from "../../api";
import { toast } from "react-hot-toast";
import useAdminCachedList from "../useAdminCachedList";
import imageCompression from "browser-image-compression";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiEdit2,
  FiGrid,
  FiImage,
  FiLayers,
  FiList,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX
} from "react-icons/fi";
import { resolveBackendImageUrl } from "../../Components/Home/productDisplay";

const EMPTY_FORM = { name: "", purity: "", description: "", image: "", status: "Active" };

const getMetalImageUrl = (image) => {
  return typeof image === "string" ? resolveBackendImageUrl(image) : "";
};

const Metals = () => {
  const { data: metals, setData: setMetals, loading, refreshing } = useAdminCachedList(
    "admin:metals",
    async () => {
      const response = await api.get("/metals");
      return response.data;
    },
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMetal, setEditingMetal] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const filteredMetals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return metals.filter((metal) => {
      const matchesSearch = !query || [metal.name, metal.purity, metal.description]
        .some((value) => String(value || "").toLowerCase().includes(query));
      const matchesStatus = statusFilter === "All" || metal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [metals, searchQuery, statusFilter]);

  const activeCount = metals.filter((metal) => metal.status === "Active").length;
  const inactiveCount = metals.length - activeCount;

  const openAddModal = () => {
    setEditingMetal(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (metal) => {
    setEditingMetal(metal);
    setFormData({
      name: metal.name || "",
      purity: metal.purity || "",
      description: metal.description || "",
      image: getMetalImageUrl(metal.image),
      imagePath: metal.image || "",
      status: metal.status || "Active"
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
    setEditingMetal(null);
    setFormData(EMPTY_FORM);
  };

  const handleImageUpload = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast.error("Choose a PNG or JPG image.");
      input.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      input.value = "";
      return;
    }

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800
      });
      const image = await imageCompression.getDataUrlFromFile(compressed);
      setFormData((current) => ({ ...current, image }));
    } catch (error) {
      console.error("Failed to process metal image:", error);
      toast.error("Could not process this image. Please try another file.");
    } finally {
      input.value = "";
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const payload = {
      name: formData.name.trim(),
      purity: formData.purity.trim(),
      description: formData.description.trim(),
      image: formData.imagePath || null,
      status: formData.status
    };
    if (!payload.name) {
      toast.error("Enter a metal name.");
      return;
    }

    try {
      setSaving(true);
      if (formData.image?.startsWith("data:image/")) {
        const imageBlob = await (await fetch(formData.image)).blob();
        const imageForm = new FormData();
        imageForm.append("image", imageBlob, imageBlob.type === "image/png" ? "metal.png" : "metal.jpg");
        const uploaded = await api.post("/metals/images", imageForm);
        payload.image = uploaded.data.image;
      }
      if (editingMetal) {
        const response = await api.put(`/metals/${editingMetal.id}`, payload);
        setMetals((current) => current.map((metal) =>
          metal.id === editingMetal.id ? response.data : metal
        ));
        toast.success("Metal updated successfully.");
      } else {
        const response = await api.post("/metals", payload);
        setMetals((current) => [response.data, ...current]);
        toast.success("Metal added successfully.");
      }
      setIsModalOpen(false);
      setEditingMetal(null);
      setFormData(EMPTY_FORM);
    } catch (error) {
      console.error("Failed to save metal:", error);
      toast.error(error.response?.data?.message || "Failed to save metal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (metal) => {
    if (!window.confirm(`Delete ${metal.name}?`)) return;
    try {
      await api.delete(`/metals/${metal.id}`);
      setMetals((current) => current.filter((item) => item.id !== metal.id));
      toast.success("Metal deleted successfully.");
    } catch (error) {
      console.error("Failed to delete metal:", error);
      toast.error(error.response?.data?.message || "Failed to delete metal.");
    }
  };

  return (
    <section className="min-h-screen space-y-6 pb-12 font-sans">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#003B3B] text-white">
            <FiLayers size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400">Total Metals</p>
            <p className="mt-1 text-2xl font-black text-slate-800">{metals.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D4AF37] text-white">
            <FiCheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400">Active</p>
            <p className="mt-1 text-2xl font-black text-slate-800">{activeCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#9A6B2F] text-white">
            <FiAlertCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400">Inactive</p>
            <p className="mt-1 text-2xl font-black text-slate-800">{inactiveCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full sm:max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search metals, purity, or description..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative">
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm font-semibold text-slate-600 outline-none transition focus:border-amber-400"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </label>
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              className={`rounded-lg p-2 transition ${viewMode === "table" ? "bg-[#003B3B] text-white" : "text-gray-400 hover:text-slate-700"}`}
            >
              <FiList size={18} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-label="Card view"
              aria-pressed={viewMode === "cards"}
              className={`rounded-lg p-2 transition ${viewMode === "cards" ? "bg-[#003B3B] text-white" : "text-gray-400 hover:text-slate-700"}`}
            >
              <FiGrid size={18} />
            </button>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#003B3B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#008577]"
          >
            <FiPlus size={18} /> Add Metal
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-[#003B3B]">
              <tr>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-white">S No</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-white">Metal</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-white">Purity</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-white">Description</th>
                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-white">Status</th>
                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-sm font-medium text-gray-500">Loading metals...</td>
                </tr>
              ) : filteredMetals.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-sm font-medium text-gray-500">
                    {searchQuery || statusFilter !== "All" ? "No metals match the selected filters." : "No metals yet. Add one to get started."}
                  </td>
                </tr>
              ) : filteredMetals.map((metal, index) => (
                <tr key={metal.id} className="transition-colors hover:bg-amber-50/30">
                  <td className="px-5 py-4 text-sm font-semibold text-slate-500">{index + 1}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {metal.image ? (
                        <img src={getMetalImageUrl(metal.image)} alt="" className="h-10 w-10 rounded-lg border border-gray-200 object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                          <FiImage size={18} />
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-800">{metal.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-600">{metal.purity || "—"}</td>
                  <td className="max-w-sm px-5 py-4 text-sm text-slate-500">{metal.description || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${metal.status === "Active" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                      {metal.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" disabled={refreshing} onClick={() => openEditModal(metal)} aria-label={`Edit ${metal.name}`} className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <FiEdit2 size={16} />
                      </button>
                      <button type="button" disabled={refreshing} onClick={() => handleDelete(metal)} aria-label={`Delete ${metal.name}`} className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm font-medium text-gray-500">
              Loading metals...
            </div>
          ) : filteredMetals.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm font-medium text-gray-500">
              {searchQuery || statusFilter !== "All" ? "No metals match the selected filters." : "No metals yet. Add one to get started."}
            </div>
          ) : filteredMetals.map((metal, index) => (
            <article key={metal.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {metal.image ? (
                    <img src={getMetalImageUrl(metal.image)} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-gray-200 object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#003B3B] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-800">{metal.name}</h2>
                    <p className="text-xs text-gray-500">S No: {index + 1}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${metal.status === "Active" ? "bg-amber-50 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                  {metal.status}
                </span>
              </div>
              <dl className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Purity</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-700">{metal.purity || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Description</dt>
                  <dd className="mt-1 text-sm text-slate-600">{metal.description || "—"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button type="button" disabled={refreshing} onClick={() => openEditModal(metal)} aria-label={`Edit ${metal.name}`} className="rounded-lg p-2 text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <FiEdit2 size={16} />
                </button>
                <button type="button" disabled={refreshing} onClick={() => handleDelete(metal)} aria-label={`Delete ${metal.name}`} className="rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                  <FiTrash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleSave} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-800">{editingMetal ? "Edit Metal" : "Add Metal"}</h2>
                <p className="mt-1 text-xs text-gray-500">Enter the metal type and catalog details.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Close dialog" className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-slate-700">
                <FiX size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Metal Name <span className="text-red-500">*</span>
                    <input
                      required
                      maxLength={100}
                      autoFocus
                      value={formData.name}
                      onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                      placeholder="e.g. Gold"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Purity
                    <input
                      maxLength={50}
                      value={formData.purity}
                      onChange={(event) => setFormData((current) => ({ ...current, purity: event.target.value }))}
                      placeholder="e.g. 22K or 24K"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Description
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Add optional details about this metal..."
                      className="mt-1.5 w-full resize-y rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-normal text-slate-800 outline-none transition placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    />
                  </label>
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="block text-sm font-semibold text-slate-700">Metal Image</span>
                    {formData.image ? (
                      <div className="relative mt-1.5">
                        <img src={getMetalImageUrl(formData.image)} alt="Metal preview" className="h-52 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain" />
                        <button
                          type="button"
                          onClick={() => setFormData((current) => ({ ...current, image: "" }))}
                          aria-label="Remove metal image"
                          className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-red-500 shadow transition hover:bg-red-50"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="mt-1.5 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center transition hover:border-amber-400 hover:bg-amber-50/50">
                        <FiUploadCloud className="mb-2 text-2xl text-amber-600" />
                        <span className="text-sm font-bold text-slate-700">Upload Metal Image</span>
                        <span className="mt-1 text-xs text-gray-500">PNG or JPG, up to 5 MB</span>
                        <input type="file" accept="image/png,image/jpeg" onChange={handleImageUpload} className="sr-only" />
                      </label>
                    )}
                  </div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Status
                    <select
                      value={formData.status}
                      onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-normal text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/80 px-6 py-4">
              <button type="button" onClick={closeModal} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving || !formData.name.trim()} className="rounded-xl bg-[#003B3B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? "Saving..." : editingMetal ? "Save Changes" : "Save Metal"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default Metals;
