const assert = require('node:assert/strict');
const test = require('node:test');
const bcrypt = require('bcryptjs');
const { insertUser } = require('../src/modules/authModule');
const { normalizeCustomerUsername } = require('../src/controllers/loanCustomerController');

test('requires a non-empty customer account username', () => {
  assert.deepEqual(normalizeCustomerUsername('  '), { error: 'Username is required' });
  assert.deepEqual(normalizeCustomerUsername(null), { error: 'Username is required' });
});

test('trims customer account usernames and enforces the users table limit', () => {
  assert.deepEqual(normalizeCustomerUsername('  gold.customer  '), { username: 'gold.customer' });
  assert.deepEqual(normalizeCustomerUsername('u'.repeat(101)), {
    error: 'Username must be 100 characters or fewer'
  });
});

test('creates an active customer user with a bcrypt-hashed mobile password', async () => {
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
    password: '9876543210',
    status: 'Active',
    role: 'user'
  });

  assert.equal(userId, 14);
  assert.equal(insertedValues[0], 'gold.customer');
  assert.equal(insertedValues[1], 'Gold Customer');
  assert.equal(insertedValues[2], 'customer@example.com');
  assert.equal(insertedValues[3], '9876543210');
  assert.equal(await bcrypt.compare('9876543210', insertedValues[4]), true);
  assert.equal(insertedValues[5], 'user');
  assert.equal(insertedValues[6], 'Active');
});
