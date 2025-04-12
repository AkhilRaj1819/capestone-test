const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads directory exists
const uploadsDir = "uploads/";
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for storing uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Directory to save the files
    },
    filename: (req, file, cb) => {
        cb(null, `file_${Date.now()}${path.extname(file.originalname)}`); // Simplified and easy-to-read filename
    },
});

// Configure file filtering to only accept PDFs
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed!"), false);
    }
};

// Export the configured Multer instance
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
});

// Middleware for error handling
const handleErrors = (err, req, res, next) => {
    console.error(err.message); // Log the error for debugging
    res.status(500).send({ error: err.message });
};

module.exports = { upload, handleErrors };