// In routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const authenticate = require('../middleware/auth');

// ... your existing message routes ...

// Mark all messages as read for current user
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Message.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true, message: 'All messages marked as read' });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark single message as read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { $set: { read: true } },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// In your messageRoutes.js backend
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { recipientId: userId }
      ]
    })
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role')
      .sort({ timestamp: -1 }); // Sort by newest first

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;