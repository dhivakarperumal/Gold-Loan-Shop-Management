const { pool } = require('../config/db');

const DEFAULT_RECEIPT_SETTINGS = {
  shopName: 'Sri Golds',
  logoUrl: '/images/logo.png',
  address: 'Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India',
  gstNumber: '',
  phone: '',
  email: '',
  footerMessage: 'Thank you for choosing us. We value your trust and look forward to serving you again.'
};

async function initializeReceiptSettingsModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipt_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      settings_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getReceiptSettings() {
  const [rows] = await pool.execute('SELECT settings_json FROM receipt_settings WHERE id = 1');
  if (!rows[0]) return { ...DEFAULT_RECEIPT_SETTINGS };
  return { ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(rows[0].settings_json) };
}

async function saveReceiptSettings(settings) {
  await pool.execute(
    `INSERT INTO receipt_settings (id, settings_json) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)`,
    [JSON.stringify(settings)]
  );
  return settings;
}

module.exports = {
  DEFAULT_RECEIPT_SETTINGS,
  getReceiptSettings,
  initializeReceiptSettingsModule,
  saveReceiptSettings
};
