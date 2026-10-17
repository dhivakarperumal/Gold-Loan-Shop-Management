const {
  createMetal,
  deleteMetal,
  getMetalById,
  listMetals,
  updateMetal
} = require('../modules/metalModule');
const {
  isValidMetalImage,
  removeMetalImage
} = require('../middleware/metalImageUpload');

const VALID_STATUSES = new Set(['Active', 'Inactive']);

function normalizeMetal(body) {
  const name = String(body.name || '').trim();
  const purity = String(body.purity || '').trim();
  const description = String(body.description || '').trim();
  const image = body.image == null || body.image === '' ? null : String(body.image);
  const status = body.status == null || body.status === '' ? 'Active' : String(body.status).trim();

  if (!name) return { error: 'Metal name is required' };
  if (name.length > 100 || purity.length > 50) {
    return { error: 'Metal name or purity is too long' };
  }
  if (image && !(
    /^\/uploads\/metals\/[0-9a-f-]{36}\.(?:png|jpg)$/i.test(image)
    || (/^data:image\/(?:png|jpeg);base64,/.test(image) && image.length <= 800_000)
  )) {
    return { error: 'Metal image path is invalid' };
  }
  if (!VALID_STATUSES.has(status)) {
    return { error: 'Status must be Active or Inactive' };
  }
  return { metal: { name, purity, description, image, status } };
}

async function getMetals(req, res, next) {
  try {
    return res.json(await listMetals());
  } catch (error) {
    return next(error);
  }
}

async function postMetal(req, res, next) {
  const { metal, error } = normalizeMetal(req.body || {});
  if (error) return res.status(400).json({ message: error });

  try {
    return res.status(201).json(await createMetal(metal));
  } catch (createError) {
    return next(createError);
  }
}

async function postMetalImage(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Choose a PNG or JPG image' });

  try {
    if (!isValidMetalImage(req.file.path, req.file.mimetype)) {
      await removeMetalImage(`/uploads/metals/${req.file.filename}`);
      return res.status(400).json({ message: 'The uploaded file is not a valid PNG or JPG image' });
    }
    return res.status(201).json({ image: `/uploads/metals/${req.file.filename}` });
  } catch (error) {
    return next(error);
  }
}

async function putMetal(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Metal ID is invalid' });
  }

  const { metal, error } = normalizeMetal(req.body || {});
  if (error) return res.status(400).json({ message: error });

  try {
    const existingMetal = await getMetalById(id);
    if (!existingMetal) return res.status(404).json({ message: 'Metal not found' });
    const updated = await updateMetal(id, metal);
    if (!updated) return res.status(404).json({ message: 'Metal not found' });
    if (existingMetal.image && existingMetal.image !== updated.image) {
      await removeMetalImage(existingMetal.image);
    }
    return res.json(updated);
  } catch (updateError) {
    return next(updateError);
  }
}

async function removeMetal(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Metal ID is invalid' });
  }

  try {
    const metal = await getMetalById(id);
    if (!metal) return res.status(404).json({ message: 'Metal not found' });
    const deleted = await deleteMetal(id);
    if (!deleted) return res.status(404).json({ message: 'Metal not found' });
    await removeMetalImage(metal.image);
    return res.json({ message: 'Metal deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMetals, postMetal, postMetalImage, putMetal, removeMetal };
