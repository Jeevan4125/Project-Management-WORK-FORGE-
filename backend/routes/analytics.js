const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Sample analytics data structure (in real app, use database)
const analyticsData = {
  // User ID -> Array of sessions
  sessions: {},
  // Daily statistics
  dailyStats: {}
};

// Track user login
router.post('/track-login', auth, (req, res) => {
  try {
    const { userId } = req.body;
    const timestamp = new Date();
    
    if (!analyticsData.sessions[userId]) {
      analyticsData.sessions[userId] = [];
    }
    
    const session = {
      loginTime: timestamp,
      logoutTime: null,
      duration: null,
      device: req.headers['user-agent'],
      ip: req.ip
    };
    
    analyticsData.sessions[userId].push(session);
    
    // Update daily stats
    const dateKey = timestamp.toISOString().split('T')[0];
    if (!analyticsData.dailyStats[dateKey]) {
      analyticsData.dailyStats[dateKey] = {
        totalLogins: 0,
        totalUsers: new Set(),
        avgSessionDuration: 0,
        peakHours: {}
      };
    }
    
    analyticsData.dailyStats[dateKey].totalLogins++;
    analyticsData.dailyStats[dateKey].totalUsers.add(userId);
    
    // Track hour of login for peak hours
    const hour = timestamp.getHours();
    analyticsData.dailyStats[dateKey].peakHours[hour] = 
      (analyticsData.dailyStats[dateKey].peakHours[hour] || 0) + 1;
    
    res.status(200).json({ 
      success: true, 
      message: 'Login tracked successfully' 
    });
    
  } catch (error) {
    console.error('Error tracking login:', error);
    res.status(500).json({ success: false, message: 'Failed to track login' });
  }
});

// Track user logout
router.post('/track-logout', auth, (req, res) => {
  try {
    const { userId } = req.body;
    const logoutTime = new Date();
    
    if (analyticsData.sessions[userId]) {
      const activeSession = analyticsData.sessions[userId]
        .find(session => !session.logoutTime);
      
      if (activeSession) {
        activeSession.logoutTime = logoutTime;
        activeSession.duration = 
          (logoutTime - new Date(activeSession.loginTime)) / (1000 * 60); // minutes
        
        // Update session in sessions array
        const sessionIndex = analyticsData.sessions[userId]
          .findIndex(s => s.loginTime === activeSession.loginTime);
        analyticsData.sessions[userId][sessionIndex] = activeSession;
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Logout tracked successfully' 
    });
    
  } catch (error) {
    console.error('Error tracking logout:', error);
    res.status(500).json({ success: false, message: 'Failed to track logout' });
  }
});

// Get user session history
router.get('/user-sessions/:userId', auth, (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    let sessions = analyticsData.sessions[userId] || [];
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      sessions = sessions.filter(session => {
        const sessionDate = new Date(session.loginTime);
        return sessionDate >= start && sessionDate <= end;
      });
    }
    
    // Sort by most recent first
    sessions.sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
    
    res.status(200).json({
      success: true,
      data: {
        userId,
        totalSessions: sessions.length,
        avgSessionDuration: sessions.length > 0 
          ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length
          : 0,
        sessions: sessions.slice(0, 50) // Limit to 50 most recent sessions
      }
    });
    
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
});

// Get overall analytics
// Update the overview endpoint to handle HR requests
router.get('/overview', (req, res) => {
  try {
    const { period = 'week', userId } = req.query;
    const requestingUser = req.user; // Assuming you have auth middleware
    
    console.log(`📊 Fetching analytics overview for period: ${period}`);
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    // Get ALL sessions from ALL users
    const allSessions = [];
    Object.entries(analyticsData.sessions).forEach(([sessionUserId, sessions]) => {
      sessions.forEach(session => {
        allSessions.push({
          ...session,
          userId: sessionUserId
        });
      });
    });
    
    // Filter sessions within the period
    const recentSessions = allSessions.filter(session => 
      new Date(session.loginTime) >= startDate
    );
    
    // If specific userId is requested, filter by that user
    let filteredSessions = recentSessions;
    if (userId && userId !== 'all') {
      filteredSessions = recentSessions.filter(session => session.userId === userId);
    }
    
    // Calculate daily statistics
    const dailyData = {};
    filteredSessions.forEach(session => {
      const dateKey = getDateKey(new Date(session.loginTime));
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          logins: 0,
          uniqueUsers: new Set(),
          totalDuration: 0
        };
      }
      
      dailyData[dateKey].logins++;
      dailyData[dateKey].uniqueUsers.add(session.userId);
      if (session.duration) {
        dailyData[dateKey].totalDuration += session.duration;
      }
    });
    
    // Convert to array for charting
    const chartData = Object.values(dailyData).map(day => ({
      date: day.date,
      logins: day.logins,
      uniqueUsers: day.uniqueUsers.size,
      avgDuration: day.logins > 0 ? day.totalDuration / day.logins : 0
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate peak hours
    const hourCounts = {};
    filteredSessions.forEach(session => {
      const hour = new Date(session.loginTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
    
    // Calculate user statistics
    const userStats = {};
    filteredSessions.forEach(session => {
      if (session.userId) {
        if (!userStats[session.userId]) {
          userStats[session.userId] = {
            sessions: 0,
            totalDuration: 0
          };
        }
        userStats[session.userId].sessions++;
        userStats[session.userId].totalDuration += (session.duration || 0);
      }
    });
    
    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        ...stats,
        avgDuration: stats.sessions > 0 ? stats.totalDuration / stats.sessions : 0,
        productivityScore: Math.min(100, Math.round(
          (stats.sessions * 0.5) + 
          (stats.avgDuration * 0.3) + 
          (Math.random() * 30 + 70) * 0.2
        ))
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
    
    res.status(200).json({
      success: true,
      data: {
        period,
        totalSessions: filteredSessions.length,
        totalUsers: Object.keys(userStats).length,
        avgSessionDuration: filteredSessions.length > 0
          ? filteredSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / filteredSessions.length
          : 0,
        chartData,
        peakHours,
        topUsers,
        recentSessions: filteredSessions
          .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))
          .slice(0, 20)
          .map(s => ({
            ...s,
            loginTime: s.loginTime.toISOString(),
            logoutTime: s.logoutTime ? s.logoutTime.toISOString() : null
          }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching analytics overview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch analytics',
      error: error.message 
    });
  }
});
// Get employee metrics - returns data for ALL employees
router.get('/employee-metrics', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    console.log(`📊 Fetching employee metrics for ALL employees`);
    
    // Collect data from ALL users
    const employeeMetrics = [];
    
    Object.entries(analyticsData.sessions).forEach(([userId, sessions]) => {
      // Filter sessions by date if provided
      let userSessions = sessions;
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        userSessions = sessions.filter(session => {
          const sessionDate = new Date(session.loginTime);
          return sessionDate >= start && sessionDate <= end;
        });
      }
      
      if (userSessions.length > 0) {
        const totalDuration = userSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const avgDuration = userSessions.length > 0 ? totalDuration / userSessions.length : 0;
        
        // Generate employee name (in real app, fetch from users database)
        const employeeNames = {
          'user1': 'John Doe',
          'user2': 'Jane Smith', 
          'user3': 'Alex Johnson',
          'hr-user': 'HR Manager',
          // Add more mappings as needed
        };
        
        const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Operations'];
        const department = userId === 'hr-user' ? 'HR' : departments[Math.floor(Math.random() * departments.length)];
        
        // Calculate consistency score
        const loginTimes = userSessions
          .map(s => new Date(s.loginTime).getHours())
          .filter(h => !isNaN(h));
        
        let consistencyScore = 100;
        if (loginTimes.length > 1) {
          const mean = loginTimes.reduce((a, b) => a + b) / loginTimes.length;
          const variance = loginTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / loginTimes.length;
          const stdDev = Math.sqrt(variance);
          consistencyScore = Math.max(0, 100 - (stdDev * 5));
        }
        
        employeeMetrics.push({
          userId,
          employeeName: employeeNames[userId] || `Employee ${userId.substring(0, 4)}`,
          department,
          totalSessions: userSessions.length,
          totalDuration,
          avgDuration: Math.round(avgDuration),
          consistencyScore: Math.round(consistencyScore),
          productivityScore: Math.min(100, Math.round(
            (userSessions.length * 0.5) + 
            (avgDuration * 0.3) + 
            consistencyScore * 0.2
          )),
          lastLogin: userSessions.length > 0 
            ? userSessions[userSessions.length - 1].loginTime.toISOString()
            : null
        });
      }
    });
    
    // If no real data, generate sample data
    if (employeeMetrics.length === 0) {
      const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Operations'];
      const employeeNames = [
        'John Doe', 'Jane Smith', 'Alex Johnson', 'Sarah Wilson', 'Mike Brown',
        'Emily Davis', 'David Lee', 'Lisa Taylor', 'Robert Clark', 'Maria Garcia'
      ];
      
      employeeNames.forEach((name, index) => {
        const department = departments[Math.floor(Math.random() * departments.length)];
        const totalSessions = Math.floor(Math.random() * 40) + 5;
        const totalDuration = Math.floor(Math.random() * 3000) + 500;
        const avgDuration = totalDuration / totalSessions;
        const consistencyScore = Math.floor(Math.random() * 30) + 70;
        const productivityScore = Math.min(100, Math.floor(
          (totalSessions * 0.5) + 
          (avgDuration * 0.3) + 
          consistencyScore * 0.2
        ));
        
        employeeMetrics.push({
          userId: `EMP${1000 + index}`,
          employeeName: name,
          department,
          totalSessions,
          totalDuration,
          avgDuration: Math.round(avgDuration),
          consistencyScore,
          productivityScore,
          lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      });
    }
    
    res.status(200).json({
      success: true,
      data: employeeMetrics.sort((a, b) => b.productivityScore - a.productivityScore)
    });
    
  } catch (error) {
    console.error('❌ Error fetching employee metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch employee metrics',
      error: error.message 
    });
  }
});

// @route   GET api/analytics/calls
// @desc    Get call analytics
// @access  Private (HR, Super Admin)
router.get('/calls', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get total calls
    const totalCalls = await Call.countDocuments(dateFilter);
    
    // Get calls by status
    const callsByStatus = await Call.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Get calls by month
    const callsByMonth = await Call.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get top hosts
    const topHosts = await Call.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$hostId',
          hostName: { $first: '$hostName' },
          callCount: { $sum: 1 },
          totalAttendees: { $sum: { $size: '$attendees' } }
        }
      },
      { $sort: { callCount: -1 } },
      { $limit: 5 }
    ]);
    
    // Get average call duration
    const avgDuration = await Call.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, avg: { $avg: '$duration' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalCalls,
        callsByStatus,
        callsByMonth,
        topHosts,
        avgDuration: avgDuration[0]?.avg || 0
      }
    });
  } catch (error) {
    console.error('Get call analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;