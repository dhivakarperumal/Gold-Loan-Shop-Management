import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api";

const EMPTY_CUSTOMER = { name: "", phone: "", email: "", address: "" };
const EMPTY_PRODUCT = { product_id: "", product_name: "", category: "", purity: "", price: "" };
const EMPTY_EXCHANGE = { product_name: "", category: "", purity: "22K", credit_amount: "" };
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#008577] focus:ring-2 focus:ring-emerald-100";
const labelClass = "block text-xs font-semibold text-slate-600";

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

function decodeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function TextField({ label, value, onChange, type = "text", required = false, placeholder = "", min, step }) {
  return (
    <label className={labelClass}>
      {label}{required && <span className="ml-1 text-rose-500">*</span>}
      <input
        className={inputClass}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
      />
    </label>
  );
}

function ItemFields({ item, onChange, exchange = false }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <TextField label="Product Name" value={item.product_name} onChange={(value) => onChange("product_name", value)} required />
      <TextField label="Category" value={item.category} onChange={(value) => onChange("category", value)} required placeholder="e.g. Necklace" />
      <label className={labelClass}>
        Gold Purity<span className="ml-1 text-rose-500">*</span>
        <select className={inputClass} value={item.purity} onChange={(event) => onChange("purity", event.target.value)} required>
          {["24K", "22K", "18K"].map((purity) => <option key={purity}>{purity}</option>)}
        </select>
      </label>
      <TextField
        label={exchange ? "Exchange Credit (₹)" : "Unit Price (₹)"}
        type="number"
        value={exchange ? item.credit_amount : item.price}
        onChange={(value) => onChange(exchange ? "credit_amount" : "price", value)}
        required
        min="0"
        step="0.01"
        placeholder="0.00"
      />
    </div>
  );
}

function CatalogProductFields({ product, catalogProducts, loading, onSelect }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className={`${labelClass} xl:col-span-2`}>
        Select Existing Product<span className="ml-1 text-rose-500">*</span>
        <select
          className={inputClass}
          value={product.product_id}
          onChange={(event) => onSelect(event.target.value)}
          required
          disabled={loading}
        >
          <option value="">{loading ? "Loading products..." : "Choose a catalog product"}</option>
          {catalogProducts.map((catalogProduct) => {
            const price = Number(catalogProduct.offer_price) > 0
              ? Number(catalogProduct.offer_price)
              : Number(catalogProduct.final_selling_price) > 0
                ? Number(catalogProduct.final_selling_price)
                : Number(catalogProduct.mrp || 0);
            return (
              <option key={catalogProduct.id} value={catalogProduct.id}>
                {catalogProduct.name} · {catalogProduct.category} · {catalogProduct.purity || "Purity not set"} · {currency(price)}
              </option>
            );
          })}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3 xl:col-span-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500">Category</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-800">{product.category || "Select a product"}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-slate-500">Purity</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{product.purity || "—"}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2.5 sm:col-span-2">
          <p className="text-[11px] font-semibold text-emerald-700">Catalog Unit Price</p>
          <p className="mt-1 text-sm font-bold text-emerald-900">{product.product_id ? currency(product.price) : "—"}</p>
        </div>
      </div>
    </div>
  );
}

export default function BillingManagement() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([{ ...EMPTY_CUSTOMER }]);
  const [products, setProducts] = useState([{ ...EMPTY_PRODUCT }]);
  const [exchanges, setExchanges] = useState([]);
  const [paymentType, setPaymentType] = useState("FULL_PAYMENT");

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/billings");
      if (!Array.isArray(response.data)) throw new Error("The server returned an invalid bills list.");
      setBills(response.data);
    } catch (error) {
      console.error("Failed to load bills:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load bills.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogProducts = useCallback(async () => {
    setCatalogLoading(true);
    try {
      let page = 1;
      let totalPages = 1;
      const productsFromCatalog = [];
      do {
        const response = await api.get("/products", {
          params: { page, limit: 100, status: "Active" }
        });
        if (!Array.isArray(response.data?.products)) {
          throw new Error("The server returned an invalid product catalog.");
        }
        productsFromCatalog.push(...response.data.products);
        totalPages = Math.max(1, Number(response.data.pagination?.totalPages) || 1);
        page += 1;
      } while (page <= totalPages);
      setCatalogProducts(productsFromCatalog);
    } catch (error) {
      console.error("Failed to load billing product catalog:", error);
      toast.error(error.response?.data?.message || error.message || "Could not load catalog products.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { loadBills(); }, [loadBills]);
  useEffect(() => { loadCatalogProducts(); }, [loadCatalogProducts]);

  const subtotal = useMemo(
    () => products.reduce((sum, product) => sum + (Number(product.price) || 0), 0),
    [products]
  );
  const exchangeCredit = useMemo(
    () => paymentType === "EXCHANGE_GOLD"
      ? exchanges.reduce((sum, exchange) => sum + (Number(exchange.credit_amount) || 0), 0)
      : 0,
    [exchanges, paymentType]
  );
  const gst = Math.round(Math.max(0, subtotal - exchangeCredit) * 3) / 100;
  const total = Math.round((subtotal - exchangeCredit + gst) * 100) / 100;

  const resetForm = () => {
    setCustomers([{ ...EMPTY_CUSTOMER }]);
    setProducts([{ ...EMPTY_PRODUCT }]);
    setExchanges([]);
    setPaymentType("FULL_PAYMENT");
  };

  const updateRow = (setter, rows, index, field, value) => {
    setter(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const saveBill = async (event) => {
    event.preventDefault();
    if (paymentType === "EXCHANGE_GOLD" && exchanges.length === 0) {
      toast.error("Add at least one exchange item.");
      return;
    }
    if (exchangeCredit > subtotal) {
      toast.error("Exchange credit cannot exceed the purchased products subtotal.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/billings", {
        customers,
        products: products.map((product) => ({ product_id: Number(product.product_id) })),
        exchanges: paymentType === "EXCHANGE_GOLD"
          ? exchanges.map((exchange) => ({ ...exchange, credit_amount: Number(exchange.credit_amount) }))
          : [],
        payment_type: paymentType
      });
      toast.success("Bill saved.");
      resetForm();
      setShowForm(false);
      await loadBills();
    } catch (error) {
      console.error("Failed to save bill:", error);
      toast.error(error.response?.data?.message || "Could not save bill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen space-y-5 bg-[#F4F7F6] py-1 text-slate-800">
      {!showForm ? (
        <>
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Admin / Billing</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Show All Bills</h1>
              <p className="mt-1 text-sm text-slate-500">Create and review jewelry invoices.</p>
            </div>
            <button type="button" onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#00695C] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#008577]">
              <FiPlus /> New Bill
            </button>
          </header>
          <section className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-[#00695C] text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer(s)</th>
                    <th className="px-4 py-3">Items</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="px-4 py-12 text-center text-sm text-slate-500">Loading bills...</td></tr>
                  ) : bills.length === 0 ? (
                    <tr><td colSpan="6" className="px-4 py-12 text-center text-sm text-slate-500">No bills yet. Create your first bill.</td></tr>
                  ) : bills.map((bill) => {
                    const billCustomers = decodeArray(bill.customers);
                    const billProducts = decodeArray(bill.products);
                    return (
                      <tr key={bill.id} className="text-sm">
                        <td className="px-4 py-3 font-bold text-[#00695C]">{bill.invoice_no}</td>
                        <td className="px-4 py-3 text-slate-700">{billCustomers.map((customer) => customer.name).join(", ")}</td>
                        <td className="px-4 py-3 text-slate-600">{billProducts.length} item{billProducts.length === 1 ? "" : "s"}</td>
                        <td className="px-4 py-3 text-slate-600">{bill.payment_type === "EXCHANGE_GOLD" ? "Exchange Gold" : "Full Payment"}</td>
                        <td className="px-4 py-3 text-slate-500">{bill.created_at ? new Date(bill.created_at).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{currency(bill.total_amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <form onSubmit={saveBill} className="space-y-5">
          <header className="flex items-center gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Back to bills"><FiArrowLeft /></button>
            <div>
              <p className="text-xs font-medium text-slate-500">Admin / Billing / New Bill</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">New Bill</h1>
            </div>
          </header>

          <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-bold text-slate-900">Customer Details</h2><p className="text-xs text-slate-500">Add everyone associated with this invoice.</p></div>
            </div>
            {customers.map((customer, index) => (
              <div key={`customer-${index}`} className="space-y-3 rounded-lg border border-slate-100 p-4">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">Customer {index + 1}</h3>{customers.length > 1 && <button type="button" onClick={() => setCustomers((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-rose-500" aria-label={`Remove customer ${index + 1}`}><FiTrash2 /></button>}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <TextField label="Customer Name" value={customer.name} onChange={(value) => updateRow(setCustomers, customers, index, "name", value)} required />
                  <TextField label="Phone Number" value={customer.phone} onChange={(value) => updateRow(setCustomers, customers, index, "phone", value)} type="tel" />
                  <TextField label="Email Address" value={customer.email} onChange={(value) => updateRow(setCustomers, customers, index, "email", value)} type="email" />
                  <label className={`${labelClass} md:col-span-2`}>
                    Address
                    <textarea
                      className={`${inputClass} min-h-20`}
                      value={customer.address}
                      onChange={(event) => updateRow(setCustomers, customers, index, "address", event.target.value)}
                      rows="2"
                      maxLength={500}
                      placeholder="Enter customer address"
                    />
                  </label>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-bold text-slate-900">Purchased Products</h2><p className="text-xs text-slate-500">Enter selling price for each item.</p></div>
              <button type="button" onClick={() => setProducts((rows) => [...rows, { ...EMPTY_PRODUCT }])} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-[#00695C] hover:bg-emerald-50"><FiPlus /> Add Product</button>
            </div>
            {products.map((product, index) => (
              <div key={`product-${index}`} className="space-y-3 rounded-lg border border-slate-100 p-4">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-slate-700">Product {index + 1}</h3>{products.length > 1 && <button type="button" onClick={() => setProducts((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-rose-500" aria-label={`Remove product ${index + 1}`}><FiTrash2 /></button>}</div>
                <CatalogProductFields
                product={product}
                catalogProducts={catalogProducts}
                loading={catalogLoading}
                onSelect={(productId) => {
                  const selected = catalogProducts.find((item) => String(item.id) === productId);
                  if (!selected) {
                    updateRow(setProducts, products, index, "product_id", "");
                    return;
                  }
                  const price = Number(selected.offer_price) > 0
                    ? Number(selected.offer_price)
                    : Number(selected.final_selling_price) > 0
                      ? Number(selected.final_selling_price)
                      : Number(selected.mrp || 0);
                  setProducts((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
                    product_id: String(selected.id),
                    product_name: selected.name,
                    category: selected.category,
                    purity: selected.purity || "",
                    price
                  } : row));
                }}
                />
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <div><h2 className="font-bold text-slate-900">Payment Method</h2><p className="text-xs text-slate-500">GST is calculated at 3% after exchange credit.</p></div>
            <div className="flex flex-wrap gap-3">
              {[["FULL_PAYMENT", "Full Payment"], ["EXCHANGE_GOLD", "Exchange Gold"]].map(([value, label]) => (
                <label key={value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm font-semibold ${paymentType === value ? "border-[#008577] bg-emerald-50 text-[#00695C]" : "border-slate-200 text-slate-600"}`}>
                  <input type="radio" name="payment_type" value={value} checked={paymentType === value} onChange={() => setPaymentType(value)} className="accent-[#008577]" />{label}
                </label>
              ))}
            </div>
            {paymentType === "EXCHANGE_GOLD" && (
              <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><h3 className="font-bold text-slate-800">Exchange Gold Items</h3><p className="text-xs text-slate-500">Enter the credit value for each trade-in.</p></div>
                  <button type="button" onClick={() => setExchanges((rows) => [...rows, { ...EMPTY_EXCHANGE }])} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"><FiPlus /> Add Multiple Exchange Items</button>
                </div>
                {exchanges.map((exchange, index) => (
                  <div key={`exchange-${index}`} className="space-y-3 rounded-lg border border-amber-100 bg-white p-4">
                    <div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-700">Exchange Item {index + 1}</h4><button type="button" onClick={() => setExchanges((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-rose-500" aria-label={`Remove exchange item ${index + 1}`}><FiTrash2 /></button></div>
                    <ItemFields item={exchange} exchange onChange={(field, value) => updateRow(setExchanges, exchanges, index, field, value)} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ml-auto max-w-lg space-y-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Bill Summary</h2>
            <div className="flex justify-between text-sm text-slate-600"><span>Sub-Total</span><span>{currency(subtotal)}</span></div>
            {paymentType === "EXCHANGE_GOLD" && <div className="flex justify-between text-sm text-amber-700"><span>Exchange Credit</span><span>−{currency(exchangeCredit)}</span></div>}
            <div className="flex justify-between text-sm text-slate-600"><span>GST (3% of net subtotal)</span><span>{currency(gst)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-extrabold text-slate-900"><span>Total Bill</span><span>{currency(total)}</span></div>
            {paymentType === "EXCHANGE_GOLD" && exchangeCredit > subtotal && <p className="text-xs font-semibold text-rose-600">Exchange credit cannot exceed subtotal.</p>}
          </section>
          <footer className="flex justify-end">
            <button type="submit" disabled={saving || (paymentType === "EXCHANGE_GOLD" && exchangeCredit > subtotal)} className="inline-flex items-center gap-2 rounded-lg bg-[#00695C] px-5 py-3 text-sm font-bold text-white hover:bg-[#008577] disabled:cursor-not-allowed disabled:opacity-60"><FiSave />{saving ? "Saving Bill..." : "Save Bill"}</button>
          </footer>
        </form>
      )}
    </main>
  );
}
