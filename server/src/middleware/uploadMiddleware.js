const multer = require('multer');
const ApiError = require('../utils/apiError');

// Use memory storage so no temp files remain on disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const originalName = (file.originalname || '').toLowerCase();
    if (originalName.endsWith('.pdf') || originalName.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(ApiError.badRequest('Unsupported file type. Only .pdf and .txt files are allowed.'));
    }
  },
});

module.exports = upload;
