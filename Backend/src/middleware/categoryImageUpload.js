const {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory
} = require('../modules/categoryModule');
const {
  isValidCategoryImage,
  removeCategoryImages
} = require('../middleware/categoryImageUpload');

function parseImages(images) {
  if (Array.isArray(images)) return { images };
  if (typeof images !== 'string' || images === '') return { images: [] };
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? { images: parsed } : { error: 'Images must be an array' };
  } catch {
    return { error: 'Images must be valid JSON' };
  }
}

function parseSubcategories(subcategories) {
  if (Array.isArray(subcategories)) return { subcategories };
  if (typeof subcategories !== 'string' || subcategories === '') return { subcategories: [] };
  try {
    const parsed = JSON.parse(subcategories);
    return Array.isArray(parsed)
      ? { subcategories: parsed }
      : { error: 'Subcategories must be an array' };
  } catch {
    return { error: 'Subcategories must be valid JSON' };
  }
}

function normalizeCategory(body) {
  const catId = String(body.catId || '').trim();
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const parsedSubcategories = parseSubcategories(body.subcategory);
  if (parsedSubcategories.error) return parsedSubcategories;
  const subcategory = parsedSubcategories.subcategories;
  const parsedImages = parseImages(body.images);
  if (parsedImages.error) return parsedImages;
  const images = parsedImages.images;
  const rawUserId = body.user_id;
  const userId = rawUserId == null || rawUserId === '' || rawUserId === 'null'
    ? null
    : Number(rawUserId);

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

async function resolveUploadedImages(req, res) {
  const files = req.files || [];
  const cleanup = async () => removeCategoryImages(
    files.map((file) => `/uploads/categories/${file.filename}`)
  );

  try {
    if (files.some((file) => !isValidCategoryImage(file))) {
      await cleanup();
      res.status(400).json({ message: 'One or more files are not valid PNG or JPG images' });
      return null;
    }

    const parsedImages = parseImages(req.body.images);
    if (parsedImages.error) {
      await cleanup();
      res.status(400).json({ message: parsedImages.error });
      return null;
    }

    return {
      images: [
        ...parsedImages.images,
        ...files.map((file) => `/uploads/categories/${file.filename}`)
      ],
      cleanup
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function getCategories(req, res, next) {
  try {
    return res.json(await listCategories());
  } catch (error) {
    return next(error);
  }
}

async function postCategory(req, res, next) {
  let uploaded;
  let persisted = false;
  try {
    uploaded = await resolveUploadedImages(req, res);
    if (!uploaded) return;
    const { category, error: validationError } = normalizeCategory({
      ...req.body,
      images: uploaded.images
    });
    if (validationError) {
      await uploaded.cleanup();
      return res.status(400).json({ message: validationError });
    }
    const created = await createCategory(category);
    persisted = true;
    return res.status(201).json(created);
  } catch (error) {
    if (uploaded && !persisted) await uploaded.cleanup();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'A category with this ID already exists' });
    }
    return next(error);
  }
}

async function putCategory(req, res, next) {
  let uploaded;
  let persisted = false;
  try {
    uploaded = await resolveUploadedImages(req, res);
    if (!uploaded) return;
    const { category, error: validationError } = normalizeCategory({
      ...req.body,
      catId: req.params.catId,
      images: uploaded.images
    });
    if (validationError) {
      await uploaded.cleanup();
      return res.status(400).json({ message: validationError });
    }
    const existing = await getCategoryById(req.params.catId);
    if (!existing) {
      await uploaded.cleanup();
      return res.status(404).json({ message: 'Category not found' });
    }
    const updated = await updateCategory(req.params.catId, category);
    if (!updated) {
      await uploaded.cleanup();
      return res.status(404).json({ message: 'Category not found' });
    }
    persisted = true;
    const keptImages = new Set(category.images);
    const removedImages = (Array.isArray(existing.images) ? existing.images : [])
      .filter((image) => !keptImages.has(image));
    await removeCategoryImages(removedImages);
    return res.json(updated);
  } catch (error) {
    if (uploaded && !persisted) await uploaded.cleanup();
    return next(error);
  }
}

async function removeCategory(req, res, next) {
  try {
    const existing = await getCategoryById(req.params.catId);
    if (!existing) return res.status(404).json({ message: 'Category not found' });
    const deleted = await deleteCategory(req.params.catId);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    await removeCategoryImages(Array.isArray(existing.images) ? existing.images : []);
    return res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getCategories, postCategory, putCategory, removeCategory };