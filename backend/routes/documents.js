const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Folder = require('../models/Folder');
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, XLS, PPT, Images, and TXT files are allowed.'));
    }
  }
});

// @route   GET /api/documents
// @desc    Get all documents for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get documents where user has access
    const documents = await Document.find({
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true },
        { sharedWith: req.user.id },
        { projectId: { $in: user.projects } }
      ],
      status: 'active'
    })
    .populate('uploadedBy', 'name email')
    .populate('projectId', 'name')
    .populate('folderId', 'name')
    .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/project/:projectId
// @desc    Get documents for specific project
// @access  Private
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      projectId: req.params.projectId,
      status: 'active'
    })
    .populate('uploadedBy', 'name email')
    .populate('folderId', 'name')
    .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents/upload
// @desc    Upload a document
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Please upload a file' });
    }

    const { name, description, projectId, folderId, isPublic, tags } = req.body;
    
    // Check if user has access to project
    const user = await User.findById(req.user.id);
    if (!user.projects.includes(projectId)) {
      return res.status(403).json({ msg: 'No access to this project' });
    }

    // Create document record
    const document = new Document({
      name: name || req.file.originalname,
      description: description || '',
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      projectId,
      folderId: folderId || null,
      uploadedBy: req.user.id,
      isPublic: isPublic || false,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });

    await document.save();

    // Populate and return
    const populatedDoc = await Document.findById(document._id)
      .populate('uploadedBy', 'name email')
      .populate('projectId', 'name')
      .populate('folderId', 'name');

    res.json(populatedDoc);
  } catch (err) {
    console.error(err.message);
    
    // Clean up uploaded file if error occurred
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ msg: 'File size exceeds 50MB limit' });
    } else {
      res.status(500).send('Server error');
    }
  }
});

// @route   GET /api/documents/:id
// @desc    Get document by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('uploadedBy', 'name email')
      .populate('projectId', 'name')
      .populate('folderId', 'name')
      .populate('sharedWith', 'name email');

    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Check access
    const user = await User.findById(req.user.id);
    const hasAccess = 
      document.uploadedBy._id.toString() === req.user.id ||
      document.isPublic ||
      document.sharedWith.includes(req.user.id) ||
      user.projects.includes(document.projectId._id);

    if (!hasAccess) {
      return res.status(403).json({ msg: 'No access to this document' });
    }

    // Increment view count
    document.viewCount += 1;
    await document.save();

    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/documents/:id
// @desc    Update document
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, isPublic, tags, folderId } = req.body;
    
    let document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Check if user is owner
    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Update fields
    if (name) document.name = name;
    if (description !== undefined) document.description = description;
    if (isPublic !== undefined) document.isPublic = isPublic;
    if (tags) document.tags = tags.split(',').map(tag => tag.trim());
    if (folderId !== undefined) document.folderId = folderId;
    
    document.lastModified = Date.now();
    await document.save();

    document = await Document.findById(document._id)
      .populate('uploadedBy', 'name email')
      .populate('projectId', 'name')
      .populate('folderId', 'name');

    res.json(document);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Check if user is owner or admin
    if (document.uploadedBy.toString() !== req.user.id) {
      const user = await User.findById(req.user.id);
      if (user.role !== 'HR' && user.role !== 'Super Admin') {
        return res.status(403).json({ msg: 'Not authorized' });
      }
    }

    // Soft delete
    document.status = 'deleted';
    await document.save();

    res.json({ msg: 'Document deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents/:id/share
// @desc    Share document with users
// @access  Private
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userIds, permission } = req.body;
    
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Check if user is owner
    if (document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // Add users to sharedWith array (avoid duplicates)
    userIds.forEach(userId => {
      if (!document.sharedWith.includes(userId)) {
        document.sharedWith.push(userId);
      }
    });

    await document.save();

    res.json(document);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/search
// @desc    Search documents
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { query, projectId, fileType, dateFrom, dateTo } = req.query;
    
    let searchQuery = {
      status: 'active',
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true },
        { sharedWith: req.user.id }
      ]
    };

    if (projectId) {
      searchQuery.projectId = projectId;
    }

    if (query) {
      searchQuery.$text = { $search: query };
    }

    if (fileType) {
      searchQuery.fileType = { $regex: fileType, $options: 'i' };
    }

    if (dateFrom || dateTo) {
      searchQuery.uploadedAt = {};
      if (dateFrom) searchQuery.uploadedAt.$gte = new Date(dateFrom);
      if (dateTo) searchQuery.uploadedAt.$lte = new Date(dateTo);
    }

    const documents = await Document.find(searchQuery)
      .populate('uploadedBy', 'name email')
      .populate('projectId', 'name')
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/documents/:id/download
// @desc    Track download and get download URL
// @access  Private
router.post('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    // Check access
    const user = await User.findById(req.user.id);
    const hasAccess = 
      document.uploadedBy.toString() === req.user.id ||
      document.isPublic ||
      document.sharedWith.includes(req.user.id) ||
      user.projects.includes(document.projectId);

    if (!hasAccess) {
      return res.status(403).json({ msg: 'No access to this document' });
    }

    // Increment download count
    document.downloadCount += 1;
    await document.save();

    res.json({ 
      downloadUrl: document.fileUrl,
      fileName: document.name
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/documents/stats/overview
// @desc    Get document statistics
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const totalDocuments = await Document.countDocuments({
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true },
        { sharedWith: req.user.id },
        { projectId: { $in: user.projects } }
      ],
      status: 'active'
    });

    const myDocuments = await Document.countDocuments({
      uploadedBy: req.user.id,
      status: 'active'
    });

    const storageUsed = await Document.aggregate([
      {
        $match: {
          uploadedBy: req.user.id,
          status: 'active'
        }
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' }
        }
      }
    ]);

    const recentDocuments = await Document.find({
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true },
        { sharedWith: req.user.id }
      ],
      status: 'active'
    })
    .sort({ uploadedAt: -1 })
    .limit(5)
    .populate('uploadedBy', 'name')
    .populate('projectId', 'name');

    res.json({
      totalDocuments,
      myDocuments,
      storageUsed: storageUsed[0]?.totalSize || 0,
      recentDocuments
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;