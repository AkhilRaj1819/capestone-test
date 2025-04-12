const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const User = require('../models/userModel');
const Document = require('../models/documentModel');
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Log Cloudinary configuration (mask sensitive info)
console.log('Cloudinary Configuration:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? '***' : 'missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'missing'
});

// Validate Cloudinary configuration
const validateCloudinaryConfig = () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Missing Cloudinary configuration');
    return false;
  }
  return true;
};

// Test Cloudinary connection
const testCloudinaryConnection = async () => {
  try {
    await cloudinary.api.ping();
    console.log('Cloudinary connection successful');
    return true;
  } catch (error) {
    console.error('Cloudinary connection failed:', error);
    return false;
  }
};

// Initialize Cloudinary
const initializeCloudinary = async () => {
  if (!validateCloudinaryConfig()) {
    console.error('Invalid Cloudinary configuration');
    return false;
  }
  
  return await testCloudinaryConnection();
};

// Initialize Cloudinary on module load
initializeCloudinary().then(success => {
  if (!success) {
    console.error('Failed to initialize Cloudinary');
  }
});

// Get a document by ID
exports.getDocument = async (req, res) => {
  try {
    const documentId = req.params.documentId;
    console.log('Fetching document:', documentId);
    
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id
    });

    if (!document) {
      console.error('Document not found:', documentId);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log('Document found:', document);
    
    // Ensure the URL is properly formatted
    let documentUrl = document.url;
    
    // Check if the URL is from Cloudinary
    const isCloudinaryUrl = documentUrl.includes('cloudinary.com');
    
    // For Cloudinary URLs, ensure they're properly formatted
    if (isCloudinaryUrl) {
      // Make sure the URL is using HTTPS
      if (documentUrl.startsWith('http:')) {
        documentUrl = documentUrl.replace('http:', 'https:');
      }
      
      // For PDFs, ensure they're using the raw format
      if (document.name.toLowerCase().endsWith('.pdf')) {
        // Add resource_type=raw parameter for PDFs
        if (!documentUrl.includes('resource_type=raw')) {
          documentUrl = documentUrl + (documentUrl.includes('?') ? '&' : '?') + 'resource_type=raw';
        }
      }
    }
    
    console.log('Returning document URL:', documentUrl);
    
    return res.json({
      document: {
        _id: document._id,
        name: document.name,
        url: documentUrl,
        fileType: document.fileType,
        uploadedAt: document.uploadedAt,
        cloudinaryId: document.cloudinaryId || null
      }
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
};

// Summarize a document
exports.summarizeDocument = async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ message: 'Text is required for summarization' });
    }
    
    // Simple text summarization function
    const summarizeText = (text) => {
      // Split text into sentences
      const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
      
      // If text is too short, return as is
      if (sentences.length <= 3) {
        return text;
      }
      
      // Take first 3 sentences as summary
      const summary = sentences.slice(0, 3).join('. ') + '.';
      return summary;
    };
    
    const summary = summarizeText(text);
    
    return res.json({ summary });
  } catch (error) {
    console.error('Error summarizing document:', error);
    return res.status(500).json({ message: 'Error summarizing document', error: error.message });
  }
};

// Upload a document
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine resource type based on file extension
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    const resourceType = fileExtension === 'pdf' ? 'raw' : 'auto';

    // Upload to Cloudinary with proper resource type
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'documents',
      resource_type: resourceType,
      public_id: `${req.user._id}_${Date.now()}`,
    });

    // Create document record
    const document = new Document({
      name: req.file.originalname,
      url: result.secure_url,
      userId: req.user._id,
      fileType: fileExtension,
    });

    await document.save();

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        _id: document._id,
        name: document.name,
        url: document.url,
        fileType: document.fileType,
      },
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    // Clean up temporary file if it exists
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
};

// Get all documents for a user
exports.getDocuments = async (req, res) => {
  try {
    console.log('Getting documents for user:', req.user._id);
    
    if (!req.user) {
      console.error('User not authenticated');
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const documents = await Document.find({ userId: req.user._id })
      .sort({ uploadedAt: -1 });
    
    console.log(`Found ${documents.length} documents for user`);
    
    // Map documents to return format and ensure URLs are properly formatted
    const formattedDocuments = documents.map(doc => {
      let documentUrl = doc.url;
      
      // Check if the URL is from Cloudinary
      const isCloudinaryUrl = documentUrl.includes('cloudinary.com');
      
      // For Cloudinary URLs, ensure they're properly formatted
      if (isCloudinaryUrl) {
        // Make sure the URL is using HTTPS
        if (documentUrl.startsWith('http:')) {
          documentUrl = documentUrl.replace('http:', 'https:');
        }
        
        // For PDFs, ensure they're using the raw format
        if (doc.name.toLowerCase().endsWith('.pdf')) {
          // Check if the URL already has a format parameter
          if (!documentUrl.includes('/f_')) {
            // Add format parameter for PDF
            documentUrl = documentUrl.replace('/upload/', '/upload/f_pdf/');
          }
        }
      }
      
      return {
        _id: doc._id,
        name: doc.name,
        url: documentUrl,
        fileType: doc.fileType,
        uploadedAt: doc.uploadedAt
      };
    });
    
    return res.json(formattedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ 
      message: 'Error fetching documents', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Download a document
exports.downloadDocument = async (req, res) => {
  try {
    const documentId = req.params.documentId;
    console.log('Downloading document:', documentId);
    
    // Find the document in the database
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id
    });
    
    if (!document) {
      console.error('Document not found:', documentId);
      return res.status(404).json({ message: 'Document not found' });
    }
    
    console.log('Document found for download:', document.name);
    
    // Ensure the URL is properly formatted
    let documentUrl = document.url;
    
    // Check if the URL is from Cloudinary
    const isCloudinaryUrl = documentUrl.includes('cloudinary.com');
    
    if (isCloudinaryUrl) {
      // For Cloudinary URLs, we need to proxy the request to handle authentication
      const axios = require('axios');
      
      try {
        // Make sure the URL is using HTTPS
        if (documentUrl.startsWith('http:')) {
          documentUrl = documentUrl.replace('http:', 'https:');
        }
        
        // For PDFs, ensure they're using the raw format
        if (document.name.toLowerCase().endsWith('.pdf')) {
          if (!documentUrl.includes('resource_type=raw')) {
            documentUrl = documentUrl + (documentUrl.includes('?') ? '&' : '?') + 'resource_type=raw';
          }
        }
        
        console.log('Fetching document from Cloudinary:', documentUrl);
        
        // Fetch the document from Cloudinary
        const response = await axios({
          method: 'GET',
          url: documentUrl,
          responseType: 'arraybuffer',  // Changed from 'stream' to 'arraybuffer'
          headers: {
            // Using Cloudinary API credentials directly
            'Authorization': `Basic ${Buffer.from(process.env.CLOUDINARY_API_KEY + ':' + process.env.CLOUDINARY_API_SECRET).toString('base64')}`,
          }
        });
        
        // Set appropriate headers for viewing in browser
        const contentType = document.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : response.headers['content-type'];
        res.setHeader('Content-Type', contentType);
        
        // For PDFs, we want to display them in the browser, not download them
        if (document.name.toLowerCase().endsWith('.pdf')) {
          // Use 'inline' to display in browser instead of downloading
          res.setHeader('Content-Disposition', `inline; filename="${document.name}"; filename*=UTF-8''${encodeURIComponent(document.name)}`);
        } else {
          // For non-PDF files, use attachment to force download
          res.setHeader('Content-Disposition', `attachment; filename="${document.name}"; filename*=UTF-8''${encodeURIComponent(document.name)}`);
        }
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Send the response as a buffer
        return res.send(Buffer.from(response.data));
      } catch (proxyError) {
        console.error('Error proxying document from Cloudinary:', proxyError);
        
        // Fallback to redirect if proxy fails
        console.log('Falling back to redirect to Cloudinary URL');
        return res.redirect(documentUrl);
      }
    } else {
      // For other URLs, return the URL
      console.log('Returning document URL:', documentUrl);
      return res.json({ url: documentUrl });
    }
  } catch (error) {
    console.error('Error downloading document:', error);
    return res.status(500).json({ message: 'Error downloading document', error: error.message });
  }
};