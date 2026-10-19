const jwt = require('jsonwebtoken');
const { getUserById } = require('../modules/authModule');

async function requireUser(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';
  if (!token) return res.status(401).json({ message: 'Authentication is required' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is required to verify user sessions'));

  let claims;
  try {
    claims = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or expired' });
  }

  try {
    const user = await getUserById(claims.user_id);
    if (!user || user.status !== 'Active') {
      return res.status(401).json({ message: 'Your account is unavailable' });
    }
    req.storeUser = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = requireUser;
