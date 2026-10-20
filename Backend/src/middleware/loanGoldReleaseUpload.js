const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const documentDirectory = path.resolve(__dirname, '../../uploads/.private/loan-gold-release');
fs.mkdirSync(documentDirectory, { recursive: true });

const formats = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

const uploadLoanGoldReleaseDocument = multer({
  storage: multer.diskStorage({
    destination: documentDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${formats[file.mimetype]}`)
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(formats, file.mimetype)) {
      callback(new Error('Upload the signed form as a PDF, JPG, or PNG file'));
      return;
    }
    callback(null, true);
  }
});

function isValidLoanGoldReleaseDocument(filePath, mimeType) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (mimeType === 'application/pdf') return signature.subarray(0, 5).toString() === '%PDF-';
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

function getLoanGoldReleaseDocumentPath(reference) {
  if (typeof reference !== 'string') return null;
  const match = reference.match(/^\/api\/loans\/gold-release-documents\/([0-9a-f-]{36}\.(?:pdf|png|jpg))$/i);
  return match ? path.join(documentDirectory, match[1]) : null;
}

async function removeLoanGoldReleaseDocument(reference) {
  const filePath = getLoanGoldReleaseDocumentPath(reference);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  getLoanGoldReleaseDocumentPath,
  isValidLoanGoldReleaseDocument,
  removeLoanGoldReleaseDocument,
  uploadLoanGoldReleaseDocument
};
