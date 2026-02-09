const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST /api/folders
// @desc    Create a new folder
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, projectId, parentFolder, accessLevel } = req.body;
    
    // Validate required fields
    if (!name || !projectId) {
      return res.status(400).json({ msg: 'Name and project are required' });
    }

    // Check if user has access to project
    const user = await User.findById(req.user.id);
    if (!user.projects.includes(projectId)) {
      return res.status(403).json({ msg: 'No access to this project' });
    }

    // Check if parent folder exists and belongs to same project
    if (parentFolder) {
      const parent = await Folder.findById(parentFolder);
      if (!parent) {
        return res.status(404).json({ msg: 'Parent folder not found' });
      }
      if (parent.projectId.toString() !== projectId) {
        return res.status(400).json({ msg: 'Parent folder must be in same project' });
      }
    }

    // Create folder
    const folder = new Folder({
      name,
      description: description || '',
      projectId,
      createdBy: req.user.id,
      parentFolder: parentFolder || null,
      accessLevel: accessLevel || 'private'
    });

    await folder.save();

    // Populate and return
    const populatedFolder = await Folder.findById(folder._id)
      .populate('projectId', 'name')
      .populate('createdBy', 'name email')
      .populate('parentFolder', 'name');

    res.json(populatedFolder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/folders
// @desc    Get all folders for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get folders where user has access
    const folders = await Folder.find({
      $or: [
        { createdBy: req.user.id },
        { accessLevel: 'public' },
        { 
          accessLevel: 'team',
          projectId: { $in: user.projects }
        }
      ]
    })
    .populate('projectId', 'name')
    .populate('createdBy', 'name email')
    .populate('parentFolder', 'name')
    .sort({ createdAt: -1 });

    res.json(folders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/folders/project/:projectId
// @desc    Get folders for specific project
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const folders = await Folder.find({
      projectId: req.params.projectId,
      $or: [
        { createdBy: req.user.id },
        { accessLevel: 'public' },
        { accessLevel: 'team' }
      ]
    })
    .populate('createdBy', 'name email')
    .populate('parentFolder', 'name')
    .sort({ name: 1 });

    // Organize into tree structure
    const folderTree = buildFolderTree(folders);
    
    res.json(folderTree);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/folders/:id
// @desc    Get folder by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id)
      .populate('projectId', 'name')
      .populate('createdBy', 'name email')
      .populate('parentFolder', 'name')
      .populate('sharedWith.user', 'name email');

    if (!folder) {
      return res.status(404).json({ msg: 'Folder not found' });
    }

    // Check access
    const user = await User.findById(req.user.id);
    const hasAccess = 
      folder.createdBy._id.toString() === req.user.id ||
      folder.accessLevel === 'public' ||
      (folder.accessLevel === 'team' && user.projects.includes(folder.projectId._id)) ||
      folder.sharedWith.some(share => share.user._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ msg: 'No access to this folder' });
    }

    res.json(folder);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Folder not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/folders/:id
// @desc    Update folder
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, accessLevel } = req.body;
    
    let folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ msg: 'Folder not found' });
    }

    // Check if user is owner or has admin permission
    const isOwner = folder.createdBy.toString() === req.user.id;
    const hasAdminAccess = folder.sharedWith.some(
      share => share.user.toString() === req.user.id && share.permission === 'admin'
    );

    if (!isOwner && !hasAdminAccess) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Update fields
    if (name) folder.name = name;
    if (description !== undefined) folder.description = description;
    if (accessLevel) folder.accessLevel = accessLevel;
    
    await folder.save();

    folder = await Folder.findById(folder._id)
      .populate('projectId', 'name')
      .populate('createdBy', 'name email')
      .populate('parentFolder', 'name');

    res.json(folder);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Folder not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/folders/:id
// @desc    Delete folder
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ msg: 'Folder not found' });
    }

    // Check if user is owner
    if (folder.createdBy.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);
      if (user.role !== 'HR' && user.role !== 'Super Admin') {
        return res.status(403).json({ msg: 'Not authorized' });
      }
    }

    // Check if folder has subfolders
    const hasSubfolders = await Folder.exists({ parentFolder: folder._id });
    if (hasSubfolders) {
      return res.status(400).json({ msg: 'Cannot delete folder with subfolders' });
    }

    // TODO: Check if folder has documents (you'll need to implement this)

    await Folder.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Folder deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Folder not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST /api/folders/:id/share
// @desc    Share folder with users
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userId, permission } = req.body;
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ msg: 'Folder not found' });
    }

    // Check if user is owner
    if (folder.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if user exists
    const userToShare = await User.findById(userId);
    if (!userToShare) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if already shared
    const existingShareIndex = folder.sharedWith.findIndex(
      share => share.user.toString() === userId
    );

    if (existingShareIndex !== -1) {
      // Update existing permission
      folder.sharedWith[existingShareIndex].permission = permission;
    } else {
      // Add new share
      folder.sharedWith.push({
        user: userId,
        permission: permission || 'view'
      });
    }

    await folder.save();

    res.json(folder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/folders/:id/move
// @desc    Move folder to different parent
// @access  Private
router.post('/:id/move', auth, async (req, res) => {
  try {
    const { parentFolderId } = req.body;
    
    const folder = await Folder.findById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ msg: 'Folder not found' });
    }

    // Check if user is owner
    if (folder.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Check if moving to different parent
    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder) {
        return res.status(404).json({ msg: 'Parent folder not found' });
      }
      
      // Check if parent is in same project
      if (parentFolder.projectId.toString() !== folder.projectId.toString()) {
        return res.status(400).json({ msg: 'Cannot move folder to different project' });
      }

      // Check for circular reference (folder cannot be its own parent)
      if (parentFolderId === folder._id.toString()) {
        return res.status(400).json({ msg: 'Folder cannot be its own parent' });
      }

      // Check if parent is a descendant of this folder
      const isDescendant = await checkDescendant(folder._id, parentFolderId);
      if (isDescendant) {
        return res.status(400).json({ msg: 'Cannot move folder to its descendant' });
      }

      folder.parentFolder = parentFolderId;
    } else {
      // Move to root (no parent)
      folder.parentFolder = null;
    }

    await folder.save();

    res.json(folder);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Helper function to build folder tree
function buildFolderTree(folders, parentId = null) {
  const tree = [];
  
  folders
    .filter(folder => {
      if (parentId === null) {
        return !folder.parentFolder;
      }
      return folder.parentFolder && folder.parentFolder._id.toString() === parentId;
    })
    .forEach(folder => {
      const children = buildFolderTree(folders, folder._id.toString());
      tree.push({
        ...folder.toObject(),
        children
      });
    });

  return tree;
}

// Helper function to check if a folder is descendant of another
async function checkDescendant(ancestorId, descendantId) {
  let currentId = descendantId;
  
  while (currentId) {
    const folder = await Folder.findById(currentId).select('parentFolder');
    if (!folder || !folder.parentFolder) {
      return false;
    }
    if (folder.parentFolder.toString() === ancestorId.toString()) {
      return true;
    }
    currentId = folder.parentFolder;
  }
  
  return false;
}

module.exports = router;