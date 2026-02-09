const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware'); // ✅ Fixed import



// In your POST route
// PUT: Mark message as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipientId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.read = true;
    await message.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// In your POST route with debugging
// In your POST route with debugging - UPDATED VERSION
router.post('/', protect, async (req, res) => {
  try {
    console.log('Received message request body:', req.body);
    console.log('User ID (sender):', req.user.id);
    
    const { content, recipientId, subject, isUrgent, messageType } = req.body;
    const senderId = req.user.id;

    console.log('Content:', content);
    console.log('Recipient ID:', recipientId);
    console.log('Recipient ID type:', typeof recipientId);

    // Check if content is provided
    if (!content) {
      return res.status(400).json({ 
        message: 'Content is required',
        receivedContent: !!content,
        contentLength: content ? content.length : 0
      });
    }

    let recipient;

    // Handle HR department messages (when recipientId is null or 'hr-dept')
    if (!recipientId || recipientId === 'hr-dept') {
      // Find an HR user to receive the message
      recipient = await User.findOne({ role: 'HR' });
      
      if (!recipient) {
        console.log('No HR user found in database');
        return res.status(404).json({ 
          message: 'No HR representative available',
          recipientId: recipientId
        });
      }
      
      console.log('Message directed to HR department, assigning to:', recipient._id);
    } else {
      // Handle regular user messages
      // Try to find recipient - handle both string ID and ObjectId
      try {
        recipient = await User.findById(recipientId);
      } catch (error) {
        console.log('Error finding by ID, trying to find by other fields...');
        // Try to find by email or name if direct ID fails
        recipient = await User.findOne({
          $or: [
            { email: recipientId },
            { name: recipientId }
          ]
        });
      }

      if (!recipient) {
        console.log('Recipient not found with ID:', recipientId);
        return res.status(404).json({ 
          message: 'Recipient not found',
          recipientId: recipientId
        });
      }
    }

    const newMessage = new Message({
      senderId,
      recipientId: recipient._id, // Use the found user's _id
      content,
      subject: subject || '',
      isUrgent: isUrgent || false,
      messageType: messageType || 'general',
      timestamp: new Date(),
      read: false
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role');

    console.log('Message saved successfully:', populatedMessage._id);
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});
// GET: Get all messages for current user
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { recipientId: userId }]
    })
      .populate('senderId', 'name email role')
      .populate('recipientId', 'name email role')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/mark-all-read', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Update all unread messages where current user is the recipient
    const result = await Message.updateMany(
      { 
        recipientId: userId, 
        read: false 
      },
      { 
        $set: { read: true, readAt: new Date() } 
      }
    );
    
    res.json({ 
      success: true, 
      message: 'All messages marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error.message 
    });
  }
});

// ✅ ALSO ADD THIS ROUTE: Refresh announcements notification
router.post('/refresh-announcements', protect, async (req, res) => {
  try {
    // This is a dummy endpoint to trigger frontend refresh
    // In a real implementation, you might want to send socket events
    res.json({ 
      success: true, 
      message: 'Announcements refresh triggered'
    });
  } catch (error) {
    console.error('Error refreshing announcements:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

// ✅ ADD THIS TOO: Get unread messages count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Message.countDocuments({
      recipientId: userId,
      read: false
    });
    
    res.json({ 
      success: true, 
      unreadCount: unreadCount 
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;