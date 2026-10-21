const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const profileImagesDirectory = path.resolve(__dirname, '../../uploads/profiles');
fs.mkdirSync(profileImagesDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: profileImagesDirectory,
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${extensionsByMimeType[file.mimetype]}`);
  }
});

const uploadProfileImage = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensionsByMimeType, file.mimetype)) {
      callback(new Error('Profile photo must be a JPG, PNG, or WEBP image'));
      return;
    }
    callback(null, true);
  }
});

function isValidProfileImage(filePath, mimeType) {
  const header = Buffer.alloc(12);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (mimeType === 'image/png') {
      return signature.length >= 8
        && signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') {
      return signature.length >= 3
        && signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
    }
    return mimeType === 'image/webp'
      && signature.length >= 12
      && signature.toString('ascii', 0, 4) === 'RIFF'
      && signature.toString('ascii', 8, 12) === 'WEBP';
  } finally {
    fs.closeSync(descriptor);
  }
}

async function removeProfileImage(imageUrl) {
  if (typeof imageUrl !== 'string') return;
  const match = imageUrl.match(/^\/uploads\/profiles\/([0-9a-f-]{36}\.(?:png|jpg|webp))$/i);
  if (!match) return;
  try {
    await fs.promises.unlink(path.join(profileImagesDirectory, match[1]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  isValidProfileImage,
  removeProfileImage,
  uploadProfileImage
};
