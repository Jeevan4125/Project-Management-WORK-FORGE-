// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  console.log('=== PROTECT MIDDLEWARE CALLED ===');
  console.log('Authorization Header:', req.headers.authorization);
  
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extracted:', token ? 'Yes' : 'No');
    }
    
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no token' 
      });
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('Token decoded, user ID:', decoded.id);
      
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        console.log('User not found in database');
        return res.status(401).json({ 
          success: false,
          message: 'User not found' 
        });
      }
      
      console.log('User authenticated:', req.user.email);
      next(); // Call next to continue to the route handler
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, token failed' 
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};



module.exports = { protect };