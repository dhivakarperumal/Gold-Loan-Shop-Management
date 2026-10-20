const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const receiptDirectory = path.resolve(__dirname, '../../uploads/.private/fund-receipts');
fs.mkdirSync(receiptDirectory, { recursive: true });

const extensions = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const uploadFundReceipt = multer({
  storage: multer.diskStorage({
    destination: receiptDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensions, file.mimetype)) {
      callback(new Error('Only PDF, JPG, PNG, or WEBP receipts are supported'));
      return;
    }
    callback(null, true);
  }
});

function getFundReceiptPath(filename) {
  if (typeof filename !== 'string' || !/^[0-9a-f-]{36}\.(?:pdf|jpg|png|webp)$/i.test(filename)) return null;
  return path.join(receiptDirectory, filename);
}

module.exports = { getFundReceiptPath, uploadFundReceipt };
