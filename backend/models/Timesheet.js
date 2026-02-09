const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  task: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/ // HH:MM format
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]\d|2[0-3]):([0-5]\d)$/
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  billable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending'
  },
  submittedAt: Date,
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate hours before saving
timesheetSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const [startHour, startMin] = this.startTime.split(':').map(Number);
    const [endHour, endMin] = this.endTime.split(':').map(Number);
    
    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;
    
    // Handle overnight entries
    const diffMinutes = endTotal >= startTotal ? endTotal - startTotal : (1440 - startTotal) + endTotal;
    this.hours = parseFloat((diffMinutes / 60).toFixed(2));
  }
  
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
timesheetSchema.index({ userId: 1, date: -1 });
timesheetSchema.index({ projectId: 1, status: 1 });
timesheetSchema.index({ status: 1, submittedAt: 1 });

module.exports = mongoose.model('Timesheet', timesheetSchema);