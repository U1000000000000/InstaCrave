const multer = require('multer');
const fileType = require('file-type');

const storage = multer.memoryStorage();

const allowedMimeTypes = ['video/mp4', 'image/jpeg', 'image/png'];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

// Middleware to check file signature after multer
async function validateFileSignature(req, res, next) {
  if (!req.file) return next();
  try {
    const type = await fileType.fromBuffer(req.file.buffer);
    if (!type || !['mp4', 'jpg', 'jpeg', 'png'].includes(type.ext)) {
      return res.status(400).json({ success: false, message: 'Invalid file content' });
    }
    next();
  } catch (err) {
    return res.status(400).json({ success: false, message: 'File validation failed' });
  }
}

module.exports = { upload, validateFileSignature };
