const { pool } = require('../config/db');
const { insertUser } = require('./authModule');

const CUSTOMER_COLUMNS = `
  id, customer_code, user_id, customer_type, full_name, mobile, alternate_mobile,
  email, date_of_birth, gender, occupation, address, city, district, state, pincode,
  guarantor_name, guarantor_mobile, guarantor_email, guarantor_relationship, guarantor_address,
  kyc_status, photo_url, notes, created_at, updated_at
`;

async function linkExistingCustomerAccounts() {
  const [customers] = await pool.query(`
    SELECT id, full_name, mobile, email
    FROM loan_customers
    WHERE user_id IS NULL AND email IS NOT NULL AND mobile IS NOT NULL
    ORDER BY id
  `);
  let linkedCount = 0;

  for (const customer of customers) {
    const username = String(customer.full_name || '').trim();
    const email = String(customer.email || '').trim().toLowerCase();
    const phone = String(customer.mobile || '').trim();
    if (!username || username.length > 150 || !email || !phone) {
      console.error(`Could not create a user account for loan customer ${customer.id}: name, email, or mobile is invalid.`);
      continue;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [existingUsers] = await connection.execute(
        `SELECT user_id, email, phone
         FROM users
         WHERE email = ? OR phone = ? OR username = ?
         FOR UPDATE`,
        [email, phone, username]
      );
      if (existingUsers.length > 0) {
        const matchingUser = existingUsers.find((user) =>
          String(user.email || '').toLowerCase() === email && String(user.phone || '') === phone
        );
        if (!matchingUser) {
          throw new Error('an account already uses the customer name, email, or mobile');
        }
        await connection.execute(
          'UPDATE loan_customers SET user_id = ? WHERE id = ? AND user_id IS NULL',
          [matchingUser.user_id, customer.id]
        );
      } else {
        const userId = await insertUser(connection, {
          username,
          name: username,
          email,
          phone,
          password: phone,
          status: 'Active',
          role: 'user'
        });
        await connection.execute(
          'UPDATE loan_customers SET user_id = ? WHERE id = ? AND user_id IS NULL',
          [userId, customer.id]
        );
      }
      await connection.commit();
      linkedCount += 1;
    } catch (error) {
      await connection.rollback();
      console.error(`Could not link a user account to loan customer ${customer.id}: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  if (linkedCount > 0) {
    console.info(`Linked user accounts to ${linkedCount} existing loan customer record(s).`);
  }
}

async function initializeLoanCustomerModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_code VARCHAR(30) NULL UNIQUE,
      user_id INT UNSIGNED NULL UNIQUE,
      customer_type VARCHAR(20) NOT NULL DEFAULT 'Individual',
      full_name VARCHAR(150) NOT NULL,
      mobile VARCHAR(15) NOT NULL,
      alternate_mobile VARCHAR(15) NULL,
      email VARCHAR(254) NULL,
      date_of_birth DATE NULL,
      gender VARCHAR(30) NULL,
      occupation VARCHAR(100) NULL,
      address TEXT NULL,
      city VARCHAR(100) NULL,
      district VARCHAR(100) NULL,
      state VARCHAR(100) NULL,
      pincode VARCHAR(10) NULL,
      guarantor_name VARCHAR(150) NULL,
      guarantor_mobile VARCHAR(15) NULL,
      guarantor_email VARCHAR(254) NULL,
      guarantor_relationship VARCHAR(100) NULL,
      guarantor_address TEXT NULL,
      kyc_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
      photo_url TEXT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  const [customerColumns] = await pool.query('SHOW COLUMNS FROM loan_customers');
  const existingCustomerColumns = new Set(customerColumns.map((column) => column.Field));
  if (!existingCustomerColumns.has('user_id')) {
    await pool.query('ALTER TABLE loan_customers ADD COLUMN user_id INT UNSIGNED NULL UNIQUE AFTER customer_code');
  }
  const customerColumnMigrations = {
    email: 'VARCHAR(254) NULL AFTER alternate_mobile',
    guarantor_name: 'VARCHAR(150) NULL AFTER pincode',
    guarantor_mobile: 'VARCHAR(15) NULL AFTER guarantor_name',
    guarantor_email: 'VARCHAR(254) NULL AFTER guarantor_mobile',
    guarantor_relationship: 'VARCHAR(100) NULL AFTER guarantor_email',
    guarantor_address: 'TEXT NULL AFTER guarantor_relationship'
  };
  for (const [column, definition] of Object.entries(customerColumnMigrations)) {
    if (!existingCustomerColumns.has(column)) {
      await pool.query(`ALTER TABLE loan_customers ADD COLUMN \`${column}\` ${definition}`);
    }
  }
  await linkExistingCustomerAccounts();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loan_customer_documents (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL,
      document_type VARCHAR(40) NOT NULL,
      document_side VARCHAR(10) NOT NULL DEFAULT 'front',
      file_ref VARCHAR(120) NOT NULL UNIQUE,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      file_size INT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_loan_customer_documents_customer
        FOREIGN KEY (customer_id) REFERENCES loan_customers(id) ON DELETE CASCADE
    )
  `);
  const [documentColumns] = await pool.query("SHOW COLUMNS FROM loan_customer_documents LIKE 'document_side'");
  if (documentColumns.length === 0) {
    await pool.query("ALTER TABLE loan_customer_documents ADD COLUMN document_side VARCHAR(10) NOT NULL DEFAULT 'front' AFTER document_type");
  }
}

async function listLoanCustomers(search = '') {
  const term = `%${search}%`;
  const [rows] = await pool.execute(
    `SELECT ${CUSTOMER_COLUMNS}
     FROM loan_customers
     WHERE ? = '' OR CAST(id AS CHAR) LIKE ? OR customer_code LIKE ? OR full_name LIKE ? OR mobile LIKE ?
       OR alternate_mobile LIKE ? OR email LIKE ? OR city LIKE ? OR district LIKE ?
     ORDER BY created_at DESC, id DESC`,
    [search, term, term, term, term, term, term, term, term]
  );
  return rows;
}

async function getLoanCustomerById(id) {
  const [rows] = await pool.execute(
    `SELECT ${CUSTOMER_COLUMNS} FROM loan_customers WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createLoanCustomer(customer, username, password = customer.mobile) {
  const connection = await pool.getConnection();
  let id;
  try {
    await connection.beginTransaction();
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE username = ? LIMIT 1 FOR UPDATE',
      [username]
    );
    if (existingUsers.length > 0) {
      const error = new Error('Username is already registered');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    const userId = await insertUser(connection, {
      username,
      name: customer.full_name,
      email: customer.email.toLowerCase(),
      phone: customer.mobile,
      password,
      status: 'Active',
      role: 'user'
    });
    const fields = ['user_id', ...Object.keys(customer)];
    const [result] = await connection.execute(
      `INSERT INTO loan_customers (${fields.map((field) => `\`${field}\``).join(', ')})
       VALUES (${fields.map(() => '?').join(', ')})`,
      fields.map((field) => field === 'user_id' ? userId : customer[field])
    );
    id = result.insertId;
    const customerCode = `CUS-${String(id).padStart(6, '0')}`;
    await connection.execute(
      'UPDATE loan_customers SET customer_code = ? WHERE id = ?',
      [customerCode, id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getLoanCustomerById(id);
}

async function updateLoanCustomer(id, customer) {
  const fields = Object.keys(customer);
  await pool.execute(
    `UPDATE loan_customers SET ${fields.map((field) => `\`${field}\` = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((field) => customer[field]), id]
  );
  return getLoanCustomerById(id);
}

async function deleteLoanCustomer(id) {
  const [result] = await pool.execute('DELETE FROM loan_customers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function listLoanCustomerDocuments(customerId) {
  const [rows] = await pool.execute(
    `SELECT id, customer_id, document_type, document_side, file_ref, original_name, mime_type, file_size, created_at
     FROM loan_customer_documents WHERE customer_id = ? ORDER BY created_at DESC, id DESC`,
    [customerId]
  );
  return rows;
}

async function getLoanCustomerDocumentById(id) {
  const [rows] = await pool.execute(
    `SELECT id, customer_id, document_type, document_side, file_ref, original_name, mime_type, file_size, created_at
     FROM loan_customer_documents WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function getLoanCustomerDocumentByRef(fileRef) {
  const [rows] = await pool.execute(
    `SELECT id, customer_id, document_type, document_side, file_ref, original_name, mime_type, file_size, created_at
     FROM loan_customer_documents WHERE file_ref = ?`,
    [fileRef]
  );
  return rows[0] || null;
}

async function addLoanCustomerDocuments(customerId, documents) {
  const connection = await pool.getConnection();
  const replacedDocuments = [];
  try {
    await connection.beginTransaction();
    for (const document of documents) {
      const [existing] = await connection.execute(
        `SELECT file_ref FROM loan_customer_documents
         WHERE customer_id = ? AND document_type = ? AND document_side = ?`,
        [customerId, document.document_type, document.document_side]
      );
      replacedDocuments.push(...existing);
      await connection.execute(
        `DELETE FROM loan_customer_documents
         WHERE customer_id = ? AND document_type = ? AND document_side = ?`,
        [customerId, document.document_type, document.document_side]
      );
      await connection.execute(
        `INSERT INTO loan_customer_documents
          (customer_id, document_type, document_side, file_ref, original_name, mime_type, file_size)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          customerId, document.document_type, document.document_side, document.file_ref,
          document.original_name, document.mime_type, document.file_size
        ]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return {
    documents: await listLoanCustomerDocuments(customerId),
    replacedDocuments
  };
}

async function deleteLoanCustomerDocument(id) {
  const [result] = await pool.execute('DELETE FROM loan_customer_documents WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  addLoanCustomerDocuments,
  createLoanCustomer,
  deleteLoanCustomer,
  deleteLoanCustomerDocument,
  getLoanCustomerDocumentById,
  getLoanCustomerDocumentByRef,
  getLoanCustomerById,
  initializeLoanCustomerModule,
  listLoanCustomerDocuments,
  listLoanCustomers,
  updateLoanCustomer
};
