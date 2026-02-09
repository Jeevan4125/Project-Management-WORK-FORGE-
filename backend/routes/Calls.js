const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Call = require('../models/Call');
const User = require('../models/User');
const Project = require('../models/Project');
const { v4: uuidv4 } = require('uuid');

// Generate unique call link
const generateCallLink = () => {
  return `workforge-call-${uuidv4().split('-')[0]}`;
};

const generateShareLink = () => {
  return `https://workforge.app/join/${uuidv4()}`;
};

// @route   POST api/calls
// @desc    Create a new standup call
// @access  Private (HR, Project Manager, Super Admin)
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      scheduledAt,
      duration,
      maxParticipants,
      attendees
    } = req.body;

    // Validate required fields
    if (!title || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Title and scheduled time are required'
      });
    }

    // Validate date
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future'
      });
    }

    // Get host info
    const host = await User.findById(req.user.id).select('name email role');
    if (!host) {
      return res.status(404).json({
        success: false,
        message: 'Host user not found'
      });
    }

    // Get project info if provided
    let projectName = '';
    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        projectName = project.name;
      }
    }

    // Create the call
    const call = new Call({
      title,
      description: description || '',
      hostId: req.user.id,
      hostName: host.name,
      projectId: projectId || null,
      projectName,
      callLink: generateCallLink(),
      shareLink: generateShareLink(),
      scheduledAt: scheduledDate,
      duration: duration || 30,
      maxParticipants: maxParticipants || 50,
      attendees: attendees || [],
      status: 'scheduled'
    });

    await call.save();

    // Send notifications to attendees
    if (attendees && attendees.length > 0) {
      for (const attendee of attendees) {
        const user = await User.findById(attendee.userId);
        if (user) {
          // Create notification or send email
          console.log(`Notified ${user.email} about call: ${title}`);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Standup call created successfully',
      data: call
    });
  } catch (error) {
    console.error('Create call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/calls
// @desc    Get all calls
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let calls;
    const userRole = req.user.role;
    
    if (userRole === 'HR' || userRole === 'Super Admin') {
      // HR and Super Admin can see all calls
      calls = await Call.find()
        .sort({ scheduledAt: -1 })
        .populate('attendees.userId', 'name email')
        .populate('projectId', 'name');
    } else if (userRole === 'Project Manager') {
      // Project Managers can see their calls and calls for their projects
      const userProjects = await Project.find({ 
        $or: [
          { manager: req.user.id },
          { members: req.user.id }
        ]
      }).select('_id');
      
      const projectIds = userProjects.map(p => p._id);
      
      calls = await Call.find({
        $or: [
          { hostId: req.user.id },
          { projectId: { $in: projectIds } },
          { 'attendees.userId': req.user.id }
        ]
      })
      .sort({ scheduledAt: -1 })
      .populate('attendees.userId', 'name email')
      .populate('projectId', 'name');
    } else {
      // Team Members and Clients can only see calls they're invited to
      calls = await Call.find({
        $or: [
          { hostId: req.user.id },
          { 'attendees.userId': req.user.id }
        ]
      })
      .sort({ scheduledAt: -1 })
      .populate('attendees.userId', 'name email')
      .populate('projectId', 'name');
    }

    res.json({
      success: true,
      data: calls
    });
  } catch (error) {
    console.error('Get calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/calls/:id
// @desc    Get call by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id)
      .populate('attendees.userId', 'name email role')
      .populate('projectId', 'name');

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user has access
    const hasAccess = 
      req.user.id === call.hostId.toString() ||
      call.attendees.some(a => a.userId && a.userId.toString() === req.user.id) ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: call
    });
  } catch (error) {
    console.error('Get call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT api/calls/:id
// @desc    Update call
// @access  Private (Host, HR, Super Admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user can update
    const canUpdate = 
      req.user.id === call.hostId.toString() ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin';

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this call'
      });
    }

    // Update fields
    const updates = req.body;
    const allowedUpdates = [
      'title', 'description', 'scheduledAt', 'duration', 
      'maxParticipants', 'attendees', 'status'
    ];
    
    allowedUpdates.forEach(update => {
      if (updates[update] !== undefined) {
        call[update] = updates[update];
      }
    });

    call.updatedAt = Date.now();
    await call.save();

    res.json({
      success: true,
      message: 'Call updated successfully',
      data: call
    });
  } catch (error) {
    console.error('Update call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE api/calls/:id
// @desc    Delete call
// @access  Private (Host, HR, Super Admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user can delete
    const canDelete = 
      req.user.id === call.hostId.toString() ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin';

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this call'
      });
    }

    await call.deleteOne();

    res.json({
      success: true,
      message: 'Call deleted successfully'
    });
  } catch (error) {
    console.error('Delete call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST api/calls/:id/join
// @desc    Join a call

// @access  Private
// In backend/routes/calls.js
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate the ID
    if (!id || id.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid call ID'
      });
    }

    const call = await Call.findById(id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if call is active or scheduled
    if (call.status === 'completed' || call.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Call is not active'
      });
    }

    // Check if user is already in attendees
    const alreadyJoined = call.attendees.some(
      a => a.userId && a.userId.toString() === req.user.id
    );

    if (!alreadyJoined) {
      const user = await User.findById(req.user.id).select('name email');
      
      if (user) {
        // Check if max participants reached
        if (call.attendees.length >= call.maxParticipants) {
          return res.status(400).json({
            success: false,
            message: 'Call is full'
          });
        }

        // Add user to attendees
        call.attendees.push({
          userId: req.user.id,
          userName: user.name,
          userEmail: user.email,
          joinedAt: new Date()
        });

        // If this is the first attendee besides host, mark as active
        if (call.attendees.length > 0 && call.status === 'scheduled') {
          call.status = 'active';
        }

        await call.save();
      }
    }

    res.json({
      success: true,
      message: 'Joined call successfully',
      data: {
        callLink: call.callLink,
        shareLink: call.shareLink,
        title: call.title,
        hostName: call.hostName
      }
    });
  } catch (error) {
    console.error('Join call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// @route   POST api/calls/:id/leave
// @desc    Leave a call
// @access  Private
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Find attendee
    const attendeeIndex = call.attendees.findIndex(
      a => a.userId && a.userId.toString() === req.user.id
    );

    if (attendeeIndex !== -1) {
      // Update leave time and calculate duration
      call.attendees[attendeeIndex].leftAt = new Date();
      const joinedAt = call.attendees[attendeeIndex].joinedAt;
      if (joinedAt) {
        const duration = Math.round((new Date() - joinedAt) / (1000 * 60)); // minutes
        call.attendees[attendeeIndex].duration = duration;
      }

      await call.save();
    }

    res.json({
      success: true,
      message: 'Left call successfully'
    });
  } catch (error) {
    console.error('Leave call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST api/calls/:id/chat
// @desc    Send chat message in call
// @access  Private
router.post('/:id/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty'
      });
    }

    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user is in the call
    const isInCall = 
      req.user.id === call.hostId.toString() ||
      call.attendees.some(a => a.userId && a.userId.toString() === req.user.id);

    if (!isInCall) {
      return res.status(403).json({
        success: false,
        message: 'You are not in this call'
      });
    }

    const user = await User.findById(req.user.id).select('name');
    
    call.chatMessages.push({
      userId: req.user.id,
      userName: user.name,
      message: message.trim(),
      timestamp: new Date()
    });

    await call.save();

    res.json({
      success: true,
      message: 'Message sent',
      data: {
        userName: user.name,
        message: message.trim(),
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Send chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/calls/:id/chat
// @desc    Get call chat messages
// @access  Private
router.get('/:id/chat', auth, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id).select('chatMessages');
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user has access
    const hasAccess = 
      req.user.id === call.hostId.toString() ||
      call.attendees.some(a => a.userId && a.userId.toString() === req.user.id) ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: call.chatMessages
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST api/calls/:id/invite
// @desc    Invite employees to call
// @access  Private (Host, HR, Super Admin)
router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { employeeIds } = req.body;
    
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        message: 'Employee IDs array is required'
      });
    }

    const call = await Call.findById(req.params.id);
    
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Check if user can invite
    const canInvite = 
      req.user.id === call.hostId.toString() ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin';

    if (!canInvite) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to invite to this call'
      });
    }

    const invitedUsers = [];
    for (const employeeId of employeeIds) {
      const user = await User.findById(employeeId).select('name email');
      if (user) {
        // Check if already invited
        const alreadyInvited = call.attendees.some(
          a => a.userId && a.userId.toString() === employeeId
        );

        if (!alreadyInvited) {
          call.attendees.push({
            userId: employeeId,
            userName: user.name,
            userEmail: user.email
          });
          invitedUsers.push(user.name);
        }
      }
    }

    await call.save();

    res.json({
      success: true,
      message: `Invited ${invitedUsers.length} employee(s) to the call`,
      data: {
        invitedCount: invitedUsers.length,
        invitedUsers
      }
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/calls/upcoming
// @desc    Get upcoming calls
// @access  Private
router.get('/upcoming/me', auth, async (req, res) => {
  try {
    const upcomingCalls = await Call.find({
      $or: [
        { hostId: req.user.id },
        { 'attendees.userId': req.user.id }
      ],
      scheduledAt: { $gte: new Date() },
      status: { $in: ['scheduled', 'active'] }
    })
    .sort({ scheduledAt: 1 })
    .limit(10)
    .select('title scheduledAt duration hostName projectName status');

    res.json({
      success: true,
      data: upcomingCalls
    });
  } catch (error) {
    console.error('Get upcoming calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET api/calls/history/me
// @desc    Get user's call history
// @access  Private
router.get('/history/me', auth, async (req, res) => {
  try {
    const callHistory = await Call.find({
      $or: [
        { hostId: req.user.id },
        { 'attendees.userId': req.user.id }
      ],
      scheduledAt: { $lt: new Date() },
      status: 'completed'
    })
    .sort({ scheduledAt: -1 })
    .select('title scheduledAt duration hostName attendees');

    res.json({
      success: true,
      data: callHistory
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;