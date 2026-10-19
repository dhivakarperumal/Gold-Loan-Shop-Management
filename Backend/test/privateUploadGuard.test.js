const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const privateUploadGuard = require('../src/middleware/privateUploadGuard');

function runGuard(requestPath) {
  let statusCode;
  let responseBody;
  let continued = false;
  const req = { path: requestPath };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  privateUploadGuard(path.resolve('uploads'))(req, res, () => { continued = true; });
  return { statusCode, responseBody, continued };
}

test('blocks private upload paths including case changes and encoded traversal', () => {
  for (const requestPath of [
    '/.private/kyc/document.pdf',
    '/.PRIVATE/kyc/document.pdf',
    '/public/../.private/kyc/document.pdf',
    '/public/%2e%2e/%2eprivate/kyc/document.pdf'
  ]) {
    assert.equal(runGuard(requestPath).statusCode, 404, requestPath);
  }
});

test('allows regular public upload paths through to static file serving', () => {
  assert.equal(runGuard('/products/product.jpg').continued, true);
});

test('rejects malformed encoded upload paths', () => {
  assert.equal(runGuard('/%E0%A4%A').statusCode, 400);
});
