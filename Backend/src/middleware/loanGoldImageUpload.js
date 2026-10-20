const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const imageDirectory = path.resolve(__dirname, '../../uploads/.private/loan-gold');
fs.mkdirSync(imageDirectory, { recursive: true });

const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const uploadLoanGoldImage = multer({
  storage: multer.diskStorage({
    destination: imageDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensions, file.mimetype)) {
      callback(new Error('Only PNG and JPG gold images are supported'));
      return;
    }
    callback(null, true);
  }
});

function isValidLoanGoldImage(filePath, mimeType) {
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

function getLoanGoldImagePath(reference) {
  if (typeof reference !== 'string') return null;
  const match = reference.match(/^\/api\/loans\/gold-images\/([0-9a-f-]{36}\.(?:png|jpg))$/i);
  return match ? path.join(imageDirectory, match[1]) : null;
}

async function removeLoanGoldImage(reference) {
  const filePath = getLoanGoldImagePath(reference);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  getLoanGoldImagePath,
  isValidLoanGoldImage,
  removeLoanGoldImage,
  uploadLoanGoldImage
};
