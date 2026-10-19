const express = require('express');
const {
  getProduct,
  getProductPricing,
  getProductPriceHistory,
  getProducts,
  latestProductCode,
  postProduct,
  postRecalculatePrices,
  putProduct,
  receiveProductFiles,
  removeProduct,
  uploadProductImages,
  uploadProductMedia
} = require('../controllers/productController');
const requireAdmin = require('../middleware/requireAdmin');
const { removeProductFiles, uploadProductFiles } = require('../middleware/productUpload');

const router = express.Router();

function receiveFiles(fields) {
  return (req, res, next) => {
    uploadProductFiles.fields(fields)(req, res, (error) => {
      if (!error) return next();
      const files = Object.values(req.files || {}).flat();
      removeProductFiles(files)
        .then(() => res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message }))
        .catch(next);
    });
  };
}

router.get('/', getProducts);
router.post('/recalculate-prices', requireAdmin, postRecalculatePrices);
router.get('/latest-code', latestProductCode);
router.get('/:id/pricing', getProductPricing);
router.get('/:id/price-history', requireAdmin, getProductPriceHistory);
router.get('/:id', getProduct);
router.post('/upload', requireAdmin, receiveFiles([{ name: 'images', maxCount: 10 }]), receiveProductFiles, uploadProductImages);
router.post('/upload-media', requireAdmin, receiveFiles([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
  { name: 'size_guide_chart', maxCount: 1 },
  { name: 'certificate', maxCount: 1 }
]), receiveProductFiles, uploadProductMedia);
router.post('/', requireAdmin, postProduct);
router.put('/:id', requireAdmin, putProduct);
router.delete('/:id', requireAdmin, removeProduct);

module.exports = router;
