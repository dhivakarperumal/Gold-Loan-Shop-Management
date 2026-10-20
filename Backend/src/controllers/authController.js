const {
  createAccessToken,
  createUser,
  deleteUser,
  findUserForLogin,
  listUsers,
  updateUser,
  verifyPassword
} = require('../modules/authModule');
const { parseDateRange } = require('../utils/dateRange');

const VALID_STATUSES = new Set(['Active', 'Inactive']);

function normalizeStatus(status) {
  if (status == null || status === '') return 'Active';
  const normalized = String(status).trim().toLowerCase();
  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  return null;
}

async function register(req, res, next) {
  const username = String(req.body.username || req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = req.body.password;
  const status = normalizeStatus(req.body.status);

  if (!username || !email || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      message: 'Name, email, and a password of at least 8 characters are required'
    });
  }
  if (status == null || !VALID_STATUSES.has(status)) {
    return res.status(400).json({ message: 'Status must be Active or Inactive' });
  }

  try {
    const user = await createUser({ username, email, phone, password, status });
    return res.status(201).json({ message: 'Registration successful', user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or phone number is already registered' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  const identifier = String(req.body.identifier || '').trim();
  const password = req.body.password;
  if (!identifier || typeof password !== 'string') {
    return res.status(400).json({ message: 'Email, phone, or username and password are required' });
  }

  try {
    const user = await findUserForLogin(identifier);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'This account is inactive' });
    }

    const { password_hash: passwordHash, ...publicUser } = user;
    return res.json({ user: publicUser, token: createAccessToken(user) });
  } catch (error) {
    return next(error);
  }
}

async function getUsers(req, res, next) {
  const dateRange = parseDateRange(req.query);
  if (dateRange.error) return res.status(400).json({ message: dateRange.error });
  try {
    return res.json(await listUsers(dateRange));
  } catch (error) {
    return next(error);
  }
}

async function createManagedUser(req, res, next) {
  const username = String(req.body.username || req.body.name || '').trim();
  const name = String(req.body.name || username).trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const password = req.body.password;
  const role = String(req.body.role || 'user').trim().toLowerCase();

  if (!username || !name || !email || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      message: 'Username, name, email, and a password of at least 8 characters are required'
    });
  }
  if (!['admin', 'manager', 'dealer', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, manager, dealer, or user' });
  }

  try {
    const user = await createUser({ username, email, phone, password, status: 'Active', role });
    return res.status(201).json({ message: 'Customer created successfully', user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or phone number is already registered' });
    }
    return next(error);
  }
}

async function updateManagedUser(req, res, next) {
  const userId = Number(req.params.id);
  const username = String(req.body.username || '').trim();
  const name = String(req.body.name || username).trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();
  const role = String(req.body.role || 'user').trim().toLowerCase();

  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ message: 'Customer ID is invalid' });
  }
  if (!username || !name || !email) {
    return res.status(400).json({ message: 'Username, name, and email are required' });
  }
  if (!['admin', 'manager', 'dealer', 'user'].includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, manager, dealer, or user' });
  }
  if (userId === req.adminUser.user_id && role !== req.adminUser.role) {
    return res.status(400).json({ message: 'You cannot change your own administrator role' });
  }

  try {
    const user = await updateUser(userId, { username, name, email, phone, role });
    if (!user) return res.status(404).json({ message: 'Customer not found' });
    return res.json({ message: 'Customer updated successfully', user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email or phone number is already registered' });
    }
    return next(error);
  }
}

async function removeManagedUser(req, res, next) {
  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ message: 'Customer ID is invalid' });
  }
  if (userId === req.adminUser.user_id) {
    return res.status(400).json({ message: 'You cannot delete your own administrator account' });
  }

  try {
    const deleted = await deleteUser(userId);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createManagedUser,
  getUsers,
  login,
  register,
  removeManagedUser,
  updateManagedUser
};
