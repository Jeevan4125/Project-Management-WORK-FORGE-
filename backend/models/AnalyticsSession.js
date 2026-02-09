// server/models/AnalyticsSession.js
const mongoose = require('mongoose');

const analyticsSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  loginTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  logoutTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  device: {
    type: String
  },
  ip: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'timeout'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Index for faster queries
analyticsSessionSchema.index({ userId: 1, loginTime: -1 });
analyticsSessionSchema.index({ loginTime: -1 });
analyticsSessionSchema.index({ status: 1 });

module.exports = mongoose.model('AnalyticsSession', analyticsSessionSchema);
