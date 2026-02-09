// Try using express Router since your server is running
const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User');

// For testing, create a simple auth middleware function
const authMiddleware = (req, res, next) => {
  // For testing, bypass auth
  console.log('Auth middleware called');
  req.user = { 
    id: '65d4f8a9e4b0c8a9c8f9b2a1', // dummy user ID
    role: 'hr', 
    department: 'hr' 
  };
  next();
};

// @route   POST /api/announcements
// @desc    Create a new announcement
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Creating announcement:', req.body);
    
    const { title, content, department, priority, expiresAt } = req.body;
    
    const announcement = new Announcement({
      title,
      content,
      department: department || 'all',
      priority: priority || 'medium',
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isPublished: false
    });

    await announcement.save();
    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/announcements
// @desc    Get all published announcements
router.get('/', authMiddleware, async (req, res) => {
  try {
    const announcements = await Announcement.find({ isPublished: true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: announcements.length,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/announcements/drafts
// @desc    Get draft announcements (HR only)
router.get('/drafts', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. HR only.'
      });
    }

    const drafts = await Announcement.find({ 
      isPublished: false,
      createdBy: req.user.id 
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: drafts
    });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/announcements/:id/publish
// @desc    Publish an announcement
router.put('/:id/publish', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Only HR can publish announcements'
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    announcement.isPublished = true;
    announcement.publishedAt = new Date();
    await announcement.save();

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement published successfully! All employees will receive it.'
    });
  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Only HR can delete announcements'
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.deleteOne();
    
    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/announcements/:id
// ... keep all your existing imports ...

// Import Message model for sending notifications
const Message = require('../models/Message');

// @route   PUT /api/announcements/:id/publish
// In your backend announcement routes - update the publish function:

router.put('/:id/publish', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Only HR can publish announcements'
      });
    }

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Mark as published
    announcement.isPublished = true;
    announcement.publishedAt = new Date();
    await announcement.save();

    // ✅ FIXED: Get ALL employees (non-HR) to send notifications
    const employees = await User.find({ 
      role: { $ne: 'hr' }, // Get all non-HR users
      status: 'Active' // Only active users
    });

    console.log(`📢 Found ${employees.length} employees to notify`);

    // ✅ FIXED: Create notification messages for each employee
    const notificationPromises = employees.map(employee => {
      const message = new Message({
        senderId: req.user.id,
        recipientId: employee._id,
        content: `📢 **NEW ANNOUNCEMENT**\n\n**${announcement.title}**\n\n${announcement.content}\n\n*Published by HR*`,
        subject: `Announcement: ${announcement.title}`,
        isAnnouncement: true,
        announcementId: announcement._id,
        read: false,
        timestamp: new Date()
      });
      return message.save();
    });

    // Wait for all notifications to be saved
    await Promise.all(notificationPromises);

    console.log(`✅ Sent announcement to ${employees.length} employees`);

    // ✅ FIXED: Send success response
    res.json({
      success: true,
      data: announcement,
      notifiedCount: employees.length,
      message: `Announcement published successfully! Sent to ${employees.length} employees.`
    });

  } catch (error) {
    console.error('Error publishing announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Add this new route to get announcement notifications
// @route   GET /api/announcements/notifications
// @desc    Get recent announcement notifications for current user
router.get('/notifications/recent', authMiddleware, async (req, res) => {
  try {
    // Get messages that are announcements for this user
    const announcementMessages = await Message.find({
      recipientId: req.user.id,
      isAnnouncement: true
    })
    .populate('senderId', 'name email')
    .sort({ timestamp: -1 })
    .limit(10);

    res.json({
      success: true,
      data: announcementMessages
    });
  } catch (error) {
    console.error('Error fetching announcement notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;