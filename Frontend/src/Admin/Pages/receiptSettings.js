export const RECEIPT_SETTINGS_KEY = "sri-golds-receipt-settings";

export const DEFAULT_RECEIPT_SETTINGS = {
  shopName: "Sri Golds",
  logoUrl: "/images/logo.png",
  address: "Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India",
  gstNumber: "",
  phone: "",
  email: "",
  footerMessage: "Thank you for choosing us. We value your trust and look forward to serving you again."
};

export function getReceiptSettings() {
  const savedSettings = window.localStorage.getItem(RECEIPT_SETTINGS_KEY);
  if (!savedSettings) return { ...DEFAULT_RECEIPT_SETTINGS };

  try {
    const parsedSettings = JSON.parse(savedSettings);
    if (!parsedSettings || typeof parsedSettings !== "object" || Array.isArray(parsedSettings)) {
      throw new Error("Saved receipt settings have an invalid format.");
    }
    return {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...Object.fromEntries(
        Object.keys(DEFAULT_RECEIPT_SETTINGS)
          .filter((key) => typeof parsedSettings[key] === "string")
          .map((key) => [key, parsedSettings[key]])
      )
    };
  } catch (error) {
    console.error("Failed to read saved receipt settings:", error);
    return { ...DEFAULT_RECEIPT_SETTINGS };
  }
}
