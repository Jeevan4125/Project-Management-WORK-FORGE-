const OpenAI = require('openai');
const dotenv = require('dotenv');
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development',
});

// System prompt for Work Forge AI assistant
const SYSTEM_PROMPT = `You are a helpful AI assistant for Work Forge, a project management platform. Your role is to help users with:

1. Project Management: Questions about creating, managing, or tracking projects
2. Task Management: Help with tasks, deadlines, assignments
3. Team Collaboration: Questions about team members, communication, collaboration
4. HR Functions: HR-related queries (if user has HR role)
5. Technical Support: Platform usage, features, troubleshooting
6. Time Management: Timesheets, working hours, productivity
7. Document Management: Files, documents, sharing
8. Issue Reporting: Help with reporting or resolving issues
9. General Questions: About the platform, features, or guidance

Keep responses:
- Professional and helpful
- Specific to Work Forge when possible
- Concise but thorough
- Actionable with clear steps when needed
- Friendly but workplace-appropriate

If asked about something outside Work Forge's scope, politely redirect to relevant features or suggest contacting support.

Current date: ${new Date().toDateString()}`;

// Function to get AI response
const getAIResponse = async (userMessage, context = {}) => {
  try {
    const { userRole, currentPage } = context;
    
    // If no API key, return mock response for development
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-development') {
      console.log('Using mock AI response (no API key)');
      return getMockResponse(userMessage, userRole);
    }
    
    // Add role-specific context
    let roleContext = '';
    if (userRole) {
      roleContext = `The user is a ${userRole}. `;
      
      if (userRole === 'HR') {
        roleContext += 'You can help with employee management, announcements, HR policies, and administrative tasks. ';
      } else if (userRole === 'Project Manager') {
        roleContext += 'You can help with project planning, team management, task assignments, and progress tracking. ';
      } else if (userRole === 'Team Member') {
        roleContext += 'You can help with tasks, time tracking, project updates, and collaboration. ';
      } else if (userRole === 'Client') {
        roleContext += 'You can help with project status, deliverables, communication with teams, and feedback. ';
      } else if (userRole === 'Super Admin') {
        roleContext += 'You can help with system administration, user management, and technical issues. ';
      }
    }
    
    // Add page-specific context
    let pageContext = '';
    if (currentPage) {
      pageContext = `The user is currently on the ${currentPage} page. `;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + roleContext + pageContext
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    // Fallback to mock response on API error
    return getMockResponse(userMessage, context.userRole || 'Team Member');
  }
};

// Mock response for development
const getMockResponse = (userMessage, userRole) => {
  console.log('Generating mock response for:', userMessage);
  
  // Simple keyword-based responses for development
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('project') || lowerMessage.includes('create project')) {
    return `To create a new project in Work Forge:\n\n1. Go to the Projects page\n2. Click "Create Project" button\n3. Fill in project details (name, description, dates)\n4. Add team members if needed\n5. Click "Create" to save\n\nAs a ${userRole}, you can manage projects from the dashboard.`;
  }
  
  if (lowerMessage.includes('task') || lowerMessage.includes('assign task')) {
    return `To assign a task:\n\n1. Open the Projects page\n2. Select a project\n3. Click "Add Task"\n4. Enter task details and assignee\n5. Set due date and priority\n6. Save the task\n\nTasks can be tracked from the Tasks page.`;
  }
  
  if (lowerMessage.includes('hr') || lowerMessage.includes('employee')) {
    if (userRole === 'HR') {
      return `As HR, you can:\n\n1. Manage employees from the Employees page\n2. Create announcements\n3. Schedule meetings\n4. View employee reports\n5. Handle HR requests\n\nUse the HR dashboard for these functions.`;
    }
    return `For HR-related queries, please contact your HR department directly or use the Messages feature to message HR.`;
  }
  
  if (lowerMessage.includes('time') || lowerMessage.includes('timesheet')) {
    return `To submit timesheets:\n\n1. Go to Timesheets page\n2. Select week\n3. Enter hours for each day\n4. Add notes if needed\n5. Submit for approval\n\nTimesheets are automatically saved as you type.`;
  }
  
  if (lowerMessage.includes('document') || lowerMessage.includes('upload')) {
    return `To upload documents:\n\n1. Go to Documents page\n2. Click "Upload"\n3. Select files\n4. Choose folder\n5. Add description\n6. Upload\n\nDocuments support PDF, Word, Excel, and image files.`;
  }
  
  if (lowerMessage.includes('issue') || lowerMessage.includes('problem')) {
    return `To report an issue:\n\n1. Go to Issues page\n2. Click "Report New Issue"\n3. Fill in issue details\n4. Select priority\n5. Submit report\n\nYou can track issue status from the same page.`;
  }
  
  if (lowerMessage.includes('message') || lowerMessage.includes('chat')) {
    return `To send messages:\n\n1. Go to Messages page\n2. Select a contact\n3. Type your message\n4. Press Enter to send\n\nYou can also create group chats for team communication.`;
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return `I'm here to help with Work Forge! You can ask me about:\n\n• Projects & Tasks\n• Team Collaboration\n• Document Management\n• Time Tracking\n• HR Functions (if applicable)\n• Technical Support\n\nWhat specific feature would you like to know more about?`;
  }
  
  // Default response
  return `Thank you for your question about "${userMessage}". As your Work Forge assistant, I can help you with project management, task tracking, team collaboration, and other platform features. Could you please provide more specific details about what you need help with?`;
};

// Function for quick help (shorter responses)
const getQuickHelp = async (userMessage) => {
  try {
    // If no API key, return mock response
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-development') {
      const response = getMockResponse(userMessage, 'User');
      // Return first sentence for quick help
      return response.split('.')[0] + '.';
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a concise AI assistant for Work Forge. Provide brief, helpful answers (1-2 sentences). Focus on quick solutions and direct guidance."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return getMockResponse(userMessage, 'User').split('.')[0] + '.';
  }
};

module.exports = {
  getAIResponse,
  getQuickHelp
};