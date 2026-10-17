const {
  createBanner,
  deleteBanner,
  getBannerById,
  listActiveBanners,
  listBanners,
  updateBanner
} = require('../modules/bannerModule');
const {
  isValidBannerImage,
  removeBannerImages,
  removeBannerUpload
} = require('../middleware/bannerImageUpload');

const BANNER_TYPES = new Set(['hero', 'offer']);

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function normalizeBanner(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const mobileImage = typeof body.mobile_image === 'string' ? body.mobile_image.trim() : '';
  const link = typeof body.link === 'string' ? body.link.trim() : '';
  const type = typeof body.type === 'string' ? body.type : '';
  const rawUserId = body.user_id;
  const userId = rawUserId == null || rawUserId === '' || rawUserId === 'null'
    ? null
    : Number(rawUserId);

  if (title.length > 200 || subtitle.length > 300 || description.length > 10000 || link.length > 1000) {
    return { error: 'Banner text fields exceed the allowed length' };
  }
  if (!image || image.length > 500 || (mobileImage && mobileImage.length > 500)) {
    return { error: 'A valid desktop banner image is required' };
  }
  if (!BANNER_TYPES.has(type)) return { error: 'Banner type must be hero or offer' };
  if (typeof body.active !== 'boolean') return { error: 'Banner active status must be true or false' };
  if (rawUserId != null && rawUserId !== '' && rawUserId !== 'null'
    && (!Number.isSafeInteger(userId) || userId < 1)) {
    return { error: 'User ID is invalid' };
  }

  return {
    banner: {
      title,
      subtitle,
      description: description || null,
      image,
      mobile_image: mobileImage || null,
      link,
      type,
      active: body.active,
      user_id: userId
    }
  };
}

function uploadedBannerPath(file) {
  return `/uploads/banners/${file.filename}`;
}

async function getBanners(req, res, next) {
  try {
    return res.json(await listBanners());
  } catch (error) {
    return next(error);
  }
}

async function getActiveBanners(req, res, next) {
  try {
    return res.json(await listActiveBanners());
  } catch (error) {
    return next(error);
  }
}

async function postBanner(req, res, next) {
  const { banner, error } = normalizeBanner({
    ...req.body,
    user_id: req.adminUser.user_id
  });
  if (error) return res.status(400).json({ message: error });
  try {
    return res.status(201).json(await createBanner(banner));
  } catch (createError) {
    return next(createError);
  }
}

async function putBanner(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Banner ID is invalid' });
  const { banner, error } = normalizeBanner({
    ...req.body,
    user_id: req.adminUser.user_id
  });
  if (error) return res.status(400).json({ message: error });
  try {
    const existing = await getBannerById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Banner not found' });
    const updated = await updateBanner(req.params.id, banner);
    if (!updated) return res.status(404).json({ message: 'Banner not found' });
    const keptImages = new Set([banner.image, banner.mobile_image]);
    const banners = await listBanners();
    const referencedImages = new Set(banners.flatMap((item) => [item.image, item.mobile_image]).filter(Boolean));
    await removeBannerImages(
      [existing.image, existing.mobile_image]
        .filter((url) => url && !keptImages.has(url) && !referencedImages.has(url))
    );
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function removeBanner(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Banner ID is invalid' });
  try {
    const existing = await getBannerById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Banner not found' });
    if (!await deleteBanner(req.params.id)) return res.status(404).json({ message: 'Banner not found' });
    const banners = await listBanners();
    const referencedImages = new Set(banners.flatMap((item) => [item.image, item.mobile_image]).filter(Boolean));
    await removeBannerImages(
      [existing.image, existing.mobile_image].filter((url) => url && !referencedImages.has(url))
    );
    return res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

async function postBannerUpload(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Select a banner image to upload' });
  try {
    if (!isValidBannerImage(req.file)) {
      await removeBannerUpload(req.file);
      return res.status(400).json({ message: 'The uploaded file is not a valid PNG, JPG, or WEBP image' });
    }
    return res.status(201).json({ url: uploadedBannerPath(req.file) });
  } catch (error) {
    await removeBannerUpload(req.file);
    return next(error);
  }
}

async function cleanFailedBannerUpload(req, res, next) {
  if (req.file) {
    try {
      await removeBannerUpload(req.file);
    } catch (error) {
      return next(error);
    }
  }
  const status = req.fileValidationError ? 400 : req.fileSizeLimitExceeded ? 413 : 400;
  return res.status(status).json({ message: req.fileValidationError || (status === 413
    ? 'Banner images must be 5 MB or smaller'
    : 'Banner image upload failed') });
}

module.exports = {
  cleanFailedBannerUpload,
  getActiveBanners,
  getBanners,
  postBanner,
  postBannerUpload,
  putBanner,
  removeBanner
};
