const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const reviewImagesDirectory = path.resolve(__dirname, '../../uploads/reviews');
fs.mkdirSync(reviewImagesDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const uploadReviewImage = multer({
  storage: multer.diskStorage({
    destination: reviewImagesDirectory,
    filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}${extensionsByMimeType[file.mimetype]}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensionsByMimeType, file.mimetype)) {
      callback(new Error('Only PNG, JPG, and WEBP review images are supported'));
      return;
    }
    callback(null, true);
  }
});

function isValidReviewImage(file) {
  const header = Buffer.alloc(12);
  const descriptor = fs.openSync(file.path, 'r');
  let bytesRead;
  try {
    bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
  } finally {
    fs.closeSync(descriptor);
  }
  if (file.mimetype === 'image/png') {
    return bytesRead >= 8
      && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/jpeg') {
    return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  return bytesRead >= 12
    && header.toString('ascii', 0, 4) === 'RIFF'
    && header.toString('ascii', 8, 12) === 'WEBP';
}

async function removeReviewImage(reference) {
  if (typeof reference !== 'string') return;
  const match = reference.match(/^\/uploads\/reviews\/([0-9a-f-]{36}\.(?:png|jpg|webp))$/i);
  if (!match) return;
  try {
    await fs.promises.unlink(path.join(reviewImagesDirectory, match[1]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function removeReviewUpload(file) {
  if (!file) return;
  await removeReviewImage(`/uploads/reviews/${path.basename(file.filename)}`);
}

module.exports = { isValidReviewImage, removeReviewImage, removeReviewUpload, uploadReviewImage };
