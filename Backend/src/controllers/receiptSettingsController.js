const {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings: readReceiptSettings,
  saveReceiptSettings: writeReceiptSettings
} = require('../modules/receiptSettingsModule');

const FIELD_LIMITS = {
  shopName: 120,
  logoUrl: 1500000,
  address: 2000,
  gstNumber: 100,
  phone: 50,
  email: 254,
  footerMessage: 1000
};

function normalizeSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Receipt settings are invalid' };
  }
  const settings = {};
  for (const [field, maxLength] of Object.entries(FIELD_LIMITS)) {
    const value = body[field] ?? DEFAULT_RECEIPT_SETTINGS[field];
    if (typeof value !== 'string' || value.length > maxLength) {
      return { error: `${field} is invalid` };
    }
    settings[field] = value.trim();
  }
  if (!settings.shopName) return { error: 'Shop name is required' };
  if (settings.logoUrl && !(
    /^\/[a-zA-Z0-9_./-]*$/.test(settings.logoUrl)
    || /^https?:\/\/\S+$/i.test(settings.logoUrl)
    || /^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/]+={0,2}$/i.test(settings.logoUrl)
  )) {
    return { error: 'Logo must be a public path, HTTP(S) URL, or PNG, JPG, or WebP image' };
  }
  return { settings };
}

async function getReceiptSettings(req, res, next) {
  try {
    return res.json(await readReceiptSettings());
  } catch (error) {
    return next(error);
  }
}

async function putReceiptSettings(req, res, next) {
  const { settings, error } = normalizeSettings(req.body || {});
  if (error) return res.status(400).json({ message: error });
  try {
    return res.json(await writeReceiptSettings(settings));
  } catch (saveError) {
    return next(saveError);
  }
}

module.exports = {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings,
  normalizeSettings,
  putReceiptSettings
};
