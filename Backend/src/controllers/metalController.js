const {
  createMetal,
  deleteMetal,
  listMetals,
  updateMetal
} = require('../modules/metalModule');

const VALID_STATUSES = new Set(['Active', 'Inactive']);

function normalizeMetal(body) {
  const name = String(body.name || '').trim();
  const purity = String(body.purity || '').trim();
  const description = String(body.description || '').trim();
  const status = body.status == null || body.status === '' ? 'Active' : String(body.status).trim();

  if (!name) return { error: 'Metal name is required' };
  if (name.length > 100 || purity.length > 50) {
    return { error: 'Metal name or purity is too long' };
  }
  if (!VALID_STATUSES.has(status)) {
    return { error: 'Status must be Active or Inactive' };
  }
  return { metal: { name, purity, description, status } };
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

async function putMetal(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Metal ID is invalid' });
  }

  const { metal, error } = normalizeMetal(req.body || {});
  if (error) return res.status(400).json({ message: error });

  try {
    const updated = await updateMetal(id, metal);
    if (!updated) return res.status(404).json({ message: 'Metal not found' });
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
    const deleted = await deleteMetal(id);
    if (!deleted) return res.status(404).json({ message: 'Metal not found' });
    return res.json({ message: 'Metal deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getMetals, postMetal, putMetal, removeMetal };
