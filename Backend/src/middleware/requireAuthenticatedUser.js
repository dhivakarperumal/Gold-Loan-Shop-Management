const jwt = require('jsonwebtoken');
const { getUserById } = require('../modules/authModule');

async function requireAuthenticatedUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!token) return res.status(401).json({ message: 'Authentication is required' });
  if (!process.env.JWT_SECRET) return next(new Error('JWT_SECRET is required to verify sessions'));

  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or expired' });
  }

  try {
    const user = await getUserById(claims.user_id);
    if (!user || user.status !== 'Active') {
      return res.status(401).json({ message: 'Your account is unavailable' });
    }
    if (user.role !== 'user') {
      return res.status(403).json({ message: 'Customer access is required' });
    }
    req.authenticatedUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireAuthenticatedUser;
