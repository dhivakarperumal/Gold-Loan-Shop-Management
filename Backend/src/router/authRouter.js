const express = require('express');
const {
  createManagedUser,
  getUsers,
  login,
  register,
  removeManagedUser,
  updateManagedUser
} = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/users', requireAdmin, getUsers);
router.post('/users', requireAdmin, createManagedUser);
router.put('/users/:id', requireAdmin, updateManagedUser);
router.delete('/users/:id', requireAdmin, removeManagedUser);

module.exports = router;
