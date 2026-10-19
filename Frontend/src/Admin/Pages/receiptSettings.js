import api from "../../api";

export const DEFAULT_RECEIPT_SETTINGS = {
  shopName: "Sri Golds",
  logoUrl: "/images/logo.png",
  address: "Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India",
  gstNumber: "",
  phone: "",
  email: "",
  footerMessage: "Thank you for choosing us. We value your trust and look forward to serving you again."
};

export async function getReceiptSettings() {
  const response = await api.get("/receipt-settings");
  if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
    throw new Error("The server returned invalid receipt settings.");
  }
  return { ...DEFAULT_RECEIPT_SETTINGS, ...response.data };
}

export async function saveReceiptSettings(settings) {
  const response = await api.put("/receipt-settings", settings);
  if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
    throw new Error("The server returned invalid receipt settings.");
  }
  return { ...DEFAULT_RECEIPT_SETTINGS, ...response.data };
}
