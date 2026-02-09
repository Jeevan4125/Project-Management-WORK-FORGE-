// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*\.\w{2,}$/i, 'Please enter a valid email']
  },
   department: {
    type: String,
    enum: ['hr', 'engineering', 'marketing', 'sales', 'operations'],
    default: 'engineering'
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'hr', 'admin'],
    default: 'employee'
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR'],
    default: 'Team Member'
  },
  avatar: {
    type: String,
    default: ''
  },
  isNewUser: {
    type: Boolean,
    default: true
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  department: String,
  employeeId: String,
  hireDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ CORRECT: Async pre-save WITHOUT next()
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);