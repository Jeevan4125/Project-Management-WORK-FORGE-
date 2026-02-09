import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import io from 'socket.io-client';
import { 
  FiVideo, FiCalendar, FiClock, FiUsers, FiPlus, 
  FiChevronRight, FiChevronLeft, FiCopy, FiLink,
  FiUserPlus, FiMessageSquare, FiShare2, FiSettings,
  FiMic, FiMicOff, FiVideoOff, FiMonitor, FiX,
  FiCheck, FiTrash2, FiEdit, FiDownload, FiBell,
  FiMoreVertical, FiExternalLink, FiPhoneOff,
  FiGlobe, FiSearch, FiFilter
} from 'react-icons/fi';

const CallsPage = () => {
  const { user, allEmployees } = useAuth();
  const [calls, setCalls] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCall, setNewCall] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 30,
    maxParticipants: 50,
    attendees: []
  });
  const [joinLink, setJoinLink] = useState('');
  const [selectedCall, setSelectedCall] = useState(null);
  const [filter, setFilter] = useState('all');
  const [socket, setSocket] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const chatContainerRef = useRef(null);
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});

  // Check if user is HR
  const isHR = user?.role === 'HR';
  // Check if user is a team member (non-HR)
  const isTeamMember = user?.role !== 'HR';

  useEffect(() => {
    fetchCalls();
    
    // Connect to Socket.IO
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      stopMedia();
    };
  }, []);

  useEffect(() => {
    if (socket && activeCall) {
      socket.on('user-joined', handleUserJoined);
      socket.on('user-left', handleUserLeft);
      socket.on('offer', handleOffer);
      socket.on('answer', handleAnswer);
      socket.on('ice-candidate', handleIceCandidate);
      socket.on('receive-chat', handleReceiveChat);
      socket.on('screen-share-started', handleScreenShareStarted);
      socket.on('screen-share-stopped', handleScreenShareStopped);
    }

    return () => {
      if (socket) {
        socket.off('user-joined');
        socket.off('user-left');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        socket.off('receive-chat');
        socket.off('screen-share-started');
        socket.off('screen-share-stopped');
      }
    };
  }, [socket, activeCall]);

  const fetchCalls = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/calls', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCalls(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCall = async () => {
    // Check if user is HR before allowing creation
    if (!isHR) {
      alert('Only HR personnel can create calls');
      return;
    }

    if (!newCall.title || !newCall.scheduledAt) {
      alert('Please fill in title and scheduled time');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://localhost:5000/api/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newCall,
          attendees: selectedEmployees.map(emp => ({ userId: emp.id }))
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('✅ Call created successfully!');
        setShowCreateModal(false);
        setNewCall({
          title: '',
          description: '',
          scheduledAt: '',
          duration: 30,
          maxParticipants: 50,
          attendees: []
        });
        setSelectedEmployees([]);
        fetchCalls();
      } else {
        alert(data.message || 'Failed to create call');
      }
    } catch (error) {
      console.error('Error creating call:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleJoinCall = async (callId) => {
    // Validate callId before sending
    if (!callId || callId.length < 10) {
      alert('Invalid call ID');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first');
      return;
    }

    // Allow both HR and team members to join calls
    try {
      console.log('Joining call with ID:', callId);
      
      const response = await fetch(`http://localhost:5000/api/calls/${callId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('Join successful:', data);
        setActiveCall({
          id: callId,
          title: data.data.title,
          hostName: data.data.hostName,
          link: data.data.callLink
        });
        await initializeMedia();
        
        // Notify socket server
        if (socket) {
          socket.emit('user-connected', user.id);
          socket.emit('join-call', { 
            callId: callId, 
            userId: user.id 
          });
        }
      } else {
        alert(data.message || 'Failed to join call');
        console.error('Join failed:', data);
      }
    } catch (error) {
      console.error('Error joining call:', error);
      alert('Network error. Please try again.');
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Please allow camera and microphone access to join the call');
      throw error;
    }
  };

  const stopMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        // Replace video track
        const videoTrack = screenStream.getVideoTracks()[0];
        const senders = Object.values(peerConnections.current).map(pc => 
          pc.getSenders().find(s => s.track.kind === 'video')
        ).filter(Boolean);
        
        senders.forEach(sender => {
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(true);
        socket.emit('start-screen-share', { callId: activeCall.id });
      } else {
        // Switch back to camera
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = cameraStream.getVideoTracks()[0];
        const senders = Object.values(peerConnections.current).map(pc => 
          pc.getSenders().find(s => s.track.kind === 'video')
        ).filter(Boolean);
        
        senders.forEach(sender => {
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(false);
        socket.emit('stop-screen-share', { callId: activeCall.id });
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const handleSendChat = () => {
    if (newMessage.trim() && activeCall) {
      const message = {
        callId: activeCall.id,
        userId: user.id,
        userName: user.name,
        message: newMessage.trim()
      };
      
      socket.emit('send-chat', message);
      setChatMessages(prev => [...prev, message]);
      setNewMessage('');
      
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  };

  const handleInviteEmployees = async (callId) => {
    // Only HR can invite employees
    if (!isHR) {
      alert('Only HR can invite employees to calls');
      return;
    }

    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee to invite');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/calls/${callId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          employeeIds: selectedEmployees.map(emp => emp.id)
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`✅ ${data.message}`);
        setShowInviteModal(false);
        setSelectedEmployees([]);
        fetchCalls();
      } else {
        alert(data.message || 'Failed to invite employees');
      }
    } catch (error) {
      console.error('Error inviting employees:', error);
      alert('Network error. Please try again.');
    }
  };

  // WebRTC Handlers
  const handleUserJoined = (data) => {
    createPeerConnection(data.userId);
  };

  const handleUserLeft = (data) => {
    if (remoteStreams[data.userId]) {
      delete remoteStreams[data.userId];
      setRemoteStreams({...remoteStreams});
    }
  };

  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnections.current[userId] = pc;

    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [userId]: remoteStream
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: userId,
          candidate: event.candidate,
          callId: activeCall.id
        });
      }
    };

    // Create and send offer
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socket.emit('offer', {
          to: userId,
          offer: pc.localDescription,
          callId: activeCall.id
        });
      })
      .catch(console.error);

    return pc;
  };

  const handleOffer = async (data) => {
    const pc = createPeerConnection(data.from);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socket.emit('answer', {
      to: data.from,
      answer: answer,
      callId: activeCall.id
    });
  };

  const handleAnswer = async (data) => {
    const pc = peerConnections.current[data.from];
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  };

  const handleIceCandidate = async (data) => {
    const pc = peerConnections.current[data.from];
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  };

  const handleReceiveChat = (data) => {
    setChatMessages(prev => [...prev, data]);
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const handleScreenShareStarted = (data) => {
    console.log('User started screen sharing:', data.userId);
  };

  const handleScreenShareStopped = (data) => {
    console.log('User stopped screen sharing:', data.userId);
  };

  const leaveCall = () => {
    stopMedia();
    
    // Clean up peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};
    
    // Leave socket room
    if (socket && activeCall) {
      socket.emit('leave-call', activeCall.id);
    }
    
    setActiveCall(null);
    setRemoteStreams({});
    setChatMessages([]);
    setNewMessage('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Link copied to clipboard!'))
      .catch(err => console.error('Copy failed:', err));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredCalls = calls.filter(call => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return call.title.toLowerCase().includes(query) ||
             call.description?.toLowerCase().includes(query) ||
             call.hostName.toLowerCase().includes(query);
    }
    
    const now = new Date();
    const callDate = new Date(call.scheduledAt);
    
    switch (filter) {
      case 'upcoming':
        return callDate >= now && call.status !== 'completed' && call.status !== 'cancelled';
      case 'past':
        return callDate < now || call.status === 'completed';
      case 'my':
        return call.hostId === user.id;
      case 'active':
        return call.status === 'active';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (activeCall) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        {/* Call Header */}
        <div className="bg-gray-800 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{activeCall.title}</h2>
            <p className="text-sm text-gray-300">Host: {activeCall.hostName}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoOff ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isVideoOff ? "Turn on video" : "Turn off video"}
              >
                {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-3 rounded-full ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                <FiMonitor size={20} />
              </button>
            </div>
            <button
              onClick={leaveCall}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium flex items-center"
            >
              <FiPhoneOff className="mr-2" /> Leave Call
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Grid */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-xl overflow-hidden border-2 border-blue-500">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {user.name} (You)
                  {isMuted && <FiMicOff className="ml-2" size={14} />}
                  {isVideoOff && <FiVideoOff className="ml-1" size={14} />}
                </div>
              </div>

              {/* Remote Videos */}
              {Object.entries(remoteStreams).map(([userId, stream]) => (
                <div key={userId} className="relative bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-700">
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-64 object-cover"
                    ref={el => {
                      if (el && stream) {
                        el.srcObject = stream;
                      }
                    }}
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    User {userId.substring(0, 8)}
                  </div>
                </div>
              ))}
            </div>

            {/* Call Info */}
            <div className="mt-6 p-4 bg-gray-800 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">Call Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Call ID</p>
                  <p className="font-mono text-sm">{activeCall.id?.substring(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Participants</p>
                  <p className="font-medium">{Object.keys(remoteStreams).length + 1} online</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Connection</p>
                  <p className="font-medium text-green-500">Stable</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="w-96 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-lg">Chat ({chatMessages.length})</h3>
            </div>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ maxHeight: 'calc(100vh - 200px)' }}
            >
              {chatMessages.map((msg, index) => (
                <div key={index} className={`${msg.userId === user.id ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-xs p-3 rounded-2xl ${msg.userId === user.id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    <p className="text-sm font-medium">{msg.userName}</p>
                    <p className="mt-1">{msg.message}</p>
                    <p className="text-xs text-gray-300 mt-2">
                      {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!newMessage.trim()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiMessageSquare size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Standup Calls</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isHR ? 'Schedule and manage video calls for your team' : 'Join and participate in team video calls'}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <FiLink className="mr-2" /> Join Call
          </button>
          
          {/* Only show Schedule Call button for HR */}
          {isHR && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-lg transition-colors"
            >
              <FiPlus className="mr-2" /> Schedule Call
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calls..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {['all', 'upcoming', 'active', 'past', 'my'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg capitalize text-sm ${
                filter === tab
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {tab === 'my' ? 'My Calls' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
              <FiVideo className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Total Calls</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{calls.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-black rounded-xl shadow p-6 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg mr-4">
              <FiCalendar className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Upcoming</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {calls.filter(c => new Date(c.scheduledAt) > new Date() && c.status !== 'completed').length}
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Active Now</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {calls.filter(c => c.status === 'active').length}
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                {calls.length > 0 
                  ? Math.round(calls.reduce((sum, c) => sum + (c.duration || 30), 0) / calls.length) 
                  : 0} min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calls Grid */}
      {filteredCalls.length === 0 ? (
        <div className="bg-white dark:bg-black rounded-xl shadow p-12 text-center border border-gray-200 dark:border-gray-800">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 mx-auto">
            <FiVideo size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
            {searchQuery ? 'No calls found' : 'No calls scheduled yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery 
              ? 'Try different search terms'
              : isHR 
                ? 'Schedule your first standup call to get started'
                : 'No calls are scheduled at the moment. Please check back later.'
            }
          </p>
          <div className="flex justify-center space-x-3">
            {/* Only show Schedule Call button for HR */}
            {isHR && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-lg"
              >
                Schedule Call
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              >
                Clear Search
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalls.map(call => (
            <div
              key={call._id}
              className="bg-white dark:bg-black rounded-xl shadow border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        call.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                        call.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' :
                        call.status === 'completed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                      }`}>
                        {call.status}
                      </span>
                      {call.projectName && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100 rounded-full">
                          {call.projectName}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{call.title}</h3>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(call.callLink)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Copy call link"
                  >
                    <FiLink size={18} />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {call.description || 'No description'}
                </p>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <FiCalendar className="mr-2 flex-shrink-0" />
                    <span>{formatDate(call.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <FiClock className="mr-2 flex-shrink-0" />
                    <span>{call.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <FiUsers className="mr-2 flex-shrink-0" />
                    <span>{call.attendees?.length || 0} attending • Host: {call.hostName}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    {(call.status === 'scheduled' || call.status === 'active') ? (
                      <>
                        <button
                          onClick={() => handleJoinCall(call._id)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                        >
                          Join Call
                        </button>
                        {/* Only HR can invite employees */}
                        {isHR && (
                          <button
                            onClick={() => {
                              setSelectedCall(call);
                              setShowInviteModal(true);
                            }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                          >
                            Invite
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => copyToClipboard(call.shareLink || call.callLink)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Copy share link"
                  >
                    <FiShare2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Call Modal - Only show for HR */}
      {showCreateModal && isHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Schedule New Call</h2>
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
                    Call Title *
                  </label>
                  <input
                    type="text"
                    value={newCall.title}
                    onChange={(e) => setNewCall({ ...newCall, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="e.g., Daily Standup - Dev Team"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCall.description}
                    onChange={(e) => setNewCall({ ...newCall, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    rows="3"
                    placeholder="Agenda, topics to discuss..."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={newCall.scheduledAt}
                      onChange={(e) => setNewCall({ ...newCall, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="240"
                      value={newCall.duration}
                      onChange={(e) => setNewCall({ ...newCall, duration: parseInt(e.target.value) || 30 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    value={newCall.maxParticipants}
                    onChange={(e) => setNewCall({ ...newCall, maxParticipants: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                  />
                </div>

                {/* Only HR can invite employees */}
                {isHR && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Invite Employees (Optional)
                    </label>
                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto">
                      {allEmployees.filter(emp => emp.role !== 'HR').map(emp => (
                        <div key={emp.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.some(e => e.id === emp.id)}
                            onChange={() => {
                              if (selectedEmployees.some(e => e.id === emp.id)) {
                                setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
                              } else {
                                setSelectedEmployees([...selectedEmployees, emp]);
                              }
                            }}
                            className="mr-2"
                          />
                          <div>
                            <p className="text-sm">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Selected: {selectedEmployees.length} employee(s)
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCall}
                  className="px-4 py-2 bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-lg transition-colors"
                >
                  Schedule Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Call Modal - Available for all users */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Join a Call</h2>
                <button 
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinLink('');
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Enter Call Link or ID
                  </label>
                  <input
                    type="text"
                    value={joinLink}
                    onChange={(e) => setJoinLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white"
                    placeholder="workforge-call-abc123 or share link"
                  />
                </div>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>You can join using:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Call link provided by the host</li>
                    <li>Share link from the invitation</li>
                    <li>Call ID from the calls list</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinLink('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (joinLink.includes('workforge-call-')) {
                      // Extract call ID from link
                      const callId = joinLink.split('workforge-call-')[1];
                      handleJoinCall(callId);
                    } else if (joinLink.includes('join/')) {
                      // Extract from share link
                      const parts = joinLink.split('join/');
                      if (parts.length > 1) {
                        const callId = parts[1].substring(0, 24); // Assuming MongoDB ObjectId
                        handleJoinCall(callId);
                      }
                    } else {
                      // Try as direct ID
                      handleJoinCall(joinLink.trim());
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Join Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Employees Modal - Only for HR */}
      {showInviteModal && selectedCall && isHR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Invite to "{selectedCall.title}"
                </h2>
                <button 
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedEmployees([]);
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Employees
                  </label>
                  <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-2 max-h-48 overflow-y-auto">
                    {allEmployees.filter(emp => emp.role !== 'HR').map(emp => (
                      <div key={emp.id} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.some(e => e.id === emp.id)}
                          onChange={() => {
                            if (selectedEmployees.some(e => e.id === emp.id)) {
                              setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
                            } else {
                              setSelectedEmployees([...selectedEmployees, emp]);
                            }
                          }}
                          className="mr-2"
                        />
                        <div className="flex-1">
                          <p className="text-sm">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {selectedEmployees.length} employee(s)
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Selected employees will receive a notification with the call details.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setSelectedEmployees([]);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInviteEmployees(selectedCall._id)}
                  disabled={selectedEmployees.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Send Invitations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsPage;