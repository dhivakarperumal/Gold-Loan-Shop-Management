const express = require('express');
const {
  createManagedUser,
  changeMyPassword,
  deactivateMyAccount,
  getMyProfile,
  getUsers,
  login,
  register,
  removeManagedUser,
  removeMyProfileImage,
  saveMyProfileImage,
  saveMyNotificationPreferences,
  updateMyProfile,
  updateManagedUser,
  updateManagedUserStatus
} = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');
const requireUser = require('../middleware/requireUser');
const { uploadProfileImage } = require('../middleware/profileImageUpload');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireUser, getMyProfile);
router.put('/me', requireUser, updateMyProfile);
router.put('/me/status', requireUser, deactivateMyAccount);
router.put('/me/password', requireUser, changeMyPassword);
router.put('/me/notifications', requireUser, saveMyNotificationPreferences);
router.post('/me/photo', requireUser, (req, res, next) => {
  uploadProfileImage.single('image')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, saveMyProfileImage);
router.delete('/me/photo', requireUser, removeMyProfileImage);
router.get('/users', requireAdmin, getUsers);
router.post('/users', requireAdmin, createManagedUser);
router.put('/users/:id', requireAdmin, updateManagedUser);
router.put('/users/:id/status', requireAdmin, updateManagedUserStatus);
router.delete('/users/:id', requireAdmin, removeManagedUser);

module.exports = router;
