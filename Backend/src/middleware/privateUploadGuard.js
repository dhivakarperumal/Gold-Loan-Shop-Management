const path = require('node:path');

function privateUploadGuard(uploadsDirectory) {
  const privateDirectory = path.resolve(uploadsDirectory, '.private').toLowerCase();
  return (req, res, next) => {
    let requestedPath;
    try {
      requestedPath = decodeURIComponent(req.path);
    } catch {
      return res.status(400).json({ message: 'Upload path is invalid' });
    }
    const resolvedPath = path.resolve(uploadsDirectory, `.${requestedPath}`).toLowerCase();
    if (resolvedPath === privateDirectory || resolvedPath.startsWith(`${privateDirectory}${path.sep}`)) {
      return res.status(404).json({ message: 'Upload not found' });
    }
    return next();
  };
}

module.exports = privateUploadGuard;
