const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: {
    type: String,
    enum: ['all', 'hr', 'engineering', 'marketing', 'sales', 'operations'],
    default: 'all'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  expiresAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Index for efficient queries
announcementSchema.index({ isPublished: 1, createdAt: -1 });
announcementSchema.index({ department: 1, isPublished: 1 });

module.exports = mongoose.model('Announcement', announcementSchema);