// components/HelpCenter.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  FiHelpCircle, 
  FiSearch, 
  FiChevronRight, 
  FiChevronDown, 
  FiBookOpen, 
  FiVideo, 
  FiFileText, 
  FiMessageCircle, 
  FiMail, 
  FiPhone, 
  FiClock, 
  FiGlobe,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiAlertTriangle,
  FiSettings,
  FiBarChart2,
  FiDatabase,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiDownload,
  FiExternalLink
} from 'react-icons/fi';
import { useAuth } from '../App'; // Adjust import path as needed

const HelpCenter = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [activeTab, setActiveTab] = useState('faq');
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Categories based on user role
  const categories = [
    { id: 'all', name: 'All Topics', icon: <FiGlobe />, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    { id: 'projects', name: 'Projects', icon: <FiFolder />, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { id: 'tasks', name: 'Tasks', icon: <FiCheckSquare />, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    { id: 'issues', name: 'Issues', icon: <FiAlertTriangle />, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    { id: 'messages', name: 'Messages', icon: <FiMessageCircle />, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { id: 'analytics', name: 'Analytics', icon: <FiBarChart2 />, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    { id: 'settings', name: 'Settings', icon: <FiSettings />, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  ];

  // FAQ Data
  const faqs = [
    {
      id: 1,
      question: 'How do I create a new project?',
      answer: 'To create a new project:\n1. Click the "Projects" tab in the sidebar\n2. Click the "Create Project" button\n3. Fill in project details (name, description, dates)\n4. Add team members (optional)\n5. Click "Create Project"\n\nHR and Project Managers can create projects. Team Members can only join existing projects.',
      category: 'projects',
      tags: ['projects', 'creation', 'setup']
    },
    {
      id: 2,
      question: 'How do I assign tasks to team members?',
      answer: 'Task assignment:\n1. Navigate to the project\n2. Open the Tasks tab\n3. Click "Add Task"\n4. Enter task details\n5. Select assignee from the team members list\n6. Set priority and due date\n7. Click "Create Task"\n\nOnly Project Managers and HR can assign tasks.',
      category: 'tasks',
      tags: ['tasks', 'assignment', 'management']
    },
    {
      id: 3,
      question: 'How do I report an issue?',
      answer: 'To report an issue:\n1. Click the "Issues" tab\n2. Click "Report New Issue"\n3. Fill in the issue details\n4. Select category and priority\n5. Choose if you want to report anonymously\n6. Click "Report Issue"\n\nAll users can report issues. HR will review and respond.',
      category: 'issues',
      tags: ['issues', 'reporting', 'support']
    },
    {
      id: 4,
      question: 'How do I send messages to HR?',
      answer: 'To message HR:\n1. Click the "Messages" tab\n2. Select "HR Department" from contacts\n3. Type your message\n4. Press Enter or click send\n\nYou can also contact HR through the Employees page if you have HR access.',
      category: 'messages',
      tags: ['messages', 'hr', 'communication']
    },
    {
      id: 5,
      question: 'How do I view analytics and reports?',
      answer: 'Analytics access:\n- Super Admins: Full access to all analytics\n- Project Managers: Access to project-specific analytics\n- HR: Access to employee and issue analytics\n- Team Members: Limited access to personal analytics\n\nNavigate to the Analytics page from the sidebar.',
      category: 'analytics',
      tags: ['analytics', 'reports', 'data']
    },
    {
      id: 6,
      question: 'How do I update my profile settings?',
      answer: 'Profile settings:\n1. Click the "Settings" tab\n2. Go to "Profile" section\n3. Update your information\n4. Click "Save Changes"\n\nYou can also change notification preferences and security settings.',
      category: 'settings',
      tags: ['settings', 'profile', 'preferences']
    },
    {
      id: 7,
      question: 'How do I join a project as a Team Member?',
      answer: 'Joining projects:\n1. Go to Projects page\n2. Click "Search Projects" button\n3. Search for available projects\n4. Click "Join" on the project you want\n5. Wait for project manager approval\n\nTeam Members can only join projects they are invited to or find through search.',
      category: 'projects',
      tags: ['projects', 'joining', 'team']
    },
    {
      id: 8,
      question: 'What are the different user roles and permissions?',
      answer: 'Role permissions:\n- Super Admin: Full system access\n- HR: Employee management, announcements, HR features\n- Project Manager: Project creation, task assignment, team management\n- Team Member: Task completion, issue reporting, project participation\n- Client: View-only access to assigned projects\n\nContact HR to change your role.',
      category: 'settings',
      tags: ['roles', 'permissions', 'access']
    },
    {
      id: 9,
      question: 'How do I use the standup calls feature?',
      answer: 'Standup calls:\n1. HR/Project Managers can schedule calls from the Calls page\n2. Team Members receive notifications\n3. Join calls through the Calls page\n4. Video and audio capabilities available\n\nCalls are recorded for attendance tracking.',
      category: 'messages',
      tags: ['calls', 'meetings', 'video']
    },
    {
      id: 10,
      question: 'How do I manage documents?',
      answer: 'Document management:\n1. Upload documents from the Documents page\n2. Organize by project or category\n3. Share with team members\n4. Version control keeps track of changes\n5. Download or preview documents\n\nFile size limit: 100MB per document.',
      category: 'projects',
      tags: ['documents', 'files', 'sharing']
    }
  ];

  // Video tutorials
  const videoTutorials = [
    {
      id: 1,
      title: 'Getting Started with Work Forge',
      duration: '9:58',
      category: 'general',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      url: 'https://youtu.be/ThDdHETxA-g?si=Awu65WTsEYhTZk39'
    },
    {
      id: 2,
      title: 'Project Management Basics',
      duration: '8:15',
      category: 'projects',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      url: 'https://youtu.be/ThDdHETxA-g?si=Awu65WTsEYhTZk39'
    },
    {
      id: 3,
      title: 'Task Assignment and Tracking',
      duration: '2:40',
      category: 'tasks',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      url: 'https://youtu.be/Nqycl9FQcQw?si=n_72ty3QaW78wo_Y'
    },
    {
      id: 4,
      title: 'HR Features Walkthrough',
      duration: '10:57',
      category: 'hr',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg',
      url: 'https://youtu.be/bI9RZjF-538?si=N2HNk6hyXoJjiP3o'
    }
  ];

  // Documentation links - FIXED: No local file paths
  const documentation = [
    {
      id: 1,
      title: 'User Manual PDF',
      description: 'Complete user guide for all features',
      category: 'general',
      icon: <FiFileText />,
      type: 'pdf',
      action: 'download', // Changed from URL to action
      size: '2.4 MB',
      content: "Project Work Forge: Complete User Guide\n\nVersion: 2.1\n\nTable of Contents:\n1. Introduction & Welcome\n2. Getting Started\n3. Core Features\n4. Advanced Features\n5. Troubleshooting\n\nFor the complete manual, please contact your system administrator or download from the company portal."
    },
    {
      id: 2,
      title: 'API Documentation',
      description: 'Technical documentation for developers',
      category: 'technical',
      icon: <FiDatabase />,
      type: 'api',
      action: 'view',
      size: '1.8 MB',
      content: "API Documentation\n\nBase URL: https://api.workforge.com/v1\nAuthentication: Bearer tokens\nRate Limits: 1000 requests/hour\n\nEndpoints:\n- GET /projects\n- POST /tasks\n- PUT /users\n\nFull documentation available for developers."
    },
    {
      id: 3,
      title: 'Security Guidelines',
      description: 'Best practices for data security',
      category: 'security',
      icon: <FiShield />,
      type: 'pdf',
      action: 'download',
      size: '1.2 MB',
      content: "Security Guidelines\n\n1. Use strong passwords\n2. Enable 2FA\n3. Regular audits\n4. Data encryption\n5. Access controls\n\nContact security@workforge.com for more information."
    },
    {
      id: 4,
      title: 'Onboarding Checklist',
      description: 'Step-by-step onboarding guide',
      category: 'hr',
      icon: <FiUsers />,
      type: 'checklist',
      action: 'view',
      size: '850 KB',
      content: "Onboarding Checklist\n\nDay 1:\n- Account setup\n- Profile completion\n- System tour\n\nWeek 1:\n- Project assignment\n- Team introduction\n- Training sessions\n\nMonth 1:\n- Performance review\n- Goal setting\n- Feedback session"
    }
  ];

  // Filter FAQs by category
  const filteredFAQs = selectedCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === selectedCategory);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Focus search input on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the contact form to your backend
    console.log('Contact form submitted:', contactForm);
    alert('Thank you for your message! Our support team will get back to you within 24 hours.');
    setShowContactModal(false);
    setContactForm({
      name: user?.name || '',
      email: user?.email || '',
      subject: '',
      message: '',
      priority: 'normal'
    });
  };

  const handleQuickQuestion = (question) => {
    setContactForm(prev => ({
      ...prev,
      subject: question,
      message: `I need help with: ${question}\n\n`
    }));
    setShowContactModal(true);
  };

  const handleDocumentAction = (doc) => {
    switch(doc.action) {
      case 'download':
        // Create and download a text file with the content
        const element = document.createElement('a');
        const file = new Blob([doc.content], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${doc.title}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        break;
      case 'view':
        // Show content in a modal
        alert(`${doc.title}\n\n${doc.content}`);
        break;
      default:
        console.log('No action defined for document:', doc.title);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Here you would typically upload to your backend
      const newFiles = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        type: file.type,
        uploadedAt: new Date().toLocaleString()
      }));
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      alert(`${files.length} file(s) uploaded successfully!`);
      setShowUploadModal(false);
    }
  };

  const quickQuestions = [
    'How do I reset my password?',
    'Can I change my user role?',
    'Where do I find my project files?',
    'How do I schedule a meeting?',
    'Who do I contact for technical issues?'
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <FiHelpCircle className="text-3xl text-blue-600 dark:text-blue-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Help Center</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Find answers, tutorials, and support for Work Forge
            </p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-2xl mt-6">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help articles, FAQs, or documentation..."
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Search Results ({searchResults.length})
          </h2>
          <div className="space-y-3">
            {searchResults.map(result => (
              <div
                key={result.id}
                className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                      {result.question}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {result.answer.substring(0, 150)}...
                    </p>
                    <div className="flex items-center mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        categories.find(c => c.id === result.category)?.color
                      }`}>
                        {categories.find(c => c.id === result.category)?.name}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === result.id ? null : result.id)}
                    className="ml-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  >
                    <FiChevronRight className={`transform transition-transform ${
                      expandedFAQ === result.id ? 'rotate-90' : ''
                    }`} />
                  </button>
                </div>
                {expandedFAQ === result.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <pre className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400 font-sans">
                      {result.answer}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setSearchQuery('');
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                selectedCategory === category.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                selectedCategory === category.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <span className={`text-xl ${
                  selectedCategory === category.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {category.icon}
                </span>
              </div>
              <span className={`text-sm font-medium ${
                selectedCategory === category.id
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {category.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="flex -mb-px">
          {['faq', 'tutorials', 'docs', 'contact'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-6 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab === 'faq' && 'FAQs'}
              {tab === 'tutorials' && 'Video Tutorials'}
              {tab === 'docs' && 'Documentation'}
              {tab === 'contact' && 'Contact Support'}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'faq' && !searchQuery && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FiHelpCircle className="mx-auto text-4xl mb-3 opacity-50" />
              <p>No FAQs found for this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map(faq => (
                <div
                  key={faq.id}
                  className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                    className="w-full p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {faq.question}
                      </h3>
                      <div className="flex items-center mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          categories.find(c => c.id === faq.category)?.color
                        }`}>
                          {categories.find(c => c.id === faq.category)?.name}
                        </span>
                      </div>
                    </div>
                    <FiChevronDown className={`transform transition-transform ${
                      expandedFAQ === faq.id ? 'rotate-180' : ''
                    }`} />
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                      <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 font-sans">
                        {faq.answer}
                      </pre>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {faq.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tutorials' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Video Tutorials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {videoTutorials.map(tutorial => (
              <div
                key={tutorial.id}
                className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative">
                  <img
                    src={tutorial.thumbnail}
                    alt={tutorial.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                    {tutorial.duration}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <FiVideo className="text-2xl text-black" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-2">
                    {tutorial.title}
                  </h3>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      categories.find(c => c.id === tutorial.category)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {tutorial.category.charAt(0).toUpperCase() + tutorial.category.slice(1)}
                    </span>
                    <a
                      href={tutorial.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                    >
                      Watch Now
                      <FiChevronRight className="ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Documentation
            </h2>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center text-sm"
            >
              <FiDownload className="mr-2" />
              Upload Document
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentation.map(doc => (
              <div
                key={doc.id}
                className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start">
                  <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 mr-4">
                    {doc.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800 dark:text-white mb-1">
                      {doc.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {doc.description}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {doc.size}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          categories.find(c => c.id === doc.category)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.category.charAt(0).toUpperCase() + doc.category.slice(1)}
                        </span>
                        <button
                          onClick={() => handleDocumentAction(doc)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                        >
                          {doc.action === 'download' ? (
                            <>
                              <FiDownload className="mr-1" />
                              Download
                            </>
                          ) : (
                            <>
                              <FiExternalLink className="mr-1" />
                              View
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Uploaded Files Section */}
          {uploadedFiles.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Your Uploaded Documents
              </h3>
              <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">File Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Uploaded</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedFiles.map(file => (
                      <tr key={file.id} className="border-t border-gray-200 dark:border-gray-800">
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{file.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{file.size}</td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{file.uploadedAt}</td>
                        <td className="py-3 px-4">
                          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contact' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
                Contact Support
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
                      <FiMail className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Email Support</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">24/7 Response</p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    Send us an email and we'll get back to you within 24 hours.
                  </p>
                  <a
                    href="mailto:support@workforge.com"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    support@workforge.com
                  </a>
                </div>
                
                <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-4">
                      <FiPhone className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Phone Support</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Business Hours</p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-3">
                    Call us during business hours for immediate assistance.
                  </p>
                  <a
                    href="tel:+1-800-WORKFORGE"
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    +1 (800) 967-5367
                  </a>
                </div>
              </div>

              {/* Quick Questions */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Quick Questions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickQuestion(question)}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full py-3 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-lg transition-colors flex items-center justify-center"
                >
                  <FiMessageCircle className="mr-2" />
                  Send a Message to Support
                </button>
              </div>
            </div>

            {/* Support Hours & Info */}
            <div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                Support Hours
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <FiClock className="text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Monday - Friday</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">9:00 AM - 6:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiClock className="text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Saturday</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">10:00 AM - 4:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <FiClock className="text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Sunday</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Emergency Support Only</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">Support Resources</h4>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                      <FiBookOpen className="mr-2" />
                      Knowledge Base
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                      <FiUsers className="mr-2" />
                      Community Forum
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                      <FiTrendingUp className="mr-2" />
                      System Status
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Contact Support</h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiChevronRight size={24} />
                </button>
              </div>

              <form onSubmit={handleContactSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="What do you need help with?"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={contactForm.priority}
                    onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  >
                    <option value="low">Low - General Question</option>
                    <option value="normal">Normal - Need Assistance</option>
                    <option value="high">High - Urgent Issue</option>
                    <option value="critical">Critical - System Down</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows="6"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="Please describe your issue in detail..."
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowContactModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiChevronRight size={24} />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select files to upload
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <FiDownload className="mx-auto text-3xl text-gray-400 mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Drag & drop files here or click to browse
                  </p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                  >
                    Browse Files
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Max file size: 100MB. Supported formats: PDF, DOC, DOCX, TXT
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Helpful Tips */}
      {!searchQuery && activeTab === 'faq' && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Helpful Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FiSearch className="text-blue-600 dark:text-blue-400 mr-2" />
                <h4 className="font-medium text-blue-800 dark:text-blue-300">Use Specific Keywords</h4>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Try searching with specific terms like "project creation" or "task assignment" for better results.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FiVideo className="text-green-600 dark:text-green-400 mr-2" />
                <h4 className="font-medium text-green-800 dark:text-green-300">Watch Tutorials</h4>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Check out our video tutorials for step-by-step visual guides on common tasks.
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FiUser className="text-purple-600 dark:text-purple-400 mr-2" />
                <h4 className="font-medium text-purple-800 dark:text-purple-300">Role-Based Help</h4>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-400">
                Some features are role-specific. Make sure you're looking at content relevant to your user role.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCenter;