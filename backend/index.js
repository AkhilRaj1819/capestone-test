const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Load environment variables
dotenv.config();

// Import routes
const { register, login } = require('./controller/authController');
const { uploadDocument, getDocuments, getDocument, summarizeDocument, downloadDocument } = require('./controller/documentController');
const { protect } = require('./middleware/authMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

// Configure multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'documents',
    resource_type: 'raw',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // List of allowed MIME types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/rtf',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only document files (PDF, Word, Excel, text) are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Custom error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 10MB.',
        error: err.message
      });
    }
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }
  next(err);
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start server only after successful database connection
    const PORT = 5001; // Using fixed port 5001 to avoid conflicts
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('API endpoints:');
      console.log('- POST /api/auth/register');
      console.log('- POST /api/auth/login');
      console.log('- POST /api/documents/upload');
      console.log('- GET /api/documents');
      console.log('- GET /api/documents/:documentId');
      console.log('- POST /api/documents/summarize');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Add error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/documents/upload', protect, upload.single('document'), handleMulterError, uploadDocument);
app.get('/api/documents', protect, getDocuments);
app.get('/api/documents/:documentId', protect, getDocument);
app.post('/api/documents/summarize', protect, summarizeDocument);
app.get('/api/documents/:documentId/download', protect, downloadDocument);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation error',
      error: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Unauthorized',
      error: err.message
    });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: err.message 
  });
});
