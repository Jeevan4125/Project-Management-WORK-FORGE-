const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route   GET /api/tasks
// @desc    Get all tasks for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;

    let tasks;

    if (['Super Admin', 'Project Manager', 'HR'].includes(user.role)) {
      tasks = await Task.find().populate('project assignee', 'name email role avatar');
    } else if (user.role === 'Team Member') {
      tasks = await Task.find({ assignee: user._id }).populate('project assignee', 'name email role avatar');
    } else if (user.role === 'Client') {
      // Client can see tasks in their projects
      const projects = await Project.find({ client: user._id });
      const projectIds = projects.map(p => p._id);
      tasks = await Task.find({ project: { $in: projectIds } }).populate('project assignee', 'name email role avatar');
    }

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;