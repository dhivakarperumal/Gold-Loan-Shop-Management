import { toast } from "react-hot-toast";
import api, { getPrivateFile } from "../../api";
import { loanReviewDate } from "./loanPolicy";
import { formatCurrency as money } from "../../utils/currency";

const SHOP_NAME = "Sri Golds";
const SHOP_ADDRESS = "No.58 Vaitheeshwaran Nagar, Tirupattur - 635653";
const SHOP_PHONE = "9659133504";
const TAMIL_LABELS = {
  "Fixed Interest Amount": "நிலையான வட்டி தொகை",
  "Custom Interest Period": "தனிப்பயன் வட்டி காலம்",
  "Compounding Frequency": "கூட்டு வட்டி இடைவெளி",
  "Grace Period": "சலுகைக் காலம்",
  "Interest-Free Period": "வட்டியில்லா காலம்",
  "Late Payment Rate": "தாமதக் கட்டண வட்டி விகிதம்",
  "Minimum Interest": "குறைந்தபட்ச வட்டி",
  "Maximum Interest": "அதிகபட்ச வட்டி",
  "Customer name": "வாடிக்கையாளர் பெயர்",
  "Customer ID": "வாடிக்கையாளர் எண்",
  "Mobile number": "கைபேசி எண்",
  "Alternate mobile": "மாற்று கைபேசி எண்",
  Email: "மின்னஞ்சல்",
  "Date of birth": "பிறந்த தேதி",
  Gender: "பாலினம்",
  Occupation: "தொழில்",
  "KYC status": "KYC நிலை",
  Address: "முகவரி",
  "Guarantor name": "உத்தரவாததாரர் பெயர்",
  "Guarantor mobile": "உத்தரவாததாரர் கைபேசி எண்",
  "Guarantor email": "உத்தரவாததாரர் மின்னஞ்சல்",
  "Guarantor relationship": "உத்தரவாததாரருடனான உறவு",
  "Guarantor address": "உத்தரவாததாரர் முகவரி",
  "Jewellery type": "நகை வகை",
  Metal: "உலோகம்",
  "Purity / quality": "தூய்மை / தரம்",
  "Gross weight": "மொத்த எடை",
  "Stone weight": "கல் எடை",
  "Net weight": "நிகர எடை",
  "Rate snapshot": "பதிவு செய்யப்பட்ட விலை",
  "Rate effective date": "விலை அமலான தேதி",
  "Pledged metal valuation": "அடகு உலோக மதிப்பு",
  "Pledged gold image": "அடகு நகை படம்",
  "Pledged photo": "அடகு நகை படம்",
  "Principal amount": "கடன் அசல் தொகை",
  "Interest method": "வட்டி முறை",
  "Interest rate": "வட்டி விகிதம்",
  "Calculation start date": "கணக்கீடு தொடங்கும் தேதி",
  "Day-count convention": "நாள் கணக்கீட்டு முறை",
  "Payment frequency": "செலுத்தும் இடைவெளி",
  "Initial loan term": "ஆரம்ப கடன் காலம்",
  "Loan date": "கடன் தேதி",
  "Maturity date": "முதிர்வு தேதி",
  "Processing fee": "செயலாக்கக் கட்டணம்",
  "Other authorized charges": "பிற அங்கீகரிக்கப்பட்ட கட்டணங்கள்",
  Notes: "குறிப்புகள்",
  "Late-payment terms": "தாமதக் கட்டண விதிமுறைகள்",
  "15-month review date": "15 மாத மதிப்பாய்வு தேதி",
  "Review process": "மதிப்பாய்வு நடைமுறை"
};

const escapeHtml = (value) => String(value ?? "—")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

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

const tamilFrequency = (value) => ({
  daily: "தினசரி",
  weekly: "வாரந்தோறும்",
  monthly: "மாதந்தோறும்",
  quarterly: "காலாண்டுக்கு ஒருமுறை",
  half_yearly: "அரையாண்டுக்கு ஒருமுறை",
  yearly: "ஆண்டுதோறும்",
  custom_period: "தனிப்பயன் காலம்",
  bullet: "முதிர்வில் ஒருமுறை"
}[String(value || "").toLowerCase()] || titleCase(value));

const tamilLoanStatus = (value) => ({
  active: "செயலில்",
  inactive: "செயலற்றது",
  suspended: "இடைநிறுத்தப்பட்டது",
  completed: "முடிக்கப்பட்டது"
}[String(value || "").toLowerCase()] || titleCase(value));

const rateText = (value) => {
  if (value == null || value === "") return "—";
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : "—";
};

function detail(label, value, tamilValue) {
  const tamilLabel = TAMIL_LABELS[label] || label;
  const valueMarkup = tamilValue == null
    ? escapeHtml(value)
    : `<span class="translation-en">${escapeHtml(value)}</span><span class="translation-ta">${escapeHtml(tamilValue)}</span>`;
  return `<div class="detail"><span class="detail-label"><span class="translation-en">${escapeHtml(label)}</span><span class="translation-ta">${escapeHtml(tamilLabel)}</span></span><strong>${valueMarkup}</strong></div>`;
}

function translated(english, tamil) {
  return `<span class="translation-en">${escapeHtml(english)}</span><span class="translation-ta">${escapeHtml(tamil)}</span>`;
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
  return {
    ...loan,
    gold_image_data_url: URL.createObjectURL(imageBlob),
    printImageObjectUrl: true
  };
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
  const rateSnapshotTamil = loan.gold_rate_per_gram == null ? "பதிவு செய்யப்படவில்லை" : rateSnapshot;
  const fixedInterest = loan.fixed_interest_amount == null
    ? "—"
    : money(loan.fixed_interest_amount);
  const latePaymentTerms = loan.late_payment_interest_rate == null
    ? "No late-payment rate is configured for this loan."
    : `${rateText(loan.late_payment_interest_rate)}% of outstanding principal per ${titleCase(loan.interest_frequency)} period, applied as a simple, non-compounding charge from the day after maturity.`;
  const latePaymentTermsTamil = loan.late_payment_interest_rate == null
    ? "இந்தக் கடனுக்கு தாமதக் கட்டண வட்டி விகிதம் அமைக்கப்படவில்லை."
    : `நிலுவையில் உள்ள அசல் தொகைக்கு ${titleCase(loan.interest_frequency)} காலத்திற்கு ${rateText(loan.late_payment_interest_rate)}% எளிய, கூட்டு சேராத தாமதக் கட்டணம் முதிர்வு தேதிக்கு அடுத்த நாளிலிருந்து விதிக்கப்படும்.`;
  const reviewDate = loanReviewDate(loan);
  const optionalTerms = [
    ["Fixed Interest Amount", fixedInterest, fixedInterest],
    ["Custom Interest Period", loan.custom_period_days == null ? "—" : `${loan.custom_period_days} days`, loan.custom_period_days == null ? "—" : `${loan.custom_period_days} நாட்கள்`],
    ["Compounding Frequency", loan.compounding_frequency ? titleCase(loan.compounding_frequency) : "—", loan.compounding_frequency ? tamilFrequency(loan.compounding_frequency) : "—"],
    ["Grace Period", `${loan.grace_period_days || 0} days`, `${loan.grace_period_days || 0} நாட்கள்`],
    ["Interest-Free Period", `${loan.interest_free_days || 0} days`, `${loan.interest_free_days || 0} நாட்கள்`],
    ["Late Payment Rate", loan.late_payment_interest_rate == null ? "Not set" : `${rateText(loan.late_payment_interest_rate)}% per ${titleCase(loan.interest_frequency)} period`, loan.late_payment_interest_rate == null ? "அமைக்கப்படவில்லை" : `${rateText(loan.late_payment_interest_rate)}% · ${tamilFrequency(loan.interest_frequency)} காலத்திற்கு`],
    ["Minimum Interest", loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount), loan.minimum_interest_amount == null ? "—" : money(loan.minimum_interest_amount)],
    ["Maximum Interest", loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount), loan.maximum_interest_amount == null ? "—" : money(loan.maximum_interest_amount)]
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
    .toolbar select { border: 1px solid #cbd5d1; border-radius: 8px; padding: 0 12px; background: white; color: #172b28; font: inherit; }
    .translation-ta { display: none; }
    body.tamil .translation-en { display: none !important; }
    body.tamil .translation-ta { display: initial; }
    .detail-label .translation-en { display: block; }
    .detail-label .translation-ta { display: none; }
    body.tamil .detail-label .translation-ta { display: block; }
    .detail strong .translation-en { display: block; }
    .detail strong .translation-ta { display: none; }
    body.tamil .detail strong .translation-en { display: none !important; }
    body.tamil .detail strong .translation-ta { display: block; }
    body.tamil { font-family: "Nirmala UI", "Latha", "Noto Sans Tamil", "Arial Unicode MS", sans-serif; }
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
    .full-line { grid-column: 1 / -1; }
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
    @page { size: A4 portrait; margin: 4mm 6mm; }
    @media print {
      body { padding: 0; background: white; font-size: 12px; line-height: 1.25; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .toolbar { display: none !important; }
      .page { display: flex; width: 100%; max-width: none; min-height: 289mm; flex-direction: column; justify-content: space-between; padding: 0; box-shadow: none; break-after: avoid-page; page-break-after: avoid; }
      .shop { padding-bottom: 6px; gap: 12px; }
      .brand { font-size: 28px; }
      .shop p, .meta p { margin-top: 2px; font-size: 11px; }
      .doc-title h2 { font-size: 17px; }
      .doc-title p { margin-top: 4px; }
      .meta { margin: 5px 0; padding: 5px 8px; }
      .section { flex: 0 0 auto; margin-top: 4px; break-inside: avoid; page-break-inside: avoid; }
      .section h3 { margin-bottom: 3px; padding-bottom: 2px; font-size: 12px; }
      .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 2px 7px; }
      .full-line { grid-column: 1 / -1; }
      .detail { padding: 1px 0; }
      .detail span { margin-bottom: 1px; font-size: 10px; }
      .detail strong { font-size: 12px; line-height: 1.2; }
      .pledged-image-detail { grid-column: span 2; }
      .pledged-image { max-height: 56px; max-width: 120px; margin-top: 2px; border-radius: 3px; }
      .notes { min-height: 0; }
      .acknowledgment { margin-top: 5px; padding: 5px 7px; font-size: 10px; line-height: 1.2; }
      .signatures { gap: 10px 20px; margin-top: 7px; }
      .signature { padding-top: 3px; }
      .signature strong { font-size: 11px; }
      .signature span, .footer { font-size: 9px; }
      .signature span { margin-top: 1px; }
      .footer { margin-top: 0; padding-top: 4px; }
      .acknowledgment, .signatures, .footer { break-inside: avoid; page-break-inside: avoid; }
      body.tamil .detail-label, body.tamil .section h3 { letter-spacing: 0; text-transform: none; }
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
    <label for="print-language">Language / மொழி</label>
    <select id="print-language" aria-label="Print language" onchange="document.body.classList.toggle('tamil', this.value === 'ta'); document.documentElement.lang = this.value === 'ta' ? 'ta' : 'en'">
      <option value="en">English</option>
      <option value="ta">தமிழ்</option>
    </select>
    <button type="button" onclick="printAgreementPage()">Print / Download PDF</button>
    <button type="button" class="secondary" onclick="window.close()">Close</button>
  </div>
  <article class="page">
    <div class="shop">
      <div>
        <h1 class="brand">${SHOP_NAME}</h1>
        <p>${SHOP_ADDRESS}</p>
        <p>${translated("Phone:", "தொலைபேசி:")} ${SHOP_PHONE}</p>
      </div>
      <div class="doc-title">
        <h2>${isDraft ? translated("Gold Loan Agreement · Draft", "தங்கக் கடன் ஒப்பந்தம் · வரைவு") : translated("Gold Loan Agreement", "தங்கக் கடன் ஒப்பந்தம்")}</h2>
        <p>${escapeHtml(loan.loan_number || "Number assigned after saving")}</p>
      </div>
    </div>
    ${isDraft ? `<p class="draft">${translated("DRAFT — This document is not a saved loan agreement.", "வரைவு — இது சேமிக்கப்பட்ட கடன் ஒப்பந்தம் அல்ல.")}</p>` : ""}
    <div class="meta">
      <p><strong>${translated("Agreement date:", "ஒப்பந்த தேதி:")}</strong> ${dateText(loan.loan_date)}</p>
      <p><strong>${translated("Loan status:", "கடன் நிலை:")}</strong> ${translated(titleCase(loan.loan_status), tamilLoanStatus(loan.loan_status))}</p>
      <p><strong>${translated("Pledge number:", "அடகு எண்:")}</strong> ${escapeHtml(loan.gold_pledge_number)}</p>
    </div>
    <section class="section">
      <h3>${translated("Borrower details", "கடன் பெறுபவர் விவரங்கள்")}</h3>
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
      <h3>${translated("Pledged jewellery and valuation", "அடகு நகை மற்றும் மதிப்பீடு")}</h3>
      <div class="grid">
        ${detail("Jewellery type", loan.jewellery_type)}
        ${detail("Metal", loan.metal_type || "Gold")}
        ${detail("Purity / quality", loan.gold_purity)}
        ${detail("Gross weight", `${loan.gross_weight} ${unit}`)}
        ${detail("Stone weight", `${loan.stone_weight || 0} ${unit}`)}
        ${detail("Net weight", `${loan.net_gold_weight} ${unit}`)}
        ${detail("Rate snapshot", rateSnapshot, rateSnapshotTamil)}
        ${detail("Rate effective date", dateText(loan.gold_rate_date))}
        ${detail("Pledged metal valuation", money(loan.gold_valuation))}
        ${loan.gold_image_data_url
          ? `<div class="detail pledged-image-detail"><span class="detail-label">${translated("Pledged gold image", "அடகு நகை படம்")}</span><img class="pledged-image" src="${escapeHtml(loan.gold_image_data_url)}" alt="Pledged gold item"></div>`
          : detail("Pledged photo", "No image attached", "படம் இணைக்கப்படவில்லை")}
      </div>
    </section>
    <section class="section">
      <h3>${translated("Loan and repayment terms", "கடன் மற்றும் திருப்பிச் செலுத்தும் விதிமுறைகள்")}</h3>
      <div class="grid">
        ${detail("Principal amount", money(loan.principal_amount))}
        ${detail("Interest method", titleCase(loan.interest_type), ({
          simple: "எளிய வட்டி",
          compound: "கூட்டு வட்டி",
          fixed: "நிலையான வட்டி",
          flat: "நிலையான வட்டி முறை",
          reducing_balance: "குறையும் இருப்பு முறை",
          slab_based: "தொகுப்பு அடிப்படையிலான முறை",
          custom: "தனிப்பயன் முறை"
        }[String(loan.interest_type || "").toLowerCase()] || titleCase(loan.interest_type)))}
        ${detail("Interest rate", `${rateText(loan.interest_rate)}% per ${titleCase(loan.interest_frequency)}`, `${rateText(loan.interest_rate)}% · ${tamilFrequency(loan.interest_frequency)}`)}
        ${detail("Calculation start date", dateText(loan.interest_calculation_start_date))}
        ${detail("Day-count convention", titleCase(loan.day_count_convention))}
        ${detail("Payment frequency", titleCase(loan.payment_frequency), tamilFrequency(loan.payment_frequency))}
        ${detail("Initial loan term", "11 months; renewals set a new 11-month term from the recorded renewal date", "ஆரம்ப கடன் காலம் 11 மாதங்கள்; புதுப்பித்தால் பதிவு செய்யப்பட்ட புதுப்பிப்பு தேதியிலிருந்து புதிய 11 மாத காலம் தொடங்கும்")}
        ${detail("Loan date", dateText(loan.loan_date))}
        ${detail("Maturity date", dateText(loan.maturity_date))}
        ${detail("Processing fee", money(loan.processing_fee))}
        ${detail("Other authorized charges", money(loan.other_charges))}
        ${optionalTerms.map(([label, value, tamilValue]) => detail(label, value, tamilValue)).join("")}
      </div>
      ${loan.notes ? `<div class="detail notes"><span class="detail-label"><span class="translation-en">Notes</span><span class="translation-ta">குறிப்புகள்</span></span><strong>${escapeHtml(loan.notes)}</strong></div>` : ""}
    </section>
    <section class="section">
      <h3>${translated("Late payment and account review", "தாமதக் கட்டணம் மற்றும் கணக்கு மதிப்பாய்வு")}</h3>
      <div class="grid">
        <div class="wide">${detail("Late-payment terms", latePaymentTerms, latePaymentTermsTamil)}</div>
        ${detail("15-month review date", dateText(reviewDate))}
        <div class="full-line">${detail("Review process", "If a balance remains after maturity, the account is flagged for authorized manual review 15 months after the original loan date. This does not authorize automatic seizure or forfeiture. Any collateral handling must follow the signed agreement, applicable law, required notice, and authorized review.", "முதிர்வுக்குப் பிறகும் நிலுவை இருந்தால், அசல் கடன் தேதியிலிருந்து 15 மாதங்களில் கணக்கு அங்கீகரிக்கப்பட்ட கைமுறை மதிப்பாய்வுக்காக குறிக்கப்படும். இதனால் தானாகப் பறிமுதல் செய்யவோ உரிமை இழக்கச் செய்யவோ அனுமதி கிடையாது. அடகு பொருள் தொடர்பான நடவடிக்கைகள் கையொப்பமிட்ட ஒப்பந்தம், பொருந்தும் சட்டம், தேவையான அறிவிப்பு மற்றும் அங்கீகரிக்கப்பட்ட மதிப்பாய்வின்படி மட்டுமே நடைபெறும்.")}</div>
      </div>
    </section>
    <p class="acknowledgment">${translated("The borrower confirms these customer and pledged-item details and accepts the loan amount, interest and repayment terms, charges, maturity date, late-payment terms, and review process. Both parties should review and sign this agreement and keep a signed copy.", "வாடிக்கையாளர் மற்றும் அடகு நகை விவரங்கள் சரியானவை என்றும், கடன் தொகை, வட்டி மற்றும் திருப்பிச் செலுத்தும் விதிமுறைகள், கட்டணங்கள், முதிர்வு தேதி, தாமதக் கட்டண விதிமுறைகள் மற்றும் மதிப்பாய்வு நடைமுறை ஆகியவற்றை ஏற்றுக்கொள்வதாகவும் கடன் பெறுபவர் உறுதிப்படுத்துகிறார். இரு தரப்பினரும் இந்த ஒப்பந்தத்தைச் சரிபார்த்துக் கையொப்பமிட்டு, கையொப்பமிட்ட பிரதியை வைத்திருக்க வேண்டும்.")}</p>
    <div class="signatures">
      <div class="signature"><strong>${escapeHtml(loan.customer_name)}</strong><span>${translated("Borrower signature / thumb impression", "கடன் பெறுபவர் கையொப்பம் / விரல் ரேகை")}</span><span>${translated("Date:", "தேதி:")} ____________________</span></div>
      <div class="signature"><strong>${SHOP_NAME}</strong><span>${translated("Authorized shop representative signature", "அங்கீகரிக்கப்பட்ட கடை பிரதிநிதி கையொப்பம்")}</span><span>${translated("Date:", "தேதி:")} ____________________</span></div>
      <div class="signature"><strong>${translated("Witness 1", "சாட்சி 1")}</strong><span>${translated("Name and signature", "பெயர் மற்றும் கையொப்பம்")}</span></div>
      <div class="signature"><strong>${translated("Witness 2", "சாட்சி 2")}</strong><span>${translated("Name and signature", "பெயர் மற்றும் கையொப்பம்")}</span></div>
    </div>
    <div class="footer">${translated(`Generated from the loan record on ${new Date().toLocaleString("en-IN")}. This document reflects the saved loan terms.`, `${new Date().toLocaleString("ta-IN")} அன்று கடன் பதிவிலிருந்து உருவாக்கப்பட்டது. இந்த ஆவணம் சேமிக்கப்பட்ட கடன் விதிமுறைகளைக் காட்டுகிறது.`)}</div>
  </article>
  <script>
    function printAgreementPage() {
      window.print();
    }
  </script>
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
  const releaseImageUrl = () => {
    if (loan.printImageObjectUrl && loan.gold_image_data_url) {
      URL.revokeObjectURL(loan.gold_image_data_url);
    }
  };
  printWindow.addEventListener("afterprint", releaseImageUrl, { once: true });
  printWindow.addEventListener("pagehide", releaseImageUrl, { once: true });
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
    releaseImageUrl();
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
