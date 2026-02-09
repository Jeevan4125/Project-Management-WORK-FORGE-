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
  FiCheck , FiMoreVertical, FiCopy,FiCamera, FiMic,FiInfo
} from 'react-icons/fi';
// Add this import at the very top of App.jsx
import io from 'socket.io-client';
import AnalyticsPage from './components/AnalyticsPage';
import CallsPage from './components/CallsPage';
import HelpCenter from './components/HelpCenter';
import DocumentsPage from './components/DocumentsPage';
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
      {recentMessages.map((msg, index) => (
        <div 
          key={msg.id || msg._id || `message-${index}`} 
          className="border-l-4 border-black pl-4 py-2"
        >
          <div className="flex justify-between">
            <h3 className="font-medium text-gray-800 dark:text-white">
              {msg.senderId?.name || 'Unknown Sender'}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {msg.timestamp ? new Date(msg.timestamp).toLocaleDateString() : 'Unknown date'}
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

// TimesheetsPage Component
const TimesheetsPage = () => {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [weeklyView, setWeeklyView] = useState(true);
  const [newEntry, setNewEntry] = useState({
    projectId: '',
    task: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '17:00',
    hours: 8,
    description: '',
    billable: true
  });
  
  const [selectedProject, setSelectedProject] = useState(null);
  const [stats, setStats] = useState({
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    overtimeHours: 0
  });

  useEffect(() => {
    fetchTimeEntries();
    fetchProjects();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [timeEntries]);

 // In your TimesheetsPage component, add better error logging:
const fetchTimeEntries = async () => {
  setLoading(true);
  const token = localStorage.getItem('token');
  console.log('Fetching time entries with token:', token ? 'Yes' : 'No');
  
  try {
    const response = await fetch('http://localhost:5000/api/timesheets', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', data);
      if (data.success) {
        setTimeEntries(data.data || []);
      }
    } else {
      const errorData = await response.json();
      console.error('API Error:', errorData);
    }
  } catch (error) {
    console.error('Network error details:', error);
    // Set empty array to stop loading
    setTimeEntries([]);
  } finally {
    setLoading(false);
  }
};

  const fetchProjects = async () => {
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const projects = await response.json();
        setProjects(projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([
        { id: 1, name: 'Website Redesign' },
        { id: 2, name: 'Mobile App' },
        { id: 3, name: 'Marketing Campaign' }
      ]);
    }
  };

  const calculateStats = () => {
    const total = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const billable = timeEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + entry.hours, 0);
    const nonBillable = total - billable;
    const overtime = timeEntries
      .filter(entry => entry.hours > 8)
      .reduce((sum, entry) => sum + (entry.hours - 8), 0);
    
    setStats({
      totalHours: total,
      billableHours: billable,
      nonBillableHours: nonBillable,
      overtimeHours: overtime
    });
  };

 const handleAddEntry = async () => {
  if (!newEntry.projectId || !newEntry.task || !newEntry.date) {
    alert('Please fill in all required fields');
    return;
  }

  const token = localStorage.getItem('token');
  
  // Log what we're sending
  console.log('=== SENDING POST REQUEST ===');
  console.log('URL: http://localhost:5000/api/timesheets');
  console.log('Data:', newEntry);
  console.log('Token exists:', !!token);
  
  try {
    const response = await fetch('http://localhost:5000/api/timesheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(newEntry)
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok && data.success) {
      alert('✅ Time entry added successfully!');
      setShowAddModal(false);
      // Reset form
      setNewEntry({
        projectId: '',
        task: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        hours: 8,
        description: '',
        billable: true
      });
      fetchTimeEntries();
    } else {
      alert(`Failed: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Network error:', error);
    alert('Network error. Check backend logs.');
  }
};
  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this time entry?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/timesheets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Time entry deleted successfully!');
        fetchTimeEntries();
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
      alert('Failed to delete time entry');
    }
  };
  // Add this function for stats
const fetchStats = async () => {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(
      `http://localhost:5000/api/timesheets/stats/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        setStats({
          totalHours: data.data.totalHours,
          billableHours: data.data.billableHours,
          nonBillableHours: data.data.nonBillableHours,
          overtimeHours: data.data.overtimeHours
        });
      }
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

  const handleSubmitTimesheet = async () => {
  const pendingEntries = timeEntries.filter(entry => entry.status === 'pending');
  if (pendingEntries.length === 0) {
    alert('No pending entries to submit');
    return;
  }

  if (!window.confirm(`Submit ${pendingEntries.length} time entries for approval?`)) return;

  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:5000/api/timesheets/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        weekStart: dateRange.startDate,
        weekEnd: dateRange.endDate
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      alert(`✅ ${data.message}`);
      fetchTimeEntries();
    } else {
      alert(`Failed: ${data.message}`);
    }
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    alert('Network error. Please try again.');
  }
};

  const calculateHours = () => {
    const start = new Date(`2000-01-01T${newEntry.startTime}`);
    const end = new Date(`2000-01-01T${newEntry.endTime}`);
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);
    setNewEntry({ ...newEntry, hours: hours > 0 ? hours : 0 });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getWeeklyEntries = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });
  };

  const weeklyEntries = getWeeklyEntries();

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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Timesheets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your working hours and submit for approval
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiBarChart2 className="mr-2" /> Generate Report
          </button>
          <button
            onClick={handleSubmitTimesheet}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <FiSend className="mr-2" /> Submit Timesheet
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <FiPlus className="mr-2" /> Add Time Entry
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiClock className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Hours</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {stats.totalHours.toFixed(1)}h
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Billable Hours</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {stats.billableHours.toFixed(1)}h
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Overtime Hours</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {stats.overtimeHours.toFixed(1)}h
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Pending Entries</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {timeEntries.filter(e => e.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Entries Table */}
      <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800 mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Time Entries</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {weeklyView ? 'This Week' : 'All Entries'} • {timeEntries.length} entries
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
              <button
                onClick={() => setWeeklyView(true)}
                className={`px-3 py-1 rounded-lg text-sm ${weeklyView ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                Weekly
              </button>
              <button
                onClick={() => setWeeklyView(false)}
                className={`px-3 py-1 rounded-lg text-sm ${!weeklyView ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
              >
                All
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <FiCalendar className="text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-black"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm bg-white dark:bg-black"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
              {(weeklyView ? weeklyEntries : timeEntries).map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-800 dark:text-white">
                      {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-800 dark:text-white">
                      {entry.project?.name || 'Unknown Project'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-800 dark:text-white">{entry.task}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {entry.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {entry.startTime} - {entry.endTime}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-800 dark:text-white">
                        {entry.hours.toFixed(1)}h
                      </span>
                      {entry.billable && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
                          Billable
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(entry.status)}`}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 mr-3"
                    >
                      <FiTrash2 size={16} />
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300">
                      <FiEdit size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {timeEntries.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 mx-auto">
                <FiClock size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Time Entries Yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Start tracking your work hours by adding your first time entry
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
              >
                <FiPlus className="inline mr-2" /> Add First Entry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Weekly Summary</h2>
        <div className="grid grid-cols-7 gap-2 mb-6">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const dayEntries = weeklyEntries.filter(entry => {
              const entryDate = new Date(entry.date);
              return entryDate.getDay() === (index === 6 ? 0 : index + 1); // Adjust for Sunday = 0
            });
            const dayHours = dayEntries.reduce((sum, entry) => sum + entry.hours, 0);
            
            return (
              <div key={day} className="text-center">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{day}</div>
                <div className={`h-24 rounded-lg flex flex-col items-center justify-center p-2 ${
                  dayHours === 0 ? 'bg-gray-100 dark:bg-gray-800' :
                  dayHours < 4 ? 'bg-blue-100 dark:bg-blue-900/30' :
                  dayHours < 8 ? 'bg-green-100 dark:bg-green-900/30' :
                  'bg-yellow-100 dark:bg-yellow-900/30'
                }`}>
                  <div className="text-lg font-bold text-gray-800 dark:text-white">{dayHours.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">hours</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {dayEntries.length} entries
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total weekly hours</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {weeklyEntries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)} hours
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              <FiPlus className="inline mr-2" /> Add Entry
            </button>
            <button
              onClick={handleSubmitTimesheet}
              disabled={weeklyEntries.filter(e => e.status === 'pending').length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FiSend className="inline mr-2" /> Submit Week
            </button>
          </div>
        </div>
      </div>

      {/* Add Time Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add Time Entry</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Project *
                  </label>
                  <select
                    value={newEntry.projectId}
                    onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task *
                  </label>
                  <input
                    type="text"
                    value={newEntry.task}
                    onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="What did you work on?"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={newEntry.startTime}
                      onChange={(e) => {
                        setNewEntry({ ...newEntry, startTime: e.target.value });
                        setTimeout(calculateHours, 100);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={newEntry.endTime}
                      onChange={(e) => {
                        setNewEntry({ ...newEntry, endTime: e.target.value });
                        setTimeout(calculateHours, 100);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newEntry.hours}
                    onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Calculated: {newEntry.hours.toFixed(1)} hours
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    rows="2"
                    placeholder="Brief description of work done..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newEntry.billable}
                    onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700 dark:text-gray-300">Billable hours</label>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Add Time Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Generate Report</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Report Type
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white">
                    <option>Weekly Summary</option>
                    <option>Monthly Summary</option>
                    <option>Project-wise Report</option>
                    <option>Detailed Timesheet</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Format
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="format" defaultChecked className="mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">PDF</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="format" className="mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Excel</span>
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="format" className="mr-2" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">CSV</span>
                    </label>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Report Preview</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>• Period: {dateRange.startDate} to {dateRange.endDate}</p>
                    <p>• Total Hours: {stats.totalHours.toFixed(1)}</p>
                    <p>• Billable Hours: {stats.billableHours.toFixed(1)}</p>
                    <p>• Entries: {timeEntries.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alert('Report generated successfully!');
                    setShowReportModal(false);
                  }}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  <FiDownload className="inline mr-2" /> Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Supporting Modals for Extreme Features
const AttendanceModal = ({ logs, onClose, onLogAttendance, biometricData }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-4xl border border-gray-200 dark:border-gray-800">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Attendance & Biometric Logs</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => onLogAttendance('login')}
              className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <FiLogIn className="inline mr-2" /> Log In
            </button>
            <button
              onClick={() => onLogAttendance('logout')}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              <FiLogOut className="inline mr-2" /> Log Out
            </button>
            <button
              onClick={() => onLogAttendance('break_start')}
              className="flex-1 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
            >
              <FiCoffee className="inline mr-2" /> Start Break
            </button>
          </div>
          
          {biometricData && (
            <div className={`p-4 rounded-lg mb-4 ${biometricData.available ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
              <div className="flex items-center">
                <FiUserCheck className={`mr-2 ${biometricData.available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                <span className="font-medium">
                  Biometric Authentication: {biometricData.available ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Biometric</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      log.type === 'login' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                      log.type === 'logout' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                    }`}>
                      {log.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.biometricVerified ? '✅ Verified' : '❌ Not Verified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    {log.location ? 
                      `${log.location.latitude.toFixed(4)}, ${log.location.longitude.toFixed(4)}` : 
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs">
                    {log.deviceInfo?.substring(0, 30)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);

const AnalyticsModal = ({ analysis, stats, onClose, productivityScore }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-6xl border border-gray-200 dark:border-gray-800">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Advanced Analytics Dashboard</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Productivity Score */}
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">Overall Productivity Score</h3>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" 
                    stroke="white" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${productivityScore * 2.83} 283`}
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold">{productivityScore}</div>
                    <div className="text-sm opacity-80">out of 100</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="text-sm opacity-90">
                {productivityScore >= 90 ? '🏆 Exceptional Performance' :
                 productivityScore >= 80 ? '👍 Excellent Work' :
                 productivityScore >= 70 ? '👏 Good Performance' :
                 productivityScore >= 60 ? '📈 Room for Improvement' : '⚠️ Needs Attention'}
              </div>
            </div>
          </div>
          
          {/* Time Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Time Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Productive Time', value: stats.focusHours, color: 'bg-green-500' },
                { label: 'Idle Time', value: stats.idleHours, color: 'bg-yellow-500' },
                { label: 'Billable Hours', value: stats.billableHours, color: 'bg-blue-500' },
                { label: 'Overtime', value: stats.overtimeHours, color: 'bg-red-500' }
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{item.label}</span>
                    <span>{item.value.toFixed(1)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${(item.value / (stats.focusHours + stats.idleHours)) * 100 || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Peak Hours Analysis */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Peak Productivity Hours</h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 24 }).map((_, hour) => {
              const hourData = analysis.peakProductivityHours?.find(h => 
                parseInt(h.hour.split(':')[0]) === hour
              );
              const height = hourData ? (hourData.hours / 8) * 100 : 10;
              
              return (
                <div key={hour} className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className="relative h-32">
                    <div className="absolute bottom-0 left-1/4 right-1/4">
                      <div 
                        className={`rounded-t ${
                          height > 70 ? 'bg-green-500' :
                          height > 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${Math.max(10, height)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    {hourData ? `${hourData.hours.toFixed(1)}h` : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Project Performance */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Top Projects</h3>
            <div className="space-y-3">
              {analysis.mostProductiveProjects?.map((project, idx) => (
                <div key={idx} className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold mr-3">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-800 dark:text-white">{project.project}</span>
                      <span className="text-gray-600 dark:text-gray-400">{project.hours.toFixed(1)}h</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                      <div 
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${(project.hours / (analysis.mostProductiveProjects[0]?.hours || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Activity Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Development', value: analysis.developmentTime || 0, color: 'bg-blue-500' },
                { label: 'Meetings', value: analysis.meetingTime || 0, color: 'bg-green-500' },
                { label: 'Research', value: analysis.researchTime || 0, color: 'bg-purple-500' },
                { label: 'Administration', value: analysis.adminTime || 0, color: 'bg-yellow-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800 dark:text-white">{item.label}</span>
                      <span className="text-gray-600 dark:text-gray-400">{item.value.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const AddTimeEntryModal = ({ 
  newEntry, 
  setNewEntry, 
  projects, 
  onClose, 
  onSave, 
  biometricData,
  currentLocation,
  isRecording,
  onStartRecording,
  onStopRecording 
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
      <div className="p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Add Time Entry (Advanced)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Biometric Verification */}
          {biometricData?.available && (
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center mb-2">
                <FiUserCheck className="text-green-600 dark:text-green-400 mr-2" />
                <span className="font-medium text-green-800 dark:text-green-300">Biometric Verified</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                Last verified: {new Date(biometricData.lastVerified).toLocaleString()}
              </p>
            </div>
          )}
          
          {/* Location Tracking */}
          {currentLocation && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiMapPin className="text-blue-600 dark:text-blue-400 mr-2" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">Location Tracked</span>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Accuracy: {currentLocation.accuracy.toFixed(0)}m
                </span>
              </div>
            </div>
          )}
          
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project *
            </label>
            <select
              value={newEntry.projectId}
              onChange={(e) => setNewEntry({ ...newEntry, projectId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              required
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>
          
          {/* Task & Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task *
              </label>
              <input
                type="text"
                value={newEntry.task}
                onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                placeholder="What did you work on?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={newEntry.activityType}
                onChange={(e) => setNewEntry({ ...newEntry, activityType: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              >
                <option value="development">Development</option>
                <option value="meeting">Meeting</option>
                <option value="design">Design</option>
                <option value="testing">Testing</option>
                <option value="research">Research</option>
                <option value="documentation">Documentation</option>
              </select>
            </div>
          </div>
          
          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time *
              </label>
              <input
                type="time"
                value={newEntry.startTime}
                onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time *
              </label>
              <input
                type="time"
                value={newEntry.endTime}
                onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                required
              />
            </div>
          </div>
          
          {/* Voice Recording */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <FiMic className="text-purple-600 dark:text-purple-400 mr-2" />
                <span className="font-medium text-purple-800 dark:text-purple-300">Voice Notes</span>
              </div>
              {isRecording ? (
                <button
                  onClick={onStopRecording}
                  className="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  <FiSquare className="mr-1" /> Stop Recording
                </button>
              ) : (
                <button
                  onClick={onStartRecording}
                  className="flex items-center px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                >
                  <FiMic className="mr-1" /> Start Recording
                </button>
              )}
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              Record voice notes for detailed descriptions or meeting notes
            </p>
          </div>
          
          {/* Advanced Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newEntry.billable}
                onChange={(e) => setNewEntry({ ...newEntry, billable: e.target.checked })}
                className="mr-2"
                id="billable"
              />
              <label htmlFor="billable" className="text-sm text-gray-700 dark:text-gray-300">
                Billable Hours
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={newEntry.autoTrack}
                onChange={(e) => setNewEntry({ ...newEntry, autoTrack: e.target.checked })}
                className="mr-2"
                id="autoTrack"
              />
              <label htmlFor="autoTrack" className="text-sm text-gray-700 dark:text-gray-300">
                Enable Auto-tracking
              </label>
            </div>
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              rows="3"
              placeholder="Detailed description of work done..."
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all"
          >
            Save with Advanced Tracking
          </button>
        </div>
      </div>
    </div>
  </div>
);
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
    
    const data = await response.json();
    
    if (response.ok) {
      // Handle both response formats for compatibility
      if (data.success && data.data) {
        // New format
        setIssues(data.data || []);
      } else if (Array.isArray(data)) {
        // Old format (array directly)
        setIssues(data || []);
      } else {
        setIssues([]);
      }
    } else {
      // If API fails, show empty state
      setIssues([]);
    }
  } catch (error) {
    console.error('Error fetching issues:', error);
    setIssues([]); // Set empty array on error
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
      if (data.success && data.data) {
        setStats(data.data);
      }
    }
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Set default stats on error
    setStats({
      byStatus: [],
      byPriority: [],
      byCategory: [],
      avgResolutionTime: [{ avgTime: 0 }]
    });
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
                    <FiClock className="inline mr-1" /> View History
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
// MessagesPage Component - FULL CORRECTED CODE
const MessagesPage = () => {
  const { user, hrMessages = [], allEmployees = [] } = useAuth(); // Add default values
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageThreads, setMessageThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const [sending, setSending] = useState(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) {
      console.log('No user or token available for socket connection');
      return;
    }

    console.log('Initializing socket connection for user:', user?.id || user?._id);

    // Create socket connection
    const socketInstance = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      // Emit user connection with proper null check
      if (user && (user._id || user.id)) {
        socketInstance.emit('user-connected', user._id || user.id);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Listen for messages
    socketInstance.on('receive-message', (message) => {
      console.log('Received new message via socket:', message);
      handleNewMessage(message);
    });

    // Listen for online users updates
    socketInstance.on('online-users', (users) => {
      console.log('Online users updated:', users);
      setOnlineUsers(users);
    });

    // Listen for message read status
    socketInstance.on('message-read', (data) => {
      console.log('Message read notification:', data);
      if (data && data.messageId) {
        updateMessageReadStatus(data.messageId);
      }
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        console.log('Cleaning up socket connection');
        socketInstance.disconnect();
      }
    };
  }, [user]); // Depend on user

  // Fetch all messages for the current user
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  // Build contacts list
  useEffect(() => {
    if (user && allEmployees) {
      buildContactsList();
    }
  }, [user, allEmployees, onlineUsers]);

  // Build contacts list
  const buildContactsList = () => {
    if (!user) {
      console.log('No user available for building contacts');
      return;
    }

    console.log('Building contacts list for user:', user.id || user._id);

    // Start with HR as first contact
    const contactsList = [{
      id: 'hr-dept',
      _id: 'hr-dept',
      name: 'HR Department',
      role: 'HR',
      status: 'Active',
      type: 'hr',
      avatar: 'HR',
      isOnline: false
    }];

    // Add all employees except current user
    if (allEmployees && Array.isArray(allEmployees)) {
      console.log('Processing employees:', allEmployees.length);
      allEmployees.forEach(emp => {
        // Check if employee is not the current user
        const empId = emp._id || emp.id;
        const userId = user._id || user.id;
        
        if (empId !== userId) {
          const isOnline = onlineUsers.includes(empId);
          contactsList.push({
            id: empId,
            _id: empId,
            name: emp.name || `Employee ${empId}`,
            email: emp.email || '',
            role: emp.role || 'Team Member',
            status: emp.status || 'Active',
            type: 'employee',
            avatar: emp.name?.charAt(0)?.toUpperCase() || 'E',
            isOnline: isOnline
          });
        }
      });
    }

    console.log('Built contacts list:', contactsList.length, 'contacts');
    setContacts(contactsList);
  };

  // Fetch messages from the API
  const fetchMessages = async () => {
    if (!user) {
      console.log('No user available for fetching messages');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      console.log('Fetching messages for user:', user.id || user._id);
      const response = await fetch('http://localhost:5000/api/messages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched messages:', data.length || data);
        setAllMessages(Array.isArray(data) ? data : []);
        buildMessageThreads(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch messages, status:', response.status);
        setAllMessages([]);
        buildMessageThreads([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setAllMessages([]);
      buildMessageThreads([]);
    } finally {
      setLoading(false);
    }
  };

  // Build message threads from messages
  const buildMessageThreads = (messages) => {
    if (!user || !contacts.length) {
      console.log('Cannot build threads: user or contacts missing');
      return;
    }

    console.log('Building message threads from', messages.length, 'messages');

    const threads = contacts.map(contact => {
      // Get messages for this contact
      const contactMessages = messages.filter(msg => {
        if (!msg) return false;
        
        const msgSenderId = msg.senderId?._id || msg.senderId?.id || msg.senderId;
        const msgRecipientId = msg.recipientId?._id || msg.recipientId?.id || msg.recipientId;
        const contactId = contact.id;
        const userId = user._id || user.id;

        return (
          // User sent to contact
          (msgSenderId === userId && msgRecipientId === contactId) ||
          // Contact sent to user
          (msgSenderId === contactId && msgRecipientId === userId) ||
          // For HR contact, include any HR messages
          (contactId === 'hr-dept' && (msg.senderId?.role === 'HR' || msg.recipientId?.role === 'HR'))
        );
      }).sort((a, b) => {
        const timeA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const timeB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return timeA - timeB;
      });

      const lastMessageTime = contactMessages.length > 0
        ? new Date(contactMessages[contactMessages.length - 1].timestamp || contactMessages[contactMessages.length - 1].createdAt)
        : new Date(0);
      
      const unreadCount = contactMessages.filter(m => {
        if (!m) return false;
        const msgSenderId = m.senderId?._id || m.senderId?.id || m.senderId;
        const userId = user._id || user.id;
        return !m.read && msgSenderId !== userId;
      }).length;

      return {
        contact,
        messages: contactMessages,
        lastMessageTime,
        unreadCount
      };
    }).sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
    
    console.log('Built', threads.length, 'message threads');
    setMessageThreads(threads);
    
    // Auto-select first contact if none selected
    if (threads.length > 0 && !selectedContact) {
      setSelectedContact(threads[0].contact);
    }
  };

  // Handle new incoming message
  const handleNewMessage = (message) => {
    if (!message || !user) return;
    
    console.log('Processing new message:', message);

    // Determine which contact this message is from
    const senderId = message.senderId?._id || message.senderId?.id || message.senderId;
    const userId = user._id || user.id;
    
    // If message is from the currently selected contact, mark as read
    if (selectedContact && (senderId === selectedContact.id || (senderId === userId && message.recipientId === selectedContact.id))) {
      if (senderId !== userId) {
        markMessageAsRead(message._id || message.id);
      }
    }

    // Update message threads
    setMessageThreads(prev => {
      const updatedThreads = prev.map(thread => {
        const threadContactId = thread.contact.id;
        const isSender = senderId === userId && message.recipientId === threadContactId;
        const isRecipient = senderId === threadContactId && message.recipientId === userId;
        
        if (isSender || isRecipient) {
          // Check if message already exists
          const messageExists = thread.messages.some(m => 
            (m._id && m._id === message._id) || 
            (m.id && m.id === message.id)
          );
          if (!messageExists) {
            return {
              ...thread,
              messages: [...thread.messages, message],
              lastMessageTime: new Date(message.timestamp || message.createdAt || new Date()),
              unreadCount: senderId === threadContactId ? thread.unreadCount + 1 : 0
            };
          }
        }
        return thread;
      });
      return updatedThreads;
    });

    // Add to all messages
    setAllMessages(prev => {
      const messageExists = prev.some(m => 
        (m._id && m._id === message._id) || 
        (m.id && m.id === message.id)
      );
      if (!messageExists) {
        return [...prev, message];
      }
      return prev;
    });
  };

  // Update message read status
  const updateMessageReadStatus = (messageId) => {
    setMessageThreads(prev => prev.map(thread => ({
      ...thread,
      messages: thread.messages.map(msg => 
        (msg._id === messageId || msg.id === messageId) ? { ...msg, read: true } : msg
      )
    })));

    setAllMessages(prev => prev.map(msg => 
      (msg._id === messageId || msg.id === messageId) ? { ...msg, read: true } : msg
    ));
  };

  // Mark message as read
  const markMessageAsRead = async (messageId) => {
    const token = localStorage.getItem('token');
    if (!token || !messageId) return;

    try {
      await fetch(`http://localhost:5000/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Notify via socket
      if (socket) {
        socket.emit('message-read', { messageId });
      }
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedContact, messageThreads]);

 const handleSendMessage = async () => {
  if (!newMessage.trim() || !selectedContact || sending) {
    alert('Please enter a message');
    return;
  }
  
  if (!user) {
    alert('Please login again');
    return;
  }
  
  setSending(true);
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please login again');
    setSending(false);
    return;
  }

  try {
    // Prepare request body - FIX: Handle HR department specially
    let requestBody;
    
    if (selectedContact.id === 'hr-dept') {
      // For HR department, find an actual HR user to send to
      const hrUser = contacts.find(contact => 
        contact.role === 'HR' && contact.id !== 'hr-dept'
      );
      
      if (hrUser) {
        requestBody = {
          content: newMessage.trim(),
          recipientId: hrUser.id
        };
      } else {
        // If no HR user found, send to a default HR user
        // You might need to adjust this based on your actual HR users
        requestBody = {
          content: newMessage.trim(),
          recipientId: null // This will need special handling in backend
        };
      }
    } else {
      requestBody = {
        content: newMessage.trim(),
        recipientId: selectedContact.id
      };
    }

    console.log('Sending message:', requestBody);

    const response = await fetch('http://localhost:5000/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    if (response.ok) {
      // Add the sent message to local state immediately
      const sentMessage = {
        _id: data._id || `temp-${Date.now()}`,
        senderId: {
          _id: user._id || user.id,
          name: user.name,
          role: user.role
        },
        recipientId: selectedContact.id === 'hr-dept' ? null : {
          _id: selectedContact.id,
          name: selectedContact.name,
          role: selectedContact.role
        },
        content: newMessage.trim(),
        timestamp: new Date().toISOString(),
        read: false,
        isTemp: !data._id
      };

      // Update message threads
      setMessageThreads(prev => prev.map(thread => {
        if (thread.contact.id === selectedContact.id) {
          return {
            ...thread,
            messages: [...thread.messages, sentMessage],
            lastMessageTime: new Date(),
            unreadCount: 0
          };
        }
        return thread;
      }));

      // Add to all messages
      setAllMessages(prev => [...prev, sentMessage]);

      // Send via socket for real-time delivery
      if (socket && data._id) {
        socket.emit('send-message', {
          ...data,
          recipientId: selectedContact.id === 'hr-dept' ? null : selectedContact.id
        });
      }

      setNewMessage('');
      
      // Refresh messages after a short delay to get server-side saved message
      setTimeout(() => {
        fetchMessages();
      }, 500);
      
    } else {
      throw new Error(data.message || 'Failed to send message');
    }
  } catch (err) {
    console.error('Send message error:', err);
    alert(`Error: ${err.message || 'Could not send message'}`);
  } finally {
    setSending(false);
  }
};
  const markAsRead = async (contactId) => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    try {
      // Mark all messages from this contact as read
      const contactThread = messageThreads.find(t => t.contact.id === contactId);
      if (contactThread) {
        for (const msg of contactThread.messages) {
          if (msg && !msg.read && msg.senderId?._id !== user._id) {
            await fetch(`http://localhost:5000/api/messages/${msg._id || msg.id}/read`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            // Notify via socket
            if (socket) {
              socket.emit('message-read', { messageId: msg._id || msg.id });
            }
          }
        }
      }

      // Update local state
      setMessageThreads(prev => prev.map(thread => {
        if (thread.contact.id === contactId) {
          return {
            ...thread,
            messages: thread.messages.map(msg => ({ ...msg, read: true })),
            unreadCount: 0
          };
        }
        return thread;
      }));
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  // Filter contacts based on search
  const filteredThreads = messageThreads.filter(thread =>
    thread.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.contact.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (thread.contact.email && thread.contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentThread = messageThreads.find(t => t.contact.id === selectedContact?.id);

  const refreshMessages = () => {
    fetchMessages();
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex overflow-hidden bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl mx-6 my-6">
      {/* Sidebar - Contact List */}
      <div className="w-1/3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Messages</h2>
            <div className="flex items-center space-x-2">
              <button 
                onClick={refreshMessages}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                title="Refresh"
              >
                <FiRefreshCw className="text-gray-500 dark:text-gray-400" />
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {contacts.length} contacts
              </span>
              {socket && socket.connected && (
                <span className="text-xs px-2 py-1 bg-green-500 text-white rounded-full">Online</span>
              )}
            </div>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border-0 text-gray-800 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4 mx-auto">
                <FiUsers size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Contacts Found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No employees are registered in the system yet.
              </p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No contacts match your search
            </div>
          ) : (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                All Contacts ({filteredThreads.length})
              </div>
              {filteredThreads.map(thread => (
                <div
                  key={thread.contact.id}
                  onClick={() => {
                    setSelectedContact(thread.contact);
                    markAsRead(thread.contact.id);
                  }}
                  className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center ${
                    selectedContact?.id === thread.contact.id ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-lg mr-3">
                      {thread.contact.avatar}
                    </div>
                    {/* Online status indicator */}
                    {thread.contact.isOnline && (
                      <span className="absolute bottom-0 right-3 w-3 h-3 border-2 border-white dark:border-gray-900 rounded-full bg-green-500"></span>
                    )}
                    {/* Status indicator for offline */}
                    {!thread.contact.isOnline && (
                      <span className="absolute bottom-0 right-3 w-3 h-3 border-2 border-white dark:border-gray-900 rounded-full bg-gray-400"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">
                          {thread.contact.name}
                        </p>
                        {thread.contact.id === 'hr-dept' && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 rounded-full">
                            HR
                          </span>
                        )}
                        {thread.contact.role === 'Super Admin' && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 rounded-full">
                            Admin
                          </span>
                        )}
                        {thread.contact.isOnline && (
                          <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded-full">
                            Online
                          </span>
                        )}
                      </div>
                      {thread.messages.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {thread.messages.length > 0
                        ? (thread.messages[thread.messages.length - 1]?.content?.substring(0, 30) || '') + '...'
                        : `${thread.contact.role} • Click to message`}
                    </p>
                    {thread.unreadCount > 0 && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs px-2 py-0.5 bg-red-500 text-white rounded-full">
                          {thread.unreadCount} new
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-lg mr-3">
                    {selectedContact.avatar}
                  </div>
                  {selectedContact.isOnline && (
                    <span className="absolute bottom-0 right-2 w-2.5 h-2.5 border-2 border-white dark:border-gray-900 rounded-full bg-green-500"></span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-white">{selectedContact.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedContact.role} • {selectedContact.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
                <FiVideo className="cursor-pointer hover:text-black dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Video call" />
                <FiPhone className="cursor-pointer hover:text-black dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Voice call" />
                <FiSearch className="cursor-pointer hover:text-black dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="Search" />
                <FiMoreVertical className="cursor-pointer hover:text-black dark:hover:text-white p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded" title="More options" />
              </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto z-0">
              {currentThread?.messages.length === 0 ? (
                <div className="flex h-full items-center justify-center flex-col">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center text-gray-400 dark:text-gray-600 mb-6">
                    <FiMessageCircle size={48} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Start a conversation with {selectedContact.name}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
                    {selectedContact.id === 'hr-dept' 
                      ? 'HR Department is available to help with questions about policies, benefits, or any workplace concerns.'
                      : `Send your first message to ${selectedContact.name}. You can discuss projects, tasks, or collaborate on work.`}
                  </p>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setNewMessage("Hi, how are you?")}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      "Hi, how are you?"
                    </button>
                    <button 
                      onClick={() => setNewMessage("Let's discuss the project")}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      "Let's discuss the project"
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentThread.messages.map((msg, idx) => {
                    const isSent = msg.senderId?._id === user._id || msg.senderId?.id === user.id;
                    const isRead = msg.read;
                    const showDate = idx === 0 || 
                      (new Date(msg.timestamp || msg.createdAt).toDateString() !== 
                       new Date(currentThread.messages[idx-1].timestamp || currentThread.messages[idx-1].createdAt).toDateString());
                    
                    return (
                      <div key={msg._id || idx}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                              {new Date(msg.timestamp || msg.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                        
                        <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                          <div className="flex flex-col max-w-[70%]">
                            <div
                              className={`px-4 py-3 shadow-sm rounded-2xl relative ${
                                isSent
                                  ? 'bg-[#d9fdd3] dark:bg-green-900/60 text-gray-800 dark:text-gray-100 rounded-tr-none'
                                  : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-tl-none'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              {msg.isTemp && (
                                <div className="absolute -bottom-2 right-2 text-xs text-gray-400">
                                  Sending...
                                </div>
                              )}
                            </div>
                            <span className={`text-[10px] text-gray-500 dark:text-gray-400 mt-1 ${isSent ? 'text-right' : 'text-left'}`}>
                              {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {isSent && (
                                <span className="ml-1">
                                  {isRead ? '✓✓ Read' : '✓ Sent'}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-900 p-3 flex items-center border-t border-gray-200 dark:border-gray-800 z-10">
              <div className="flex space-x-1 mr-2">
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded">
                  <FiPlus size={20} />
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 rounded">
                  <FiPaperclip size={20} />
                </button>
              </div>
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-full px-4 py-2 flex items-center">
                <button className="text-xl mr-2 cursor-pointer text-gray-500 hover:text-gray-700">😊</button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={`Message ${selectedContact.name}...`}
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 dark:text-white text-sm placeholder-gray-400"
                  disabled={sending}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="ml-3 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <FiSend size={18} />
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-900">
            <div className="w-64 h-64 mb-6 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
              <FiMessageSquare size={80} className="text-gray-400" />
            </div>
            <h2 className="text-3xl font-light text-gray-700 dark:text-gray-300 mb-4">Work Forge Messages</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
              Connect and collaborate with your team members. Send messages, share files, and stay updated.
            </p>
            
            {contacts.length > 0 && (
              <div className="mt-8 text-center w-full max-w-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Select a contact to start chatting:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {contacts.slice(0, 6).map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className="flex flex-col items-center p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-2">
                          {contact.avatar}
                        </div>
                        {contact.isOnline && (
                          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 border-2 border-white dark:border-gray-800 rounded-full bg-green-500"></span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate w-full">
                        {contact.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                        {contact.role}
                      </p>
                    </button>
                  ))}
                </div>
                {contacts.length > 6 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    + {contacts.length - 6} more contacts available
                  </p>
                )}
              </div>
            )}
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
// Updated ChatBot with Overlay History
const ChatBot = () => {
  const { user, darkMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "Hi! I'm your AI assistant for Work Forge. How can I help you today?", 
      isBot: true,
      timestamp: new Date(),
      id: 'welcome-message'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(Date.now().toString());
  const chatbotRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('workForgeChatHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setChatHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  // Save messages to chat history
  useEffect(() => {
    if (messages.length > 1) {
      const sessionHistory = {
        id: currentSessionId,
        date: new Date().toISOString(),
        messages: messages.slice(1), // Exclude welcome message
        title: messages.find(m => !m.isBot)?.text?.substring(0, 30) + '...' || 'Chat Session'
      };
      
      // Update current session in history
      const existingSessionIndex = chatHistory.findIndex(session => session.id === currentSessionId);
      
      if (existingSessionIndex !== -1) {
        const updatedHistory = [...chatHistory];
        updatedHistory[existingSessionIndex] = sessionHistory;
        setChatHistory(updatedHistory);
      } else {
        setChatHistory(prev => [sessionHistory, ...prev]);
      }
    }
  }, [messages, currentSessionId]);

  // Save history to localStorage when it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('workForgeChatHistory', JSON.stringify(chatHistory.slice(0, 20)));
    }
  }, [chatHistory]);

  // Close history when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (historyRef.current && !historyRef.current.contains(event.target)) {
        // Don't close if clicking on history button
        if (!event.target.closest('[data-history-button]')) {
          setShowHistory(false);
        }
      }
    };
    
    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHistory]);

  // Fetch suggestions when chatbot opens
  useEffect(() => {
    if (isOpen && user) {
      fetchSuggestions();
    }
  }, [isOpen, user]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatbotRef.current && !chatbotRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowHistory(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chatbot/suggestions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.data.suggestions || []);
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([
        "How do I create a project?",
        "How to assign tasks?",
        "How do I upload documents?",
        "How to message team members?"
      ]);
    }
  };

  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isLoading) return;

    const userMessage = { 
      text: message, 
      isBot: false, 
      timestamp: new Date(),
      id: `user-${Date.now()}`
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      
      const response = await fetch('http://localhost:5000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Mock-Role': user?.role || 'Team Member'
        },
        body: JSON.stringify({ 
          message: message,
          isQuickHelp: message.length < 50,
          context: {
            currentPage: window.location.pathname.split('/').pop() || 'dashboard'
          }
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        const botMessage = { 
          text: data.data.response, 
          isBot: true, 
          timestamp: new Date(),
          id: `bot-${Date.now()}`,
          isQuickHelp: data.data.isQuickHelp
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage = { 
          text: data.mockResponse || data.message || "I'm having some technical difficulties. Please try again in a moment.",
          isBot: true, 
          timestamp: new Date(),
          id: `error-${Date.now()}`,
          isError: true
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = { 
        text: "I'm currently having connection issues. Here are some things you can do:\n\n1. Check your internet connection\n2. Try refreshing the page\n3. Contact support if the issue persists",
        isBot: true, 
        timestamp: new Date(),
        id: `error-${Date.now()}`,
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickHelp = async () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = { 
      text: inputMessage, 
      isBot: false, 
      timestamp: new Date(),
      id: `user-quick-${Date.now()}`
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: inputMessage,
          isQuickHelp: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const botMessage = { 
            text: data.data.response, 
            isBot: true, 
            timestamp: new Date(),
            id: `bot-quick-${Date.now()}`,
            isQuickHelp: true
          };
          setMessages(prev => [...prev, botMessage]);
        }
      }
    } catch (error) {
      console.error('Quick help error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { 
        text: "Hi! I'm your AI assistant for Work Forge. How can I help you today?", 
        isBot: true,
        timestamp: new Date(),
        id: 'welcome-message'
      }
    ]);
    setShowSuggestions(true);
    setCurrentSessionId(Date.now().toString());
    setShowHistory(false);
  };

  const loadHistorySession = (session) => {
    setMessages([
      { 
        text: "Loaded from previous chat session...", 
        isBot: true,
        timestamp: new Date(),
        id: 'continue-message'
      },
      ...session.messages
    ]);
    setShowHistory(false);
    setShowSuggestions(false);
    setCurrentSessionId(session.id);
  };

  const deleteHistorySession = (sessionId, e) => {
    e.stopPropagation();
    const updatedHistory = chatHistory.filter(session => session.id !== sessionId);
    setChatHistory(updatedHistory);
    
    if (updatedHistory.length === 0) {
      localStorage.removeItem('workForgeChatHistory');
    } else {
      localStorage.setItem('workForgeChatHistory', JSON.stringify(updatedHistory));
    }
  };

  const exportChat = () => {
    const chatText = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sender = msg.isBot ? 'AI Assistant' : 'You';
      return `[${time}] ${sender}: ${msg.text}`;
    }).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workforge-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllHistory = () => {
    localStorage.removeItem('workForgeChatHistory');
    setChatHistory([]);
    setShowHistory(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40" ref={chatbotRef}>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 animate-float relative border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
      >
        <FiMessageCircle size={24} />
        {messages.filter(m => !m.isBot).length > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 ${darkMode ? 'bg-red-500' : 'bg-red-600'} text-white text-xs rounded-full flex items-center justify-center animate-pulse`}>
            {messages.filter(m => !m.isBot).length}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`absolute bottom-16 right-0 w-96 ${darkMode ? 'bg-black text-white border-gray-800' : 'bg-white text-black border-gray-300'} rounded-lg shadow-xl overflow-hidden border`}>
          {/* Header */}
          <div className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'} p-4 flex justify-between items-center border-b relative`}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center mr-3`}>
                <FiMessageCircle className={darkMode ? 'text-white' : 'text-black'} size={18} />
              </div>
              <div>
                <h3 className="font-semibold">AI Assistant</h3>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Powered by OpenAI</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {chatHistory.length > 0 && (
                <button
                  data-history-button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-1 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded relative`}
                  title="Chat History"
                >
                  <FiClock className={darkMode ? 'text-gray-300' : 'text-gray-700'} size={16} />
                  {chatHistory.length > 0 && (
                    <span className={`absolute -top-1 -right-1 w-4 h-4 text-xs rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-300 text-black'}`}>
                      {chatHistory.length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={exportChat}
                className={`p-1 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded`}
                title="Export Chat"
              >
                <FiDownload className={darkMode ? 'text-gray-300' : 'text-gray-700'} size={16} />
              </button>
              <button
                onClick={clearChat}
                className={`p-1 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded`}
                title="Clear chat"
              >
                <FiTrash2 className={darkMode ? 'text-gray-300' : 'text-gray-700'} size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`p-1 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded`}
                title="Close"
              >
                <FiX className={darkMode ? 'text-gray-300' : 'text-gray-700'} size={20} />
              </button>
            </div>
          </div>

          {/* History Overlay */}
          {showHistory && (
            <div 
              ref={historyRef}
              className={`absolute inset-0 z-10 ${darkMode ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-sm rounded-lg p-4`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Chat History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className={`p-1 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded`}
                  title="Close History"
                >
                  <FiX className={darkMode ? 'text-gray-300' : 'text-gray-700'} size={20} />
                </button>
              </div>
              
              {chatHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className={`w-16 h-16 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center mb-4`}>
                    <FiClock className={darkMode ? 'text-gray-400' : 'text-gray-600'} size={24} />
                  </div>
                  <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No chat history yet</p>
                  <p className={`text-sm mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>Your conversations will appear here</p>
                </div>
              ) : (
                <>
                  <div className="max-h-64 overflow-y-auto mb-4">
                    <div className="grid grid-cols-1 gap-2">
                      {chatHistory.map((session) => (
                        <div
                          key={session.id}
                          onClick={() => loadHistorySession(session)}
                          className={`p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${darkMode ? 'hover:bg-gray-800 border-gray-800' : 'hover:bg-gray-100 border-gray-300'} border`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-sm mb-1">{session.title}</p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <FiMessageCircle className={`mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} size={12} />
                                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {session.messages.length} messages
                                  </span>
                                </div>
                                <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                  {new Date(session.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteHistorySession(session.id, e)}
                              className={`p-1 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded ml-2`}
                              title="Delete session"
                            >
                              <FiTrash2 className={darkMode ? 'text-red-400' : 'text-red-600'} size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={clearAllHistory}
                      className={`flex-1 py-2 text-sm ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} rounded-lg transition-colors`}
                    >
                      Clear All History
                    </button>
                    <button
                      onClick={() => setShowHistory(false)}
                      className={`px-4 py-2 text-sm ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} rounded-lg transition-colors`}
                    >
                      Back to Chat
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Messages Area */}
          <div className={`h-96 overflow-y-auto p-4 space-y-3 ${darkMode ? 'bg-black' : 'bg-white'} ${showHistory ? 'opacity-30' : ''}`}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div className="flex max-w-[85%]">
                  {msg.isBot && (
                    <div className={`w-6 h-6 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center ${darkMode ? 'text-white' : 'text-black'} text-xs font-bold mr-2 mt-1 flex-shrink-0`}>
                      AI
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-3 py-2 ${msg.isBot 
                      ? `${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-gray-100 border-gray-300 text-black'} border` 
                      : `${darkMode ? 'bg-white text-black' : 'bg-black text-white'}`} ${msg.isError ? 'border border-red-500' : ''}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <div className={`text-xs mt-1 flex items-center ${msg.isBot 
                      ? darkMode ? 'text-gray-400' : 'text-gray-600' 
                      : darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      <FiClock className="mr-1" size={10} />
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.isQuickHelp && (
                        <span className={`ml-2 text-xs ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700'} px-1.5 py-0.5 rounded`}>
                          Quick Help
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`flex items-center ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'} rounded-lg px-3 py-2 border`}>
                  <div className="flex space-x-1">
                    <div className={`w-2 h-2 ${darkMode ? 'bg-white' : 'bg-black'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                    <div className={`w-2 h-2 ${darkMode ? 'bg-white' : 'bg-black'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                    <div className={`w-2 h-2 ${darkMode ? 'bg-white' : 'bg-black'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className={`ml-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Thinking...</span>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && messages.length <= 2 && (
              <div className="mt-4">
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`text-xs ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-3 py-1.5 rounded-full transition-colors`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`border-t ${darkMode ? 'border-gray-800 bg-black' : 'border-gray-300 bg-white'} p-3 ${showHistory ? 'opacity-30' : ''}`}>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your question..."
                  className={`w-full px-3 py-2 border ${darkMode ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-300 bg-gray-50 text-black'} rounded-lg focus:outline-none focus:ring-1 ${darkMode ? 'focus:ring-white' : 'focus:ring-black'} text-sm resize-none`}
                  rows={1}
                  disabled={isLoading || showHistory}
                />
                {inputMessage && inputMessage.length < 50 && !showHistory && (
                  <button
                    onClick={handleQuickHelp}
                    className={`absolute right-2 bottom-2 text-xs ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-2 py-1 rounded`}
                    title="Get quick answer"
                    disabled={showHistory}
                  >
                    Quick Help
                  </button>
                )}
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim() || showHistory}
                className={`px-4 py-2 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'} rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                {isLoading ? (
                  <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 ${darkMode ? 'border-black' : 'border-white'}`}></div>
                ) : (
                  <FiSend size={18} />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs">
              <div className={`flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <FiInfo className="mr-1" size={10} />
                <span>{showHistory ? 'History is open' : 'Press Enter to send'}</span>
              </div>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                {messages.filter(m => !m.isBot).length} messages
              </span>
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

// Database Page Component
const DatabasePage = () => {
  const { user, allEmployees } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableStructure, setTableStructure] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');
  const [backups, setBackups] = useState([]);
  const [newTable, setNewTable] = useState({
    name: '',
    fields: [{ name: 'id', type: 'INT', primary: true, auto_increment: true }]
  });

  useEffect(() => {
    fetchDatabaseInfo();
    fetchBackups();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable]);

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      // Fetch tables
      const tablesRes = await fetch('http://localhost:5000/api/database/tables', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (tablesRes.ok) {
        const data = await tablesRes.json();
        setTables(data.tables || []);
        
        // Select first table by default
        if (data.tables?.length > 0 && !selectedTable) {
          setSelectedTable(data.tables[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching database info:', error);
      // Sample data for demo
      setTables([
        { name: 'users', rows: 45, size: '256 KB' },
        { name: 'projects', rows: 12, size: '128 KB' },
        { name: 'tasks', rows: 89, size: '512 KB' },
        { name: 'messages', rows: 156, size: '768 KB' },
        { name: 'issues', rows: 23, size: '64 KB' },
        { name: 'announcements', rows: 8, size: '32 KB' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/database/table/${tableName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setTableData(data.data || []);
        setTableStructure(data.structure || []);
      }
    } catch (error) {
      console.error('Error fetching table data:', error);
      // Sample data for demo
      if (tableName === 'users') {
        setTableData(allEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          status: emp.status,
          created_at: '2026-01-15'
        })));
        setTableStructure([
          { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', Default: null },
          { Field: 'name', Type: 'varchar(100)', Null: 'NO', Key: '', Default: null },
          { Field: 'email', Type: 'varchar(100)', Null: 'NO', Key: 'UNI', Default: null },
          { Field: 'role', Type: 'varchar(50)', Null: 'NO', Key: '', Default: 'Team Member' },
          { Field: 'status', Type: 'varchar(20)', Null: 'NO', Key: '', Default: 'Active' },
          { Field: 'created_at', Type: 'timestamp', Null: 'NO', Key: '', Default: 'CURRENT_TIMESTAMP' }
        ]);
      }
    }
  };

  const fetchBackups = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/database/backups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      // Sample backups for demo
      setBackups([
        { name: 'backup_2026_01_20.sql', size: '2.4 MB', created: '2026-01-20 03:00:00' },
        { name: 'backup_2026_01_19.sql', size: '2.3 MB', created: '2026-01-19 03:00:00' },
        { name: 'backup_2026_01_18.sql', size: '2.2 MB', created: '2026-01-18 03:00:00' }
      ]);
    }
  };

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: sqlQuery })
      });
      
      if (res.ok) {
        const data = await res.json();
        setQueryResult(data);
      } else {
        const error = await res.json();
        setQueryResult({ error: error.message || 'Query failed' });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setQueryResult({ error: 'Network error. Please try again.' });
    }
  };

  const createBackup = async () => {
    if (!window.confirm('Create a new database backup?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/database/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(`✅ Backup created: ${data.backupName}`);
        fetchBackups();
      } else {
        alert('❌ Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Network error. Please try again.');
    }
  };

  const restoreBackup = async (backupName) => {
    if (!window.confirm(`Are you sure you want to restore ${backupName}? This will replace current data.`)) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/database/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ backupName })
      });
      
      if (res.ok) {
        alert('✅ Database restored successfully!');
        fetchDatabaseInfo();
      } else {
        alert('❌ Failed to restore backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Network error. Please try again.');
    }
  };

  const createTable = async () => {
    if (!newTable.name.trim()) {
      alert('Please enter table name');
      return;
    }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/database/create-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTable)
      });
      
      if (res.ok) {
        alert(`✅ Table "${newTable.name}" created successfully!`);
        setShowCreateModal(false);
        setNewTable({
          name: '',
          fields: [{ name: 'id', type: 'INT', primary: true, auto_increment: true }]
        });
        fetchDatabaseInfo();
      } else {
        const error = await res.json();
        alert(`❌ Failed to create table: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating table:', error);
      alert('Network error. Please try again.');
    }
  };

  const deleteTable = async (tableName) => {
    if (!window.confirm(`Are you sure you want to delete table "${tableName}"? This cannot be undone.`)) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/database/table/${tableName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert(`✅ Table "${tableName}" deleted successfully!`);
        fetchDatabaseInfo();
        if (selectedTable === tableName) {
          setSelectedTable(null);
          setTableData([]);
          setTableStructure([]);
        }
      } else {
        alert('❌ Failed to delete table');
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Network error. Please try again.');
    }
  };

  const filteredTableData = tableData.filter(row => {
    if (!searchQuery) return true;
    
    return Object.values(row).some(value =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getDataTypeColor = (type) => {
    if (type.includes('int')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    if (type.includes('varchar') || type.includes('text')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    if (type.includes('timestamp') || type.includes('date')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100';
    if (type.includes('boolean') || type.includes('bool')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Database Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your application database, run queries, and create backups
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowQueryModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiDatabase className="mr-2" /> Run Query
          </button>
          <button
            onClick={createBackup}
            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <FiDownload className="mr-2" /> Create Backup
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'browse', label: 'Browse Data' },
            { id: 'backups', label: 'Backups' },
            { id: 'structure', label: 'Database Structure' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-black text-black dark:border-white dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Browse Data Tab */}
      {activeTab === 'browse' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tables List */}
          <div className="lg:col-span-1 bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 dark:text-white">Tables ({tables.length})</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                title="Create new table"
              >
                <FiPlus size={18} />
              </button>
            </div>
            <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
              {tables.length === 0 ? (
                <p className="p-4 text-center text-gray-500 dark:text-gray-400">No tables found</p>
              ) : (
                tables.map(table => (
                  <div
                    key={table.name}
                    onClick={() => setSelectedTable(table.name)}
                    className={`p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                      selectedTable === table.name
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <FiDatabase className="mr-2 opacity-70" size={16} />
                        <span className="font-medium">{table.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {table.rows || 0} rows
                        </span>
                        {user?.role === 'HR' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTable(table.name);
                            }}
                            className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete table"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {table.size && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        Size: {table.size}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Table Data */}
          <div className="lg:col-span-3">
            {selectedTable ? (
              <div className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {selectedTable} Data
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({filteredTableData.length} records)
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search in table..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 w-64 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-800 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => fetchTableData(selectedTable)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                      title="Refresh"
                    >
                      <FiRefreshCw className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {/* Table Structure */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Table Structure</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800">
                          <th className="py-2 px-3 text-left">Column</th>
                          <th className="py-2 px-3 text-left">Type</th>
                          <th className="py-2 px-3 text-left">Nullable</th>
                          <th className="py-2 px-3 text-left">Key</th>
                          <th className="py-2 px-3 text-left">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableStructure.map((col, idx) => (
                          <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                            <td className="py-2 px-3 font-medium">{col.Field}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded text-xs ${getDataTypeColor(col.Type)}`}>
                                {col.Type}
                              </span>
                            </td>
                            <td className="py-2 px-3">{col.Null}</td>
                            <td className="py-2 px-3">
                              {col.Key && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 rounded text-xs">
                                  {col.Key}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{col.Default || 'NULL'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table Data */}
                <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                      <tr>
                        {tableStructure.length > 0 ? (
                          tableStructure.map((col, idx) => (
                            <th key={idx} className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {col.Field}
                            </th>
                          ))
                        ) : (
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                            No columns found
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredTableData.length > 0 ? (
                        filteredTableData.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            {tableStructure.map((col, colIdx) => (
                              <td key={colIdx} className="py-3 px-4 text-sm">
                                {row[col.Field] !== null && row[col.Field] !== undefined ? (
                                  <span className="text-gray-800 dark:text-gray-200">
                                    {typeof row[col.Field] === 'boolean' ? (
                                      row[col.Field] ? '✓' : '✗'
                                    ) : row[col.Field].toString()}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-600 italic">NULL</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={tableStructure.length || 1} className="py-8 text-center text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'No matching records found' : 'No data available'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-black rounded-xl shadow p-12 text-center border border-gray-200 dark:border-gray-800">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 mx-auto">
                  <FiDatabase size={40} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Select a Table</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a table from the left panel to view its data and structure
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backups Tab */}
      {activeTab === 'backups' && (
        <div className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Database Backups</h3>
              <button
                onClick={createBackup}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <FiDownload className="mr-2" /> Create New Backup
              </button>
            </div>
            
            {backups.length === 0 ? (
              <div className="text-center py-12">
                <FiDatabase className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Backups Found</h4>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first database backup</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Backup Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {backups.map((backup, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FiFile className="text-gray-400 dark:text-gray-500 mr-3" />
                            <span className="font-medium text-gray-800 dark:text-white">{backup.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {backup.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                          {backup.created}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => restoreBackup(backup.name)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => alert(`Download ${backup.name}`)}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              Download
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete backup ${backup.name}?`)) {
                                  // Add delete backup functionality
                                  alert(`Backup ${backup.name} deleted`);
                                }
                              }}
                              className="px-3 py-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Database Structure Tab */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Database Stats */}
          <div className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Database Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Total Tables</span>
                <span className="font-bold text-gray-800 dark:text-white">{tables.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Total Rows</span>
                <span className="font-bold text-gray-800 dark:text-white">
                  {tables.reduce((sum, table) => sum + (table.rows || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">Database Size</span>
                <span className="font-bold text-gray-800 dark:text-white">
                  {tables.reduce((sum, table) => {
                    const size = parseFloat(table.size) || 0;
                    return sum + size;
                  }, 0).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>

          {/* Server Info */}
          <div className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Server Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Database Type</p>
                  <p className="font-medium text-gray-800 dark:text-white">MySQL</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Version</p>
                  <p className="font-medium text-gray-800 dark:text-white">8.0+</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Host</p>
                  <p className="font-medium text-gray-800 dark:text-white">localhost</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Port</p>
                  <p className="font-medium text-gray-800 dark:text-white">3306</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <FiInfo className="inline mr-1" />
                  Database operations are restricted to HR and Super Admin users only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Table</h2>
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
                    Table Name *
                  </label>
                  <input
                    type="text"
                    value={newTable.name}
                    onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="e.g., new_table"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use lowercase letters, numbers, and underscores only
                  </p>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Table Columns
                    </label>
                    <button
                      onClick={() => setNewTable({
                        ...newTable,
                        fields: [...newTable.fields, { name: '', type: 'VARCHAR(255)', primary: false }]
                      })}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <FiPlus className="inline mr-1" /> Add Column
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-800 rounded-lg">
                    {newTable.fields.map((field, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <div className="col-span-4">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => {
                              const newFields = [...newTable.fields];
                              newFields[index].name = e.target.value;
                              setNewTable({ ...newTable, fields: newFields });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
                            placeholder="Column name"
                          />
                        </div>
                        <div className="col-span-3">
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newFields = [...newTable.fields];
                              newFields[index].type = e.target.value;
                              setNewTable({ ...newTable, fields: newFields });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
                          >
                            <option value="INT">INT</option>
                            <option value="VARCHAR(255)">VARCHAR(255)</option>
                            <option value="TEXT">TEXT</option>
                            <option value="BOOLEAN">BOOLEAN</option>
                            <option value="TIMESTAMP">TIMESTAMP</option>
                            <option value="DATE">DATE</option>
                            <option value="DECIMAL(10,2)">DECIMAL</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={field.primary}
                              onChange={(e) => {
                                const newFields = [...newTable.fields];
                                newFields[index].primary = e.target.checked;
                                setNewTable({ ...newTable, fields: newFields });
                              }}
                              className="mr-1"
                            />
                            Primary
                          </label>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={field.auto_increment}
                              onChange={(e) => {
                                const newFields = [...newTable.fields];
                                newFields[index].auto_increment = e.target.checked;
                                setNewTable({ ...newTable, fields: newFields });
                              }}
                              className="mr-1"
                            />
                            Auto Inc
                          </label>
                        </div>
                        <div className="col-span-1">
                          {index > 0 && (
                            <button
                              onClick={() => {
                                const newFields = newTable.fields.filter((_, i) => i !== index);
                                setNewTable({ ...newTable, fields: newFields });
                              }}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  onClick={createTable}
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                >
                  Create Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Query Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-4xl border border-gray-200 dark:border-gray-800">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">SQL Query Editor</h2>
                <button
                  onClick={() => {
                    setShowQueryModal(false);
                    setSqlQuery('');
                    setQueryResult(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enter SQL Query
                  </label>
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white font-mono text-sm"
                    rows="6"
                    placeholder="SELECT * FROM users WHERE role = 'Team Member';"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSqlQuery("SELECT * FROM users LIMIT 10;")}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Sample Query
                  </button>
                  <button
                    onClick={() => setSqlQuery("SHOW TABLES;")}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Show Tables
                  </button>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={executeQuery}
                    disabled={!sqlQuery.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Execute Query
                  </button>
                </div>
                
                {queryResult && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Query Results</h3>
                    {queryResult.error ? (
                      <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <div className="flex items-center text-red-700 dark:text-red-300">
                          <FiAlertTriangle className="mr-2" />
                          <span className="font-mono text-sm">{queryResult.error}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                              {queryResult.fields?.map((field, idx) => (
                                <th key={idx} className="px-4 py-2 text-left border-b border-gray-200 dark:border-gray-800">
                                  {field.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.rows?.map((row, rowIdx) => (
                              <tr key={rowIdx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                                {Object.values(row).map((value, colIdx) => (
                                  <td key={colIdx} className="px-4 py-2">
                                    {value !== null ? value.toString() : 'NULL'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {queryResult.rows?.length === 0 && (
                          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No results returned
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
<Route 
  path="/help" 
  element={
    <ProtectedRoute allowedRoles={['Super Admin', 'Project Manager', 'Team Member', 'Client', 'HR']}>
      <HelpCenter />
    </ProtectedRoute>
  } 
/>
// Add this with your other routes in the App component
<Route 
  path="/database" 
  element={
    <ProtectedRoute allowedRoles={['HR', 'Super Admin']}>
      <DatabasePage />
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