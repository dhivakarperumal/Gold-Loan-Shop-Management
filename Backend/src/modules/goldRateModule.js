const crypto = require('node:crypto');
const { pool } = require('../config/db');

const RATE_SPECS = [
  { key: 'gold_999', metal_type: 'Gold', purity: '999', rate_unit: 'gram' },
  { key: 'gold_916', metal_type: 'Gold', purity: '916', rate_unit: 'gram' },
  { key: 'gold_833', metal_type: 'Gold', purity: '833', rate_unit: 'gram' },
  { key: 'gold_750', metal_type: 'Gold', purity: '750', rate_unit: 'gram' },
  { key: 'gold_585', metal_type: 'Gold', purity: '585', rate_unit: 'gram' },
  { key: 'silver_999', metal_type: 'Silver', purity: '999', rate_unit: 'gram' },
  { key: 'platinum_950', metal_type: 'Platinum', purity: '950', rate_unit: 'gram' },
  { key: 'platinum_900', metal_type: 'Platinum', purity: '900', rate_unit: 'gram' },
  { key: 'diamond_df_vvs', metal_type: 'Diamond', purity: 'D-F / VVS', rate_unit: 'carat' },
  { key: 'diamond_gh_vs', metal_type: 'Diamond', purity: 'G-H / VS', rate_unit: 'carat' },
  { key: 'diamond_ij_si', metal_type: 'Diamond', purity: 'I-J / SI', rate_unit: 'carat' }
];

async function initializeGoldRateModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gold_rates (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_id CHAR(36) NOT NULL,
      rate_date DATE NOT NULL,
      metal_type ENUM('Gold', 'Silver', 'Platinum', 'Diamond') NOT NULL,
      purity VARCHAR(20) NOT NULL,
      rate_per_gram DECIMAL(14,2) NOT NULL,
      rate_unit ENUM('gram', 'carat') NOT NULL DEFAULT 'gram',
      making_charge_type ENUM('Percentage', 'Fixed Amount') NOT NULL DEFAULT 'Percentage',
      making_charge_value DECIMAL(12,4) NOT NULL DEFAULT 0,
      wastage_percentage DECIMAL(9,4) NOT NULL DEFAULT 0,
      status ENUM('Draft', 'Active', 'Archived') NOT NULL DEFAULT 'Draft',
      effective_from DATETIME NOT NULL,
      updated_by BIGINT UNSIGNED NOT NULL,
      version INT UNSIGNED NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_gold_rates_batch_metal_purity (batch_id, metal_type, purity),
      INDEX idx_gold_rates_current (status, effective_from),
      INDEX idx_gold_rates_rate_date (rate_date)
    )
  `);
  const [rateColumns] = await pool.query('SHOW COLUMNS FROM gold_rates');
  const metalTypeColumn = rateColumns.find((column) => column.Field === 'metal_type');
  if (!String(metalTypeColumn?.Type || '').includes("'Platinum'")
    || !String(metalTypeColumn?.Type || '').includes("'Diamond'")) {
    await pool.query("ALTER TABLE gold_rates MODIFY metal_type ENUM('Gold', 'Silver', 'Platinum', 'Diamond') NOT NULL");
  }
  if (!rateColumns.some((column) => column.Field === 'version')) {
    await pool.query('ALTER TABLE gold_rates ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1 AFTER updated_by');
  }
  if (!rateColumns.some((column) => column.Field === 'rate_unit')) {
    await pool.query("ALTER TABLE gold_rates ADD COLUMN rate_unit ENUM('gram', 'carat') NOT NULL DEFAULT 'gram' AFTER rate_per_gram");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gold_rate_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      batch_id CHAR(36) NOT NULL,
      rate_id BIGINT UNSIGNED NULL,
      metal_type VARCHAR(20) NOT NULL,
      purity VARCHAR(20) NOT NULL,
      rate_unit ENUM('gram', 'carat') NOT NULL DEFAULT 'gram',
      previous_rate DECIMAL(14,2) NULL,
      new_rate DECIMAL(14,2) NULL,
      action VARCHAR(20) NOT NULL,
      reason VARCHAR(500) NOT NULL,
      changed_by BIGINT UNSIGNED NOT NULL,
      changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gold_rate_history_batch (batch_id, changed_at),
      INDEX idx_gold_rate_history_changed_at (changed_at)
    )
  `);
  const [historyColumns] = await pool.query('SHOW COLUMNS FROM gold_rate_history');
  if (!historyColumns.some((column) => column.Field === 'rate_unit')) {
    await pool.query("ALTER TABLE gold_rate_history ADD COLUMN rate_unit ENUM('gram', 'carat') NOT NULL DEFAULT 'gram' AFTER purity");
  }
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    let batch = groups.get(row.batch_id);
    if (!batch) {
      batch = {
        id: Number(row.batch_first_id || row.id),
        batch_id: row.batch_id,
        rate_date: row.rate_date_display,
        making_charge_type: row.making_charge_type,
        making_charge_value: Number(row.making_charge_value),
        wastage_percentage: Number(row.wastage_percentage),
        effective_from: row.effective_from_utc,
        status: row.status,
        updated_by: row.updated_by,
        updated_by_name: row.updated_by_name,
        updated_at: row.updated_at,
        version: Number(row.version),
        created_at: row.created_at,
        rates: []
      };
      groups.set(row.batch_id, batch);
    }
    batch.rates.push({
      id: Number(row.id),
      metal_type: row.metal_type,
      purity: row.purity,
      rate_per_gram: Number(row.rate_per_gram),
      rate_per_unit: Number(row.rate_per_gram),
      rate_unit: row.rate_unit || 'gram'
    });
  }
  return [...groups.values()];
}

const RATE_SELECT = `
  SELECT r.*, u.username AS updated_by_name,
    DATE_FORMAT(r.rate_date, '%Y-%m-%d') AS rate_date_display,
    DATE_FORMAT(r.effective_from, '%Y-%m-%dT%H:%i:%s.000Z') AS effective_from_utc,
    (SELECT MIN(first_row.id) FROM gold_rates first_row WHERE first_row.batch_id = r.batch_id) AS batch_first_id
  FROM gold_rates r LEFT JOIN users u ON u.user_id = r.updated_by
`;

async function listRateBatches({ status, limit = 100 } = {}) {
  const params = [];
  const where = status ? 'WHERE r.status = ?' : '';
  if (status) params.push(status);
  const [rows] = await pool.execute(
    `${RATE_SELECT} ${where} ORDER BY rate_date DESC, created_at DESC, id`,
    params
  );
  return groupRows(rows).slice(0, limit);
}

async function getCurrentGoldRates() {
  const [rows] = await pool.query(`
    ${RATE_SELECT}
    WHERE r.status = 'Active' AND r.effective_from <= UTC_TIMESTAMP()
    ORDER BY r.effective_from DESC, r.created_at DESC, r.id DESC
  `);
  const batches = groupRows(rows);
  return batches[0] || null;
}

function findGoldRateForPurity(current, purity, metalType = 'Gold') {
  if (!current) return null;
  const text = String(purity || '').toLowerCase();
  const exactRate = current.rates.find((rate) => (
    rate.metal_type.toLowerCase() === String(metalType).toLowerCase()
    && rate.purity.toLowerCase() === text
  ));
  if (exactRate) return exactRate;
  const purityDigits = text.match(/\d{3}/)?.[0] || ({
    '24k': '999', '22k': '916', '20k': '833', '18k': '750', '14k': '585'
  })[text.match(/\d{2}k/)?.[0]];
  return current.rates.find((rate) => (
    rate.metal_type.toLowerCase() === String(metalType).toLowerCase()
    && rate.purity === purityDigits
  )) || null;
}

async function recordHistory(connection, { batchId, rateId, metalType, purity, rateUnit = 'gram', previousRate, newRate, action, reason, userId }) {
  await connection.execute(
    `INSERT INTO gold_rate_history
      (batch_id, rate_id, metal_type, purity, rate_unit, previous_rate, new_rate, action, reason, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [batchId, rateId, metalType, purity, rateUnit, previousRate, newRate, action, reason, userId]
  );
}

async function createRateBatch(batch, userId) {
  const connection = await pool.getConnection();
  const batchId = crypto.randomUUID();
  try {
    await connection.beginTransaction();
    for (const spec of RATE_SPECS) {
      const ratePerGram = batch.rates[spec.key];
      const [result] = await connection.execute(
        `INSERT INTO gold_rates
          (batch_id, rate_date, metal_type, purity, rate_per_gram, rate_unit, making_charge_type,
           making_charge_value, wastage_percentage, status, effective_from, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?)`,
        [
          batchId, batch.rate_date, spec.metal_type, spec.purity, ratePerGram, spec.rate_unit,
          batch.making_charge_type, batch.making_charge_value, batch.wastage_percentage,
          batch.effective_from, userId
        ]
      );
      await recordHistory(connection, {
        batchId, rateId: result.insertId, metalType: spec.metal_type, purity: spec.purity, rateUnit: spec.rate_unit,
        previousRate: null, newRate: ratePerGram, action: 'Created',
        reason: batch.reason, userId
      });
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getRateBatchById(batchId);
}

async function getRateBatchById(id, connection = pool) {
  const [rows] = await connection.execute(
    `${RATE_SELECT} WHERE r.batch_id = ? OR r.id = ? ORDER BY r.id`,
    [String(id), String(id)]
  );
  return groupRows(rows)[0] || null;
}

async function getRateBatchRowsForUpdate(batchId, connection) {
  const [rows] = await connection.execute(`
    SELECT r.*, u.username AS updated_by_name,
      DATE_FORMAT(r.rate_date, '%Y-%m-%d') AS rate_date_display,
      DATE_FORMAT(r.effective_from, '%Y-%m-%dT%H:%i:%s.000Z') AS effective_from_utc,
      (SELECT MIN(first_row.id) FROM gold_rates first_row WHERE first_row.batch_id = r.batch_id) AS batch_first_id
    FROM gold_rates r LEFT JOIN users u ON u.user_id = r.updated_by
    WHERE r.batch_id = ? ORDER BY r.id FOR UPDATE
  `, [batchId]);
  return rows;
}

async function updateRateBatch(id, batch, userId, expectedVersion) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existing = await getRateBatchById(id, connection);
    if (!existing) {
      await connection.rollback();
      return { error: 'NOT_FOUND' };
    }
    const lockedRows = await getRateBatchRowsForUpdate(existing.batch_id, connection);
    const lockedBatch = groupRows(lockedRows)[0];
    if (!lockedBatch) {
      await connection.rollback();
      return { error: 'NOT_FOUND' };
    }
    if (lockedBatch.status !== 'Draft' || lockedRows.some((row) => row.status !== 'Draft')) {
      await connection.rollback();
      return { error: 'NOT_DRAFT' };
    }
    if (expectedVersion != null && Number(expectedVersion) !== lockedBatch.version) {
      await connection.rollback();
      return { error: 'CONFLICT' };
    }
    const existingRateDate = String(existing.rate_date).slice(0, 10);
    const existingEffectiveFrom = String(existing.effective_from).replace(' ', 'T').slice(0, 19);
    const nextEffectiveFrom = batch.effective_from.replace(' ', 'T').slice(0, 19);
    const settingsChanged = existingRateDate !== batch.rate_date
      || existing.making_charge_type !== batch.making_charge_type
      || Number(existing.making_charge_value) !== batch.making_charge_value
      || Number(existing.wastage_percentage) !== batch.wastage_percentage
      || existingEffectiveFrom !== nextEffectiveFrom;
    await connection.execute(
      `UPDATE gold_rates SET rate_date = ?, making_charge_type = ?, making_charge_value = ?,
        wastage_percentage = ?, effective_from = ?, updated_by = ?, version = version + 1 WHERE batch_id = ?`,
      [batch.rate_date, batch.making_charge_type, batch.making_charge_value, batch.wastage_percentage, batch.effective_from, userId, existing.batch_id]
    );
    const existingRates = new Map(lockedRows.map((row) => [`${row.metal_type}:${row.purity}`, row]));
    for (const spec of RATE_SPECS) {
      const row = existingRates.get(`${spec.metal_type}:${spec.purity}`);
      const newRate = batch.rates[spec.key];
      if (!row) {
        const [result] = await connection.execute(
          `INSERT INTO gold_rates
            (batch_id, rate_date, metal_type, purity, rate_per_gram, rate_unit, making_charge_type,
             making_charge_value, wastage_percentage, status, effective_from, updated_by, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?)`,
          [
            existing.batch_id, batch.rate_date, spec.metal_type, spec.purity, newRate, spec.rate_unit,
            batch.making_charge_type, batch.making_charge_value, batch.wastage_percentage,
            batch.effective_from, userId, lockedBatch.version + 1
          ]
        );
        await recordHistory(connection, {
          batchId: existing.batch_id, rateId: result.insertId, metalType: spec.metal_type, purity: spec.purity,
          rateUnit: spec.rate_unit, previousRate: null, newRate, action: 'Created',
          reason: batch.reason, userId
        });
        continue;
      }
      if (Number(row.rate_per_gram) !== newRate || settingsChanged) {
        await recordHistory(connection, {
          batchId: existing.batch_id, rateId: row.id, metalType: row.metal_type, purity: row.purity,
          rateUnit: row.rate_unit || spec.rate_unit,
          previousRate: row.rate_per_gram, newRate, action: 'Updated',
          reason: batch.reason, userId
        });
      }
      await connection.execute(
        'UPDATE gold_rates SET rate_per_gram = ?, rate_unit = ? WHERE id = ?',
        [newRate, spec.rate_unit, row.id]
      );
    }
    await connection.execute('UPDATE gold_rates SET version = ? WHERE batch_id = ?', [lockedBatch.version + 1, existing.batch_id]);
    await connection.commit();
    return { batch: await getRateBatchById(existing.batch_id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function activateRateBatch(id, reason, userId) {
  const connection = await pool.getConnection();
  let lockAcquired = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('global_gold_rate_activation', 10) AS acquired");
    if (Number(lock.acquired) !== 1) {
      const error = new Error('Could not acquire the gold-rate activation lock');
      error.code = 'RATE_LOCK_TIMEOUT';
      throw error;
    }
    lockAcquired = true;
    await connection.beginTransaction();
    let batch = await getRateBatchById(id, connection);
    if (!batch) {
      await connection.rollback();
      return { error: 'NOT_FOUND' };
    }
    const draftRows = await getRateBatchRowsForUpdate(batch.batch_id, connection);
    batch = groupRows(draftRows)[0];
    if (!batch) {
      await connection.rollback();
      return { error: 'NOT_FOUND' };
    }
    if (batch.status !== 'Draft' || batch.rates.length !== RATE_SPECS.length
      || draftRows.length !== RATE_SPECS.length || draftRows.some((row) => row.status !== 'Draft')) {
      await connection.rollback();
      return { error: 'NOT_DRAFT' };
    }
    const [activeRows] = await connection.execute(
      `SELECT id, batch_id, metal_type, purity, rate_per_gram, rate_unit
       FROM gold_rates WHERE status = 'Active' AND effective_from <= UTC_TIMESTAMP() FOR UPDATE`
    );
    for (const row of activeRows) {
      await recordHistory(connection, {
        batchId: row.batch_id, rateId: row.id, metalType: row.metal_type, purity: row.purity,
        rateUnit: row.rate_unit || 'gram',
        previousRate: row.rate_per_gram, newRate: row.rate_per_gram, action: 'Archived',
        reason, userId
      });
    }
    await connection.execute(
      `UPDATE gold_rates SET status = 'Archived', updated_by = ?
       WHERE status = 'Active' AND effective_from <= UTC_TIMESTAMP()`,
      [userId]
    );
    await connection.execute(
      `UPDATE gold_rates SET status = 'Active', updated_by = ? WHERE batch_id = ?`,
      [userId, batch.batch_id]
    );
    for (const row of batch.rates) {
      await recordHistory(connection, {
        batchId: batch.batch_id, rateId: row.id, metalType: row.metal_type, purity: row.purity,
        rateUnit: row.rate_unit || 'gram',
        previousRate: null, newRate: row.rate_per_gram, action: 'Activated', reason, userId
      });
    }
    await connection.commit();
    return { batch: await getRateBatchById(batch.batch_id) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    try {
      if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('global_gold_rate_activation')");
    } finally {
      connection.release();
    }
  }
}

async function listRateHistory({ limit = 250 } = {}) {
  const [rows] = await pool.execute(
    `SELECT h.id, h.batch_id, h.rate_id, h.metal_type, h.purity, h.rate_unit, h.previous_rate,
      h.new_rate, h.action, h.reason, h.changed_by, h.changed_at, u.username AS updated_by_name
     FROM gold_rate_history h LEFT JOIN users u ON u.user_id = h.changed_by
     ORDER BY h.changed_at DESC, h.id DESC LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    ...row,
    previous_rate: row.previous_rate == null ? null : Number(row.previous_rate),
    new_rate: row.new_rate == null ? null : Number(row.new_rate)
  }));
}

module.exports = {
  RATE_SPECS,
  activateRateBatch,
  createRateBatch,
  getCurrentGoldRates,
  getRateBatchById,
  findGoldRateForPurity,
  initializeGoldRateModule,
  listRateBatches,
  listRateHistory,
  updateRateBatch
};
