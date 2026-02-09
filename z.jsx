import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiFolder, FiCheckSquare, FiClock, FiAlertTriangle, FiFile, 
  FiBarChart2, FiMessageSquare, FiVideo, FiSettings, FiUser, FiLogOut, 
  FiBell, FiSun, FiRefreshCw, FiMoon, FiMenu, FiX, FiPlus, FiSearch, FiFilter, 
  FiCalendar, FiUsers, FiGlobe, FiLock, FiEye, FiEdit, FiTrash2, 
  FiDownload, FiUpload, FiPaperclip, FiThumbsUp, FiThumbsDown, 
  FiFlag, FiTag, FiLink, FiChevronDown, FiChevronRight, FiChevronLeft, 
  FiChevronUp, FiMail, FiUserCheck, FiSend, FiMessageCircle, FiPhone, 
  FiUserPlus, FiTrendingUp, FiActivity, FiAward, FiTarget, FiGrid, 
  FiPieChart, FiDatabase, FiShield, FiHelpCircle, FiBookOpen,
  FiCheck , FiMoreVertical, FiCopy// Add FiCheck to replace FiCheckCircle
} from 'react-icons/fi';
// In your App.jsx, add this import:
import AnalyticsPage from './components/AnalyticsPage';
// Add this with other imports
import CallsPage from './components/CallsPage';

import DocumentsPage from './components/DocumentsPage';
// Auth Context
export const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userProjects, setUserProjects] = useState([]);
  const [userTasks, setUserTasks] = useState([]);
  const [userDocuments, setUserDocuments] = useState([]);
  const [userIssues, setUserIssues] = useState([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hrMessages, setHrMessages] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [viewEmployee, setViewEmployee] = useState(null); // 👈 For View Popup

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDarkMode = savedDarkMode ? JSON.parse(savedDarkMode) : systemPrefersDark;
    setDarkMode(initialDarkMode);
    document.documentElement.classList.toggle('dark', initialDarkMode);

    const savedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchUserData(parsedUser, token);
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const fetchUserData = async (user, token) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const endpoints = ['projects', 'tasks', 'documents', 'issues'];
      const promises = endpoints.map(endpoint =>
        fetch(`http://localhost:5000/api/${endpoint}`, { headers }).then(res => res.json())
      );
      const [projects, tasks, documents, issues] = await Promise.all(promises);
      setUserProjects(projects);
      setUserTasks(tasks);
      setUserDocuments(documents);
      setUserIssues(issues);

      const msgRes = await fetch('http://localhost:5000/api/messages', { headers });
      if (msgRes.ok) {
        const messages = await msgRes.json();
        setHrMessages(messages);
      }

      if (user.role === 'HR') {
        try {
          const empRes = await fetch('http://localhost:5000/api/users', { headers });
          if (empRes.ok) {
            const employees = await empRes.json();
            setAllEmployees(employees);
          } else {
            setAllEmployees([
              { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Team Member', status: 'Active' },
              { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Project Manager', status: 'Active' }
            ]);
          }
        } catch (e) {
          console.log("Using mock employee data");
          setAllEmployees([
            { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Team Member', status: 'Active' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Project Manager', status: 'Active' }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const login = async (email, password) => {
  setLoading(true);
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      
      // Track login in analytics - store session ID
      if (data.token && data.id) {
        try {
          const analyticsRes = await fetch('http://localhost:5000/api/analytics/track-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({ 
              userId: data.id || data._id,
              email: data.email,
              role: data.role 
            })
          });
          
          if (analyticsRes.ok) {
            const analyticsData = await analyticsRes.json();
            // Store session ID for logout tracking
            localStorage.setItem('currentSessionId', analyticsData.sessionId);
            console.log('✅ Login tracked:', analyticsData);
          }
        } catch (err) {
          console.error('Failed to track login:', err);
        }
      }
      
      if (data.isNewUser) {
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 8000);
      }
      return true;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (err) {
    console.error('Login error:', err);
    return false;
  } finally {
    setLoading(false);
  }
};

  const signup = async (name, email, password, role) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        localStorage.setItem('currentUser', JSON.stringify(data));
        localStorage.setItem('token', data.token);
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 8000);
        return true;
      } else {
        throw new Error(data.message || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

 const logout = () => {
  // Track logout before clearing data
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const sessionId = localStorage.getItem('currentSessionId');
  
  if (token && currentUser?.id && sessionId) {
    fetch('http://localhost:5000/api/analytics/track-logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        userId: currentUser.id || currentUser._id,
        sessionId: parseInt(sessionId)
      })
    })
    .then(res => res.json())
    .then(data => {
      console.log('✅ Logout tracked:', data);
      localStorage.removeItem('currentSessionId');
    })
    .catch(err => console.error('Failed to track logout:', err));
  }
  
  // Clear all data
  setUser(null);
  localStorage.removeItem('currentUser');
  localStorage.removeItem('token');
  localStorage.removeItem('currentSessionId');
  setUserProjects([]);
  setUserTasks([]);
  setUserDocuments([]);
  setUserIssues([]);
  setHrMessages([]);
  setAllEmployees([]);
  
  // Navigate to login
  window.location.href = '/login';
};
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const createProject = async (projectData) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found');
    alert('Please login again');
    return null;
  }
  
  try {
    console.log('Creating project with data:', projectData);
    
    const formattedData = {
      ...projectData,
      members: projectData.members || []
    };
    
    const res = await fetch('http://localhost:5000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formattedData)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      console.log('✅ Project created successfully:', data);
      
      // ✅ IMPORTANT: Refresh user projects after creation
      await fetchUserData(user, token);
      
      return data.project;
    } else {
      console.error('Server error response:', data);
      throw new Error(data.message || 'Failed to create project');
    }
  } catch (err) {
    console.error('Failed to create project:', err);
    alert(`Failed to create project: ${err.message}`);
    return null;
  }
};

  const contactHR = async (messageContent) => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: messageContent })
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  };

  const addEmployee = async (employeeData) => {
    const token = localStorage.getItem('token');
    if (!token) return false;
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(employeeData)
      });
      if (res.ok) {
        const newEmployee = await res.json();
        setAllEmployees([...allEmployees, newEmployee]);
        return true;
      } else {
        const err = await res.json();
        alert(`Failed to add employee: ${err.message || 'Unknown error'}`);
        return false;
      }
    } catch (err) {
      console.error('Add employee error:', err);
      alert('Network error. Could not add employee.');
      return false;
    }
  };

  const removeEmployee = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee? This action cannot be undone.")) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAllEmployees(allEmployees.filter(emp => emp.id !== id));
        alert("Employee removed successfully.");
      } else {
        alert('Failed to remove employee.');
      }
    } catch (err) {
      console.error('Remove employee error:', err);
      alert('Network error. Could not remove employee.');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      darkMode,
      toggleDarkMode,
      loading,
      checkingAuth,
      userProjects,
      setUserProjects,
      userTasks,
      userDocuments,
      userIssues,
      createProject,
      deleteProject,
      searchProjects,
      showWelcome,
      hrMessages,
      contactHR,
      allEmployees,
      addEmployee,
      removeEmployee,
      viewEmployee,
      setViewEmployee,
      fetchUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Loading Component
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-black dark:border-white"></div>
  </div>
);

// Employee Announcements Page (for non-HR users)
const EmployeeAnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'priority'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAnnouncements();
    
    // Check for new announcements every 30 seconds
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Fetch announcements specifically for this employee
      const response = await fetch('http://localhost:5000/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnnouncements(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

 // Mark announcement as read
const markAsRead = (announcementId) => {
  // Get current read status from localStorage
  const readStatus = JSON.parse(localStorage.getItem('announcementReadStatus') || '{}');
  
  // Mark as read
  readStatus[announcementId] = {
    read: true,
    readAt: new Date().toISOString(),
    userId: user?.id || user?._id,
    userName: user?.name
  };
  
  // Save to localStorage
  localStorage.setItem('announcementReadStatus', JSON.stringify(readStatus));
  
  // Update local state - FIX: Handle null readBy properly
  setAnnouncements(prev => 
    prev.map(ann => {
      const id = ann._id || ann.id;
      if (id === announcementId) {
        return { 
          ...ann, 
          read: true, 
          readAt: new Date().toISOString(),
          readBy: Array.isArray(ann.readBy) ? [...ann.readBy, user?.id || user?._id] : [user?.id || user?._id]
        };
      }
      return ann;
    })
  );
  
  if (selectedAnnouncement && (selectedAnnouncement._id === announcementId || selectedAnnouncement.id === announcementId)) {
    setSelectedAnnouncement(prev => ({ 
      ...prev, 
      read: true, 
      readAt: new Date().toISOString(),
      readBy: Array.isArray(prev.readBy) ? [...prev.readBy, user?.id || user?._id] : [user?.id || user?._id]
    }));
  }
};

  // Filter announcements
  const filteredAnnouncements = announcements.filter(announcement => {
    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.content.toLowerCase().includes(searchLower) ||
        (announcement.department && announcement.department.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }
    
    // Apply read status filter
    if (filter === 'unread') {
      return !announcement.read;
    }
    
    // Apply priority filter
    if (filter === 'priority') {
      return announcement.priority === 'high';
    }
    
    return true;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getDepartmentBadge = (department) => {
    switch (department) {
      case 'all': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'hr': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100';
      case 'engineering': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100';
      case 'marketing': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100';
      case 'sales': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'operations': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  // Calculate unread count
  const unreadCount = announcements.filter(ann => !ann.read).length;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Company Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stay updated with latest news and updates from HR
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                {unreadCount} new
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          
          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
          >
            <option value="all">All Announcements</option>
            <option value="unread">Unread Only</option>
            <option value="priority">High Priority</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={fetchAnnouncements}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Refresh announcements"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiGlobe className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Announcements</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{announcements.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <FiBell className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unread</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{unreadCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg mr-4">
              <FiAlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">High Priority</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {announcements.filter(a => a.priority === 'high').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
              <FiCalendar className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">This Month</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {announcements.filter(a => {
                  const announcementDate = new Date(a.publishedAt || a.createdAt);
                  const now = new Date();
                  return announcementDate.getMonth() === now.getMonth() && 
                         announcementDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcements List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-xl shadow p-12 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 mx-auto">
            <FiGlobe size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {searchQuery ? 'No announcements found' : 'No announcements yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? 'Try different search terms'
              : 'HR will post announcements here when available'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement._id || announcement.id}
              onClick={() => {
                setSelectedAnnouncement(announcement);
                if (!announcement.read) {
                  markAsRead(announcement._id || announcement.id);
                }
              }}
              className={`bg-white dark:bg-black rounded-xl shadow p-6 border ${
                announcement.read 
                  ? 'border-gray-200 dark:border-gray-800' 
                  : 'border-blue-500 dark:border-blue-700'
              } hover:shadow-lg transition-shadow cursor-pointer ${
                !announcement.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentBadge(announcement.department)}`}>
                      {announcement.department === 'all' ? 'Company Wide' : announcement.department}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority} Priority
                    </span>
                    {!announcement.read && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        NEW
                      </span>
                    )}
                    {announcement.expiresAt && new Date(announcement.expiresAt) < new Date() && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                        Expired
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {announcement.title}
                    {!announcement.read && (
                      <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block animate-pulse"></span>
                    )}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-xs mr-2">
                        {announcement.createdBy?.name?.charAt(0) || 'H'}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">
                        {announcement.createdBy?.name || 'HR Department'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString()}
                      </span>
                      {announcement.read && announcement.readAt && (
                        <span className="flex items-center">
                          <FiEye className="mr-1" />
                          Read {new Date(announcement.readAt).toLocaleDateString()}
                        </span>
                      )}
                      {announcement.expiresAt && (
                        <span className="flex items-center">
                          <FiClock className="mr-1" />
                          Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnnouncement(announcement);
                    if (!announcement.read) {
                      markAsRead(announcement._id || announcement.id);
                    }
                  }}
                  className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <FiChevronRight className="text-gray-400" size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentBadge(selectedAnnouncement.department)}`}>
                      {selectedAnnouncement.department === 'all' ? 'Company Wide' : selectedAnnouncement.department}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedAnnouncement.priority)}`}>
                      {selectedAnnouncement.priority} Priority
                    </span>
                    {!selectedAnnouncement.read && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        NEW
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedAnnouncement.title}</h2>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              {/* Sender Info */}
              <div className="flex items-center mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold mr-3">
                  {selectedAnnouncement.createdBy?.name?.charAt(0) || 'H'}
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {selectedAnnouncement.createdBy?.name || 'HR Department'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Published on {new Date(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Content */}
              <div className="mb-6">
                <div className="prose dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-600 dark:text-gray-400">
                    {selectedAnnouncement.content}
                  </pre>
                </div>
              </div>
              
              {/* Metadata */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Department</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {selectedAnnouncement.department === 'all' ? 'All Departments' : selectedAnnouncement.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Priority</p>
                    <p className="font-medium text-gray-800 dark:text-white">{selectedAnnouncement.priority}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Published</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {new Date(selectedAnnouncement.publishedAt || selectedAnnouncement.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Status</p>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {selectedAnnouncement.read ? 'Read' : 'Unread'}
                      {selectedAnnouncement.read && selectedAnnouncement.readAt && (
                        <span className="block text-xs text-gray-500">
                          on {new Date(selectedAnnouncement.readAt).toLocaleString()}
                        </span>
                      )}
                    </p>
                  </div>
                  {selectedAnnouncement.expiresAt && (
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400">Expires</p>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {new Date(selectedAnnouncement.expiresAt).toLocaleString()}
                        {new Date(selectedAnnouncement.expiresAt) < new Date() && (
                          <span className="ml-2 text-red-600 dark:text-red-400">(Expired)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Close
                </button>
                {!selectedAnnouncement.read && (
                  <button
                    onClick={() => {
                      markAsRead(selectedAnnouncement._id || selectedAnnouncement.id);
                      setSelectedAnnouncement(null);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Splash Screen
const SplashScreen = () => {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const fullText = 'Work Forge';

  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setTimeout(() => setShowSubtitle(true), 500);
      }
    }, 200);

    const redirectTimer = setTimeout(() => {
      navigate('/home');
    }, 10000);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black">
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-6">
          <span className="text-black font-bold text-3xl">WF</span>
        </div>
        <h1 className="text-5xl font-bold text-white mb-2">
          {text}
          <span className="animate-pulse">|</span>
        </h1>
        {showSubtitle && (
          <p className="text-gray-400 text-lg animate-fade-in">
            Manage projects, tasks, and teams efficiently
          </p>
        )}
      </div>
      <div className="mt-12">
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

// In AuthProvider component, add this function with other functions:
// In AuthProvider component - fix deleteProject function
const deleteProject = async (projectId) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found');
    return false;
  }
  
  try {
    const res = await fetch(`http://localhost:5000/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      // Remove project from state
      setUserProjects(prev => prev.filter(project => project.id !== projectId || project._id !== projectId));
      return true;
    } else {
      throw new Error(data.message || 'Failed to delete project');
    }
  } catch (err) {
    console.error('Failed to delete project:', err);
    alert(`Failed to delete project: ${err.message}`);
    return false;
  }
};

// In AuthProvider component, add this function:
const searchProjects = async (query) => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('No token found');
    return [];
  }
  
  try {
    const res = await fetch(`http://localhost:5000/api/projects/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await res.json();
    
    if (res.ok) {
      return data;
    } else {
      throw new Error(data.message || 'Failed to search projects');
    }
  } catch (err) {
    console.error('Failed to search projects:', err);
    return [];
  }
};

// Welcome Animation
const WelcomeAnimation = () => {
  const { user } = useAuth();
  const [animate, setAnimate] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const animationTimer = setTimeout(() => setAnimate(true), 100);
    return () => {
      clearTimeout(animationTimer);
      setMounted(false);
    };
  }, []);

  if (!mounted || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`text-center transform transition-all duration-1000 ${animate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-black font-bold text-4xl">WF</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          {user.isNewUser ? 'Welcome!' : 'Welcome Back!'}
        </h1>
        <p className="text-xl text-gray-300 mb-2">{user.name || 'User'}</p>
        <p className="text-lg text-gray-400">{user.role || 'Team Member'}</p>
        <div className="mt-8">
          <div className="flex justify-center space-x-2">
            <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animated Route Loader
const AnimatedRoute = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 3500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black flex items-center justify-center z-[9999]">
        <div className="loader"></div>
      </div>
    );
  }
  return children;
};

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, checkingAuth, showWelcome } = useAuth();

  if (checkingAuth || loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return (
    <Layout>
      {showWelcome && <WelcomeAnimation />}
      <AnimatedRoute>{children}</AnimatedRoute>
    </Layout>
  );
};

// Empty State
const EmptyState = ({ title, description, buttonText, onButtonClick, icon }) => (
  <div className="flex flex-col items-center justify-center h-full py-12">
    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">{description}</p>
    <button
      onClick={onButtonClick}
      className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
    >
      <FiPlus className="mr-2" /> {buttonText}
    </button>
  </div>
);

// HR Profile Completion
const HRProfileCompletion = () => {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ department: '', employeeId: '', hireDate: '' });
  const [completed, setCompleted] = useState(user?.profileCompleted || false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, profileCompleted: true, ...profile };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCompleted(true);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  if (completed) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="max-w-md w-full bg-white dark:bg-black rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            <FiUserCheck />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Please fill in your HR details</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
            <input
              type="text"
              value={profile.department}
              onChange={(e) => setProfile({...profile, department: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter department"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee ID</label>
            <input
              type="text"
              value={profile.employeeId}
              onChange={(e) => setProfile({...profile, employeeId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter employee ID"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hire Date</label>
            <input
              type="date"
              value={profile.hireDate}
              onChange={(e) => setProfile({...profile, hireDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Complete Profile
          </button>
        </form>
      </div>
    </div>
  );
};

// Sidebar
const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const hrMenuItems = [
    { name: 'Dashboard', icon: <FiBarChart2 />, path: '/dashboard' },
    { name: 'Employees', icon: <FiUsers />, path: '/employees' },
    { name: 'Projects', icon: <FiFolder />, path: '/projects' },
    { name: 'Issues', icon: <FiAlertTriangle />, path: '/issues' },
    { name: 'Documents', icon: <FiFile />, path: '/documents' },
    { name: 'Announcements', icon: <FiGlobe />, path: '/hr-announcements' },
    { name: 'Analytics', icon: <FiPieChart />, path: '/analytics', roles: ['Super Admin', 'Project Manager', 'HR'] },
    { name: 'Messages', icon: <FiMessageSquare />, path: '/messages' },
    { name: 'Standup Calls', icon: <FiVideo />, path: '/calls' },
    { name: 'Database', icon: <FiDatabase />, path: '/database' },
    { name: 'Security', icon: <FiShield />, path: '/security' },
    { name: 'Help Center', icon: <FiHelpCircle />, path: '/help' },
    { name: 'Settings', icon: <FiSettings />, path: '/settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLinkClick = () => {
    if (isOpen) {
      toggleSidebar();
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-black shadow-lg transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold">WF</div>
          <span className="text-xl font-bold text-gray-800 dark:text-white">Work Forge</span>
        </div>
        <button onClick={toggleSidebar} className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <FiX size={24} />
        </button>
      </div>
      
      {/* SINGLE NAVIGATION SECTION - Remove the duplicate one below */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {user && user.role === 'HR' ? (
          hrMenuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={handleLinkClick}
              className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <span className="mr-3">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))
        ) : (
          [
            { name: 'Dashboard', icon: <FiBarChart2 />, path: '/dashboard', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
            { name: 'Announcements', icon: <FiGlobe />, path: '/announcements', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
            { name: 'Projects', icon: <FiFolder />, path: '/projects', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
            { name: 'Tasks', icon: <FiCheckSquare />, path: '/tasks', roles: ['Super Admin', 'Project Manager', 'Team Member'] },
            { name: 'Timesheets', icon: <FiClock />, path: '/timesheets', roles: ['Super Admin', 'Project Manager', 'Team Member'] },
            { name: 'Issues', icon: <FiAlertTriangle />, path: '/issues', roles: ['Super Admin', 'Project Manager', 'Team Member'] },
            { name: 'Documents', icon: <FiFile />, path: '/documents', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
            { name: 'Reports', icon: <FiBarChart2 />, path: '/reports', roles: ['Super Admin', 'Project Manager'] },
            { name: 'Messages', icon: <FiMessageSquare />, path: '/messages', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
            { name: 'Standup Calls', icon: <FiVideo />, path: '/calls', roles: ['Super Admin', 'Project Manager', 'Team Member'] },
            { name: 'Settings', icon: <FiSettings />, path: '/settings', roles: ['Super Admin', 'Project Manager', 'Team Member','Client'] },
            { name: 'Analytics', icon: <FiPieChart />, path: '/analytics', roles: ['Super Admin', 'Project Manager'] },
            { name: 'Help Center', icon: <FiHelpCircle />, path: '/help', roles: ['Super Admin', 'Project Manager', 'Team Member', 'Client'] },
          ].map((item) =>
            user && item.roles.includes(user.role) && (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleLinkClick}
                className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <span className="mr-3">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            )
          )
        )}
      </nav>

      {/* Remove this duplicate nav section completely */}
      {/* <nav className="flex-1 overflow-y-auto px-2 py-4"> ... </nav> */}

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold">
              {user?.avatar || 'U'}
            </div>
            <div>
              <p className="font-medium text-gray-800 dark:text-white">{user?.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Logout"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Top Navbar
// Top Navbar with Enhanced Notifications - Fixed Persistent Read Status
const TopNavbar = ({ toggleSidebar }) => {
  const { user, darkMode, toggleDarkMode, hrMessages, contactHR, allEmployees } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readStatus, setReadStatus] = useState({});
  const dropdownRef = useRef(null);
  const notificationDetailRef = useRef(null);

  // Load read status from localStorage on initial render
  useEffect(() => {
    const savedReadStatus = localStorage.getItem('notificationReadStatus');
    if (savedReadStatus) {
      setReadStatus(JSON.parse(savedReadStatus));
    }
  }, []);

  // Save read status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('notificationReadStatus', JSON.stringify(readStatus));
  }, [readStatus]);

  // Fetch and update notifications
  useEffect(() => {
    const fetchNotifications = () => {
      const notificationList = [];
      
      // Add system notifications (these should persist read status)
      const systemNotifications = [
        { 
          id: 'task-1', 
          message: 'Task "Design homepage layout" is due tomorrow', 
          time: '2 hours ago',
          type: 'task',
          project: 'Website Redesign',
          dueDate: 'Tomorrow, 5:00 PM',
          priority: 'High'
        },
        { 
          id: 'issue-1', 
          message: 'New comment on issue "Login page not responsive"', 
          time: '1 day ago',
          type: 'issue',
          issueId: 'ISS-123',
          project: 'Mobile App',
          comment: 'Can you check the responsive design on mobile devices?'
        },
        { 
          id: 'project-1', 
          message: 'Project "Marketing Campaign" has been completed', 
          time: '3 days ago',
          type: 'project',
          project: 'Marketing Campaign',
          status: 'Completed'
        }
      ];

      // In your AnnouncementsPage component, add this after handlePublishAnnouncement:
const refreshEmployeeNotifications = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/messages/refresh-announcements', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Notified employees to refresh messages');
  } catch (error) {
    console.log('Could not refresh employee notifications:', error);
  }
};

// Call this after successful publish:
const handlePublishAnnouncement = async () => {
  // ... existing code ...
  
  if (response.ok && data.success) {
    showSnackbar(
      `✅ ${data.message || `Announcement published! Sent to ${data.notifiedCount || 'all'} employees.`}`,
      'success'
    );
    
    // ✅ ADD THIS: Trigger notification refresh for employees
    await refreshEmployeeNotifications();
    
    setShowPublishModal(false);
    setSelectedAnnouncement(null);
    fetchAnnouncements();
    fetchDrafts();
  }
}
      // Add system notifications with read status from localStorage
      systemNotifications.forEach(notification => {
        notificationList.push({
          ...notification,
          isMessage: false,
          read: readStatus[notification.id] || false
        });
      });

      // Add HR messages from backend
      if (hrMessages && Array.isArray(hrMessages)) {
        hrMessages.forEach(msg => {
          // Get sender name properly
          let senderName = 'HR';
          let senderId = null;
          
          if (msg.senderId) {
            // Check if senderId is an object or string
            if (typeof msg.senderId === 'object') {
              senderName = msg.senderId.name || 'HR';
              senderId = msg.senderId._id || msg.senderId.id;
            } else if (typeof msg.senderId === 'string') {
              // Try to find sender in allEmployees
              const sender = allEmployees.find(emp => emp.id === msg.senderId || emp._id === msg.senderId);
              senderName = sender ? sender.name : 'HR';
              senderId = msg.senderId;
            }
          }

            // ✅ ADD THIS FILTER: Don't show HR their own sent messages as notifications
    // Check if current user is the sender of this message
    if (senderId === user?.id || senderId === user?._id) {
      return; // Skip this message - HR sent it, they don't need a notification
    }

          const messageId = `msg-${msg._id || msg.id}`;
          notificationList.push({
            id: messageId,
            message: `Message from ${senderName}: ${msg.content?.substring(0, 50) || 'New message'}...`,
            time: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'Recently',
            isMessage: true,
            sender: senderName,
            senderId: senderId,
            content: msg.content || '',
            timestamp: msg.timestamp || new Date(),
            originalMessage: msg,
            notificationType: 'message',
            fromHR: senderName.includes('HR') || senderName === 'HR Department',
            // Use read status from message or localStorage
            read: msg.read || readStatus[messageId] || false
          });
        });
      }

      // Sort by timestamp (newest first)
      notificationList.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

      setNotifications(notificationList);
    };

    fetchNotifications();
    
    // Refresh notifications every 30 seconds for new messages
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [hrMessages, allEmployees, readStatus]); // Added readStatus as dependency

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (notificationDetailRef.current && 
          !notificationDetailRef.current.contains(event.target) &&
          !dropdownRef.current?.contains(event.target)) {
        setSelectedNotification(null);
      }
    };
    
    if (notificationsOpen || selectedNotification) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationsOpen, selectedNotification]);

  // Mark all as read function
  const markAllAsRead = async () => {
    // Create new read status object
    const newReadStatus = { ...readStatus };
    
    // Mark all current notifications as read
    notifications.forEach(notification => {
      newReadStatus[notification.id] = true;
    });
    
    // Update read status state
    setReadStatus(newReadStatus);
    
    // Also mark HR messages as read in the backend
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch('http://localhost:5000/api/messages/mark-all-read', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('All messages marked as read');
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    }
    
    // Show success feedback
    alert('✅ All notifications marked as read!');
  };

  // Mark single notification as read
  const markAsRead = async (id) => {
    // Update read status in localStorage
    setReadStatus(prev => ({
      ...prev,
      [id]: true
    }));
    
    // If it's a message, mark as read in backend
    const notification = notifications.find(n => n.id === id);
    if (notification && notification.isMessage && notification.originalMessage) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch(`http://localhost:5000/api/messages/${notification.originalMessage._id || notification.originalMessage.id}/read`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          console.error('Failed to mark message as read:', err);
        }
      }
    }
  };

  // Clear all read notifications
  const clearAllRead = () => {
    // Only keep unread notifications
    const unreadNotifications = notifications.filter(n => !n.read);
    
    // Update read status - remove entries for notifications we're clearing
    const newReadStatus = { ...readStatus };
    notifications.forEach(notification => {
      if (notification.read) {
        delete newReadStatus[notification.id];
      }
    });
    
    setReadStatus(newReadStatus);
    
    // For demo purposes, keep at least some notifications
    if (unreadNotifications.length === 0) {
      // Add a fresh notification
      const freshNotification = {
        id: `fresh-${Date.now()}`,
        message: 'Welcome back! You have no new notifications.',
        time: 'Just now',
        type: 'system',
        read: false
      };
      
      setReadStatus(prev => ({
        ...prev,
        [freshNotification.id]: false
      }));
    }
    
    alert('✅ All read notifications cleared!');
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // If it's a message notification, show detail view
    if (notification.isMessage) {
      setSelectedNotification(notification);
      setNotificationsOpen(false);
    } else {
      // For other notifications, show appropriate action
      switch(notification.type) {
        case 'task':
          alert(`Task Notification: ${notification.message}\nProject: ${notification.project}\nDue: ${notification.dueDate}`);
          break;
        case 'issue':
          alert(`Issue Notification: ${notification.message}\nIssue ID: ${notification.issueId}`);
          break;
        case 'project':
          alert(`Project Notification: ${notification.message}\nStatus: ${notification.status}`);
          break;
        default:
          alert(`Notification: ${notification.message}`);
      }
      setNotificationsOpen(false);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async () => {
    if (!replyMessage.trim() || !selectedNotification) return;
    
    setSendingReply(true);
    const token = localStorage.getItem('token');
    
    if (token && selectedNotification.senderId) {
      try {
        const res = await fetch('http://localhost:5000/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: replyMessage,
            recipientId: selectedNotification.senderId
          })
        });
        
        if (res.ok) {
          // Add the reply to notifications
          const replyId = `reply-${Date.now()}`;
          const newNotification = {
            id: replyId,
            message: `You replied to ${selectedNotification.sender}: ${replyMessage.substring(0, 50)}...`,
            time: 'Just now',
            isMessage: true,
            isReply: true,
            sender: user?.name || 'You',
            content: replyMessage,
            timestamp: new Date(),
            read: true // Replies are automatically marked as read
          };
          
          // Mark reply as read in localStorage
          setReadStatus(prev => ({
            ...prev,
            [replyId]: true
          }));
          
          setReplyMessage('');
          setSelectedNotification(null);
          
          alert('✅ Reply sent successfully!');
        } else {
          const errorData = await res.json();
          alert(`Failed to send reply: ${errorData.message || 'Unknown error'}`);
        }
      } catch (err) {
        console.error('Reply error:', err);
        alert('Network error. Could not send reply.');
      } finally {
        setSendingReply(false);
      }
    } else {
      alert('Cannot send reply - sender information missing');
      setSendingReply(false);
    }
  };

  // Format time display
  const formatTime = (timeString) => {
    if (!timeString) return 'Recently';
    
    if (timeString.includes('Just now')) return timeString;
    if (timeString.includes('minutes ago') || timeString.includes('hours ago') || 
        timeString.includes('day ago') || timeString.includes('days ago')) {
      return timeString;
    }
    
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString;
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString();
    } catch {
      return timeString;
    }
  };

  // Filter notifications by type
  const messageNotifications = notifications.filter(n => n.isMessage);
  const otherNotifications = notifications.filter(n => !n.isMessage);

  return (
    <>
      <div className="sticky top-0 z-20 bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="lg:hidden mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiMenu size={24} />
            </button>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 relative"
              >
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-black rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                    <div className="flex space-x-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-sm text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300 font-medium flex items-center"
                          title="Mark all as read"
                        >
                          <FiCheck className="mr-1" size={14} />
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && notifications.some(n => n.read) && (
                        <button 
                          onClick={clearAllRead}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium flex items-center"
                          title="Clear read notifications"
                        >
                          <FiTrash2 className="mr-1" size={12} />
                          Clear read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        <FiBell className="mx-auto mb-2 text-gray-400" size={24} />
                        <p>No notifications</p>
                        <p className="text-sm mt-1">You're all caught up!</p>
                      </div>
                    ) : (
                      <>
                        {/* Message Notifications */}
                        {messageNotifications.length > 0 && (
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Messages ({messageNotifications.length})
                            </p>
                          </div>
                        )}
                        {messageNotifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start">
                              <div className={`w-2 h-2 mt-2 mr-3 rounded-full flex-shrink-0 ${
                                notification.read ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 flex-shrink-0">
                                    <FiMessageCircle className="text-blue-600 dark:text-blue-400" size={16} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {notification.sender}
                                      {notification.fromHR && (
                                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded">
                                          HR
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {notification.message}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatTime(notification.time)}
                                      </span>
                                      {!notification.read && (
                                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
                                          New
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Other Notifications */}
                        {otherNotifications.length > 0 && (
                          <div className="px-4 pt-3 pb-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              System ({otherNotifications.length})
                            </p>
                          </div>
                        )}
                        {otherNotifications.map(notification => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                          >
                            <div className="flex items-start">
                              <div className={`w-2 h-2 mt-2 mr-3 rounded-full flex-shrink-0 ${
                                notification.read ? 'bg-gray-300 dark:bg-gray-700' : 'bg-blue-500'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${
                                    notification.type === 'task' ? 'bg-green-100 dark:bg-green-900' :
                                    notification.type === 'issue' ? 'bg-yellow-100 dark:bg-yellow-900' :
                                    'bg-purple-100 dark:bg-purple-900'
                                  }`}>
                                    {notification.type === 'task' && <FiCheckSquare className="text-green-600 dark:text-green-400" size={16} />}
                                    {notification.type === 'issue' && <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400" size={16} />}
                                    {notification.type === 'project' && <FiFolder className="text-purple-600 dark:text-purple-400" size={16} />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                      {notification.type === 'task' ? 'Task' : 
                                       notification.type === 'issue' ? 'Issue' : 
                                       'Project'} Notification
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {notification.message}
                                    </p>
                                    <div className="flex justify-between items-center mt-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatTime(notification.time)}
                                      </span>
                                      {notification.priority === 'High' && !notification.read && (
                                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full">
                                          {notification.priority}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                  <div className="p-3 text-center border-t border-gray-200 dark:border-gray-800">
                    <button 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white font-bold">
                {user?.avatar || 'U'}
              </div>
              <span className="hidden md:block text-gray-700 dark:text-gray-300">{user?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && selectedNotification.isMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            ref={notificationDetailRef}
            className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-lg border border-gray-200 dark:border-gray-800"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
                    <FiMessageCircle className="text-blue-600 dark:text-blue-400" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                      Message Details
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      From: {selectedNotification.sender}
                      {selectedNotification.fromHR && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs rounded-full">
                          HR
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              {/* Message Content */}
              <div className="mb-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-gray-700 dark:text-gray-300 font-bold text-sm">
                        {selectedNotification.sender?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <h4 className="font-medium text-gray-800 dark:text-white mr-2">
                          {selectedNotification.sender}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(selectedNotification.time)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {selectedNotification.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reply Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reply to {selectedNotification.sender}
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black mb-4"
                  placeholder="Type your reply..."
                />
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedNotification(null)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReplySubmit}
                    disabled={!replyMessage.trim() || sendingReply}
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {sendingReply ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend className="mr-2" size={16} />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
// Working Time Graph
const WorkingTimeGraph = () => {
  const workingTimeData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    hours: [7.5, 8.0, 6.5, 8.5, 7.0, 4.0, 0]
  };
  const maxHours = Math.max(...workingTimeData.hours);
  return (
    <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Weekly Working Hours</h2>
        <button className="text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300 text-sm font-medium">
          View Report
        </button>
      </div>
      <div className="flex items-end justify-between h-40 mt-6">
        {workingTimeData.labels.map((day, index) => (
          <div key={day} className="flex flex-col items-center flex-1">
            <div className="w-full flex flex-col items-center">
              <div
                className="w-8 bg-black rounded-t-lg transition-all duration-500 ease-in-out"
                style={{
                  height: `${(workingTimeData.hours[index] / maxHours) * 100}%`,
                  minHeight: '4px'
                }}
              ></div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{day}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{workingTimeData.hours[index]}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ✅ MODIFIED Employees Page - FIXED CHECKBOX SELECTION
const EmployeesPage = () => {
  const { allEmployees, addEmployee, removeEmployee, user, userProjects, hrMessages, viewEmployee, setViewEmployee } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false); // Add this line!
  const [messageType, setMessageType] = useState('general');
  const [messageHistory, setMessageHistory] = useState([]);
  const [messageSubject, setMessageSubject] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Team Member'
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [assigningEmployees, setAssigningEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false); // New state for "Select All" checkbox

  const nonHREmployees = allEmployees.filter(emp => emp.role !== 'HR');

  const getStatusBadgeClass = (status) => {
    if (status === 'Active') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  };

  const handleRemoveEmployee = async (id) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    await removeEmployee(id);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    const success = await addEmployee(formData);
    if (success) {
      setFormData({ name: '', email: '', role: 'Team Member' });
      setShowAddModal(false);
    }
  };

  const openMessageModal = (employee) => {
    setSelectedEmployee(employee);
    setMessageContent('');
    setShowMessageModal(true);
  };

 const sendMessage = async () => {
  if (!messageContent.trim()) {
    alert('Please enter a message.');
    return;
  }

  if (!selectedEmployee) {
    alert('No employee selected.');
    return;
  }

  console.log('=== DEBUG: Starting sendMessage ===');
  console.log('1. Selected Employee:', selectedEmployee);
  console.log('2. Message Content:', messageContent);
  
  setSendingMessage(true);
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('No authentication token found. Please login again.');
    setSendingMessage(false);
    return;
  }

  try {
    const recipientId = selectedEmployee._id || selectedEmployee.id;
    
    if (!messageContent || !recipientId) {
      alert('Missing required fields.');
      setSendingMessage(false);
      return;
    }

    const requestBody = {
      content: messageContent.trim(),
      recipientId: recipientId
    };

    const response = await fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    
    if (response.ok) {
      alert(`✅ Message sent to ${selectedEmployee.name}!`);
      
      // Close modal and reset form
      setShowMessageModal(false);
      setMessageContent('');
      setMessageSubject('');
      
      // You can add a callback or event to refresh messages if needed
      // For now, just close the modal
    } else {
      throw new Error(responseData.message || 'Failed to send message');
    }
  } catch (err) {
    console.error('Send message error:', err);
    alert(`Error: ${err.message || 'Could not send message'}`);
  } finally {
    setSendingMessage(false);
  }
};

  const assignEmployeesToProject = async () => {
    if (!selectedProject || assigningEmployees.length === 0) {
      alert('Please select a project and at least one employee.');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      for (const emp of assigningEmployees) {
        const msgRes = await fetch('http://localhost:5000/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: `You have been assigned to the project: "${userProjects.find(p => p.id === selectedProject)?.name || 'Unknown Project'}".`,
            recipientId: emp.id
          })
        });
        if (!msgRes.ok) {
          console.error(`Failed to send message to employee ${emp.id}`);
        }
      }
      alert(`✅ Assigned ${assigningEmployees.length} employee(s) to the project.`);
      setShowAssignModal(false);
      setAssigningEmployees([]);
      setSelectedProject('');
      setSelectAll(false); // Reset select all when done
    } catch (err) {
      console.error('Error assigning employees:', err);
      alert('Network error. Could not assign employees.');
    }
  };

  // Fix: Improved toggle function for individual employee selection
  const toggleEmployeeSelection = (employee) => {
    const isSelected = assigningEmployees.some(e => e.id === employee.id);
    
    if (isSelected) {
      // Remove employee from selection
      setAssigningEmployees(prev => prev.filter(e => e.id !== employee.id));
    } else {
      // Add employee to selection
      setAssigningEmployees(prev => [...prev, employee]);
    }
    
    // Update selectAll state based on current selection
    if (selectAll && !isSelected) {
      setSelectAll(false);
    }
  };

  // New function: Toggle select all employees
  const toggleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setAssigningEmployees([]);
    } else {
      // Select all non-HR employees
      setAssigningEmployees([...nonHREmployees]);
    }
    setSelectAll(!selectAll);
  };

  // 👇 Helper to get assigned projects for an employee
  const getAssignedProjects = (empId) => {
    return userProjects.filter(p => p.members && p.members.some(m => m.id === empId));
  };

  // 👇 Helper to get recent messages TO this employee
  const getMessagesToEmployee = (empId) => {
    return hrMessages
      .filter(msg => msg.recipientId === empId)
      .slice(-3)
      .map(msg => ({
        content: msg.content,
        timestamp: new Date(msg.timestamp).toLocaleString()
      }));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Employee Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your team. Add new employees, remove existing ones, or assign them to projects.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <FiUserPlus className="mr-2" /> Add Employee
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiFolder className="mr-2" /> Assign to Project
          </button>
        </div>
      </div>

      {/* Selection Summary Bar */}
      {assigningEmployees.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FiUsers className="text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                {assigningEmployees.length} employee{assigningEmployees.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={() => {
                setAssigningEmployees([]);
                setSelectAll(false);
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {nonHREmployees.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 mx-auto">
            <FiUsers size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No employees found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Team members who sign in or are added by HR will appear here.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FiUserPlus className="mr-2" /> Add First Employee
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectAll && nonHREmployees.length > 0}
                        onChange={toggleSelectAll}
                        className="mr-2"
                        title="Select all employees"
                      />
                      Employee
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                {nonHREmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={assigningEmployees.some(e => e.id === employee.id)}
                          onChange={() => toggleEmployeeSelection(employee)}
                          className="mr-2"
                          title={`Select ${employee.name}`}
                        />
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                            {employee.name.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{employee.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        {employee.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={"px-2 inline-flex text-xs leading-5 font-semibold rounded-full " + getStatusBadgeClass(employee.status)}>
                        {employee.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => openMessageModal(employee)}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={`Message ${employee.name}`}
                      >
                        <FiMail />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setViewEmployee(employee)}
                        className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 mr-4 font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRemoveEmployee(employee.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove Employee"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 👇 VIEW EMPLOYEE MODAL (remains the same) */}
      {viewEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {viewEmployee.name}
                </h2>
                <button
                  onClick={() => setViewEmployee(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <p><strong>Email:</strong> {viewEmployee.email}</p>
                <p><strong>Role:</strong> {viewEmployee.role}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    viewEmployee.status === 'Active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                  }`}>
                    {viewEmployee.status}
                  </span>
                </p>

                {/* Assigned Projects */}
                <div>
                  <strong>Assigned Projects:</strong>
                  <ul className="mt-1 list-disc pl-5 text-gray-600 dark:text-gray-400">
                    {getAssignedProjects(viewEmployee.id).length > 0 ? (
                      getAssignedProjects(viewEmployee.id).map(p => (
                        <li key={p.id}>{p.name}</li>
                      ))
                    ) : (
                      <li className="text-gray-400 italic">None</li>
                    )}
                  </ul>
                </div>

                {/* Recent Messages */}
                <div>
                  <strong>Recent Messages:</strong>
                  <div className="mt-1 max-h-24 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2 bg-gray-50 dark:bg-gray-800">
                    {getMessagesToEmployee(viewEmployee.id).length > 0 ? (
                      getMessagesToEmployee(viewEmployee.id).map((msg, i) => (
                        <p key={i} className="text-xs">{msg.content}</p>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">No messages</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setViewEmployee(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal (remains the same) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add New Employee</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <FiX size={24} />
                </button>
              </div>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  >
                    <option value="Team Member">Team Member</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Client">Client</option>
                  </select>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg"
                  >
                    Add Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Direct Message Modal (remains the same) */}
      {showMessageModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Message {selectedEmployee.name}
                </h2>
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your message
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder={`Type your message to ${selectedEmployee.name}...`}
                  required
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMessageModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={sendMessage}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Project Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assign Employees to Project</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  >
                    <option value="">Choose a project...</option>
                    {userProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Selected Employees ({assigningEmployees.length})</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2">
                    {assigningEmployees.length > 0 ? (
                      assigningEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                          <span className="text-sm text-gray-800 dark:text-white">{emp.name}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">No employees selected.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={assignEmployeesToProject}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  disabled={!selectedProject || assigningEmployees.length === 0}
                >
                  Assign to Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// New Announcements Page
const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    department: 'all',
    priority: 'medium',
    expiresAt: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const isHR = user?.role === 'HR' || user?.role === 'hr';

  useEffect(() => {
    fetchAnnouncements();
    if (isHR) {
      fetchDrafts();
    }
  }, [isHR]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/announcements', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAnnouncements(data.data || []);
      } else {
        showSnackbar(data.message || 'Failed to fetch announcements', 'error');
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showSnackbar('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/announcements/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDrafts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drafts:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAnnouncement)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showSnackbar(data.message || 'Announcement created successfully!', 'success');
        setShowCreateModal(false);
        setNewAnnouncement({
          title: '',
          content: '',
          department: 'all',
          priority: 'medium',
          expiresAt: ''
        });
        fetchDrafts();
      } else {
        showSnackbar(data.message || 'Failed to create announcement', 'error');
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      showSnackbar('Network error', 'error');
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    setPublishing(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/announcements/${selectedAnnouncement._id}/publish`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showSnackbar(
          `✅ ${data.message || `Announcement published! Sent to ${data.notifiedCount || 'all'} employees.`}`,
          'success'
        );
        setShowPublishModal(false);
        setSelectedAnnouncement(null);
        fetchAnnouncements();
        fetchDrafts();
        
        // Trigger notification refresh for all users
        if (window.refreshGlobalNotifications) {
          window.refreshGlobalNotifications();
        }
      } else {
        showSnackbar(data.message || 'Failed to publish announcement', 'error');
      }
    } catch (error) {
      console.error('Error publishing announcement:', error);
      showSnackbar('Network error', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/announcements/${selectedAnnouncement._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        showSnackbar(data.message || 'Announcement deleted successfully!', 'success');
        setShowDeleteModal(false);
        setSelectedAnnouncement(null);
        fetchAnnouncements();
        fetchDrafts();
      } else {
        showSnackbar(data.message || 'Failed to delete announcement', 'error');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showSnackbar('Network error', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getDepartmentBadge = (department) => {
    switch (department) {
      case 'all': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'hr': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100';
      case 'engineering': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100';
      case 'marketing': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100';
      case 'sales': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100';
      case 'operations': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isHR ? 'Create and manage announcements for all employees' : 'Company announcements and updates'}
          </p>
        </div>
        {isHR && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <FiPlus className="mr-2" /> Create Announcement
          </button>
        )}
      </div>

      {/* Drafts Section (HR only) */}
      {isHR && drafts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Draft Announcements</h2>
          <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {drafts.map((draft) => (
                    <tr key={draft._id || draft.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{draft.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getDepartmentBadge(draft.department)}`}>
                          {draft.department === 'all' ? 'All Departments' : draft.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(draft.priority)}`}>
                          {draft.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(draft.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(draft);
                              setShowPublishModal(true);
                            }}
                            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Publish"
                          >
                            <FiSend size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(draft);
                              setShowDeleteModal(true);
                            }}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Published Announcements */}
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
        {isHR ? 'Published Announcements' : 'Latest Announcements'}
      </h2>
      
      {announcements.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-xl shadow p-8 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 mx-auto">
            <FiGlobe size={32} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {isHR ? 'No announcements published yet' : 'No announcements available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {isHR ? 'Create and publish your first announcement' : 'Check back later for updates'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement._id || announcement.id} className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDepartmentBadge(announcement.department)}`}>
                      {announcement.department === 'all' ? 'Company Wide' : announcement.department}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority} Priority
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      {new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{announcement.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{announcement.content}</p>
                </div>
                <div className="flex flex-col items-end ml-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {announcement.createdBy?.name?.charAt(0) || 'H'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{announcement.createdBy?.name || 'HR'}</span>
                </div>
              </div>
              
              {announcement.expiresAt && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FiClock className="inline mr-1" />
                    Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {isHR && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedAnnouncement(announcement);
                      setShowDeleteModal(true);
                    }}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Announcement</h2>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="Enter announcement title"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newAnnouncement.content}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    rows="4"
                    placeholder="Enter announcement details..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                    <select
                      value={newAnnouncement.department}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, department: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    >
                      <option value="all">All Departments</option>
                      <option value="hr">HR</option>
                      <option value="engineering">Engineering</option>
                      <option value="marketing">Marketing</option>
                      <option value="sales">Sales</option>
                      <option value="operations">Operations</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                    <select
                      value={newAnnouncement.priority}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newAnnouncement.expiresAt}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, expiresAt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty if announcement doesn't expire
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAnnouncement}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Create Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPublishModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-600 dark:text-green-400">Publish Announcement</h2>
                <button 
                  onClick={() => {
                    setShowPublishModal(false);
                    setSelectedAnnouncement(null);
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <FiSend className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                </div>
                <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
                  Ready to publish this announcement?
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-2">{selectedAnnouncement.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {selectedAnnouncement.content}
                  </p>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  This announcement will be sent to <span className="font-semibold">ALL EMPLOYEES</span> as a notification.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setSelectedAnnouncement(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={publishing}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublishAnnouncement}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center disabled:opacity-50"
                  disabled={publishing}
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FiSend className="mr-2" />
                      Publish & Send to All
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Announcement</h2>
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAnnouncement(null);
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <FiTrash2 className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                </div>
                <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
                  Are you sure you want to delete this announcement?
                </p>
                <p className="text-center font-bold text-lg text-gray-800 dark:text-white mb-4">
                  "{selectedAnnouncement.title}"
                </p>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone. All announcement data will be permanently removed.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAnnouncement(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAnnouncement}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete Announcement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border ${
          snackbar.severity === 'success' 
            ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800'
            : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800'
        }`}>
          <div className="flex items-center">
            {snackbar.severity === 'success' ? (
              <FiCheck className="mr-2" />
            ) : (
              <FiAlertTriangle className="mr-2" />
            )}
            <span>{snackbar.message}</span>
            <button
              onClick={handleCloseSnackbar}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <FiX size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced HR Dashboard
const HRDashboard = () => {
  const { user, userProjects, hrMessages, contactHR, allEmployees } = useAuth();
  const navigate = useNavigate();
  const [showCallModal, setShowCallModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);
  const [newCall, setNewCall] = useState({
    title: '',
    date: '',
    time: '',
    projectId: '',
    attendees: []
  });
  const [newGroupChat, setNewGroupChat] = useState({
    title: '',
    projectId: '',
    members: []
  });

  const totalEmployees = allEmployees.filter(emp => emp.role !== 'HR').length;
  const pendingOnboarding = 0;
  const unreadMessages = hrMessages.filter(m => !m.read).length;
  const recentMessages = hrMessages.slice(-3);

  const handleCreateCall = async () => {
    if (!newCall.title || !newCall.date || !newCall.time || !newCall.projectId) {
      alert('Please fill all fields');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCall)
      });
      if (res.ok) {
        alert('✅ Standup call scheduled!');
        setNewCall({ title: '', date: '', time: '', projectId: '', attendees: [] });
        setShowCallModal(false);
      } else {
        alert('❌ Failed to create call.');
      }
    } catch (err) {
      console.error('Call creation error:', err);
      alert('Network error. Please try again.');
    }
  };

  const handleCreateGroupChat = async () => {
    if (!newGroupChat.title || newGroupChat.members.length === 0) {
      alert('Please add at least one member');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/messages/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newGroupChat)
      });
      if (res.ok) {
        alert('✅ Group chat created!');
        setNewGroupChat({ title: '', projectId: '', members: [] });
        setShowGroupChatModal(false);
      } else {
        alert('❌ Failed to create group chat.');
      }
    } catch (err) {
      console.error('Group chat error:', err);
      alert('Network error. Please try again.');
    }
  };

  return (
    <div className="p-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-black to-gray-800 text-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.name}!</h1>
            <p className="text-gray-300 mt-1">You’re new to HR — let’s get your team set up.</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3">
            <button
              onClick={() => navigate('/employees')}
              className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Manage Employees
            </button>
            <button
              onClick={() => setShowGroupChatModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Group Chat
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiUsers className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Employees</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalEmployees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
              <FiUserPlus className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Pending Onboarding</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{pendingOnboarding}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
              <FiMessageSquare className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unread Messages</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{unreadMessages}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <FiVideo className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Standup Calls</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Schedule Team Standup</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Create a recurring or one-time video call for your team.
          </p>
          <button
            onClick={() => setShowCallModal(true)}
            className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <FiVideo className="mr-2" /> Create Standup Call
          </button>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Need Help?</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            As a new HR user, you can reach out to Super Admin for guidance.
          </p>
          <button
            onClick={() => {
              const msg = prompt("Describe what you need help with:");
              if (msg) contactHR(msg);
            }}
            className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
          >
            <FiHelpCircle className="mr-2" /> Contact Support
          </button>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Messages</h2>
          <button
            onClick={() => navigate('/messages')}
            className="text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="p-6">
          {recentMessages.length > 0 ? (
            <div className="space-y-4">
              {recentMessages.map(msg => (
                <div key={msg.id} className="border-l-4 border-black pl-4 py-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-800 dark:text-white">{msg.senderId.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{msg.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No messages yet</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">HR Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/employees')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiUsers className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employees</span>
          </button>
          <button
            onClick={() => setShowGroupChatModal(true)}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiMessageSquare className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group Chat</span>
          </button>
          <button
            onClick={() => setShowCallModal(true)}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiVideo className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Standup Call</span>
          </button>
          <button
            onClick={() => navigate('/database')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiDatabase className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee DB</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create Standup Call</h2>
                <button onClick={() => setShowCallModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Call title (e.g., Weekly Dev Sync)"
                  value={newCall.title}
                  onChange={(e) => setNewCall({ ...newCall, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newCall.date}
                    onChange={(e) => setNewCall({ ...newCall, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <input
                    type="time"
                    value={newCall.time}
                    onChange={(e) => setNewCall({ ...newCall, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                </div>
                <select
                  value={newCall.projectId}
                  onChange={(e) => setNewCall({ ...newCall, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  <option value="">Select Project</option>
                  {userProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCall}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg"
                >
                  Schedule Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGroupChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Start Group Chat</h2>
                <button onClick={() => setShowGroupChatModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Group name (e.g., Onboarding Team)"
                  value={newGroupChat.title}
                  onChange={(e) => setNewGroupChat({ ...newGroupChat, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  required
                />
                <select
                  value={newGroupChat.projectId}
                  onChange={(e) => setNewGroupChat({ ...newGroupChat, projectId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  <option value="">Optional: Link to Project</option>
                  {userProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Members</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">You'll add employees after creating them</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowGroupChatModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroupChat}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CommonDashboard = () => {
  const { user, userProjects, userTasks, userIssues, userDocuments } = useAuth();
  const navigate = useNavigate();

  // Ensure all data is arrays before using filter/map methods
  const safeUserProjects = Array.isArray(userProjects) ? userProjects : [];
  const safeUserTasks = Array.isArray(userTasks) ? userTasks : [];
  const safeUserIssues = Array.isArray(userIssues) ? userIssues : [];
  const safeUserDocuments = Array.isArray(userDocuments) ? userDocuments : [];

  const activeProjects = safeUserProjects.filter(p => p.status === 'Active');
  const overdueTasks = safeUserTasks.filter(t => {
    if (!t || !t.dueDate) return false;
    try {
      const dueDate = new Date(t.dueDate);
      return dueDate < new Date() && t.status !== 'Completed';
    } catch {
      return false;
    }
  });
  
  const upcomingDeadlines = safeUserTasks
    .filter(t => t && t.status !== 'Completed')
    .sort((a, b) => {
      try {
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return dateA - dateB;
      } catch {
        return 0;
      }
    })
    .slice(0, 3);
    
  const recentDocuments = safeUserDocuments.slice(0, 3);
  const openIssues = safeUserIssues.filter(i => 
    i && (i.status === 'Open' || i.status === 'In Progress')
  );

  const announcements = [
    { id: 1, title: "System Maintenance", date: "Jan 20, 2026", content: "Scheduled maintenance on Jan 25th from 2-4 AM EST. Expect brief downtime." },
    { id: 2, title: "New Feature: Time Tracking", date: "Jan 10, 2026", content: "We've launched enhanced time tracking features. Check out the Timesheets section!" },
    { id: 3, title: "Team Building Event", date: "Dec 15, 2025", content: "Virtual team building event next Friday at 3 PM EST. Calendar invite sent." }
  ];

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-black to-gray-800 text-white rounded-xl shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Good morning, {user?.name}!</h1>
            <p className="text-gray-300 mt-1">Here's what's happening today</p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 md:mt-0 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            View All Projects
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiFolder className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Projects</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{safeUserProjects.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <FiCheckSquare className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {safeUserTasks.filter(t => t && t.status !== 'Completed').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
              <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Open Issues</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{openIssues.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
              <FiFile className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Recent Docs</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{safeUserDocuments.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Upcoming Deadlines</h2>
            <Link to="/tasks" className="text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="p-6">
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {upcomingDeadlines.map((task, index) => (
                  <div key={task?.id || index} className="flex items-start p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="mr-4 mt-1">
                      <div className={`w-3 h-3 rounded-full ${
                        task?.priority === 'Critical' ? 'bg-red-500' :
                        task?.priority === 'High' ? 'bg-orange-500' :
                        task?.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-gray-800 dark:text-white">
                          {task?.title || 'Untitled Task'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          task?.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                          task?.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                        }`}>
                          {task?.status || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Project: {task?.project?.name || task?.project || 'No project'}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Due: {task?.dueDate || 'No due date'}
                        </span>
                        {task?.subtasks !== undefined && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {task?.completedSubtasks || 0} of {task?.subtasks} subtasks remaining
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming deadlines</p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Documents</h2>
            <Link to="/documents" className="text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="p-6">
            {recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {recentDocuments.map((doc, index) => (
                  <div key={doc?.id || index} className="flex items-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <FiFile className="text-gray-400 mr-3" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {doc?.name || 'Untitled Document'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        v{doc?.version || '1.0'} • {doc?.size || 'Unknown size'}
                      </p>
                    </div>
                    <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 ml-2">
                      <FiDownload size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No documents available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Announcements</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {announcements.map(announcement => (
                <div key={announcement.id} className="border-l-4 border-black pl-4 py-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-gray-800 dark:text-white">{announcement.title}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{announcement.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{announcement.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <WorkingTimeGraph />
      </div>

      <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiFolder className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Projects</span>
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiCheckSquare className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Tasks</span>
          </button>
          <button
            onClick={() => navigate('/messages')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiMessageSquare className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Messages</span>
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <FiFile className="text-2xl text-gray-700 dark:text-gray-300 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Documents</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ProjectsPage
const ProjectsPage = () => {
  const { user, userProjects, createProject, deleteProject, allEmployees } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false); // New state for search modal
  const [searchQuery, setSearchQuery] = useState(''); // Search query state
  const [searchResults, setSearchResults] = useState([]); // Search results state
  const [isSearching, setIsSearching] = useState(false); // Loading state for search
  const [joiningProject, setJoiningProject] = useState(null); // Project being joined
  const [projectMenuOpen, setProjectMenuOpen] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'Active',
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const teamMembers = allEmployees.filter(emp =>
    emp.role === 'Team Member' || emp.role === 'Project Manager'
  );

  const filteredMembers = teamMembers.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

const handleUpdateProject = async () => {
  const { _id, name, description, startDate, endDate, status } = editingProject;
  if (!name || !startDate || !endDate) {
    alert('Please fill all required fields.');
    return;
  }

  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`http://localhost:5000/api/projects/${_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, description, startDate, endDate, status })
    });

    const updatedProject = await res.json();
    if (res.ok) {
      // Update local state
      setUserProjects(prev =>
        prev.map(p => (p._id === _id ? updatedProject : p))
      );
      alert(`✅ Project "${updatedProject.name}" updated successfully!`);
      setShowEditModal(false);
      setEditingProject(null);
    } else {
      throw new Error(updatedProject.message || 'Failed to update project');
    }
  } catch (err) {
    console.error('Update project error:', err);
    alert(`❌ Failed to update project: ${err.message}`);
  }
};

  // Function to search for projects
  const handleSearchProjects = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search term');
      return;
    }

    setIsSearching(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:5000/api/projects/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      } else {
        throw new Error('Failed to search projects');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search projects');
    } finally {
      setIsSearching(false);
    }
  };

 const handleJoinProject = async (projectId) => {
  console.log('=== FRONTEND: Starting join process ===');
  console.log('Project ID:', projectId);
  
  const token = localStorage.getItem('token');
  console.log('Token exists:', !!token);
  console.log('Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'No token');
  
  if (!token) {
    alert('Please login again');
    return;
  }

  setJoiningProject(projectId);
  
  try {
    // First test the debug route
    console.log('Testing debug route first...');
    const debugResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/debug-join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Debug route status:', debugResponse.status);
    const debugData = await debugResponse.json();
    console.log('Debug route response:', debugData);
    
    // Then test the simple route
    console.log('Testing simple route...');
    const testResponse = await fetch(`http://localhost:5000/api/projects/${projectId}/join-test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Test route status:', testResponse.status);
    const testData = await testResponse.json();
    console.log('Test route response:', testData);
    
    // Now try the actual join
    console.log('Calling actual join route...');
    const response = await fetch(`http://localhost:5000/api/projects/${projectId}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      alert(`✅ ${data.message}`);
      window.location.reload();
    } else {
      alert(`❌ Join failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Network error:', error);
    alert('❌ Network error: ' + error.message);
  } finally {
    setJoiningProject(null);
  }
};

  // Function to fetch user projects (refresh after joining)
  const fetchUserProjects = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const projects = await response.json();
        // Update user projects in context (you'll need to add this function to your AuthProvider)
        // For now, we'll reload the page
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  // Handle create project (existing function)
  const handleCreateProject = async () => {
  const { name, description, startDate, endDate } = newProject;
  if (!name || !startDate || !endDate) {
    alert('Please fill all required fields.');
    return;
  }

  // ✅ FIX: Extract just the IDs from selectedMembers
  const projectData = {
    name,
    description,
    startDate,
    endDate,
    // Send only the ID strings, not full objects
    members: selectedMembers.map(member => member.id || member._id)
  };

  console.log('Creating project with data:', projectData);
  console.log('Selected members (IDs only):', selectedMembers.map(m => m.id || m._id));

  const createdProject = await createProject(projectData);
  // ... rest of your code
   if (createdProject) {
    // Send notifications to assigned members
    const token = localStorage.getItem('token');
    if (token && selectedMembers.length > 0) {
      for (const member of selectedMembers) {
        try {
          await fetch('http://localhost:5000/api/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              content: `You have been assigned to the new project: "${createdProject.name}". Please check your Projects page.`,
              recipientId: member.id,
            }),
          });
        } catch (err) {
          console.warn(`Failed to notify ${member.name}:`, err);
        }
      }
    }

    // Reset form
    setNewProject({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'Active',
    });
    setSelectedMembers([]);
    setShowCreateModal(false);
    
    alert(`✅ Project "${createdProject.name}" created successfully!`);
  } else {
    alert('❌ Failed to create project.');
  }
};
  // Rest of your existing functions...
  const handleDeleteProject = async (projectId, projectName) => {
    setDeleteConfirm({ id: projectId, name: projectName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setIsDeleting(true);
    const success = await deleteProject(deleteConfirm.id);
    setIsDeleting(false);
    
    if (success) {
      alert(`✅ Project "${deleteConfirm.name}" deleted successfully!`);
    }
    setDeleteConfirm(null);
  };

  // Check if user can delete a project
  const canDeleteProject = (project) => {
    if (!user) return false;
    
    if (['Super Admin', 'HR'].includes(user.role)) return true;
    
    if (user.role === 'Project Manager') {
      return project.manager?.id === user.id;
    }
    
    return false;
  };

  return (
    <div className="p-6">
      {/* Header with Search Button for Team Members */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage all your projects in one place
          </p>
        </div>
        <div className="flex space-x-2">
          {/* Show Search button for Team Members, PMs, and Clients */}
          {['Team Member', 'Project Manager', 'Client'].includes(user?.role) && (
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <FiSearch className="mr-2" /> Search Projects
            </button>
          )}
          
          {/* Show Create button for HR and PMs */}
          {['HR', 'Project Manager', 'Super Admin'].includes(user?.role) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              <FiPlus className="mr-2" /> Create Project
            </button>
          )}
        </div>
      </div>

      {/* Your existing projects grid remains the same... */}
      {userProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

{userProjects.map(project => (
  <div
    key={project.id || project._id}
    onClick={() => navigate(`/projects/${project.id || project._id}`)}
    className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow cursor-pointer relative"
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{project.name}</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded ${
            project.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
            project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
          }`}>
            {project.status}
          </span>
          {/* Add the three-dot menu */}
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                // Toggle dropdown visibility - you'll need to manage this state
                setProjectMenuOpen(project.id || project._id);
              }}
              className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              title="More options"
            >
              <FiMoreVertical size={16} />
            </button>
            
            {/* Dropdown menu - add state management for this */}
            {projectMenuOpen === (project.id || project._id) && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-black rounded-md shadow-lg border border-gray-200 dark:border-gray-800 z-10">
                <div className="py-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id || project._id}`);
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left"
                  >
                    <FiFolder className="inline mr-2" /> Open Project
                  </button>
                  <button
  onClick={(e) => {
    e.stopPropagation();
    // Prepare editable project data (only safe fields)
    const projectForEdit = {
      _id: project._id,
      name: project.name,
      description: project.description || '',
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      status: project.status || 'Active'
    };
    setEditingProject(projectForEdit);
    setShowEditModal(true);
  }}
  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left"
>
  <FiEdit className="inline mr-2" /> Edit
</button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle duplicate functionality
                      alert('Duplicate functionality coming soon');
                    }}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 w-full text-left"
                  >
                    <FiCopy className="inline mr-2" /> Duplicate
                  </button>
                  {canDeleteProject(project) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id || project._id, project.name);
                      }}
                      className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                    >
                      <FiTrash2 className="inline mr-2" /> Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{project.description}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{project.startDate} – {project.endDate}</p>
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-black h-2.5 rounded-full"
            style={{ width: `${Math.min(project.progress, 100)}%` }}
          ></div>
        </div>
      </div>
      <div className="flex justify-between text-sm mb-4">
        <div>
          <p className="text-gray-500">Tasks</p>
          <p className="font-medium">{project.completedTasks}/{project.tasks}</p>
        </div>
        <div>
          <p className="text-gray-500">Manager</p>
          <p className="font-medium">{project.manager?.name || '—'}</p>
        </div>
      </div>
      {project.members && project.members.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Team Members:</p>
          <div className="flex flex-wrap gap-1">
            {project.members.slice(0, 3).map((member, index) => (
              <span
                key={member.id || index}
                className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-gray-700 dark:text-gray-300"
              >
                {member.name?.split(' ')[0] || 'Member'}
              </span>
            ))}
            {project.members.length > 3 && (
              <span className="text-xs text-gray-500 px-2 py-1">
                +{project.members.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
))}
        </div>
      ) : (
        <div className="bg-white dark:bg-black rounded-xl shadow p-8 mb-6 border border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
              {user?.isNewUser ? "Welcome to Work Forge!" : "No projects yet"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              {user?.isNewUser
                ? "Start by searching for projects or creating your first one."
                : "You don't have any projects yet."}
            </p>
            <div className="flex justify-center space-x-4">
              {['Team Member', 'Project Manager', 'Client'].includes(user?.role) && (
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-lg"
                >
                  <FiSearch className="mr-2" /> Search Projects
                </button>
              )}
              {['HR', 'Project Manager', 'Super Admin'].includes(user?.role) && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors text-lg"
                >
                  <FiPlus className="mr-2" /> Create Project
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
{showEditModal && editingProject && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Project</h2>
          <button
            onClick={() => {
              setShowEditModal(false);
              setEditingProject(null);
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name *</label>
            <input
              type="text"
              value={editingProject.name}
              onChange={(e) =>
                setEditingProject({ ...editingProject, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              placeholder="e.g. Website Redesign"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={editingProject.description}
              onChange={(e) =>
                setEditingProject({ ...editingProject, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              rows="2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                value={editingProject.startDate}
                onChange={(e) =>
                  setEditingProject({ ...editingProject, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
              <input
                type="date"
                value={editingProject.endDate}
                onChange={(e) =>
                  setEditingProject({ ...editingProject, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={editingProject.status}
              onChange={(e) =>
                setEditingProject({ ...editingProject, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
            >
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={() => {
              setShowEditModal(false);
              setEditingProject(null);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateProject}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Search Projects Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Search Projects</h2>
                <button 
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearchProjects()}
                    placeholder="Search projects by name or description..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleSearchProjects}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSearching ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <FiSearch className="mr-2" /> Search
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {searchResults.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                    Found {searchResults.length} project{searchResults.length !== 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {searchResults.map(project => (
                      <div key={project._id || project.id} className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800 dark:text-white">{project.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{project.description}</p>
                          </div>
                          <button
                            onClick={() => handleJoinProject(project._id || project.id)}
                            disabled={joiningProject === (project._id || project.id)}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            {joiningProject === (project._id || project.id) ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-1"></div>
                                Joining...
                              </>
                            ) : (
                              <>
                                <FiUserPlus className="mr-1" size={12} /> Join
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Manager: {project.manager?.name || 'HR'}</span>
                          <span>{project.members?.length || 0} member(s)</span>
                          <span>Status: {project.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {searchResults.length === 0 && searchQuery && !isSearching && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FiSearch className="mx-auto mb-3 text-4xl opacity-50" />
                  <p>No projects found matching "{searchQuery}"</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your existing Create Project Modal remains the same... */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Project</h2>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="e.g. Website Redesign"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    rows="2"
                    placeholder="Describe the project..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Date *</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Assign Team Members (Optional)</label>
                  <input
                    type="text"
                    placeholder="Search team members..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg mb-2"
                  />
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map(emp => (
                        <div key={emp.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                          <input
                            type="checkbox"
                            checked={selectedMembers.some(m => m.id === emp.id)}
                            onChange={() => {
                              if (selectedMembers.some(m => m.id === emp.id)) {
                                setSelectedMembers(selectedMembers.filter(m => m.id !== emp.id));
                              } else {
                                setSelectedMembers([...selectedMembers, emp]);
                              }
                            }}
                            className="mr-2"
                          />
                          <div className="flex-1">
                            <p className="text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-2 text-sm text-gray-500">No team members found</p>
                    )}
                  </div>
                  <p className="text-xs mt-1 text-gray-500">
                    Selected: {selectedMembers.length} member(s)
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Delete Project</h2>
                <button 
                  onClick={() => setDeleteConfirm(null)} 
                  className="text-gray-500 hover:text-gray-700"
                  disabled={isDeleting}
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <FiTrash2 className="text-red-600 dark:text-red-400" size={24} />
                  </div>
                </div>
                <p className="text-center text-gray-700 dark:text-gray-300 mb-2">
                  Are you sure you want to delete the project?
                </p>
                <p className="text-center font-bold text-lg text-gray-800 dark:text-white mb-4">
                  "{deleteConfirm.name}"
                </p>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone. All project data will be permanently removed.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Project'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
  );
};
// Add this new component after the ProjectsPage component

// Project Detail Page Component
const ProjectDetailPage = () => {
  const { user, userProjects } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find the project by ID from userProjects
    const foundProject = userProjects.find(p => 
      p.id === id || p._id === id
    );
    
    if (foundProject) {
      setProject(foundProject);
    } else {
      // If project not found in local state, try to fetch from API
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`http://localhost:5000/api/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data) {
              setProject(data);
            } else {
              navigate('/projects');
            }
          })
          .catch(() => navigate('/projects'));
      } else {
        navigate('/projects');
      }
    }
    setLoading(false);
  }, [id, userProjects, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800 text-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Project Not Found</h2>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FiChevronLeft className="mr-2" /> Back to Projects
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center mb-4">
              <span className={`text-xs px-2 py-1 rounded mr-3 ${
                project.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                project.status === 'Completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100'
              }`}>
                {project.status}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {project.startDate} – {project.endDate}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{project.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <FiEdit className="text-gray-600 dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <FiTrash2 className="text-red-500 dark:text-red-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Progress</span>
            <span>{project.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-black h-3 rounded-full" 
              style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiCheckSquare className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Tasks</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {project.completedTasks || 0}/{project.tasks || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <FiUsers className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Team Members</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {project.members?.length || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
              <FiFile className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Documents</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {project.documents || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
              <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Issues</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {project.issues || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2 bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Team Members</h2>
            <button className="text-sm text-black hover:text-gray-700 dark:text-white dark:hover:text-gray-300">
              <FiUserPlus className="inline mr-1" /> Add Member
            </button>
          </div>
          <div className="p-6">
            {project.members && project.members.length > 0 ? (
              <div className="space-y-4">
                {project.members.map((member, index) => (
                  <div key={member.id || index} className="flex items-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold mr-3">
                      {member.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-white">{member.name || 'Unknown Member'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.role || 'Team Member'}</p>
                    </div>
                    <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                      <FiMail />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiUsers className="mx-auto mb-3 text-4xl opacity-50" />
                <p>No team members assigned yet</p>
                <p className="text-sm mt-1">Add team members to collaborate on this project</p>
              </div>
            )}
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Project Details</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Project Manager</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {project.manager?.name || 'Not Assigned'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Updated</p>
              <p className="font-medium text-gray-800 dark:text-white">
                {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Project ID</p>
              <p className="font-mono text-sm text-gray-800 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                {project.id || project._id}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { action: 'Project created', user: 'System', time: project.createdAt || 'Just now' },
              { action: 'Status updated to Active', user: project.manager?.name || 'Admin', time: '2 days ago' },
              { action: '3 team members added', user: 'HR', time: '1 week ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-black dark:bg-white mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-white">{activity.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">by {activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const NewUserMessage = ({ pageName }) => {
  const { user, contactHR } = useAuth();
  const handleContactHR = async () => {
    const message = prompt('Please describe your request to HR:');
    if (!message || message.trim() === '') return;
    const success = await contactHR(message.trim());
    if (success) {
      alert('✅ Your message has been sent to HR!');
    } else {
      alert('❌ Failed to send message. Please try again.');
    }
  };
  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
        <FiAlertTriangle size={32} />
      </div>
      <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">You are new to this</h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        You don't have access to {pageName} yet. Please contact your Admin or HR for access.
      </p>
      <button
        onClick={handleContactHR}
        className="inline-flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
      >
        <FiMail className="mr-2" /> Contact Admin/HR
      </button>
    </div>
  );
};

// Other pages (TasksPage, TimesheetsPage, etc.) remain unchanged for brevity
// But they are included below exactly as in your original file

const TasksPage = () => {
  const { user, userTasks } = useAuth();
  if (userTasks.length === 0) return <NewUserMessage pageName="Tasks" />;
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Tasks</h1>
      <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
              {userTasks.map(task => (
                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{task.subtasks} subtasks</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{task.project?.name || task.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      task.priority === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{task.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TimesheetsPage = () => {
  const { user } = useAuth();
  return <NewUserMessage pageName="Timesheets" />;
};

const IssuesPage = () => {
  const { user, userIssues } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showIssueDetail, setShowIssueDetail] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    category: 'workplace',
    priority: 'medium',
    anonymous: false,
    confidential: false,
    department: 'hr'
  });

  useEffect(() => {
    fetchIssues();
    if (user?.role === 'HR' || user?.role === 'Super Admin') {
      fetchIssueStats();
    }
  }, [user]);

  const fetchIssues = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/issues', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIssues(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssueStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/issues/stats/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleReportIssue = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!newIssue.title || !newIssue.description) {
      alert('Please fill in title and description');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newIssue)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(data.message);
        setShowReportModal(false);
        setNewIssue({
          title: '',
          description: '',
          category: 'workplace',
          priority: 'medium',
          anonymous: false,
          confidential: false,
          department: 'hr'
        });
        fetchIssues();
      } else {
        alert(data.message || 'Failed to report issue');
      }
    } catch (error) {
      console.error('Error reporting issue:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleAddComment = async (issueId, commentText) => {
    const token = localStorage.getItem('token');
    if (!token || !commentText.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/issues/${issueId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: commentText })
      });

      if (response.ok) {
        fetchIssues();
        // Refresh current issue detail if open
        if (showIssueDetail && showIssueDetail._id === issueId) {
          const issueResponse = await fetch(`http://localhost:5000/api/issues/${issueId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (issueResponse.ok) {
            const issueData = await issueResponse.json();
            if (issueData.success) {
              setShowIssueDetail(issueData.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleUpdateStatus = async (issueId, newStatus) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!window.confirm(`Change status to ${newStatus}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/issues/${issueId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchIssues();
        if (showIssueDetail && showIssueDetail._id === issueId) {
          setShowIssueDetail(prev => ({
            ...prev,
            status: newStatus
          }));
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredIssues = issues.filter(issue => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'open') return issue.status === 'open';
    if (activeFilter === 'my') return issue.reporter?._id === user?.id;
    if (activeFilter === 'resolved') return issue.status === 'resolved' || issue.status === 'closed';
    return true;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white dark:bg-red-700';
      case 'high': return 'bg-orange-500 text-white dark:bg-orange-700';
      case 'medium': return 'bg-yellow-500 text-white dark:bg-yellow-700';
      case 'low': return 'bg-green-500 text-white dark:bg-green-700';
      default: return 'bg-gray-500 text-white dark:bg-gray-700';
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'workplace': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
      case 'technical': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'hr': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100';
      case 'harassment': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'safety': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {user?.role === 'HR' || user?.role === 'Super Admin' ? 'Issue Management' : 'Report an Issue'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.role === 'HR' || user?.role === 'Super Admin' 
              ? 'Manage and resolve employee-reported issues' 
              : 'Report workplace issues confidentially'}
          </p>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
        >
          <FiFlag className="mr-2" /> Report New Issue
        </button>
      </div>

      {/* HR Dashboard Stats */}
      {(user?.role === 'HR' || user?.role === 'Super Admin') && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg mr-4">
                <FiAlertTriangle className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Open Issues</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.byStatus?.find(s => s._id === 'open')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
                <FiClock className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">In Progress</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.byStatus?.find(s => s._id === 'in_progress')?.count || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
                <FiCheck className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Resolved</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.byStatus?.filter(s => ['resolved', 'closed'].includes(s._id))
                    .reduce((sum, s) => sum + s.count, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                <FiActivity className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Avg. Resolution</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {stats.avgResolutionTime?.[0]?.avgTime 
                    ? `${stats.avgResolutionTime[0].avgTime.toFixed(1)} days` 
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-6">
        {[
          { id: 'all', label: 'All Issues' },
          { id: 'open', label: 'Open' },
          { id: 'my', label: 'My Reports' },
          { id: 'resolved', label: 'Resolved' }
        ].map(filter => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeFilter === filter.id
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-xl shadow p-12 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 mx-auto">
            <FiFlag size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {activeFilter === 'my' ? 'You haven\'t reported any issues yet' : 'No issues found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeFilter === 'my' 
              ? 'Click "Report New Issue" to report your first concern' 
              : 'All reported issues are managed here'}
          </p>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              View All Issues
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <div
              key={issue._id}
              onClick={() => setShowIssueDetail(issue)}
              className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryBadgeClass(issue.category)}`}>
                      {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeClass(issue.priority)}`}>
                      {issue.priority.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(issue.status)}`}>
                      {issue.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {issue.confidential && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                        <FiLock className="inline mr-1" size={10} /> Confidential
                      </span>
                    )}
                    {issue.anonymous && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                        <FiUser className="inline mr-1" size={10} /> Anonymous
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                    {issue.title}
                  </h3>
                  
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                    {issue.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      {issue.anonymous ? (
                        <div className="flex items-center">
                          <FiUser className="mr-2 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">Anonymous Report</span>
                        </div>
                      ) : issue.reporter ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-xs mr-2">
                            {issue.reporter.name?.charAt(0) || 'U'}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">
                            {issue.reporter.name} • {issue.reporter.role}
                          </span>
                        </>
                      ) : null}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center">
                        <FiMessageCircle className="mr-1" />
                        {issue.comments?.length || 0} comments
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowIssueDetail(issue);
                  }}
                  className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <FiChevronRight className="text-gray-400" size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Report New Issue</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Issue Title *
                  </label>
                  <input
                    type="text"
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="Brief description of the issue"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    rows="4"
                    placeholder="Provide detailed information about the issue..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      value={newIssue.category}
                      onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    >
                      <option value="workplace">Workplace Issue</option>
                      <option value="technical">Technical Problem</option>
                      <option value="hr">HR Related</option>
                      <option value="harassment">Harassment/Bullying</option>
                      <option value="safety">Safety Concern</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={newIssue.priority}
                      onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIssue.anonymous}
                      onChange={(e) => setNewIssue({ ...newIssue, anonymous: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Report Anonymously</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newIssue.confidential}
                      onChange={(e) => setNewIssue({ ...newIssue, confidential: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Confidential</span>
                  </label>
                </div>
                
                {newIssue.anonymous && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <FiInfo className="inline mr-1" />
                      Your identity will not be shared with anyone, including HR. 
                      However, this may limit our ability to investigate fully.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportIssue}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Detail Modal */}
      {showIssueDetail && (
        <IssueDetailModal
          issue={showIssueDetail}
          onClose={() => setShowIssueDetail(null)}
          onAddComment={handleAddComment}
          onUpdateStatus={handleUpdateStatus}
          currentUser={user}
          onRefresh={() => {
            fetchIssues();
            // Refresh the current issue
            const token = localStorage.getItem('token');
            if (token) {
              fetch(`http://localhost:5000/api/issues/${showIssueDetail._id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    setShowIssueDetail(data.data);
                  }
                });
            }
          }}
        />
      )}
    </div>
  );
};

// Issue Detail Modal Component
const IssueDetailModal = ({ issue, onClose, onAddComment, onUpdateStatus, currentUser, onRefresh }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handleSubmitComment = async () => {
    if (!newComment.trim()) {
      setCommentError('Please enter a comment');
      return;
    }
    
    setIsSubmitting(true);
    setCommentError('');
    
    try {
      await onAddComment(issue._id, newComment);
      setNewComment('');
      onRefresh();
    } catch (error) {
      console.error('Error submitting comment:', error);
      setCommentError('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusOptions = () => {
    const baseOptions = ['open', 'in_progress', 'resolved', 'closed'];
    if (currentUser?.role === 'HR' || currentUser?.role === 'Super Admin') {
      return baseOptions;
    }
    return [];
  };

  const canViewReporterInfo = () => {
    if (issue.anonymous) return false;
    if (currentUser?.role === 'HR' || currentUser?.role === 'Super Admin') return true;
    if (currentUser?.id === issue.reporter?._id) return true;
    return false;
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white dark:bg-red-700 px-2 py-1 rounded-full text-xs font-semibold';
      case 'high': return 'bg-orange-500 text-white dark:bg-orange-700 px-2 py-1 rounded-full text-xs font-semibold';
      case 'medium': return 'bg-yellow-500 text-white dark:bg-yellow-700 px-2 py-1 rounded-full text-xs font-semibold';
      case 'low': return 'bg-green-500 text-white dark:bg-green-700 px-2 py-1 rounded-full text-xs font-semibold';
      default: return 'bg-gray-500 text-white dark:bg-gray-700 px-2 py-1 rounded-full text-xs font-semibold';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 px-2 py-1 rounded-full text-xs font-semibold';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 px-2 py-1 rounded-full text-xs font-semibold';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1 rounded-full text-xs font-semibold';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100 px-2 py-1 rounded-full text-xs font-semibold';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-2 py-1 rounded-full text-xs font-semibold';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-4xl border border-gray-200 dark:border-gray-800">
        <div className="p-6 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span className={getPriorityBadgeClass(issue.priority)}>
                  {issue.priority.toUpperCase()}
                </span>
                <span className={getStatusBadgeClass(issue.status)}>
                  {issue.status.replace('_', ' ').toUpperCase()}
                </span>
                {issue.confidential && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                    <FiLock className="inline mr-1" size={10} /> Confidential
                  </span>
                )}
                {issue.anonymous && (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
                    <FiUser className="inline mr-1" size={10} /> Anonymous
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{issue.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Issue Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Description</h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap font-sans text-gray-600 dark:text-gray-400">
                    {issue.description}
                  </pre>
                </div>
              </div>

              {/* Comments Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Comments ({issue.comments?.length || 0})
                </h3>
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                  {issue.comments?.length > 0 ? (
                    issue.comments.map((comment, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm mr-2">
                              {comment.user?.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-white">
                                {comment.user?.name || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {comment.user?.role} • {new Date(comment.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {comment.isPrivate && (
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              <FiLock className="inline mr-1" /> Private
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mt-2">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No comments yet. Be the first to comment.
                    </p>
                  )}
                </div>

                {/* Add Comment */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Comment</h4>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white mb-2"
                    rows="3"
                    placeholder="Add your comment..."
                  />
                  {commentError && (
                    <p className="text-red-500 text-sm mb-2">{commentError}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentUser?.role === 'HR' || currentUser?.role === 'Super Admin'
                        ? 'Your comments will be visible to HR and the reporter'
                        : 'Your comments will be visible to HR'}
                    </p>
                    <button
                      onClick={handleSubmitComment}
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar - Issue Info */}
            <div className="space-y-6">
              {/* Reporter Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Report Details</h3>
                {canViewReporterInfo() && issue.reporter ? (
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold mr-3">
                      {issue.reporter.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">{issue.reporter.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{issue.reporter.role}</p>
                      {issue.reporter.department && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{issue.reporter.department}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 mr-3">
                      <FiUser />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">Anonymous Report</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Identity protected</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reported Date</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">
                      {new Date(issue.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white capitalize">
                      {issue.category.replace('_', ' ')}
                    </p>
                  </div>
                  {issue.resolvedDate && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Resolved Date</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        {new Date(issue.resolvedDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* HR Actions */}
              {(currentUser?.role === 'HR' || currentUser?.role === 'Super Admin') && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">HR Actions</h3>
                  
                  {/* Status Update */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Update Status
                    </label>
                    <select
                      value={issue.status}
                      onChange={(e) => onUpdateStatus(issue._id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
                    >
                      {getStatusOptions().map(status => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Assign to HR */}
                  {issue.status === 'open' && (
                    <button
                      onClick={() => {
                        // Implement assign functionality
                        if (window.confirm('Assign this issue to yourself?')) {
                          const token = localStorage.getItem('token');
                          if (token) {
                            fetch(`http://localhost:5000/api/issues/${issue._id}/assign`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ assigneeId: currentUser.id })
                            })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  alert('Issue assigned to you');
                                  onRefresh();
                                }
                              });
                          }
                        }
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <FiUserPlus className="inline mr-1" /> Take Ownership
                    </button>
                  )}

                  {/* View History */}
                  <button
                    onClick={() => {
                      // Show history modal
                      alert('History feature coming soon');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-2 text-sm"
                  >
                    <FiHistory className="inline mr-1" /> View History
                  </button>
                </div>
              )}

              {/* Quick Actions for Reporter */}
              {currentUser?.id === issue.reporter?._id && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Your Actions</h3>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to mark this as resolved?')) {
                        onUpdateStatus(issue._id, 'resolved');
                      }
                    }}
                    disabled={issue.status === 'resolved' || issue.status === 'closed'}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm mb-2"
                  >
                    <FiCheck className="inline mr-1" /> Mark as Resolved
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this issue? This cannot be undone.')) {
                        const token = localStorage.getItem('token');
                        if (token) {
                          fetch(`http://localhost:5000/api/issues/${issue._id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                          })
                            .then(res => res.json())
                            .then(data => {
                              if (data.success) {
                                alert('Issue deleted');
                                onClose();
                                onRefresh();
                              }
                            });
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <FiTrash2 className="inline mr-1" /> Delete Report
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
const ReportsPage = () => {
  const { user } = useAuth();
  return <NewUserMessage pageName="Reports" />;
};

// MessagesPage
const MessagesPage = () => {
  const { user, hrMessages, allEmployees } = useAuth();
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageThreads, setMessageThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const HR_ID = 'hr-dept';

  const getUserById = (id) => {
    if (id === user?.id) return user;
    if (id === HR_ID) {
      return { id: HR_ID, name: 'HR Department', role: 'HR', status: 'Active' };
    }
    const emp = allEmployees.find(emp => emp.id === id);
    return emp || { id, name: 'Unknown User', role: 'User' };
  };

  useEffect(() => {
    if (!user || !Array.isArray(hrMessages)) {
      setLoading(false);
      return;
    }
    const partners = new Set();
    if (user.role !== 'HR') {
      partners.add(HR_ID);
    }
    if (user.role === 'HR') {
      allEmployees.forEach(emp => {
        if (emp.role !== 'HR') partners.add(emp.id);
      });
    }
   hrMessages.forEach(msg => {
  // If the current user is the RECIPIENT, add the SENDER as a partner
  if (msg.recipientId === user?.id || msg.recipientId === user?._id) {
    partners.add(msg.senderId);  // ✅ Add sender ID as partner
    
  // If the current user is the SENDER, add the RECIPIENT as a partner  
  } else if (msg.senderId === user?.id || msg.senderId === user?._id) {
    partners.add(msg.recipientId);  // ✅ Add recipient ID as partner
  }
});
    const threads = Array.from(partners).map(id => {
      const partner = getUserById(id);
      const msgs = hrMessages.filter(m =>
        (m.senderId === user.id && m.recipientId === id) ||
        (m.recipientId === user.id && m.senderId === id)
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      const lastMessageTime = msgs.length > 0
        ? new Date(msgs[msgs.length - 1].timestamp)
        : new Date(0);
      return { partner, messages: msgs, lastMessageTime };
    }).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    setMessageThreads(threads);
    if (threads.length > 0 && !selectedContact) {
      setSelectedContact(threads[0].partner);
    } else if (threads.length === 0 && user.role !== 'HR') {
      const hrPartner = getUserById(HR_ID);
      setSelectedContact(hrPartner);
      setMessageThreads([{ partner: hrPartner, messages: [], lastMessageTime: new Date(0) }]);
    }
    setLoading(false);
  }, [user, hrMessages, allEmployees]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContact, messageThreads]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newMessage,
          recipientId: selectedContact.id
        })
      });
      if (res.ok) {
        setNewMessage('');
        // Refetch could be added here if needed
      } else {
        const err = await res.json();
        alert(`❌ Send failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Network error. Could not send message.');
    }
  };

  const currentThread = messageThreads.find(t => t.partner.id === selectedContact?.id);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-120px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex overflow-hidden bg-gray-100 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl mx-6 my-6">
      {/* Sidebar - Contact List */}
      <div className="w-1/3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {messageThreads.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No conversations yet.
            </div>
          ) : (
            messageThreads.map(thread => (
              <div
                key={thread.partner.id}
                onClick={() => setSelectedContact(thread.partner)}
                className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center ${
                  selectedContact?.id === thread.partner.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-lg mr-3">
                    {thread.partner.name.charAt(0)}
                  </div>
                  <span className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-gray-800 dark:text-white truncate">{thread.partner.name}</p>
                    {thread.messages.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(thread.messages[thread.messages.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {thread.messages.length > 0
                      ? thread.messages[thread.messages.length - 1].content
                      : 'No messages'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-black relative">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        </div>
        {selectedContact ? (
          <>
            <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold mr-3">
                  {selectedContact.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.role}</p>
                </div>
              </div>
              <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
                <FiVideo className="cursor-pointer hover:text-black dark:hover:text-white" />
                <FiPhone className="cursor-pointer hover:text-black dark:hover:text-white" />
                <FiSearch className="cursor-pointer hover:text-black dark:hover:text-white" />
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto z-0">
              {currentThread?.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
                  Start a conversation!
                </div>
              ) : (
                <div className="space-y-1">
                  {currentThread?.messages.map((msg, idx) => {
                    const isSent = msg.senderId === user.id;
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="flex flex-col ${isSent ? 'items-end' : 'items-start'} max-w-[70%]">
                          <div
                            className={`px-3 py-2 shadow-sm text-sm relative ${
                              isSent
                                ? 'bg-[#d9fdd3] dark:bg-green-900/40 text-gray-800 dark:text-gray-100 rounded-tl-lg rounded-tr-lg rounded-br-none rounded-bl-lg'
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-lg rounded-tr-none rounded-br-lg rounded-bl-lg'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <span className={`text-[10px] text-gray-500 dark:text-gray-400 mt-1 mx-1`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isSent && ' ✓'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 p-3 flex items-center border-t border-gray-200 dark:border-gray-800 z-10">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2">
                <FiPlus size={24} />
              </button>
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-full px-4 py-2 flex items-center">
                <span className="text-xl mr-2">😊</span>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message"
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-white text-sm"
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="ml-3 p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {newMessage.trim() ? <FiSend /> : '🎤'}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-900 border-b-8 border-[#00a884]">
            <div className="w-64 h-64 mb-6 bg-[#d9fdd3] dark:bg-gray-800 rounded-full flex items-center justify-center">
              <FiMessageSquare size={80} className="text-gray-400" />
            </div>
            <h2 className="text-3xl font-light text-gray-700 dark:text-gray-300 mb-4">Work Forge Web</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
              Send and receive messages without keeping your phone online.<br/>
              Use Work Forge on up to 4 linked devices and 1 phone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


// SettingsPage
const SettingsPage = () => {
  const { user, darkMode, toggleDarkMode, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ')[1] || '',
    email: user?.email || '',
    role: user?.role || ''
  });
  const [notifications, setNotifications] = useState({
    email: JSON.parse(localStorage.getItem('notif_email')) ?? true,
    push: JSON.parse(localStorage.getItem('notif_push')) ?? false,
    reminders: JSON.parse(localStorage.getItem('notif_reminders')) ?? true,
    weekly: JSON.parse(localStorage.getItem('notif_weekly')) ?? true
  });
  const [preferences, setPreferences] = useState({
    language: localStorage.getItem('pref_language') || 'English (US)',
    timezone: localStorage.getItem('pref_timezone') || 'Eastern Time (ET)',
    dateFormat: localStorage.getItem('pref_dateFormat') || 'MM/DD/YYYY'
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: fullName, email: profileForm.email })
      });
      if (res.ok) {
        const updatedUser = { ...user, name: fullName, email: profileForm.email };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        alert('✅ Profile updated successfully!');
      } else {
        const err = await res.json();
        alert(`❌ Failed: ${err.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error while saving profile.');
    }
  };

  const toggleNotification = (key) => {
    const newValue = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: newValue }));
    localStorage.setItem(`notif_${key}`, JSON.stringify(newValue));
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert('❌ New passwords do not match.');
      return;
    }
    alert('✅ Password changed successfully!');
    setPasswords({ current: '', new: '', confirm: '' });
  };

  const handleSignOutOtherSessions = () => {
    alert('✅ Other sessions signed out.');
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`pref_${key}`, value);
  };

  const handleThemeToggle = () => {
    toggleDarkMode();
  };

  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Settings</h1>
      <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex -mb-px">
            {['profile', 'notifications', 'security', 'preferences'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-black text-black dark:border-white dark:text-white'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Profile Information</h2>
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-white font-bold text-2xl mr-4">
                  {user?.avatar || 'U'}
                </div>
                <div>
                  <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg mr-2">
                    Change Photo
                  </button>
                  <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    Remove
                  </button>
                </div>
              </div>
              <form onSubmit={handleSaveProfile}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                    <input
                      type="text"
                      value={profileForm.role}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Notification Preferences</h2>
              {[
                { key: 'email', label: 'Email Notifications', desc: 'Receive email updates about projects and tasks' },
                { key: 'push', label: 'Push Notifications', desc: 'Browser notifications' },
                { key: 'reminders', label: 'Task Reminders', desc: 'Get reminded before deadlines' },
                { key: 'weekly', label: 'Weekly Summary', desc: 'Get a weekly recap email' }
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-800">
                  <div>
                    <h3 className="text-sm font-medium text-gray-800 dark:text-white">{label}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleNotification(key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      notifications[key] ? 'bg-black dark:bg-white' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      notifications[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}></span>
                  </button>
                </div>
              ))}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => alert('✅ Notification preferences saved.')}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Security Settings</h2>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Change Password</h3>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                  >
                    Update Password
                  </button>
                </form>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Add an extra layer of security</p>
                <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg">
                  Enable Two-Factor Authentication
                </button>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Active Sessions</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">Chrome on Windows</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Current session • Now</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full">Current</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white">Safari on iPhone</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last active: 2 days ago</p>
                    </div>
                    <button
                      onClick={handleSignOutOtherSessions}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'preferences' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Preferences</h2>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Appearance</h3>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred theme</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => !darkMode && handleThemeToggle()}
                      className={`px-3 py-1 rounded-lg ${!darkMode ? 'bg-black text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Light
                    </button>
                    <button
                      onClick={() => darkMode && handleThemeToggle()}
                      className={`px-3 py-1 rounded-lg ${darkMode ? 'bg-black text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Language</h3>
                <select
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  {['English (US)', 'Spanish', 'French', 'German', 'Chinese'].map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Time Zone</h3>
                <select
                  value={preferences.timezone}
                  onChange={(e) => handlePreferenceChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  {['Pacific Time (PT)', 'Mountain Time (MT)', 'Central Time (CT)', 'Eastern Time (ET)', 'GMT', 'CET', 'IST'].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-800 dark:text-white mb-2">Date Format</h3>
                <select
                  value={preferences.dateFormat}
                  onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => alert('✅ Preferences saved.')}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Unauthorized
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
    <div className="max-w-md w-full bg-white dark:bg-black rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-800">
      <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mx-auto mb-4">
        <FiLock size={32} />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">You don't have permission to access this page.</p>
      <Link to="/home" className="inline-block px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors">
        Go to Home
      </Link>
    </div>
  </div>
);

// Layout
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white dark:bg-black">
          {children}
        </main>
      </div>
      <ChatBot />
    </div>
  );
};

// ChatBot
const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hi! I'm your virtual assistant. How can I help you today?", isBot: true }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const chatbotRef = useRef(null);

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setMessages([...messages, { text: inputMessage, isBot: false }]);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: "I'm here to help! You can ask me about projects, tasks, or any other features.",
          isBot: true
        }]);
      }, 1000);
      setInputMessage('');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={chatbotRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-black hover:bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 animate-float"
      >
        <FiMessageCircle size={24} />
      </button>
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white dark:bg-black rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="bg-black text-white p-4 flex justify-between items-center">
            <h3 className="font-semibold">Virtual Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300"
            >
              <FiX size={20} />
            </button>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.isBot
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white'
                      : 'bg-black text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// HomePage
const HomePage = () => {
  const navigate = useNavigate();
  const features = [
    { icon: <FiFolder size={24} />, title: 'Project Management', description: 'Create, organize, and track all your projects in one place.' },
    { icon: <FiCheckSquare size={24} />, title: 'Task Tracking', description: 'Assign tasks, set deadlines, and monitor progress.' },
    { icon: <FiUsers size={24} />, title: 'Team Collaboration', description: 'Work together seamlessly with your team members.' },
    { icon: <FiBarChart2 size={24} />, title: 'Analytics & Reports', description: 'Get insights into your team\'s performance with detailed reports.' },
    { icon: <FiMessageSquare size={24} />, title: 'Communication', description: 'Stay connected with built-in messaging and video calls.' },
    { icon: <FiClock size={24} />, title: 'Time Tracking', description: 'Monitor time spent on tasks and projects for better productivity.' }
  ];
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-black">Work Forge</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              The all-in-one project management solution to help your team collaborate better and deliver projects faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/signup')}
                className="px-8 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Manage Projects</h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Work Forge provides all the tools you need to plan, track, and collaborate on projects.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-100 rounded-lg p-6 hover:bg-gray-200 transition-colors">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center mb-4 text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-700">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Dashboard Overview</h2>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Get a bird's eye view of all your projects, tasks, and team activities.
          </p>
        </div>
        <div className="bg-gray-100 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Projects</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-gray-600 text-sm font-medium mb-1">Active Tasks</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-gray-600 text-sm font-medium mb-1">Team Members</h3>
              <p className="text-3xl font-bold">0</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="text-gray-600 text-sm font-medium mb-1">Completion Rate</h3>
              <p className="text-3xl font-bold">0%</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
            <div className="space-y-3">
              <p className="text-gray-500 text-center">No projects yet</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-gray-700 mb-6 max-w-2xl mx-auto">
            Join thousands of teams already using Work Forge to deliver amazing results.
          </p>
          <button
            onClick={() => navigate('/signup')}
            className="px-8 py-3 bg-black hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            Sign Up Now
          </button>
        </div>
      </div>
    </div>
  );
};

// SignUp
const SignUp = () => {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Team Member'
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.role === 'HR' && !formData.email.endsWith('@hr.com')) {
      setError('HR accounts must use an @hr.com email address');
      return;
    }
    try {
      const success = await signup(formData.name, formData.email, formData.password, formData.role);
      if (success) {
        navigate('/login');
      } else {
        setError('Failed to create account');
      }
    } catch (err) {
      setError('An error occurred during sign up');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="max-w-md w-full bg-white dark:bg-black rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-2xl mx-auto mb-4">
            WF
          </div>
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Create Your Account</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Join Work Forge to manage your work efficiently</p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your full name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Confirm your password"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="Team Member">Team Member</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Client">Client</option>
              <option value="HR">HR (@hr.com required)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-black dark:text-white hover:underline">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// LoginPage
const LoginPage = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4">
      <div className="max-w-md w-full bg-white dark:bg-black rounded-xl shadow-lg p-8 border border-gray-200 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-bold text-2xl mx-auto mb-4">
            WF
          </div>
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Login to Your Account</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Enter your credentials to access your dashboard</p>
        </div>
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Enter your password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging In...' : 'Login'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account? <button onClick={() => navigate('/signup')} className="text-black dark:text-white hover:underline">Sign Up</button>
          </p>
        </div>
      </div>
    </div>
  );
};

// App
const App = () => {
  return (
    <>
      <style>{`
        .loader {
          height: 60px;
          aspect-ratio: 2;
          border-bottom: 3px solid #0000;
          background:
            linear-gradient(90deg,#524656 50%,#0000 0)
            -25% 100%/50% 3px repeat-x border-box;
          position: relative;
          animation: l3-0 .75s linear infinite;
        }
        .loader:before {
          content: "";
          position: absolute;
          inset: auto 42.5% 0;
          aspect-ratio: 1;
          border-radius: 50%;
          background: #CF4647;
          animation: l3-1 .75s cubic-bezier(0,900,1,900) infinite;
        }
        @keyframes l3-0 {
          to {background-position: -125% 100%}
        }
        @keyframes l3-1 {
          0%,2% {bottom: 0%}
          98%,to {bottom:.1%}
        }
      `}</style>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/hr-profile" element={<HRProfileCompletion />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardWrapper />
                </ProtectedRoute>
              }
            />
            <Route path="/projects" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}><ProjectsPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'HR']}><TasksPage /></ProtectedRoute>} />
            <Route path="/timesheets" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'HR']}><TimesheetsPage /></ProtectedRoute>} />
            <Route path="/issues" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'HR']}><IssuesPage /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}><DocumentsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'HR']}><ReportsPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}><MessagesPage /></ProtectedRoute>} />
            <Route path="/calls" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'HR']}><CallsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member','Client','HR']}><SettingsPage /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['HR']}><EmployeesPage /></ProtectedRoute>} />
            <Route 
  path="/analytics" 
  element={
    <ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'HR']}>
      <AnalyticsPage />
    </ProtectedRoute>
  } 
/>
            
            // In your App component's Routes section
<Route 
  path="/announcements" 
  element={
    <ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}>
      <EmployeeAnnouncementsPage />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/hr-announcements" 
  element={
    <ProtectedRoute allowedRoles={['HR', 'Super Admin']}>
      <AnnouncementsPage />
    </ProtectedRoute>
  } 
/>
            <Route path="/projects/:id" element={<ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}><ProjectDetailPage /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </>
  );
};

const DashboardWrapper = () => {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'HR' ? <HRDashboard /> : <CommonDashboard />;
};

export default App;