const {
  createVideo,
  deleteVideo,
  getVideoById,
  listVideos,
  updateVideo
} = require('../modules/videoModule');
const {
  isValidUploadedMedia,
  removeUploadedFile,
  removeVideoMedia
} = require('../middleware/videoUpload');

const VIDEO_TYPES = new Set(['youtube', 'custom']);
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function validId(value) {
  return /^\d+$/.test(String(value)) && BigInt(value) > 0n;
}

function normalizeYouTubeId(value) {
  const input = String(value || '').trim();
  if (YOUTUBE_ID_PATTERN.test(input)) return input;
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      id = url.searchParams.get('v') || '';
      if (!id) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0])) id = parts[1] || '';
      }
    }
    return YOUTUBE_ID_PATTERN.test(id) ? id : '';
  } catch {
    return '';
  }
}

function normalizeVideo(body, adminUser) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const type = typeof body.type === 'string' ? body.type.toLowerCase() : '';
  const source = body.videoId ?? body.video_id;
  const thumbnail = typeof body.thumbnail === 'string' ? body.thumbnail.trim() : '';
  let videoId = '';
  if (type === 'youtube') {
    videoId = normalizeYouTubeId(source);
    if (!videoId) return { error: 'Enter a valid YouTube video ID or URL' };
  } else if (type === 'custom') {
    videoId = typeof source === 'string' ? source.trim() : '';
    if (!/^\/uploads\/videos\/[0-9a-f-]{36}\.(?:mp4|mov|webm)$/i.test(videoId)) {
      return { error: 'Upload a valid MP4, MOV, or WEBM video file' };
    }
  } else {
    return { error: 'Video type must be youtube or custom' };
  }
  if (!title || title.length > 200) return { error: 'Video title is required and must be 200 characters or fewer' };
  if (thumbnail && thumbnail.length > 500) return { error: 'Thumbnail reference is too long' };
  if (thumbnail && !/^\/uploads\/video-thumbnails\/[0-9a-f-]{36}\.(?:png|jpg|webp)$/i.test(thumbnail)
    && !/^https:\/\/[^\s]+$/i.test(thumbnail)) {
    return { error: 'Thumbnail must be an uploaded image or an HTTPS URL' };
  }
  const active = body.active == null ? true : body.active;
  if (typeof active !== 'boolean') return { error: 'Active status must be true or false' };
  return {
    video: {
      title,
      video_id: videoId,
      thumbnail: thumbnail || null,
      type,
      active,
      user_id: adminUser.user_id
    }
  };
}

async function getVideos(req, res, next) {
  try {
    return res.json(await listVideos());
  } catch (error) {
    return next(error);
  }
}

async function postVideo(req, res, next) {
  const normalized = normalizeVideo(req.body || {}, req.adminUser);
  if (normalized.error) return res.status(400).json({ message: normalized.error });
  try {
    return res.status(201).json(await createVideo(normalized.video));
  } catch (error) {
    return next(error);
  }
}

async function putVideo(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Video ID is invalid' });
  const normalized = normalizeVideo(req.body || {}, req.adminUser);
  if (normalized.error) return res.status(400).json({ message: normalized.error });
  try {
    const existing = await getVideoById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Video not found' });
    const updated = await updateVideo(req.params.id, normalized.video);
    if (!updated) return res.status(404).json({ message: 'Video not found' });
    const referencedVideos = await listVideos();
    const usedMedia = new Set(referencedVideos.flatMap((video) => [video.videoId, video.thumbnail]).filter(Boolean));
    await removeVideoMedia([existing.videoId, existing.thumbnail]
      .filter((reference) => reference && !usedMedia.has(reference)));
    return res.json(updated);
  } catch (error) {
    return next(error);
  }
}

async function removeVideo(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Video ID is invalid' });
  try {
    const existing = await getVideoById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Video not found' });
    if (!await deleteVideo(req.params.id)) return res.status(404).json({ message: 'Video not found' });
    const referencedVideos = await listVideos();
    const usedMedia = new Set(referencedVideos.flatMap((video) => [video.videoId, video.thumbnail]).filter(Boolean));
    await removeVideoMedia([existing.videoId, existing.thumbnail]
      .filter((reference) => reference && !usedMedia.has(reference)));
    return res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    return next(error);
  }
}

async function uploadVideo(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Select an MP4, MOV, or WEBM video to upload' });
  try {
    if (!isValidUploadedMedia(req.file)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: 'The uploaded file is not a valid MP4, MOV, or WEBM video' });
    }
    return res.status(201).json({ url: `/uploads/videos/${req.file.filename}` });
  } catch (error) {
    await removeUploadedFile(req.file);
    return next(error);
  }
}

async function uploadThumbnail(req, res, next) {
  if (!req.file) return res.status(400).json({ message: 'Select a PNG, JPG, or WEBP thumbnail to upload' });
  try {
    if (!isValidUploadedMedia(req.file)) {
      await removeUploadedFile(req.file);
      return res.status(400).json({ message: 'The uploaded file is not a valid PNG, JPG, or WEBP image' });
    }
    return res.status(201).json({ url: `/uploads/video-thumbnails/${req.file.filename}` });
  } catch (error) {
    await removeUploadedFile(req.file);
    return next(error);
  }
}

async function cleanFailedUpload(req, res, next) {
  try {
    await removeUploadedFile(req.file);
    const status = req.uploadError?.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = req.uploadError?.code === 'LIMIT_FILE_SIZE'
      ? req.uploadLimitMessage
      : req.uploadError?.message || 'Media upload failed';
    return res.status(status).json({ message });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cleanFailedUpload,
  getVideos,
  normalizeYouTubeId,
  normalizeVideo,
  postVideo,
  putVideo,
  removeVideo,
  uploadThumbnail,
  uploadVideo
};
