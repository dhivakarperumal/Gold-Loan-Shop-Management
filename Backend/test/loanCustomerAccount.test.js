const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { insertUser } = require('../src/modules/authModule');
const { normalizeCustomer, normalizeCustomerUsername } = require('../src/controllers/loanCustomerController');

test('allows customer email and guarantor address to be omitted', () => {
  const { customer, error } = normalizeCustomer({
    full_name: 'Gold Customer',
    mobile: '9876543210',
    gender: 'Female',
    address: 'Customer address',
    city: 'Chennai',
    district: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    guarantor_name: 'Guarantor Name',
    guarantor_mobile: '9876543211',
    guarantor_relationship: 'Parent',
    photo_url: '/api/loan-customers/photos/27d248e2-50a3-4f3b-aba8-6735bafb40a3.jpg'
  });

  assert.equal(error, undefined);
  assert.equal(customer.email, null);
  assert.equal(customer.guarantor_address, null);
});

test('requires a customer photo', () => {
  const { error } = normalizeCustomer({
    full_name: 'Gold Customer',
    mobile: '9876543210'
  });

  assert.equal(error, 'Customer photo is required');
});

test('requires a non-empty customer account username', () => {
  assert.deepEqual(normalizeCustomerUsername('  '), { error: 'Username is required' });
  assert.deepEqual(normalizeCustomerUsername(null), { error: 'Username is required' });
});

test('trims customer account usernames and enforces the full-name limit', () => {
  assert.deepEqual(normalizeCustomerUsername('  gold.customer  '), { username: 'gold.customer' });
  assert.deepEqual(normalizeCustomerUsername('u'.repeat(151)), {
    error: 'Username must be 150 characters or fewer'
  });
});

test('uses the customer full name as the login username', () => {
  assert.deepEqual(normalizeCustomerUsername('  Full Name  '), { username: 'Full Name' });
});

test('creates an active customer user with a bcrypt-hashed password', async () => {
  let insertedValues;
  const connection = {
    async execute(_query, values) {
      insertedValues = values;
      return [{ insertId: 14 }];
    }
  };

  const userId = await insertUser(connection, {
    username: 'gold.customer',
    name: 'Gold Customer',
    email: 'customer@example.com',
    phone: '9876543210',
    password: 'customer-pass-123',
    status: 'Active',
    role: 'user'
  });

  assert.equal(userId, 14);
  assert.equal(insertedValues[0], 'gold.customer');
  assert.equal(insertedValues[1], 'Gold Customer');
  assert.equal(insertedValues[2], 'customer@example.com');
  assert.equal(insertedValues[3], '9876543210');
  assert.equal(await bcrypt.compare('customer-pass-123', insertedValues[4]), true);
  assert.equal(insertedValues[5], 'user');
  assert.equal(insertedValues[6], 'Active');
});
