const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  getEnquiries,
  postEnquiry,
  putEnquiryStatus,
  removeEnquiry
} = require('../controllers/enquiryController');

const router = express.Router();
router.use(requireAdmin);
router.get('/admin/all', getEnquiries);
router.post('/', postEnquiry);
router.put('/admin/:id/status', putEnquiryStatus);
router.delete('/admin/:id', removeEnquiry);

module.exports = router;
