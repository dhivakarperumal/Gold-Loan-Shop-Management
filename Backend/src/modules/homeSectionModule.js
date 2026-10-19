const { pool } = require('../config/db');

const DEFAULT_HOME_SECTIONS = [
  { key: 'gold', label: 'Gold Jewellery', visible: true, order: 1 },
  { key: 'silver', label: 'Silver Articles', visible: true, order: 2 },
  { key: 'diamond', label: 'Diamond Jewellery', visible: true, order: 3 },
  { key: 'platinum', label: 'Platinum Jewellery', visible: true, order: 4 }
];

async function initializeHomeSectionModule() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS home_section_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      sections_json JSON NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function getHomeSections() {
  const [rows] = await pool.execute(
    'SELECT sections_json FROM home_section_settings WHERE id = 1'
  );
  if (!rows[0]) return DEFAULT_HOME_SECTIONS.map((section) => ({ ...section }));

  let savedSections = rows[0].sections_json;
  while (typeof savedSections === 'string') savedSections = JSON.parse(savedSections);
  const savedByKey = new Map(savedSections.map((section) => [section.key, section]));
  return DEFAULT_HOME_SECTIONS
    .map((section) => ({ ...section, ...savedByKey.get(section.key) }))
    .sort((first, second) => first.order - second.order);
}

async function saveHomeSections(sections) {
  await pool.execute(
    `INSERT INTO home_section_settings (id, sections_json) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE sections_json = VALUES(sections_json)`,
    [JSON.stringify(sections)]
  );
  return getHomeSections();
}

module.exports = {
  DEFAULT_HOME_SECTIONS,
  getHomeSections,
  initializeHomeSectionModule,
  saveHomeSections
};
