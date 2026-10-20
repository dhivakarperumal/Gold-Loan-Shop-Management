const assert = require('node:assert/strict');
const test = require('node:test');
const { pool } = require('../src/config/db');
const {
  allocateLoanDisbursement,
  createLoan
} = require('../src/modules/loanModule');

function fakeConnection({ balances = ['40.00', '30.00'], failOnFundInsert = 0, replayLoanId = null } = {}) {
  const state = { committed: false, rolledBack: false, released: false, fundInserts: 0, statements: [] };
  const loan = { id: replayLoanId || 25, loan_number: 'GL-20261020-000025', principal_amount: '50.00' };
  const connection = {
    async beginTransaction() {},
    async commit() { state.committed = true; },
    async rollback() { state.rolledBack = true; },
    release() { state.released = true; },
    async query(sql) {
      state.statements.push(sql);
      if (sql.includes('CURRENT_TIMESTAMP()')) return [[{ transaction_date: '2026-10-20 10:00:00' }]];
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, params = []) {
      state.statements.push(sql);
      if (sql.includes('FROM loan_customers WHERE id = ?')) return [[{ id: 1, full_name: 'Test Customer' }]];
      if (sql.includes('FROM interest_types WHERE type_key = ?')) return [[{ enabled: 1 }]];
      if (sql.includes('SELECT id FROM fund_accounts ORDER BY id FOR UPDATE')) {
        return [balances.map((_, index) => ({ id: index + 1 }))];
      }
      if (sql.includes('SELECT related_reference FROM fund_transactions')) {
        return [replayLoanId ? [{ related_reference: String(replayLoanId) }] : []];
      }
      if (sql.includes('FROM fund_accounts a')) {
        const accountId = Number(params[0]);
        return [[{ balance: balances[accountId - 1] }]];
      }
      if (sql.startsWith('INSERT INTO loans')) return [{ insertId: loan.id }];
      if (sql.startsWith('UPDATE loans SET loan_number')) return [{ affectedRows: 1 }];
      if (sql.startsWith('INSERT INTO fund_transactions')) {
        state.fundInserts += 1;
        if (failOnFundInsert === state.fundInserts) throw new Error('Simulated fund ledger failure');
        return [{ insertId: state.fundInserts }];
      }
      if (sql.includes('FROM loans l JOIN loan_customers c')) return [[loan]];
      throw new Error(`Unexpected statement: ${sql}`);
    }
  };
  return { connection, state };
}

function createConcurrentPool(shared) {
  return {
    async getConnection() {
      const local = { fundTransactions: [], loan: null, unlock: null };
      return {
        async beginTransaction() {},
        async commit() {
          shared.balance -= local.fundTransactions.reduce((sum, entry) => sum + entry.amount, 0);
          shared.fundTransactions.push(...local.fundTransactions);
          if (local.loan) shared.loans.set(local.loan.id, local.loan);
          local.unlock?.();
        },
        async rollback() { local.unlock?.(); },
        release() {},
        async query(sql) {
          if (sql.includes('CURRENT_TIMESTAMP()')) return [[{ transaction_date: '2026-10-20 10:00:00' }]];
          throw new Error(`Unexpected query: ${sql}`);
        },
        async execute(sql, params = []) {
          if (sql.includes('FROM loan_customers WHERE id = ?')) return [[{ id: 1, full_name: 'Test Customer' }]];
          if (sql.includes('FROM interest_types WHERE type_key = ?')) return [[{ enabled: 1 }]];
          if (sql.includes('SELECT id FROM fund_accounts ORDER BY id FOR UPDATE')) {
            const previous = shared.accountLock;
            shared.accountLock = new Promise((resolve) => { local.unlock = resolve; });
            await previous;
            return [[{ id: 1 }]];
          }
          if (sql.includes('SELECT related_reference FROM fund_transactions')) {
            const keyPrefix = params[0].slice(0, -1);
            const transaction = shared.fundTransactions.find((entry) => entry.idempotency_key.startsWith(keyPrefix));
            return [transaction ? [{ related_reference: transaction.related_reference }] : []];
          }
          if (sql.includes('FROM fund_accounts a')) return [[{ balance: shared.balance.toFixed(2) }]];
          if (sql.startsWith('INSERT INTO loans')) {
            local.loan = { id: ++shared.nextLoanId, loan_number: '' };
            return [{ insertId: local.loan.id }];
          }
          if (sql.startsWith('UPDATE loans SET loan_number')) {
            local.loan.loan_number = params[0];
            return [{ affectedRows: 1 }];
          }
          if (sql.startsWith('INSERT INTO fund_transactions')) {
            local.fundTransactions.push({
              amount: Number(params[4]),
              related_reference: params[6],
              idempotency_key: params[11]
            });
            return [{ insertId: local.fundTransactions.length }];
          }
          if (sql.includes('FROM loans l JOIN loan_customers c')) {
            const loanId = Number(params[0]);
            return [[local.loan?.id === loanId ? local.loan : shared.loans.get(loanId)].filter(Boolean)];
          }
          throw new Error(`Unexpected statement: ${sql}`);
        }
      };
    }
  };
}

test('allocates a loan smaller than the available balance', () => {
  assert.deepEqual(
    allocateLoanDisbursement('25.00', [{ id: 1, balance: '100.00' }]),
    [{ account_id: 1, amount: '25.00' }]
  );
});

test('allows a loan equal to total available funds', () => {
  assert.deepEqual(
    allocateLoanDisbursement('70.00', [{ id: 1, balance: '40.00' }, { id: 2, balance: '30.00' }]),
    [{ account_id: 1, amount: '40.00' }, { account_id: 2, amount: '30.00' }]
  );
});

test('rejects a loan greater than available funds', () => {
  assert.throws(
    () => allocateLoanDisbursement('70.01', [{ id: 1, balance: '40.00' }, { id: 2, balance: '30.00' }]),
    (error) => error.code === 'INSUFFICIENT_FUNDS' && error.available_balance === '70.00'
  );
});

test('rejects a positive loan when available funds are zero', () => {
  assert.throws(
    () => allocateLoanDisbursement('0.01', [{ id: 1, balance: '0.00' }]),
    (error) => error.code === 'INSUFFICIENT_FUNDS' && error.available_balance === '0.00'
  );
});

test('rejects zero, negative, empty, and invalid loan amounts', () => {
  for (const amount of [0, -1, '', 'invalid', NaN]) {
    assert.throws(() => allocateLoanDisbursement(amount, [{ id: 1, balance: '100.00' }]), {
      code: 'INVALID_LOAN_AMOUNT'
    });
  }
});

test('rolls back loan creation when recording a split fund debit fails', async (context) => {
  const originalGetConnection = pool.getConnection;
  const { connection, state } = fakeConnection({ failOnFundInsert: 2 });
  pool.getConnection = async () => connection;
  context.after(() => { pool.getConnection = originalGetConnection; });

  await assert.rejects(createLoan({
    customer_id: '1',
    interest_type: 'simple',
    loan_date: '2026-10-20',
    principal_amount: '50.0000',
    created_by: 7
  }, { idempotencyKey: 'test-request-key' }), /Simulated fund ledger failure/);

  assert.equal(state.fundInserts, 2);
  assert.equal(state.committed, false);
  assert.equal(state.rolledBack, true);
  assert.equal(state.released, true);
});

test('returns the existing loan for a repeated idempotency key', async (context) => {
  const originalGetConnection = pool.getConnection;
  const { connection, state } = fakeConnection({ replayLoanId: 25 });
  pool.getConnection = async () => connection;
  context.after(() => { pool.getConnection = originalGetConnection; });

  const loan = await createLoan({
    customer_id: '1',
    interest_type: 'simple',
    loan_date: '2026-10-20',
    principal_amount: '50.0000',
    created_by: 7
  }, { idempotencyKey: 'test-request-key' });

  assert.equal(loan.id, 25);
  assert.equal(state.fundInserts, 0);
  assert.equal(state.committed, true);
  const accountLockIndex = state.statements.findIndex((sql) => sql.includes('ORDER BY id FOR UPDATE'));
  const idempotencyCheckIndex = state.statements.findIndex((sql) => sql.includes('SELECT related_reference FROM fund_transactions'));
  assert.ok(accountLockIndex >= 0);
  assert.ok(idempotencyCheckIndex > accountLockIndex);
});

test('serializes concurrent loans so they cannot spend the same available funds', async (context) => {
  const originalGetConnection = pool.getConnection;
  const shared = {
    accountLock: Promise.resolve(),
    balance: 100,
    fundTransactions: [],
    loans: new Map(),
    nextLoanId: 0
  };
  pool.getConnection = createConcurrentPool(shared).getConnection;
  context.after(() => { pool.getConnection = originalGetConnection; });
  const loan = {
    customer_id: '1',
    interest_type: 'simple',
    loan_date: '2026-10-20',
    principal_amount: '60.00',
    created_by: 7
  };

  const results = await Promise.allSettled([
    createLoan(loan, { idempotencyKey: '00000000-0000-4000-8000-000000000001' }),
    createLoan(loan, { idempotencyKey: '00000000-0000-4000-8000-000000000002' })
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'INSUFFICIENT_FUNDS').length, 1);
  assert.equal(shared.balance, 40);
  assert.equal(shared.loans.size, 1);
  assert.equal(shared.fundTransactions.reduce((sum, entry) => sum + entry.amount, 0), 60);
});
