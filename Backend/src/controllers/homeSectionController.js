const {
  DEFAULT_HOME_SECTIONS,
  getHomeSections,
  saveHomeSections
} = require('../modules/homeSectionModule');

function normalizeSections(value) {
  if (!Array.isArray(value) || value.length !== DEFAULT_HOME_SECTIONS.length) {
    return { error: 'All home metal sections must be provided' };
  }

  const allowedKeys = new Set(DEFAULT_HOME_SECTIONS.map((section) => section.key));
  const seenKeys = new Set();
  const sections = [];
  for (const section of value) {
    if (!section || !allowedKeys.has(section.key) || seenKeys.has(section.key)) {
      return { error: 'Home section keys must be valid and unique' };
    }
    if (typeof section.visible !== 'boolean'
      || !Number.isSafeInteger(section.order)
      || section.order < 1
      || section.order > value.length) {
      return { error: 'Each home section needs a valid visibility and order' };
    }
    seenKeys.add(section.key);
    const defaultSection = DEFAULT_HOME_SECTIONS.find((item) => item.key === section.key);
    sections.push({ ...defaultSection, visible: section.visible, order: section.order });
  }
  if (new Set(sections.map((section) => section.order)).size !== value.length) {
    return { error: 'Home section order values must be unique' };
  }

  return { sections: sections.sort((first, second) => first.order - second.order) };
}

async function readHomeSections(req, res, next) {
  try {
    return res.json({ sections: await getHomeSections() });
  } catch (error) {
    return next(error);
  }
}

async function updateHomeSections(req, res, next) {
  const normalized = normalizeSections(req.body?.sections);
  if (normalized.error) return res.status(400).json({ message: normalized.error });
  try {
    return res.json({ sections: await saveHomeSections(normalized.sections) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { normalizeSections, readHomeSections, updateHomeSections };
