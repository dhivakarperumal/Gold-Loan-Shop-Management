const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const videoDirectory = path.resolve(__dirname, '../../uploads/videos');
const thumbnailDirectory = path.resolve(__dirname, '../../uploads/video-thumbnails');
fs.mkdirSync(videoDirectory, { recursive: true });
fs.mkdirSync(thumbnailDirectory, { recursive: true });

const videoExtensions = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm'
};
const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

function createUploader(directory, extensions, maxFileSize) {
  const storage = multer.diskStorage({
    destination: directory,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${extensions[file.mimetype]}`);
    }
  });
  return multer({
    storage,
    limits: { fileSize: maxFileSize, files: 1 },
    fileFilter: (req, file, callback) => {
      if (!Object.hasOwn(extensions, file.mimetype)) {
        callback(new Error('Unsupported media type'));
        return;
      }
      callback(null, true);
    }
  });
}

const uploadVideoFile = createUploader(videoDirectory, videoExtensions, 50 * 1024 * 1024);
const uploadVideoThumbnail = createUploader(thumbnailDirectory, imageExtensions, 2 * 1024 * 1024);

function isValidUploadedMedia(file) {
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
  if (file.mimetype === 'image/webp') {
    return bytesRead >= 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  }
  if (file.mimetype === 'video/mp4' || file.mimetype === 'video/quicktime') {
    return bytesRead >= 8 && header.subarray(4, 8).toString() === 'ftyp';
  }
  if (file.mimetype === 'video/webm') {
    return bytesRead >= 4 && header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  return false;
}

function ownedMediaPath(reference, type) {
  if (typeof reference !== 'string') return null;
  const match = reference.match(/^\/uploads\/(videos|video-thumbnails)\/([0-9a-f-]{36}\.(?:mp4|mov|webm|png|jpg|webp))$/i);
  if (!match || (type === 'video' && match[1] !== 'videos')
    || (type === 'thumbnail' && match[1] !== 'video-thumbnails')) return null;
  const directory = match[1] === 'videos' ? videoDirectory : thumbnailDirectory;
  return path.join(directory, path.basename(match[2]));
}

async function removeVideoMedia(references) {
  for (const reference of references) {
    const filePath = ownedMediaPath(reference, 'video') || ownedMediaPath(reference, 'thumbnail');
    if (!filePath) continue;
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function removeUploadedFile(file) {
  if (!file) return;
  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = {
  isValidUploadedMedia,
  removeUploadedFile,
  removeVideoMedia,
  uploadVideoFile,
  uploadVideoThumbnail
};
