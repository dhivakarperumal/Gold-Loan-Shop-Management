const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const {
  cleanFailedUpload,
  getVideos,
  postVideo,
  putVideo,
  removeVideo,
  uploadThumbnail,
  uploadVideo
} = require('../controllers/videoController');
const { uploadVideoFile, uploadVideoThumbnail } = require('../middleware/videoUpload');

const router = express.Router();

function receiveUpload(upload) {
  return (req, res, next) => {
    req.uploadLimitMessage = upload === uploadVideoFile
      ? 'Video uploads must be 50 MB or smaller'
      : 'Thumbnail uploads must be 2 MB or smaller';
    upload.single(upload === uploadVideoFile ? 'video' : 'image')(req, res, (error) => {
      if (!error) return next();
      req.uploadError = error;
      return cleanFailedUpload(req, res, next);
    });
  };
}

router.use(requireAdmin);
router.get('/', getVideos);
router.post('/upload', receiveUpload(uploadVideoFile), uploadVideo);
router.post('/upload-thumbnail', receiveUpload(uploadVideoThumbnail), uploadThumbnail);
router.post('/', postVideo);
router.put('/:id', putVideo);
router.delete('/:id', removeVideo);

module.exports = router;
