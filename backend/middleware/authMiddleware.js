const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  try {
    let token;

    // Check if Authorization header exists and has the correct format
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted from Authorization header');
    } else {
      console.log('No valid Authorization header found');
      return res.status(401).json({ 
        message: 'Not authorized', 
        error: 'No token provided' 
      });
    }

    if (!token) {
      console.log('No token found in Authorization header');
      return res.status(401).json({ 
        message: 'Not authorized', 
        error: 'No token provided' 
      });
    }

    try {
      // Verify token
      console.log('Verifying token with secret:', process.env.JWT_SECRET ? 'Secret exists' : 'Secret missing');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decoded successfully:', decoded);
      
      // Find user by ID
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        console.log('User not found for ID:', decoded.id);
        return res.status(401).json({ 
          message: 'Not authorized', 
          error: 'User not found' 
        });
      }
      
      console.log('User found:', user._id);
      req.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      
      // Provide specific error messages based on JWT error type
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Not authorized', 
          error: 'Invalid token signature' 
        });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Not authorized', 
          error: 'Token expired' 
        });
      } else {
        return res.status(401).json({ 
          message: 'Not authorized', 
          error: jwtError.message 
        });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = { protect }; 