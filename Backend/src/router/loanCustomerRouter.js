const express = require('express');
const {
  getCustomers,
  getCustomerById,
  getCustomerDocument,
  getCustomerDocuments,
  getCustomerPhoto,
  postCustomer,
  postCustomerDocuments,
  postCustomerPhoto,
  putCustomer,
  verifyCustomerKyc,
  removeCustomerDocument,
  removeCustomer
} = require('../controllers/loanCustomerController');
const requireAdmin = require('../middleware/requireAdmin');
const {
  uploadLoanCustomerDocuments,
  uploadLoanCustomerPhoto
} = require('../middleware/loanCustomerPhotoUpload');

const router = express.Router();

router.use(requireAdmin);
router.post('/photos', (req, res, next) => {
  uploadLoanCustomerPhoto.single('photo')(req, res, (error) => {
    if (!error) return next();
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message });
  });
}, postCustomerPhoto);
router.get('/photos/:filename', getCustomerPhoto);
router.get('/documents/:filename', getCustomerDocument);
router.get('/:id/documents', getCustomerDocuments);
router.post('/:id/documents', (req, res, next) => {
  uploadLoanCustomerDocuments.array('documents', 10)(req, res, (error) => {
    if (!error) return next();
    const files = req.files || [];
    Promise.all(files.map((file) => require('node:fs').promises.unlink(file.path).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') throw cleanupError;
    })))
      .then(() => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message }))
      .catch(next);
  });
}, postCustomerDocuments);
router.delete('/:id/documents/:documentId', removeCustomerDocument);
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', postCustomer);
router.put('/:id', putCustomer);
router.patch('/:id/verify-kyc', verifyCustomerKyc);
router.delete('/:id', removeCustomer);

module.exports = router;
