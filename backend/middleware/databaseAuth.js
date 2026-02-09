const jwt = require('jsonwebtoken');

const databaseAuth = {
  // Middleware to check if user has HR or Admin role
  requireHRorAdmin: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      // Check if user has appropriate role
      if (decoded.role === 'HR' || decoded.role === 'Admin' || decoded.role === 'Super Admin') {
        next();
      } else {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions' 
        });
      }
    } catch (error) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token' 
      });
    }
  },

  // Middleware for general authentication
  requireAuth: (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized: No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token' 
      });
    }
  },

  // Check if user can delete tables (HR or Admin only)
  canDeleteTables: (req, res, next) => {
    if (req.user.role === 'HR' || req.user.role === 'Admin' || req.user.role === 'Super Admin') {
      next();
    } else {
      return res.status(403).json({ 
        error: 'Forbidden: Only HR and Admin users can delete tables' 
      });
    }
  }
};

module.exports = databaseAuth;