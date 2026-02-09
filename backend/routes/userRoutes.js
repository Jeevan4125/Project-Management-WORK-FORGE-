const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware'); // ✅ IMPORT PROTECT

// Middleware: HR-only
const checkHR = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Access Denied' });
  if (req.user.role !== 'HR') return res.status(403).json({ message: 'Access Denied. HR only.' });
  next();
};

// GET /api/users → returns all non-HR users (employees)
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'HR') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employees = await User.find(
      { role: { $ne: 'HR' } },
      '_id name email role status createdAt' // ✅ include _id
    );

    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching employees' });
  }
});

// DELETE /api/users/:id → remove employee
router.delete('/:id', checkHR, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee removed successfully' });
  } catch (err) {
    console.error("💥 Database Error:", err);
    res.status(500).json({ message: 'Error removing employee', error: err.message });
  }
});

module.exports = router;