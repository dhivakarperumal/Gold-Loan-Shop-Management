const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const productUploadDirectory = path.resolve(__dirname, '../../uploads/products');
fs.mkdirSync(productUploadDirectory, { recursive: true });

const allowedExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'video/mp4': '.mp4',
  'application/pdf': '.pdf'
};

const storage = multer.diskStorage({
  destination: productUploadDirectory,
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${allowedExtensions[file.mimetype]}`);
  }
});

const uploadProductFiles = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(allowedExtensions, file.mimetype)) {
      callback(new Error('Only PNG/JPG images, MP4 video, and PDF documents are supported'));
      return;
    }
    callback(null, true);
  }
});

function isValidProductFile(file) {
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
  if (file.mimetype === 'application/pdf') {
    return bytesRead >= 5 && header.subarray(0, 5).toString() === '%PDF-';
  }
  if (file.mimetype === 'video/mp4') {
    return bytesRead >= 8 && header.subarray(4, 8).toString() === 'ftyp';
  }
  return false;
}

async function removeProductFiles(files) {
  for (const file of files) {
    try {
      await fs.promises.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

module.exports = { isValidProductFile, removeProductFiles, uploadProductFiles };
