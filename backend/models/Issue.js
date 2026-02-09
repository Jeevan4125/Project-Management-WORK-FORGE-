const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['workplace', 'technical', 'hr', 'harassment', 'safety', 'other'],
    default: 'workplace'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'escalated'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    enum: ['hr', 'engineering', 'marketing', 'sales', 'operations', 'all']
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],
  confidential: {
    type: Boolean,
    default: false
  },
  // For anonymous reporting
  anonymous: {
    type: Boolean,
    default: false
  },
  // Additional fields for tracking
  reportedDate: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  resolvedDate: Date,
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    isPrivate: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  history: [{
    action: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: Object
  }],
  escalationLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 3
  },
  hrNotified: {
    type: Boolean,
    default: false
  },
  hrNotifiedAt: Date,
  lastViewedByHR: Date
}, {
  timestamps: true
});

// Index for faster queries
issueSchema.index({ status: 1, priority: -1, createdAt: -1 });
issueSchema.index({ reporter: 1, createdAt: -1 });
issueSchema.index({ assignedTo: 1, status: 1 });

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;