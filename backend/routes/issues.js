const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route   GET /api/issues
// @desc    Get all issues for logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const user = req.user;

    let issues;

    if (['Super Admin', 'Project Manager', 'HR'].includes(user.role)) {
      issues = await Issue.find().populate('reporter assignedTo', 'name email role avatar');
    } else if (user.role === 'Team Member') {
      issues = await Issue.find({
        $or: [
          { assignedTo: user._id },
          { reporter: user._id }
        ]
      }).populate('reporter assignedTo', 'name email role avatar');
    } else if (user.role === 'Client') {
      const projects = await Project.find({ client: user._id });
      const projectIds = projects.map(p => p._id);
      issues = await Issue.find({ project: { $in: projectIds } }).populate('reporter assignedTo', 'name email role avatar');
    } else {
      issues = await Issue.find({ reporter: user._id }).populate('reporter assignedTo', 'name email role avatar');
    }

    res.json({
      success: true,
      data: issues || []
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching issues',
      error: error.message
    });
  }
});

// @route   POST /api/issues
// @desc    Create a new issue
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category, priority, confidential, anonymous, department } = req.body;
    const user = req.user;

    // Create issue
    const issue = new Issue({
      title,
      description,
      category: category || 'workplace',
      priority: priority || 'medium',
      reporter: user._id,
      confidential: confidential || false,
      anonymous: anonymous || false,
      department: department || 'hr'
    });

    await issue.save();

    // Populate reporter info
    const populatedIssue = await Issue.findById(issue._id).populate('reporter', 'name email role');

    // Notify HR if issue is confidential or high priority
    if (confidential || priority === 'high' || priority === 'critical') {
      // You can add notification logic here
      console.log(`⚠️ Confidential/High priority issue created: ${issue._id}`);
    }

    res.status(201).json({
      success: true,
      message: 'Issue reported successfully',
      data: populatedIssue
    });
  } catch (error) {
    console.error('Error creating issue:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting issue',
      error: error.message
    });
  }
});

// @route   GET /api/issues/stats/overview
// @desc    Get issue statistics (for HR/Admin)
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const user = req.user;
    
    // Only HR, Super Admin, and Project Managers can view stats
    if (!['HR', 'Super Admin', 'Project Manager'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view issue statistics'
      });
    }

    // Get statistics
    const totalIssues = await Issue.countDocuments();
    const openIssues = await Issue.countDocuments({ status: 'open' });
    const inProgressIssues = await Issue.countDocuments({ status: 'in_progress' });
    const resolvedIssues = await Issue.countDocuments({ status: 'resolved' });
    const closedIssues = await Issue.countDocuments({ status: 'closed' });

    // Get issues by status
    const byStatus = await Issue.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get issues by priority
    const byPriority = await Issue.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get issues by category
    const byCategory = await Issue.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    // Average resolution time (for resolved issues)
    const avgResolutionTime = await Issue.aggregate([
      {
        $match: {
          status: 'resolved',
          resolvedDate: { $exists: true }
        }
      },
      {
        $addFields: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolvedDate', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert ms to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        total: totalIssues,
        open: openIssues,
        inProgress: inProgressIssues,
        resolved: resolvedIssues,
        closed: closedIssues,
        byStatus,
        byPriority,
        byCategory,
        avgResolutionTime: avgResolutionTime[0] || { avgTime: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching issue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching issue statistics',
      error: error.message
    });
  }
});

// @route   GET /api/issues/:id
// @desc    Get single issue by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reporter', 'name email role')
      .populate('assignedTo', 'name email role');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check if user has access to this issue
    const user = req.user;
    if (!['Super Admin', 'Project Manager', 'HR'].includes(user.role)) {
      if (issue.reporter._id.toString() !== user._id.toString() && 
          (!issue.assignedTo || issue.assignedTo._id.toString() !== user._id.toString())) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this issue'
        });
      }
    }

    res.json({
      success: true,
      data: issue
    });
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching issue',
      error: error.message
    });
  }
});

// @route   PUT /api/issues/:id/status
// @desc    Update issue status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const user = req.user;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check permissions
    const canUpdate = ['Super Admin', 'Project Manager', 'HR'].includes(user.role) ||
                     (issue.reporter && issue.reporter.toString() === user._id.toString());

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this issue'
      });
    }

    // Update status
    issue.status = status;
    
    // Set resolved date if status is resolved
    if (status === 'resolved') {
      issue.resolvedDate = new Date();
    }

    // Add to history
    issue.history.push({
      action: `Status changed to ${status}`,
      user: user._id,
      details: { oldStatus: issue.status, newStatus: status }
    });

    await issue.save();

    res.json({
      success: true,
      message: `Issue status updated to ${status}`,
      data: issue
    });
  } catch (error) {
    console.error('Error updating issue status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating issue status',
      error: error.message
    });
  }
});

// @route   POST /api/issues/:id/comments
// @desc    Add comment to issue
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text, isPrivate } = req.body;
    const user = req.user;

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check if user has access to this issue
    const canComment = ['Super Admin', 'Project Manager', 'HR'].includes(user.role) ||
                      (issue.reporter && issue.reporter.toString() === user._id.toString());

    if (!canComment) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this issue'
      });
    }

    // Add comment
    issue.comments.push({
      user: user._id,
      text,
      isPrivate: isPrivate || false
    });

    // Add to history
    issue.history.push({
      action: 'Comment added',
      user: user._id,
      details: { comment: text.substring(0, 50) + (text.length > 50 ? '...' : '') }
    });

    await issue.save();

    // Populate the new comment
    const populatedIssue = await Issue.findById(issue._id)
      .populate('comments.user', 'name email role')
      .populate('reporter', 'name email role')
      .populate('assignedTo', 'name email role');

    const newComment = populatedIssue.comments[populatedIssue.comments.length - 1];

    res.json({
      success: true,
      message: 'Comment added',
      data: newComment
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// @route   PUT /api/issues/:id/assign
// @desc    Assign issue to HR/user
router.put('/:id/assign', protect, async (req, res) => {
  try {
    const { assigneeId } = req.body;
    const user = req.user;

    // Only HR, Super Admin, and Project Managers can assign issues
    if (!['Super Admin', 'Project Manager', 'HR'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to assign issues'
      });
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Update assignee
    issue.assignedTo = assigneeId || user._id; // Default to current user if no assigneeId
    
    // Add to history
    issue.history.push({
      action: `Assigned to ${assigneeId ? 'another user' : 'self'}`,
      user: user._id,
      details: { assigneeId: assigneeId || user._id }
    });

    await issue.save();

    res.json({
      success: true,
      message: 'Issue assigned successfully',
      data: issue
    });
  } catch (error) {
    console.error('Error assigning issue:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning issue',
      error: error.message
    });
  }
});

// @route   DELETE /api/issues/:id
// @desc    Delete issue (only reporter, HR, or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const user = req.user;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check permissions
    const canDelete = ['Super Admin', 'HR'].includes(user.role) ||
                     (issue.reporter && issue.reporter.toString() === user._id.toString());

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this issue'
      });
    }

    await Issue.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting issue',
      error: error.message
    });
  }
});

module.exports = router;