const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostName: {
    type: String,
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  projectName: {
    type: String
  },
  callLink: {
    type: String,
    required: true,
    unique: true
  },
  shareLink: {
    type: String,
    unique: true
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    userEmail: String,
    joinedAt: Date,
    leftAt: Date,
    duration: Number // in minutes
  }],
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  isRecording: {
    type: Boolean,
    default: false
  },
  recordingUrl: {
    type: String
  },
  chatMessages: [{
    userId: mongoose.Schema.Types.ObjectId,
    userName: String,
    message: String,
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Call', callSchema);