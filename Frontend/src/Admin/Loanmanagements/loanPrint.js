import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";

const SHOP_NAME = "Sri Golds";
const SHOP_ADDRESS = "No.58 Vaitheeshwaran Nagar, Tirupattur - 635653";
const SHOP_PHONE = "9659133504";

const escapeHtml = (value) => String(value ?? "—")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
}).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return "—";
  const text = String(value);
  const date = /^\d{4}-\d{2}-\d{2}/.test(text)
    ? new Date(`${text.slice(0, 10)}T00:00:00`)
    : new Date(value);
  return Number.isNaN(date.valueOf()) ? escapeHtml(value) : date.toLocaleDateString("en-IN");
};

const titleCase = (value) => String(value || "—")
  .replaceAll("_", " ")
  .replace(/\b\w/g, (character) => character.toUpperCase());

const rateText = (value) => {
  if (value == null || value === "") return "—";
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : "—";
};

function detail(label, value) {
  return `<div class="detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function readAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read the pledged gold image."));
    reader.readAsDataURL(blob);
  });
}

async function prepareLoanImage(loan) {
  if (!loan.gold_image_url) return loan;
  if (typeof loan.gold_image_url === "string" && loan.gold_image_url.startsWith("data:image/")) {
    return { ...loan, gold_image_data_url: loan.gold_image_url };
  }

  const imageBlob = typeof Blob !== "undefined" && loan.gold_image_url instanceof Blob
    ? loan.gold_image_url
    : (await getPrivateFile(loan.gold_image_url, { responseType: "blob" })).data;
  if (!imageBlob.type.startsWith("image/")) {
    throw new Error("The pledged gold attachment is not a supported image.");
  }
  return { ...loan, gold_image_data_url: await readAsDataUrl(imageBlob) };
}

function createDocument(loan) {
  const unit = loan.rate_unit === "carat" ? "ct" : "g";
  const customerAddress = [
    loan.customer_address,
    loan.customer_city,
    loan.customer_district,
    loan.customer_state,
    loan.customer_pincode
  ].filter(Boolean).join(", ") || "—";
  const guarantorAddress = loan.guarantor_address || "—";
  const rateSnapshot = loan.gold_rate_per_gram == null
    ? "Not recorded"
    : `${money(loan.gold_rate_per_gram)} / ${unit}`;
  const fixedInterest = loan.fixed_interest_amount == null
    ? "—"
    : money(loan.fixed_interest_amount);
  const optionalTerms = [
    ["Fixed Interest Amount", fixedInterest],
    ["Custom Interest Period", loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`],
    ["Compounding Frequency", loan.compounding_frequency ? titleCase(loan.compounding_frequency) : "—"],
    ["Grace Period", `${loan.grace_period_days || 0} days`],
    ["Interest-Free Period", `${loan.interest_free_days || 0} days`],
    ["Late Payment Rate", loan.late_payment_interest_rate == null ? "Not set" : `${rateText(loan.late_payment_interest_rate)}%`],
    ["Minimum Interest", loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount)],
    ["Maximum Interest", loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount)]
  ];
  const isDraft = !loan.id;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Loan Agreement - ${escapeHtml(loan.loan_number || "Draft")}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 28px; color: #172b28; font: 13px/1.45 Arial, sans-serif; background: #eef3f1; }
    .toolbar { display: flex; justify-content: center; gap: 10px; margin: 0 auto 18px; }
    .toolbar button { border: 0; border-radius: 8px; padding: 11px 18px; background: #07564b; color: white; font-weight: 700; cursor: pointer; }
    .toolbar button.secondary { background: #52625e; }
    .page { width: 100%; max-width: 850px; margin: auto; padding: 38px; background: white; box-shadow: 0 8px 32px #12352b18; }
    .shop { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 20px; border-bottom: 2px solid #087263; }
    .brand { margin: 0; color: #07564b; font: 700 28px Georgia, serif; }
    .shop p, .meta p { margin: 4px 0 0; color: #52625e; }
    .doc-title { text-align: right; }
    .doc-title h2 { margin: 0; color: #07564b; font-size: 19px; text-transform: uppercase; letter-spacing: .08em; }
    .doc-title p { margin-top: 7px; font-weight: 700; }
    .meta { display: flex; justify-content: space-between; gap: 12px; margin: 18px 0; padding: 12px 14px; border-radius: 8px; background: #f0f8f5; }
    .section { margin-top: 20px; break-inside: avoid; }
    .section h3 { margin: 0 0 10px; padding-bottom: 7px; border-bottom: 1px solid #dce8e3; color: #07564b; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 16px; }
    .detail { min-width: 0; padding: 2px 0; }
    .wide { grid-column: span 2; }
    .detail span { display: block; margin-bottom: 3px; color: #71817c; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .detail strong { display: block; overflow-wrap: anywhere; color: #1e302b; font-size: 12px; }
    .pledged-image-detail { grid-column: 1 / -1; }
    .pledged-image { display: block; max-width: 100%; max-height: 320px; margin-top: 10px; border: 1px solid #dce8e3; border-radius: 8px; object-fit: contain; object-position: left; }
    .notes { min-height: 36px; white-space: pre-wrap; }
    .acknowledgment { margin-top: 22px; padding: 12px 14px; border: 1px solid #dce8e3; border-radius: 7px; color: #52625e; font-size: 11px; }
    .draft { margin: 16px 0; padding: 9px 12px; border: 1px solid #f5c45e; border-radius: 7px; background: #fff8e7; color: #805400; font-weight: 700; text-align: center; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: 58px; break-inside: avoid; }
    .signature { padding-top: 8px; border-top: 1px solid #485752; }
    .signature strong { display: block; }
    .signature span { display: block; margin-top: 3px; color: #71817c; font-size: 10px; }
    .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #e3ebe7; color: #71817c; text-align: center; font-size: 10px; }
    @page { size: A4; margin: 6mm; }
    @media print {
      body { padding: 0; background: white; font-size: 10px; line-height: 1.22; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .toolbar { display: none !important; }
      .page { width: 100%; max-width: none; padding: 0; box-shadow: none; }
      .shop { padding-bottom: 4px; gap: 12px; }
      .brand { font-size: 22px; }
      .shop p, .meta p { margin-top: 2px; font-size: 9px; }
      .doc-title h2 { font-size: 15px; }
      .doc-title p { margin-top: 4px; }
      .meta { margin: 4px 0; padding: 4px 7px; }
      .section { margin-top: 6px; }
      .section h3 { margin-bottom: 3px; padding-bottom: 3px; font-size: 10px; }
      .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px 8px; }
      .detail { padding: 0; }
      .detail span { margin-bottom: 1px; font-size: 8px; }
      .detail strong { font-size: 9px; line-height: 1.18; }
      .pledged-image-detail { grid-column: span 2; }
      .pledged-image { max-height: 58px; max-width: 140px; margin-top: 2px; border-radius: 4px; }
      .notes { min-height: 0; }
      .acknowledgment { margin-top: 6px; padding: 5px 7px; font-size: 9px; line-height: 1.2; }
      .signatures { gap: 12px 24px; margin-top: 12px; }
      .signature { padding-top: 3px; }
      .signature strong { font-size: 9px; }
      .signature span, .footer { font-size: 8px; }
      .signature span { margin-top: 2px; }
      .footer { margin-top: 6px; padding-top: 4px; }
      .acknowledgment, .signatures, .footer { break-inside: avoid; page-break-inside: avoid; }
    }
    @media (max-width: 650px) {
      body { padding: 10px; }
      .page { padding: 20px; }
      .shop { flex-direction: column; }
      .doc-title { text-align: left; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .wide { grid-column: span 2; }
      .meta { flex-direction: column; }
      .signatures { gap: 24px; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Print / Download PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>
  <article class="page">
    <div class="shop">
      <div>
        <h1 class="brand">${SHOP_NAME}</h1>
        <p>${SHOP_ADDRESS}</p>
        <p>Phone: ${SHOP_PHONE}</p>
      </div>
      <div class="doc-title">
        <h2>${isDraft ? "Gold Loan Agreement · Draft" : "Gold Loan Agreement"}</h2>
        <p>${escapeHtml(loan.loan_number || "Number assigned after saving")}</p>
      </div>
    </div>
    ${isDraft ? '<p class="draft">DRAFT — This document is not a saved loan agreement.</p>' : ""}
    <div class="meta">
      <p><strong>Agreement date:</strong> ${dateText(loan.loan_date)}</p>
      <p><strong>Loan status:</strong> ${escapeHtml(titleCase(loan.loan_status))}</p>
      <p><strong>Pledge number:</strong> ${escapeHtml(loan.gold_pledge_number)}</p>
    </div>
    <section class="section">
      <h3>Borrower details</h3>
      <div class="grid">
        ${detail("Customer name", loan.customer_name)}
        ${detail("Customer ID", loan.customer_code || loan.customer_id)}
        ${detail("Mobile number", loan.customer_mobile)}
        ${detail("Alternate mobile", loan.customer_alternate_mobile)}
        ${detail("Email", loan.customer_email)}
        ${detail("Date of birth", dateText(loan.customer_date_of_birth))}
        ${detail("Gender", titleCase(loan.customer_gender))}
        ${detail("Occupation", loan.customer_occupation)}
        ${detail("KYC status", titleCase(loan.customer_kyc_status))}
        <div class="wide">${detail("Address", customerAddress)}</div>
        ${detail("Guarantor name", loan.guarantor_name)}
        ${detail("Guarantor mobile", loan.guarantor_mobile)}
        ${detail("Guarantor email", loan.guarantor_email)}
        ${detail("Guarantor relationship", loan.guarantor_relationship)}
        <div class="wide">${detail("Guarantor address", guarantorAddress)}</div>
      </div>
    </section>
    <section class="section">
      <h3>Pledged jewellery and valuation</h3>
      <div class="grid">
        ${detail("Jewellery type", loan.jewellery_type)}
        ${detail("Metal", loan.metal_type || "Gold")}
        ${detail("Purity / quality", loan.gold_purity)}
        ${detail("Gross weight", `${loan.gross_weight} ${unit}`)}
        ${detail("Stone weight", `${loan.stone_weight || 0} ${unit}`)}
        ${detail("Net weight", `${loan.net_gold_weight} ${unit}`)}
        ${detail("Rate snapshot", rateSnapshot)}
        ${detail("Rate effective date", dateText(loan.gold_rate_date))}
        ${detail("Pledged metal valuation", money(loan.gold_valuation))}
        ${loan.gold_image_data_url
          ? `<div class="detail pledged-image-detail"><span>Pledged gold image</span><img class="pledged-image" src="${escapeHtml(loan.gold_image_data_url)}" alt="Pledged gold item"></div>`
          : detail("Pledged photo", "No image attached")}
      </div>
    </section>
    <section class="section">
      <h3>Loan and repayment terms</h3>
      <div class="grid">
        ${detail("Principal amount", money(loan.principal_amount))}
        ${detail("Interest method", titleCase(loan.interest_type))}
        ${detail("Interest rate", `${rateText(loan.interest_rate)}% per ${titleCase(loan.interest_frequency)}`)}
        ${detail("Calculation start date", dateText(loan.interest_calculation_start_date))}
        ${detail("Day-count convention", titleCase(loan.day_count_convention))}
        ${detail("Payment frequency", titleCase(loan.payment_frequency))}
        ${detail("Loan date", dateText(loan.loan_date))}
        ${detail("Maturity date", dateText(loan.maturity_date))}
        ${detail("Processing fee", money(loan.processing_fee))}
        ${detail("Other authorized charges", money(loan.other_charges))}
        ${optionalTerms.map(([label, value]) => detail(label, value)).join("")}
      </div>
      ${loan.notes ? `<div class="detail notes"><span>Notes</span><strong>${escapeHtml(loan.notes)}</strong></div>` : ""}
    </section>
    <p class="acknowledgment">The borrower confirms that the customer and pledged-item details above are correct and acknowledges the loan amount, interest method, repayment frequency, charges, and maturity date. The borrower and authorized shop representative should review and sign this document. Keep a signed copy for both parties.</p>
    <div class="signatures">
      <div class="signature"><strong>${escapeHtml(loan.customer_name)}</strong><span>Borrower signature / thumb impression</span><span>Date: ____________________</span></div>
      <div class="signature"><strong>${SHOP_NAME}</strong><span>Authorized shop representative signature</span><span>Date: ____________________</span></div>
      <div class="signature"><strong>Witness 1</strong><span>Name and signature</span></div>
      <div class="signature"><strong>Witness 2</strong><span>Name and signature</span></div>
    </div>
    <div class="footer">Generated from the loan record on ${new Date().toLocaleString("en-IN")}. This document reflects the saved loan terms.</div>
  </article>
</body>
</html>`;
}

export async function printLoanAgreement(loanId) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Allow pop-ups for this site to print or download the loan document.");
    return;
  }

  showLoading(printWindow);

  try {
    const { data: loan } = await api.get(`/loans/${loanId}`);
    if (!loan || !loan.id) throw new Error("The server returned invalid loan details.");
    showPrintDocument(printWindow, await prepareLoanImage(loan));
  } catch (error) {
    console.error("Failed to prepare loan document:", error);
    printWindow.close();
    toast.error(error.response?.data?.message || error.message || "Could not prepare the loan document.");
  }
}

function showLoading(printWindow) {
  printWindow.document.write("<!doctype html><title>Loading loan document</title><p style='font:16px Arial;padding:24px'>Loading loan document...</p>");
  printWindow.document.close();
}

function showPrintDocument(printWindow, loan) {
  if (printWindow.closed) return;
  printWindow.document.open();
  printWindow.document.write(createDocument(loan));
  printWindow.document.close();
  const printWhenReady = () => {
    if (printWindow.closed) return;
    printWindow.focus();
    printWindow.print();
  };
  const images = Array.from(printWindow.document.images);
  if (images.every((image) => image.complete && image.naturalWidth > 0)) {
    window.setTimeout(printWhenReady, 100);
    return;
  }
  Promise.all(images.map((image) => new Promise((resolve, reject) => {
    if (image.complete) {
      image.naturalWidth > 0 ? resolve() : reject(new Error("The pledged gold image could not be displayed."));
      return;
    }
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("The pledged gold image could not be displayed.")), { once: true });
  }))).then(printWhenReady).catch((error) => {
    console.error("Failed to display pledged gold image:", error);
    printWindow.close();
    toast.error(error.message || "Could not display the pledged gold image.");
  });
}

export async function printLoanDraft(loan) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Allow pop-ups for this site to print or download the loan document.");
    return;
  }

  showLoading(printWindow);
  try {
    showPrintDocument(printWindow, await prepareLoanImage(loan));
  } catch (error) {
    console.error("Failed to prepare pledged gold image:", error);
    printWindow.close();
    toast.error(error.response?.data?.message || error.message || "Could not load the pledged gold image.");
  }
}
