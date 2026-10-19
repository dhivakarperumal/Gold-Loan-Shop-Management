const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSections } = require('../src/controllers/homeSectionController');

const validSections = [
  { key: 'gold', visible: true, order: 1 },
  { key: 'silver', visible: false, order: 2 },
  { key: 'diamond', visible: true, order: 3 },
  { key: 'platinum', visible: true, order: 4 }
];

test('normalizes all home sections by configured display order and visibility', () => {
  const input = [
    { key: 'platinum', visible: true, order: 1 },
    { key: 'gold', visible: false, order: 2 },
    { key: 'silver', visible: true, order: 3 },
    { key: 'diamond', visible: true, order: 4 }
  ];

  const result = normalizeSections(input);

  assert.equal(result.error, undefined);
  assert.deepEqual(result.sections.map((section) => section.key), [
    'platinum', 'gold', 'silver', 'diamond'
  ]);
  assert.equal(result.sections[1].visible, false);
  assert.equal(result.sections[0].label, 'Platinum Jewellery');
});

test('rejects incomplete, duplicate, and invalid home section settings', () => {
  assert.ok(normalizeSections(validSections.slice(0, 3)).error);
  assert.ok(normalizeSections([
    ...validSections.slice(0, 3),
    { key: 'gold', visible: true, order: 4 }
  ]).error);
  assert.ok(normalizeSections([
    ...validSections.slice(0, 3),
    { key: 'platinum', visible: 'yes', order: 4 }
  ]).error);
  assert.ok(normalizeSections([
    ...validSections.slice(0, 3),
    { key: 'platinum', visible: true, order: 3 }
  ]).error);
});
