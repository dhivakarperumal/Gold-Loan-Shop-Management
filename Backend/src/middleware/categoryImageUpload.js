const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const categoryImagesDirectory = path.resolve(__dirname, '../../uploads/categories');
fs.mkdirSync(categoryImagesDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

const storage = multer.diskStorage({
  destination: categoryImagesDirectory,
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${extensionsByMimeType[file.mimetype]}`);
  }
});

const uploadCategoryImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensionsByMimeType, file.mimetype)) {
      callback(new Error('Only PNG and JPG category images are supported'));
      return;
    }
    callback(null, true);
  }
});

function isValidCategoryImage(file) {
  const header = Buffer.alloc(8);
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
  return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
}

async function removeCategoryImages(imageUrls) {
  for (const imageUrl of imageUrls) {
    if (typeof imageUrl !== 'string') continue;
    const match = imageUrl.match(/^\/uploads\/categories\/([0-9a-f-]{36}\.(?:png|jpg))$/i);
    if (!match) continue;

    try {
      await fs.promises.unlink(path.join(categoryImagesDirectory, match[1]));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = {
  isValidCategoryImage,
  removeCategoryImages,
  uploadCategoryImages
};