const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const dealerDocumentDirectory = path.resolve(__dirname, '../../private_uploads/dealer-documents');
fs.mkdirSync(dealerDocumentDirectory, { recursive: true });

const mimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const uploadDealerDocument = multer({
  storage: multer.diskStorage({
    destination: dealerDocumentDirectory,
    filename: (req, file, callback) => {
      const extension = file.mimetype === 'application/pdf' ? '.pdf'
        : file.mimetype === 'image/jpeg' ? '.jpg'
          : file.mimetype === 'image/png' ? '.png' : '.webp';
      callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!mimeTypes.has(file.mimetype)) {
      callback(new Error('Only PDF, JPG, PNG, and WEBP documents are supported'));
      return;
    }
    callback(null, true);
  }
});

function validateDealerDocument(file) {
  const header = Buffer.alloc(12);
  const descriptor = fs.openSync(file.path, 'r');
  let bytesRead;
  try {
    bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  if (file.mimetype === 'application/pdf') return bytesRead >= 5 && header.subarray(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/jpeg') return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (file.mimetype === 'image/png') {
    return bytesRead >= 8
      && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return bytesRead >= 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
}

async function removeDealerDocument(file) {
  if (!file || typeof file.filename !== 'string' || !/^[0-9a-f-]{36}\.(?:pdf|jpg|png|webp)$/i.test(file.filename)) return;
  try {
    await fs.promises.unlink(path.join(dealerDocumentDirectory, file.filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

function handleDealerUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'Dealer documents must be 10 MB or smaller'
        : 'Upload exactly one dealer document'
    });
  }
  if (error.message === 'Only PDF, JPG, PNG, and WEBP documents are supported') {
    return res.status(400).json({ message: error.message });
  }
  return next(error);
}

module.exports = { handleDealerUploadError, removeDealerDocument, uploadDealerDocument, validateDealerDocument };
