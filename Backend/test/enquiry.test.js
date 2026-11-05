const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeEnquiry, purityForRate } = require('../src/controllers/enquiryController');

const validEnquiry = {
  customer_name: 'Customer Name',
  phone: '9659133504',
  email: 'customer@example.com',
  enquiry_type: 'Gold Jewellery',
  product_category: 'Gold Jewellery',
  product_name: 'Gold Ring',
  status: 'New Enquiry',
  follow_up_date: '2026-10-21',
  follow_up_time: '10:30',
  priority: 'High',
  whatsapp_confirmation: true
};

test('normalizes a valid customer enquiry and optional values', () => {
  const result = normalizeEnquiry({ ...validEnquiry, customer_name: '  Priya S  ', message: ' Need a ring ' });

  assert.equal(result.error, undefined);
  assert.equal(result.enquiry.customer_name, 'Priya S');
  assert.equal(result.enquiry.message, 'Need a ring');
  assert.equal(result.enquiry.quantity, null);
  assert.equal(result.enquiry.whatsapp_confirmation, true);
});

test('rejects invalid enquiry contact, status, priority, type, dates, and measurements', () => {
  for (const [field, value] of Object.entries({
    customer_name: ' ',
    phone: '',
    email: 'not-an-email',
    enquiry_type: 'Unknown',
    status: 'Unknown',
    priority: 'Urgent',
    follow_up_date: '2026-02-30',
    follow_up_time: '25:00',
    weight: '-1',
    approx_budget: 'not-a-number'
  })) {
    assert.ok(normalizeEnquiry({ ...validEnquiry, [field]: value }).error, `${field} should be rejected`);
  }
});

test('accepts a configured metal and purity and requires a metal for purity', () => {
  const result = normalizeEnquiry({ ...validEnquiry, metal_type: 'Gold', purity: '916' });
  assert.equal(result.error, undefined);
  assert.equal(result.enquiry.metal_type, 'Gold');
  assert.equal(result.enquiry.purity, '916');
  assert.equal(result.enquiry.daily_rate, null);

  assert.match(normalizeEnquiry({ ...validEnquiry, purity: '916' }).error, /metal type/i);
  assert.match(normalizeEnquiry({ ...validEnquiry, metal_type: 'Copper' }).error, /metal type/i);
});

test('maps gold karat selections to their configured daily-rate purities', () => {
  assert.equal(purityForRate('24K', 'Gold'), '999');
  assert.equal(purityForRate('22K', 'Gold'), '916');
  assert.equal(purityForRate('20K', 'Gold'), '833');
  assert.equal(purityForRate('18K', 'Gold'), '750');
  assert.equal(purityForRate('14K', 'Gold'), '585');
  assert.equal(purityForRate('22K', 'Silver'), '22K');
});
