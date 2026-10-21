const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getAdminEnquiry,
  getEnquiries,
  postEnquiry,
  postPublicEnquiry,
  putEnquiry,
  putEnquiryStatus,
  removeEnquiry
} = require('../controllers/enquiryController');

const router = express.Router();
router.post('/public', postPublicEnquiry);
router.use(requireAdmin);
router.get('/admin/all', getEnquiries);
router.get('/admin/:id', getAdminEnquiry);
router.post('/', postEnquiry);
router.put('/admin/:id', putEnquiry);
router.put('/admin/:id/status', putEnquiryStatus);
router.delete('/admin/:id', removeEnquiry);

module.exports = router;
