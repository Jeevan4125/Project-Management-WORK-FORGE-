// backend/routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const User = require('../models/User');
const Message = require('../models/Message'); // Add Message model
const { protect } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

// POST: Create a new project - SIMPLIFIED VERSION
router.post('/', async (req, res) => {
  console.log('=== CREATE PROJECT ROUTE HIT ===');
  console.log('Request body:', req.body);
  
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Extract data from request body
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      members = [],
      status = 'Active'
    } = req.body;

    console.log('Project data:', {
      name,
      description,
      startDate,
      endDate,
      members,
      membersType: typeof members,
      membersLength: members.length,
      status,
      managerId: decoded.id
    });

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Name, start date, and end date are required'
      });
    }

    // ✅ Ensure members is always an array
    let validMembers = [];
    
    if (members && Array.isArray(members)) {
      // Filter out any empty/null values
      validMembers = members.filter(memberId => 
        memberId && typeof memberId === 'string' && memberId.trim() !== ''
      );
    }

    console.log('Valid members:', validMembers);

    // Find the manager (current user)
    const manager = await User.findById(decoded.id);
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager user not found'
      });
    }

    // Create project
    const project = new Project({
      name,
      description: description || '',
      startDate,
      endDate,
      status,
      manager: decoded.id,
      members: validMembers,
      progress: 0,
      tasks: 0,
      completedTasks: 0
    });

    console.log('Saving project to database...');
    await project.save();
    console.log('Project saved with ID:', project._id);

    // ✅ Send notifications to each assigned member
    if (validMembers.length > 0) {
      console.log(`Sending notifications to ${validMembers.length} members`);
      for (const memberId of validMembers) {
        try {
          const user = await User.findById(memberId);
          if (user) {
            const notification = new Message({
              senderId: decoded.id,
              recipientId: memberId,
              content: `You have been assigned to the project: "${name}". Check your Projects page to access it.`,
              type: 'project_assignment',
              read: false
            });
            await notification.save();
            console.log(`Notification sent to ${user.name} (${memberId})`);
          }
        } catch (notifErr) {
          console.error(`Failed to send notification:`, notifErr.message);
        }
      }
    }

    // Populate the project with user details
    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    console.log('✅ Project created successfully:', {
      id: populatedProject._id,
      name: populatedProject.name,
      manager: populatedProject.manager?.name,
      memberCount: populatedProject.members?.length
    });
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populatedProject
    });
    
  } catch (error) {
    console.error('🔥 CRITICAL ERROR creating project:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error while creating project',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
// In backend/routes/projects.js - POST /api/projects
router.post('/', protect, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      startDate, 
      endDate, 
      members = [],
      status = 'Active'
    } = req.body;

    // Create project with members automatically added
    const project = new Project({
      name,
      description,
      startDate,
      endDate,
      status,
      manager: req.user.id,
      members: members, // This will add members directly
      progress: 0,
      tasks: 0,
      completedTasks: 0
    });

    await project.save();

    // ✅ Automatically send notification to each assigned member
    if (members && members.length > 0) {
      for (const memberId of members) {
        // Create notification message
        const notification = new Message({
          senderId: req.user.id,
          recipientId: memberId,
          content: `You have been assigned to the project: "${name}". Check your Projects page to access it.`,
          type: 'project_assignment',
          read: false
        });
        await notification.save();
      }
    }

    const populatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});
// GET: Get all projects for current user (including projects they're a member of)
// In backend/routes/projects.js - GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    
    // Show projects where user is manager OR member
    if (userRole === 'HR' || userRole === 'Super Admin') {
      query = {};
    } else {
      query = {
        $or: [
          { manager: userId },
          { members: userId } // ✅ Include projects where user is a member
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('manager', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET: Search projects (for team members to find HR projects)
router.get('/search', protect, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('Search request received:', { 
      query, 
      userId, 
      userRole 
    });

    // Build search criteria
    let searchCriteria = {};

    if (query && query.trim() !== '') {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // HR and Super Admin can see all projects
    if (userRole === 'HR' || userRole === 'Super Admin') {
      const projects = await Project.find(searchCriteria)
        .populate('manager', 'name email role')
        .populate('members', 'name email role')
        .sort({ createdAt: -1 });
      
      console.log(`HR/Super Admin found ${projects.length} projects`);
      return res.json(projects);
    } 
    // For Project Managers, show projects they don't manage and aren't members of
    else if (userRole === 'Project Manager') {
      const projects = await Project.find({
        ...searchCriteria,
        manager: { $ne: userId }, // Not managed by them
        members: { $ne: userId } // Not a member already
      })
      .populate('manager', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });
      
      console.log(`Project Manager found ${projects.length} projects to join`);
      return res.json(projects);
    }
    // For Team Members and Clients, show projects they're not members of
    else {
      const projects = await Project.find({
        ...searchCriteria,
        members: { $ne: userId } // User is NOT in members array
      })
      .populate('manager', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });
      
      console.log(`User found ${projects.length} projects they can join`);
      return res.json(projects);
    }
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// In backend/routes/projects.js - FIXED JOIN ROUTE
router.post('/:id/join', async (req, res) => {
  console.log('=== JOIN ROUTE CALLED ===');
  console.log('Project ID:', req.params.id);
  
  try {
    const projectId = req.params.id;
    
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    const userId = decoded.id;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    console.log('User:', user.name, 'Role:', user.role);
    
    // Find project
    const project = await Project.findById(projectId)
      .populate('manager', 'name email role');
    
    if (!project) {
      console.log('Project not found');
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    console.log('Found project:', project.name);
    console.log('Current members:', project.members);
    
    // Check if already a member
    const isMember = project.members.some(memberId => {
      return memberId && memberId.toString() === userId.toString();
    });
    
    if (isMember) {
      console.log('User already a member');
      return res.status(400).json({
        success: false,
        message: 'You are already a member of this project'
      });
    }
    
    // Add user to members
    console.log('Adding user to project...');
    project.members.push(userId);
    await project.save();
    console.log('User added successfully');
    
    // Get updated project with populated data
    const updatedProject = await Project.findById(projectId)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');
    
    res.json({
      success: true,
      message: `Successfully joined "${project.name}"`,
      project: updatedProject
    });
    
  } catch (error) {
    console.error('🔥 JOIN ERROR DETAILS:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join project',
      error: error.message
    });
  }
});
// DELETE: Delete a project
router.delete('/:id', protect, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('Delete request:', { projectId, userId, userRole });

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }

    // Check permission: Only manager, HR, or Super Admin can delete
    const canDelete = (
      project.manager.toString() === userId.toString() ||
      userRole === 'HR' ||
      userRole === 'Super Admin'
    );

    if (!canDelete) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this project' 
      });
    }

    await Project.findByIdAndDelete(projectId);

    res.json({
      success: true,
      message: `Project "${project.name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// PUT: Update project members
router.put('/:id/members', protect, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { members } = req.body;
    const userId = req.user.id;

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check permission: Only manager, HR, or Super Admin can update members
    const canUpdate = (
      project.manager.toString() === userId.toString() ||
      req.user.role === 'HR' ||
      req.user.role === 'Super Admin'
    );

    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized to update project members' });
    }

    // Validate all members exist
    let validMembers = [];
    if (members && members.length > 0) {
      for (const memberId of members) {
        const user = await User.findById(memberId);
        if (!user) {
          return res.status(400).json({ 
            message: `User with ID ${memberId} not found` 
          });
        }
        validMembers.push(memberId);
      }
    }

    // Update members
    project.members = validMembers;
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project members:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET: Get project by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findById(projectId)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }

    // Check if user has access
    const hasAccess = (
      userRole === 'HR' ||
      userRole === 'Super Admin' ||
      project.manager.toString() === userId.toString() ||
      project.members.some(member => member._id.toString() === userId.toString())
    );

    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Not authorized to view this project' 
      });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// PUT: Update project details
router.put('/:id', protect, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const project = await Project.findById(projectId);
    
    if (!project) {
      return res.status(404).json({ 
        message: 'Project not found' 
      });
    }

    // Check permission: Only manager, HR, or Super Admin can update
    const canUpdate = (
      project.manager.toString() === userId.toString() ||
      userRole === 'HR' ||
      userRole === 'Super Admin'
    );

    if (!canUpdate) {
      return res.status(403).json({ 
        message: 'Not authorized to update this project' 
      });
    }

    // Update project fields
    const { name, description, startDate, endDate, status, progress } = req.body;
    
    if (name) project.name = name;
    if (description) project.description = description;
    if (startDate) project.startDate = startDate;
    if (endDate) project.endDate = endDate;
    if (status) project.status = status;
    if (progress !== undefined) project.progress = progress;

    await project.save();

    const updatedProject = await Project.findById(projectId)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
});

// Add this test route to your backend routes/projects.js
router.post('/:id/join-simple', protect, async (req, res) => {
  console.log('=== SIMPLE TEST ROUTE CALLED ===');
  console.log('Project ID:', req.params.id);
  console.log('User ID:', req.user.id);
  
  return res.json({
    success: true,
    message: 'Simple route works!',
    projectId: req.params.id,
    userId: req.user.id
  });
});

module.exports = router;