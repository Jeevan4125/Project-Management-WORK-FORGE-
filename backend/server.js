const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

dotenv.config();

// Initialize Express
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB (updated for MongoDB driver 6.0+)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workforge')
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Import Models (needed for socket handlers)
const Message = require('./models/Message');
const Call = require('./models/Call');

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Store user info when they connect
  socket.on('user-connected', (userId) => {
    socket.userId = userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);
  });

  // Join a call room
  socket.on('join-call', async (data) => {
    const { callId, userId } = data;
    if (!callId || !userId) return;
    
    socket.join(callId);
    console.log(`User ${userId} (${socket.id}) joined call ${callId}`);
    
    try {
      // Update call attendees in database
      const call = await Call.findById(callId);
      if (call) {
        const attendeeIndex = call.attendees.findIndex(a => a.userId && a.userId.toString() === userId);
        if (attendeeIndex !== -1 && !call.attendees[attendeeIndex].joinedAt) {
          call.attendees[attendeeIndex].joinedAt = new Date();
          await call.save();
        }
      }
    } catch (error) {
      console.error('Error updating call attendees:', error);
    }
    
    // Notify others in the room
    socket.to(callId).emit('user-joined', {
      userId: userId,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // Leave a call room
  socket.on('leave-call', async (data) => {
    const { callId, userId } = data;
    if (!callId || !userId) return;
    
    socket.leave(callId);
    console.log(`User ${userId} (${socket.id}) left call ${callId}`);
    
    try {
      // Update call attendees in database
      const call = await Call.findById(callId);
      if (call) {
        const attendeeIndex = call.attendees.findIndex(a => a.userId && a.userId.toString() === userId);
        if (attendeeIndex !== -1 && call.attendees[attendeeIndex].joinedAt && !call.attendees[attendeeIndex].leftAt) {
          call.attendees[attendeeIndex].leftAt = new Date();
          const joinedAt = call.attendees[attendeeIndex].joinedAt;
          const duration = Math.round((new Date() - new Date(joinedAt)) / (1000 * 60)); // minutes
          call.attendees[attendeeIndex].duration = duration;
          await call.save();
        }
      }
    } catch (error) {
      console.error('Error updating call leave time:', error);
    }
    
    // Notify others in the room
    socket.to(callId).emit('user-left', {
      userId: userId,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // WebRTC signaling
  socket.on('offer', (data) => {
    const { to, offer, callId } = data;
    if (!to || !offer || !callId) return;
    
    socket.to(to).emit('offer', {
      from: socket.id,
      offer: offer,
      callId: callId
    });
  });

  socket.on('answer', (data) => {
    const { to, answer, callId } = data;
    if (!to || !answer || !callId) return;
    
    socket.to(to).emit('answer', {
      from: socket.id,
      answer: answer,
      callId: callId
    });
  });

  socket.on('ice-candidate', (data) => {
    const { to, candidate, callId } = data;
    if (!to || !candidate || !callId) return;
    
    socket.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate: candidate,
      callId: callId
    });
  });

  // Chat messages
  socket.on('send-chat', async (data) => {
    const { callId, userId, userName, message } = data;
    if (!callId || !userId || !userName || !message) return;
    
    const chatData = {
      userId: userId,
      userName: userName,
      message: message.trim(),
      timestamp: new Date()
    };
    
    try {
      // Save chat message to database
      const call = await Call.findById(callId);
      if (call) {
        call.chatMessages.push(chatData);
        await call.save();
      }
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
    
    // Broadcast to all in the call room
    io.to(callId).emit('receive-chat', chatData);
  });

  // Get call chat history
  socket.on('get-chat-history', async (data) => {
    const { callId } = data;
    if (!callId) return;
    
    try {
      const call = await Call.findById(callId).select('chatMessages');
      if (call) {
        socket.emit('chat-history', {
          callId: callId,
          messages: call.chatMessages || []
        });
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  // Screen sharing
  socket.on('start-screen-share', (data) => {
    const { callId } = data;
    if (!callId) return;
    
    socket.to(callId).emit('screen-share-started', {
      userId: socket.userId,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  socket.on('stop-screen-share', (data) => {
    const { callId } = data;
    if (!callId) return;
    
    socket.to(callId).emit('screen-share-stopped', {
      userId: socket.userId,
      socketId: socket.id,
      timestamp: new Date()
    });
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { callId, userId, isTyping } = data;
    if (!callId || !userId) return;
    
    socket.to(callId).emit('user-typing', {
      userId: userId,
      isTyping: isTyping,
      timestamp: new Date()
    });
  });

  // Call controls
  socket.on('mute-user', (data) => {
    const { callId, targetUserId, muted } = data;
    if (!callId || !targetUserId) return;
    
    io.to(callId).emit('user-muted', {
      userId: targetUserId,
      muted: muted,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Clean up any rooms the socket was in
    const rooms = Object.keys(socket.rooms);
    rooms.forEach(room => {
      if (room !== socket.id) {
        socket.to(room).emit('user-disconnected', {
          socketId: socket.id,
          timestamp: new Date()
        });
      }
    });
  });
});

// Import Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const documentsRoutes = require('./routes/documents');
const issueRoutes = require('./routes/issues');
const userRoutes = require('./routes/userRoutes');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');
const foldersRoutes = require('./routes/folders');
const announcementRoutes = require('./routes/announcements');
const callsRoutes = require('./routes/calls');
const videoRoutes = require('./routes/video');
const analyticsRoutes = require('./routes/analytics');
const databaseRoutes = require('./routes/database');
const chatbotRoutes = require('./routes/chatbot');
const timesheetRoutes = require('./routes/timesheets');
const User = require('./models/User');
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/calls', callsRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/timesheets', timesheetRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend is running!',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Serve static files (if you have uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} value`
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ready on port ${PORT}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
// Add these Socket.IO handlers to your existing server.js

// Store active users
const activeUsers = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Store user info when they connect
  socket.on('user-connected', async (userId) => {
    socket.userId = userId;
    activeUsers.set(socket.id, userId);
    
    console.log(`User ${userId} connected with socket ${socket.id}`);
    
    // Update user's online status in database
    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
    
    // Broadcast online users list to all clients
    const onlineUserIds = Array.from(activeUsers.values());
    io.emit('online-users', onlineUserIds);
  });

  // Send message
  socket.on('send-message', async (data) => {
    try {
      const { recipientId, ...messageData } = data;
      
      if (!recipientId) return;
      
      console.log(`Message from ${socket.userId} to ${recipientId}: ${messageData.content}`);
      
      // Find recipient's socket
      let recipientSocketId = null;
      for (const [sockId, userId] of activeUsers.entries()) {
        if (userId === recipientId) {
          recipientSocketId = sockId;
          break;
        }
      }
      
      // If recipient is online, send message via socket
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive-message', {
          ...messageData,
          read: false
        });
        console.log(`Real-time message delivered to ${recipientId}`);
      } else {
        console.log(`Recipient ${recipientId} is offline, message will be delivered when they come online`);
      }
      
      // Also emit to sender for their own UI update
      socket.emit('receive-message', {
        ...messageData,
        read: true
      });
      
    } catch (error) {
      console.error('Error sending message via socket:', error);
    }
  });

  // Message read status
  socket.on('message-read', async (data) => {
    try {
      const { messageId } = data;
      
      // Find the sender of the message
      const message = await Message.findById(messageId)
        .populate('senderId', 'id');
      
      if (message && message.senderId) {
        // Find sender's socket
        let senderSocketId = null;
        for (const [sockId, userId] of activeUsers.entries()) {
          if (userId.toString() === message.senderId._id.toString()) {
            senderSocketId = sockId;
            break;
          }
        }
        
        // Notify sender that their message was read
        if (senderSocketId) {
          io.to(senderSocketId).emit('message-read', {
            messageId: messageId
          });
        }
      }
    } catch (error) {
      console.error('Error handling message read:', error);
    }
  });

    // Typing indicator
  socket.on('typing', (data) => {
    const { recipientId, isTyping } = data;
    
    if (!recipientId) return;
    
    // Find recipient's socket
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === recipientId) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    // Send typing indicator to recipient
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('typing', {
        senderId: socket.userId,
        isTyping: isTyping
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('Client disconnected:', socket.id);
    
    const userId = activeUsers.get(socket.id);
    if (userId) {
      activeUsers.delete(socket.id);
      
      // Check if user still has other active connections
      const userStillOnline = Array.from(activeUsers.values()).some(id => id === userId);
      
      if (!userStillOnline) {
        // Update user's online status in database
        try {
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date()
          });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
      
      // Broadcast updated online users list
      const onlineUserIds = Array.from(activeUsers.values());
      io.emit('online-users', onlineUserIds);
    }
  });

  // Handle user logout
  socket.on('user-logout', async (userId) => {
    // Remove all socket connections for this user
    for (const [sockId, uid] of activeUsers.entries()) {
      if (uid === userId) {
        const sock = io.sockets.sockets.get(sockId);
        if (sock) {
          sock.disconnect();
        }
      }
    }
  });

  // Join conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} joined conversation ${conversationId}`);
  });

  // Leave conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`User ${socket.userId} left conversation ${conversationId}`);
  });

  // Call handling (WebRTC signaling)
  socket.on('call-user', (data) => {
    const { to, offer, callerName, callerId } = data;
    
    // Find recipient's socket
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === to) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming-call', {
        from: socket.userId,
        offer: offer,
        callerName: callerName,
        callerId: callerId
      });
    }
  });

  socket.on('call-accepted', (data) => {
    const { to, answer } = data;
    
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === to) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-accepted', {
        answer: answer
      });
    }
  });

  socket.on('call-rejected', (data) => {
    const { to } = data;
    
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === to) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-rejected');
    }
  });

  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === to) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('ice-candidate', {
        candidate: candidate
      });
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    
    let recipientSocketId = null;
    for (const [sockId, userId] of activeUsers.entries()) {
      if (userId === to) {
        recipientSocketId = sockId;
        break;
      }
    }
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call-ended');
    }
  });

  // Presence status update
  socket.on('presence-update', async (data) => {
    const { status, customMessage } = data;
    
    try {
      await User.findByIdAndUpdate(socket.userId, {
        presenceStatus: status,
        presenceMessage: customMessage
      });
      
      // Broadcast to all connected clients
      io.emit('presence-updated', {
        userId: socket.userId,
        status: status,
        customMessage: customMessage
      });
    } catch (error) {
      console.error('Error updating presence status:', error);
    }
  });

  // Handle reconnection
  socket.on('reconnect', async () => {
    console.log('Client reconnected:', socket.id);
    
    if (socket.userId) {
      activeUsers.set(socket.id, socket.userId);
      
      try {
        await User.findByIdAndUpdate(socket.userId, {
          isOnline: true,
          lastSeen: new Date()
        });
      } catch (error) {
        console.error('Error updating user online status on reconnect:', error);
      }
      
      // Broadcast online users list
      const onlineUserIds = Array.from(activeUsers.values());
      io.emit('online-users', onlineUserIds);
    }
  });
});
module.exports = { app, server, io };