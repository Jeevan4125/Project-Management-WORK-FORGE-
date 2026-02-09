import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from '../App'; // Only import useAuth
import { 
  FiFile, FiUpload, FiDownload, FiEye, FiTrash2, FiSearch, 
  FiFilter, FiFolder, FiFolderPlus, FiShare2, FiCopy, FiGrid,
  FiList, FiChevronDown, FiMoreVertical, FiRefreshCw, FiUsers,
  FiLock, FiUnlock, FiTag, FiCalendar, FiBarChart2, FiHardDrive,
  FiX
} from 'react-icons/fi';

// Separate Folder Modal Component
const FolderModal = ({ 
  showFolderModal, setShowFolderModal, folderData, setFolderData, 
  user, handleCreateFolder, userProjects = [] 
}) => {
  // Get projects from localStorage if not provided
  const projects = userProjects.length > 0 
    ? userProjects 
    : JSON.parse(localStorage.getItem('userProjects') || '[]');

  console.log('Available projects:', projects);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Folder</h2>
            <button
              onClick={() => setShowFolderModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>
          
          <form onSubmit={handleCreateFolder}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folderData.name}
                  onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  placeholder="Enter folder name (e.g., Project Documents)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={folderData.description}
                  onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  rows="2"
                  placeholder="Add description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project *
                </label>
                {projects.length === 0 ? (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      No projects available. Please create or join a project first.
                    </p>
                  </div>
                ) : (
                  <select
                    value={folderData.projectId}
                    onChange={(e) => setFolderData({ ...folderData, projectId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    required
                  >
                    <option value="">Select a project</option>
                    {projects.map(project => (
                      <option key={project.id || project._id} value={project.id || project._id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Level
                </label>
                <select
                  value={folderData.accessLevel}
                  onChange={(e) => setFolderData({ ...folderData, accessLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                >
                  <option value="private">Private (Only me)</option>
                  <option value="team">Team (All project members)</option>
                  <option value="public">Public (All users)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={projects.length === 0 || !folderData.name}
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const DocumentsPage = () => {
  const { user, userDocuments, userProjects, fetchUserData } = useAuth();
  // ... rest of the code remains the same
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'size'
  const [filter, setFilter] = useState('all'); // 'all', 'my', 'shared', 'recent'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    projectId: '',
    folderId: '',
    isPublic: false,
    tags: ''
  });

  const [folderData, setFolderData] = useState({
    name: '',
    description: '',
    projectId: '',
    accessLevel: 'private'
  });

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [filter, selectedFolder, sortBy]);

  const fetchDocuments = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      let url = 'http://localhost:5000/api/documents';
      if (filter === 'my') {
        url = 'http://localhost:5000/api/documents?filter=my';
      } else if (filter === 'shared') {
        url = 'http://localhost:5000/api/documents?filter=shared';
      } else if (selectedFolder !== 'all') {
        url = `http://localhost:5000/api/documents/folder/${selectedFolder}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/documents/stats/overview', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadData.projectId) {
      alert('Please select a project');
      return;
    }

    const file = fileInputRef.current.files[0];
    if (!file) {
      alert('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', uploadData.name || file.name);
    formData.append('description', uploadData.description);
    formData.append('projectId', uploadData.projectId);
    formData.append('folderId', uploadData.folderId || '');
    formData.append('isPublic', uploadData.isPublic);
    formData.append('tags', uploadData.tags);

    setUploading(true);
    setUploadProgress(0);

    const token = localStorage.getItem('token');
    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          alert('✅ Document uploaded successfully!');
          setShowUploadModal(false);
          setUploadData({
            name: '',
            description: '',
            projectId: '',
            folderId: '',
            isPublic: false,
            tags: ''
          });
          fileInputRef.current.value = '';
          fetchDocuments();
          fetchStats();
        } else {
          const error = JSON.parse(xhr.responseText);
          alert(`❌ Upload failed: ${error.msg || 'Unknown error'}`);
        }
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        alert('❌ Network error during upload');
        setUploading(false);
        setUploadProgress(0);
      };

      xhr.open('POST', 'http://localhost:5000/api/documents/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (docId, docName) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}"?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('✅ Document deleted successfully!');
        fetchDocuments();
        fetchStats();
      } else {
        const error = await response.json();
        alert(`❌ Delete failed: ${error.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Network error');
    }
  };

  const handleDownload = async (docId, docName) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${docId}/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create download link
        const downloadUrl = `http://localhost:5000${data.downloadUrl}`;
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = data.fileName || docName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        fetchDocuments(); // Refresh to update download count
      } else {
        alert('❌ Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('❌ Network error');
    }
  };

  const handleCreateFolder = async (e) => {
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  try {
    const response = await fetch('http://localhost:5000/api/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(folderData)
    });

    if (response.ok) {
      const data = await response.json();
      alert('✅ Folder created successfully!');
      setShowFolderModal(false);
      setFolderData({
        name: '',
        description: '',
        projectId: '',
        accessLevel: 'private'
      });
      // Fetch folders after creation
      fetchFolders();
    } else {
      const error = await response.json();
      alert(`❌ Failed: ${error.msg || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Create folder error:', error);
    alert('❌ Network error');
  }
};
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📋';
    return '📎';
  };

  const filteredDocuments = documents.filter(doc => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.description.toLowerCase().includes(query) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'size':
        return b.fileSize - a.fileSize;
      case 'date':
      default:
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    }
  });

  if (loading && !stats) {
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
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Store, organize, and share project documents
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <FiUpload className="mr-2" /> Upload
          </button>
          <button
            onClick={() => setShowFolderModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiFolderPlus className="mr-2" /> New Folder
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                <FiFile className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Total Documents</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.totalDocuments}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
                <FiHardDrive className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Storage Used</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {formatFileSize(stats.storageUsed)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-4">
                <FiUsers className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">My Uploads</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{stats.myDocuments}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-4">
                <FiBarChart2 className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Downloaded</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {documents.reduce((sum, doc) => sum + (doc.downloadCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-4 mb-6 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex-1 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              >
                <option value="all">All Documents</option>
                <option value="my">My Documents</option>
                <option value="shared">Shared with Me</option>
                <option value="recent">Recent</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <FiGrid />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
              >
                <FiList />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchDocuments();
                fetchStats();
              }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <FiRefreshCw />
            </button>
          </div>
        </div>
      </div>

      {/* Documents Content */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-xl shadow p-12 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 mx-auto">
            <FiFile size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery 
              ? 'Try different search terms'
              : 'Upload your first document to get started'
            }
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
            >
              <FiUpload className="mr-2" /> Upload Document
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocuments.map(doc => (
            <div key={doc._id || doc.id} className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">{getFileIcon(doc.fileType)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white truncate max-w-[180px]">
                        {doc.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocForShare(doc);
                        setShowShareModal(true);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                      <FiMoreVertical className="text-gray-400" />
                    </button>
                  </div>
                </div>
                
                {doc.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {doc.description}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {doc.tags?.slice(0, 3).map((tag, index) => (
                    <span key={index} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {doc.tags?.length > 3 && (
                    <span className="text-xs px-2 py-1 text-gray-500">+{doc.tags.length - 3}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{formatDate(doc.uploadedAt)}</span>
                  <div className="flex items-center space-x-1">
                    <span className="flex items-center">
                      <FiEye className="mr-1" /> {doc.viewCount || 0}
                    </span>
                    <span className="flex items-center">
                      <FiDownload className="mr-1" /> {doc.downloadCount || 0}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex justify-between">
                <button
                  onClick={() => handleDownload(doc._id || doc.id, doc.name)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FiDownload className="mr-1" /> Download
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      // Handle preview
                      window.open(`http://localhost:5000${doc.fileUrl}`, '_blank');
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    title="Preview"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id || doc.id, doc.name)}
                    className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Views</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Downloads</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredDocuments.map(doc => (
                <tr key={doc._id || doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{getFileIcon(doc.fileType)}</span>
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white">{doc.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          by {doc.uploadedBy?.name || 'Unknown'} • {doc.projectId?.name || 'No Project'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(doc.uploadedAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {doc.viewCount || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {doc.downloadCount || 0}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(doc._id || doc.id, doc.name)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Download"
                      >
                        <FiDownload />
                      </button>
                      <button
                        onClick={() => {
                          window.open(`http://localhost:5000${doc.fileUrl}`, '_blank');
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Preview"
                      >
                        <FiEye />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDocForShare(doc);
                          setShowShareModal(true);
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                        title="Share"
                      >
                        <FiShare2 />
                      </button>
                      <button
                        onClick={() => handleDelete(doc._id || doc.id, doc.name)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-lg border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Upload Document</h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleUpload}>
                <div className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select File *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files[0]) {
                            setUploadData(prev => ({
                              ...prev,
                              name: e.target.files[0].name
                            }));
                          }
                        }}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <FiUpload className="text-3xl text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to browse or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Max file size: 50MB • PDF, DOC, XLS, PPT, Images, TXT
                        </p>
                      </label>
                      {fileInputRef.current?.files[0] && (
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                          Selected: {fileInputRef.current.files[0].name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {uploading && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Document Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={uploadData.name}
                      onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      placeholder="Enter document name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={uploadData.description}
                      onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      rows="2"
                      placeholder="Add description (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Project *
                      </label>
                      <select
                        value={uploadData.projectId}
                        onChange={(e) => setUploadData({ ...uploadData, projectId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                        required
                      >
                        <option value="">Select Project</option>
                        {userProjects.map(project => (
                          <option key={project.id || project._id} value={project.id || project._id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={uploadData.tags}
                        onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                        placeholder="tag1, tag2, tag3"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={uploadData.isPublic}
                      onChange={(e) => setUploadData({ ...uploadData, isPublic: e.target.checked })}
                      className="mr-2"
                      id="isPublic"
                    />
                    <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">
                      Make this document public (visible to all team members)
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading || !uploadData.projectId}
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create New Folder</h2>
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <form onSubmit={handleCreateFolder}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Folder Name *
                    </label>
                    <input
                      type="text"
                      value={folderData.name}
                      onChange={(e) => setFolderData({ ...folderData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      placeholder="Enter folder name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={folderData.description}
                      onChange={(e) => setFolderData({ ...folderData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      rows="2"
                      placeholder="Add description (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project *
                    </label>
                    <select
                      value={folderData.projectId}
                      onChange={(e) => setFolderData({ ...folderData, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    >
                      <option value="">Select Project</option>
                      {userProjects.map(project => (
                        <option key={project.id || project._id} value={project.id || project._id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Access Level
                    </label>
                    <select
                      value={folderData.accessLevel}
                      onChange={(e) => setFolderData({ ...folderData, accessLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    >
                      <option value="private">Private (Only me)</option>
                      <option value="team">Team (All project members)</option>
                      <option value="public">Public (All users)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create Folder
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDocForShare && (
        <ShareDocumentModal
          document={selectedDocForShare}
          onClose={() => {
            setShowShareModal(false);
            setSelectedDocForShare(null);
          }}
          onShare={() => {
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

// Share Document Modal Component
const ShareDocumentModal = ({ document, onClose, onShare }) => {
  const { allEmployees } = useAuth();
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [permission, setPermission] = useState('view');

  const filteredEmployees = allEmployees.filter(emp => 
    emp.role !== 'HR' && // Exclude HR from sharing targets
    (emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     emp.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/documents/${document._id || document.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          permission
        })
      });

      if (response.ok) {
        alert('✅ Document shared successfully!');
        onShare();
        onClose();
      } else {
        const error = await response.json();
        alert(`❌ Share failed: ${error.msg || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('❌ Network error');
    }
  };

  const toggleUserSelection = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Share "{document.name}"
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Users
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
              placeholder="Search by name or email"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Permission Level
            </label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
            >
              <option value="view">Can View</option>
              <option value="edit">Can Edit</option>
              <option value="admin">Can Manage</option>
            </select>
          </div>

          <div className="mb-6 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2">
            {filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No users found
              </p>
            ) : (
              filteredEmployees.map(emp => (
                <div key={emp.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(emp.id)}
                    onChange={() => toggleUserSelection(emp.id)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{emp.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{emp.email} • {emp.role}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedUsers.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Selected {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
              disabled={selectedUsers.length === 0}
            >
              Share Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



export default DocumentsPage;