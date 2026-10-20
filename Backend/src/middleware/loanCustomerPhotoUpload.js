const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const photoDirectory = path.resolve(__dirname, '../../uploads/.private/loan-customers');
const documentDirectory = path.resolve(__dirname, '../../uploads/.private/loan-customer-documents');
fs.mkdirSync(photoDirectory, { recursive: true });
fs.mkdirSync(documentDirectory, { recursive: true });

const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png' };
const documentExtensions = {
  ...extensions,
  'application/pdf': '.pdf'
};

const uploadLoanCustomerPhoto = multer({
  storage: multer.diskStorage({
    destination: photoDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensions, file.mimetype)) {
      callback(new Error('Only PNG and JPG customer photos are supported'));
      return;
    }
    callback(null, true);
  }
});

const uploadLoanCustomerDocuments = multer({
  storage: multer.diskStorage({
    destination: documentDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${documentExtensions[file.mimetype]}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(documentExtensions, file.mimetype)) {
      callback(new Error('Only PDF, PNG, and JPG documents are supported'));
      return;
    }
    callback(null, true);
  }
});

function isValidLoanCustomerPhoto(filePath, mimeType) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (mimeType === 'image/png') {
      return signature.length >= 8
        && signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return mimeType === 'image/jpeg'
      && signature.length >= 3
      && signature[0] === 0xff
      && signature[1] === 0xd8
      && signature[2] === 0xff;
  } finally {
    fs.closeSync(descriptor);
  }
}

function getLoanCustomerPhotoPath(reference) {
  if (typeof reference !== 'string') return null;
  const match = reference.match(/^\/api\/loan-customers\/photos\/([0-9a-f-]{36}\.(?:png|jpg))$/i);
  return match ? path.join(photoDirectory, match[1]) : null;
}

function isValidLoanCustomerDocument(filePath, mimeType) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (mimeType === 'application/pdf') return signature.length >= 5 && signature.subarray(0, 5).toString() === '%PDF-';
    if (mimeType === 'image/png') {
      return signature.length >= 8
        && signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return mimeType === 'image/jpeg'
      && signature.length >= 3
      && signature[0] === 0xff
      && signature[1] === 0xd8
      && signature[2] === 0xff;
  } finally {
    fs.closeSync(descriptor);
  }
}

function getLoanCustomerDocumentPath(reference) {
  if (typeof reference !== 'string') return null;
  const match = reference.match(/^\/api\/loan-customers\/documents\/([0-9a-f-]{36}\.(?:png|jpg|pdf))$/i);
  return match ? path.join(documentDirectory, match[1]) : null;
}

async function removeLoanCustomerPhoto(reference) {
  const filePath = getLoanCustomerPhotoPath(reference);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function removeLoanCustomerDocuments(documents) {
  for (const document of documents) {
    const filePath = getLoanCustomerDocumentPath(document.file_ref || document);
    if (!filePath) continue;
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = {
  getLoanCustomerDocumentPath,
  getLoanCustomerPhotoPath,
  isValidLoanCustomerDocument,
  isValidLoanCustomerPhoto,
  removeLoanCustomerDocuments,
  removeLoanCustomerPhoto,
  uploadLoanCustomerDocuments,
  uploadLoanCustomerPhoto
};
