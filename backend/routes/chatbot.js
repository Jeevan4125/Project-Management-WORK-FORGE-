const express = require('express');
const router = express.Router();
const { getAIResponse, getQuickHelp } = require('../config/openai');

// Mock auth middleware for development
const mockAuth = (req, res, next) => {
  // For development, create a mock user
  req.user = {
    _id: 'mock-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: req.headers['x-mock-role'] || 'Team Member' // Allow role override via header
  };
  next();
};

// Get AI response for chatbot
router.post('/ask', mockAuth, async (req, res) => {
  try {
    const { message, isQuickHelp = false, context = {} } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    console.log('Chatbot request:', { 
      message: message.substring(0, 100),
      isQuickHelp,
      userRole: req.user.role,
      hasApiKey: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-development'
    });

    // Add user context
    const userContext = {
      userRole: req.user.role,
      currentPage: context.currentPage || 'dashboard'
    };

    let aiResponse;
    
    if (isQuickHelp) {
      aiResponse = await getQuickHelp(message);
    } else {
      aiResponse = await getAIResponse(message, userContext);
    }

    console.log('Chatbot response generated:', aiResponse.substring(0, 100) + '...');

    res.json({
      success: true,
      data: {
        response: aiResponse,
        timestamp: new Date(),
        isQuickHelp,
        userRole: req.user.role
      }
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI response',
      error: error.message,
      // Include mock response in error for development
      mockResponse: "I'm currently having technical difficulties. For now, you can:\n1. Check the Help Center\n2. Contact support\n3. Try again later\n\nIn the meantime, here's what I can help with:\n- Project creation and management\n- Task assignment and tracking\n- Document uploads\n- Team communication\n- Timesheet submission"
    });
  }
});

// Get quick help suggestions (predefined common questions)
router.get('/suggestions', mockAuth, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Role-based suggestions
    const roleSuggestions = {
      'HR': [
        "How do I add a new employee?",
        "How to create an announcement for all employees?",
        "How do I schedule a team meeting?",
        "How to view employee performance?",
        "How do I contact IT support?"
      ],
      'Project Manager': [
        "How do I create a new project?",
        "How to assign tasks to team members?",
        "How do I track project progress?",
        "How to generate project reports?",
        "How do I schedule a standup call?"
      ],
      'Team Member': [
        "How do I update my task status?",
        "How to submit timesheets?",
        "How do I report an issue?",
        "How to upload documents?",
        "How do I contact my manager?"
      ],
      'Client': [
        "How do I view project status?",
        "How to provide feedback?",
        "How do I download project files?",
        "How to message the project team?",
        "How do I check deliverables?"
      ],
      'Super Admin': [
        "How do I manage user permissions?",
        "How to view system analytics?",
        "How do I backup the database?",
        "How to troubleshoot system issues?",
        "How do I generate system reports?"
      ]
    };

    // Common suggestions for all roles
    const commonSuggestions = [
      "How do I change my password?",
      "How to update my profile information?",
      "How do I use the calendar feature?",
      "How to search for projects?",
      "How do I enable dark mode?"
    ];

    const suggestions = [
      ...(roleSuggestions[userRole] || roleSuggestions['Team Member']),
      ...commonSuggestions
    ].slice(0, 8); // Limit to 8 suggestions

    res.json({
      success: true,
      data: {
        suggestions,
        role: userRole,
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      data: {
        suggestions: [
          "How do I create a project?",
          "How to assign tasks?",
          "How do I upload documents?",
          "How to message team members?"
        ],
        role: 'User'
      }
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Chatbot API is running',
    timestamp: new Date(),
    hasOpenAIKey: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'dummy-key-for-development'),
    status: 'operational'
  });
});

module.exports = router;