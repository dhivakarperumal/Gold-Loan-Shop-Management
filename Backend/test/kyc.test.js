const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { canReadKycDocument, normalizeReviewReason, parseDocumentTypes, toCustomerApplication, validDate } = require('../src/controllers/kycController');
const { canResubmitKycStatus, canReviewKycStatus, getAllowedDocumentTypes } = require('../src/modules/kycModule');
const { validateKycFileSignature } = require('../src/middleware/kycUpload');

test('accepts configured supported document types and rejects malformed lists', () => {
  const previous = process.env.KYC_ALLOWED_DOCUMENT_TYPES;
  process.env.KYC_ALLOWED_DOCUMENT_TYPES = 'passport,pan';
  try {
    assert.deepEqual(parseDocumentTypes('["passport","pan"]', 2), ['passport', 'pan']);
    assert.equal(parseDocumentTypes('["ration_card"]', 1), null);
    assert.equal(parseDocumentTypes('["passport"]', 2), null);
    assert.equal(parseDocumentTypes('not json', 1), null);
  } finally {
    if (previous === undefined) delete process.env.KYC_ALLOWED_DOCUMENT_TYPES;
    else process.env.KYC_ALLOWED_DOCUMENT_TYPES = previous;
  }
});

test('requires an explicit document allowlist and rejects unapproved types', () => {
  const previous = process.env.KYC_ALLOWED_DOCUMENT_TYPES;
  try {
    process.env.KYC_ALLOWED_DOCUMENT_TYPES = '';
    assert.deepEqual(getAllowedDocumentTypes(), []);
    process.env.KYC_ALLOWED_DOCUMENT_TYPES = 'unknown_id';
    assert.throws(() => getAllowedDocumentTypes(), /Unsupported KYC document types/);
  } finally {
    if (previous === undefined) delete process.env.KYC_ALLOWED_DOCUMENT_TYPES;
    else process.env.KYC_ALLOWED_DOCUMENT_TYPES = previous;
  }
});

test('validates exact review eligibility and resubmission statuses', () => {
  assert.equal(canReviewKycStatus('pending'), true);
  assert.equal(canReviewKycStatus('in_review'), true);
  assert.equal(canReviewKycStatus('verified'), false);
  assert.equal(canResubmitKycStatus('rejected'), true);
  assert.equal(canResubmitKycStatus('resubmission_required'), true);
  assert.equal(canResubmitKycStatus('failed'), true);
  assert.equal(canResubmitKycStatus('verified'), false);
});

test('enforces private-document ownership except for authorized admins', () => {
  const document = { user_id: 17 };
  assert.equal(canReadKycDocument(document, 17, false), true);
  assert.equal(canReadKycDocument(document, '17', false), true);
  assert.equal(canReadKycDocument(document, 18, false), false);
  assert.equal(canReadKycDocument(document, undefined, true), true);
});

test('returns only customer-safe application fields', () => {
  const result = toCustomerApplication({
    id: 8,
    user_id: 17,
    reviewer_id: 2,
    applicant_email: 'private@example.com',
    status: 'pending',
    documents: []
  });
  assert.deepEqual(Object.keys(result), [
    'id', 'status', 'provider', 'consent_version', 'consented_at',
    'reviewed_at', 'review_reason', 'created_at', 'updated_at', 'documents'
  ]);
});

test('validates document signatures instead of trusting the filename or MIME metadata', async (context) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'kyc-signature-'));
  context.after(() => fs.promises.rm(directory, { recursive: true, force: true }));
  const pdfPath = path.join(directory, 'document.bin');
  await fs.promises.writeFile(pdfPath, Buffer.from('%PDF-1.7\n'));
  assert.equal(validateKycFileSignature(pdfPath, 'application/pdf'), true);
  assert.equal(validateKycFileSignature(pdfPath, 'image/png'), false);
  await fs.promises.writeFile(pdfPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  assert.equal(validateKycFileSignature(pdfPath, 'image/png'), true);
  await fs.promises.writeFile(pdfPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  assert.equal(validateKycFileSignature(pdfPath, 'image/jpeg'), true);
  await fs.promises.writeFile(pdfPath, Buffer.from('not a PDF'));
  assert.equal(validateKycFileSignature(pdfPath, 'application/pdf'), false);
});

test('validates review reason and calendar dates', () => {
  assert.equal(normalizeReviewReason('  Please upload a clearer copy.  '), 'Please upload a clearer copy.');
  assert.equal(normalizeReviewReason({}), null);
  assert.equal(normalizeReviewReason('x'.repeat(2500)).length, 2000);
  assert.equal(validDate('2026-10-17'), '2026-10-17');
  assert.equal(validDate('2026-02-31'), undefined);
  assert.equal(validDate('17-10-2026'), undefined);
});
