const {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} = require('../modules/categoryModule');

function normalizeCategory(body) {
  const catId = String(body.catId || '').trim();
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const subcategory = Array.isArray(body.subcategory) ? body.subcategory : [];
  const images = Array.isArray(body.images)
    ? body.images
    : body.images
      ? [body.images]
      : [];
  const rawUserId = body.user_id;
  const userId = rawUserId == null || rawUserId === '' ? null : Number(rawUserId);

  if (!catId || !name) {
    return { error: 'Category ID and name are required' };
  }
  if (catId.length > 32 || name.length > 150) {
    return { error: 'Category ID or name is too long' };
  }
  if (typeof rawUserId !== 'undefined' && userId !== null && (!Number.isSafeInteger(userId) || userId < 1)) {
    return { error: 'User ID is invalid' };
  }
  if (subcategory.some((item) => typeof item !== 'string') || images.some((image) => typeof image !== 'string')) {
    return { error: 'Subcategories and images must contain strings' };
  }

  return { category: { catId, name, description, subcategory, images, userId } };
}

async function getCategories(req, res, next) {
  try {
    return res.json(await listCategories());
  } catch (error) {
    return next(error);
  }
}

async function postCategory(req, res, next) {
  const { category, error: validationError } = normalizeCategory(req.body || {});
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const created = await createCategory(category);
    return res.status(201).json(created);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A category with this ID already exists' });
    }
    return next(error);
  }
}

async function putCategory(req, res, next) {
  const { category, error: validationError } = normalizeCategory({
    ...req.body,
    catId: req.params.catId
  });
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const updated = await updateCategory(req.params.catId, category);
    if (!updated) return res.status(404).json({ message: 'Category not found' });
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function removeCategory(req, res, next) {
  try {
    const deleted = await deleteCategory(req.params.catId);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getCategories, postCategory, putCategory, removeCategory };
