const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const kycStorageDirectory = path.resolve(__dirname, '../../private_uploads/kyc');
fs.mkdirSync(kycStorageDirectory, { recursive: true });

const MAX_FILE_SIZE_BYTES = Math.min(
  Math.max(Number(process.env.KYC_MAX_FILE_SIZE_MB) || 5, 1),
  20
) * 1024 * 1024;
const MAX_FILES = 5;
const extensionsByMimeType = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png'
};

const uploadKycDocuments = multer({
  storage: multer.diskStorage({
    destination: kycStorageDirectory,
    filename: (req, file, callback) => {
      const extension = extensionsByMimeType[file.mimetype];
      if (!extension) return callback(new Error('Only PDF, JPG, and PNG KYC files are supported'));
      return callback(null, `${crypto.randomUUID()}${extension}`);
    }
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES, fields: 5, fieldSize: 4096 },
  fileFilter: (req, file, callback) => {
    if (!Object.hasOwn(extensionsByMimeType, file.mimetype)) {
      callback(new Error('Only PDF, JPG, and PNG KYC files are supported'));
      return;
    }
    callback(null, true);
  }
});

function validateKycFileSignature(filePath, mimeType) {
  const header = Buffer.alloc(8);
  const descriptor = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(descriptor, header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (mimeType === 'application/pdf') {
      return signature.length >= 5 && signature.subarray(0, 5).toString() === '%PDF-';
    }
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

function resolveKycStoragePath(storageKey) {
  if (typeof storageKey !== 'string' || !/^[0-9a-f-]{36}\.(?:pdf|jpg|png)$/i.test(storageKey)) return null;
  const resolved = path.resolve(kycStorageDirectory, storageKey);
  return path.dirname(resolved) === kycStorageDirectory ? resolved : null;
}

async function removeKycFiles(storageKeys) {
  for (const storageKey of storageKeys) {
    const filePath = resolveKycStoragePath(storageKey);
    if (!filePath) continue;
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

async function cleanupOrphanedKycUploads(pool) {
  const [rows] = await pool.query('SELECT storage_key FROM kyc_documents');
  const referencedFiles = new Set(rows.map((row) => row.storage_key));
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const entries = await fs.promises.readdir(kycStorageDirectory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || referencedFiles.has(entry.name)) continue;
    const filePath = resolveKycStoragePath(entry.name);
    if (!filePath) continue;
    const file = await fs.promises.stat(filePath);
    if (file.mtimeMs < cutoff) await fs.promises.unlink(filePath);
  }
}

module.exports = {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES,
  cleanupOrphanedKycUploads,
  kycStorageDirectory,
  removeKycFiles,
  resolveKycStoragePath,
  uploadKycDocuments,
  validateKycFileSignature
};
