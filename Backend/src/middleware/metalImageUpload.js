const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const metalImagesDirectory = path.resolve(__dirname, '../../uploads/metals');
fs.mkdirSync(metalImagesDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

const storage = multer.diskStorage({
  destination: metalImagesDirectory,
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${extensionsByMimeType[file.mimetype]}`);
  }
});

const uploadMetalImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensionsByMimeType, file.mimetype)) {
      callback(new Error('Only PNG and JPG images are supported'));
      return;
    }
    callback(null, true);
  }
});

function isPng(buffer) {
  return buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function isJpeg(buffer) {
  return buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff;
}

function isValidMetalImage(filePath, mimeType) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    return mimeType === 'image/png' ? isPng(signature) : isJpeg(signature);
  } finally {
    fs.closeSync(descriptor);
  }
}

async function removeMetalImage(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return;
  const match = imageUrl.match(/^\/uploads\/metals\/([0-9a-f-]{36}\.(?:png|jpg))$/i);
  if (!match) return;

  const filePath = path.join(metalImagesDirectory, match[1]);
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  isValidMetalImage,
  metalImagesDirectory,
  removeMetalImage,
  uploadMetalImage
};
