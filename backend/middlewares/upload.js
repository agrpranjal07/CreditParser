import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with field name, timestamp, and random hash
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(file.originalname);
    const safeName = path.basename(file.originalname, extension).replace(/\s+/g, '_');
    cb(null, `${safeName}-${Date.now()}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.xml'];
  const allowedMimeTypes = ['application/xml', 'text/xml', 'application/octet-stream'];

  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    const error = new Error('Only XML files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Invalid MIME type. Only XML files are allowed');
    error.code = 'INVALID_MIME_TYPE';
    return cb(error, false);
  }

  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
    files: 1
  }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum allowed size is 10MB',
          error: 'FILE_TOO_LARGE'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed',
          error: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name in form data',
          error: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error',
          error: error.code
        });
    }
  }

  if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_MIME_TYPE') {
    return res.status(422).json({
      success: false,
      message: error.message,
      error: error.code
    });
  }

  // For any other unhandled errors
  next(error);
};

// Export correct single-file upload middleware (matches frontend key "file")
const uploadSingle = upload.single('file');

export { uploadSingle as upload, handleUploadError };
