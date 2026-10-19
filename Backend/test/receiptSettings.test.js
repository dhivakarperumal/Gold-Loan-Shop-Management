const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeSettings
} = require('../src/controllers/receiptSettingsController');

test('normalizes receipt settings and fills omitted values with defaults', () => {
  const result = normalizeSettings({ shopName: '  My Shop  ' });
  assert.equal(result.error, undefined);
  assert.equal(result.settings.shopName, 'My Shop');
  assert.equal(result.settings.logoUrl, DEFAULT_RECEIPT_SETTINGS.logoUrl);
  assert.equal(result.settings.footerMessage, DEFAULT_RECEIPT_SETTINGS.footerMessage);
});

test('accepts supported receipt logo paths, URLs, and embedded images', () => {
  for (const logoUrl of [
    '/uploads/shop-logo.webp',
    'https://example.com/shop-logo.png',
    `data:image/png;base64,${Buffer.from('logo').toString('base64')}`
  ]) {
    assert.equal(normalizeSettings({ shopName: 'Shop', logoUrl }).error, undefined);
  }
});

test('rejects invalid receipt fields, empty shop names, and unsupported logo URLs', () => {
  assert.match(normalizeSettings([]).error, /invalid/i);
  assert.match(normalizeSettings({ shopName: ' ' }).error, /required/i);
  assert.match(normalizeSettings({ shopName: 'Shop', phone: 123 }).error, /invalid/i);
  assert.match(normalizeSettings({ shopName: 'Shop', logoUrl: 'javascript:alert(1)' }).error, /logo/i);
  assert.match(normalizeSettings({ shopName: 'Shop', footerMessage: 'x'.repeat(1001) }).error, /invalid/i);
});
