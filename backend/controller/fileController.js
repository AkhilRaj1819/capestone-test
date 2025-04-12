const User = require('../model/schema.js');
const cloudinary = require('../config/cloudinaryConfig');
const fs = require('fs');

// Upload file to Cloudinary and save metadata
exports.saveFile = async (req, res) => {
    try {
        if (!req.file || !req.body.userEmail) {
            return res.status(400).json({ message: 'File and user email are required' });
        }

        const { userEmail } = req.body;
        const file = req.file;

        // Upload file to Cloudinary
        let result;
        try {
            result = await cloudinary.uploader.upload(file.path, {
                resource_type: 'raw',
                folder: `user_files/${userEmail.replace(/[.@]/g, '_')}`,
            });
        } catch (uploadError) {
            fs.unlinkSync(file.path);
            return res.status(502).json({ 
                message: 'File storage failed', 
                error: uploadError.message 
            });
        }

        // Find user by email
        let user = await User.findOne({ email: userEmail });

        // If user doesn't exist, create a temporary one
        if (!user) {
            try {
                user = new User({
                    username: userEmail.split('@')[0],
                    email: userEmail,
                    password: 'temporary'
                });
                await user.save();
            } catch (userError) {
                fs.unlinkSync(file.path);
                return res.status(404).json({ 
                    message: 'User creation failed',
                    error: userError.message
                });
            }
        }

        // Add file to user's files array
        user.files.push({
            fileName: file.originalname,
            fileUrl: result.secure_url,
            fileType: file.mimetype,
            storageRef: result.public_id,
            uploadDate: new Date(),
            summary: ''
        });

        try {
            await user.save();
            // Delete temporary file only after successful save
            fs.unlinkSync(file.path);
        } catch (saveError) {
            // Clean up Cloudinary upload if save failed
            await cloudinary.uploader.destroy(result.public_id);
            return res.status(503).json({
                message: 'Database save failed',
                error: saveError.message
            });
        }

        res.status(201).json({ 
            fileUrl: result.secure_url,
            fileId: user.files[user.files.length - 1]._id 
        });
    } catch (error) {
        console.error('Error saving file metadata:', error);
        res.status(500).json({ message: 'Error saving file metadata', error: error.message });
    }
};

// Get all files for a user
exports.getUserFiles = async (req, res) => {
    try {
        const { userEmail } = req.params;

        if (!userEmail) {
            return res.status(400).json({ message: 'User email is required' });
        }

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ files: user.files });
    } catch (error) {
        console.error('Error fetching user files:', error);
        res.status(500).json({ message: 'Error fetching user files', error: error.message });
    }
};

// Update file summary
exports.updateFileSummary = async (req, res) => {
    try {
        const { userEmail, fileId, summary } = req.body;

        if (!userEmail || !fileId || !summary) {
            return res.status(400).json({ message: 'Missing required information' });
        }

        const user = await User.findOne({ email: userEmail });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const file = user.files.id(fileId);

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        file.summary = summary;
        await user.save();

        res.status(200).json({ message: 'File summary updated successfully' });
    } catch (error) {
        console.error('Error updating file summary:', error);
        res.status(500).json({ message: 'Error updating file summary', error: error.message });
    }
};