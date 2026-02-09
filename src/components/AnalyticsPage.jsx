import React, { useState, useEffect, useRef } from 'react';
import { 
  FiActivity, FiTrendingUp, FiClock, FiUsers, FiCalendar, 
  FiBarChart2, FiPieChart, FiDownload, FiFilter, FiRefreshCw,
  FiFileText, FiFile, FiGrid, FiPrinter
} from 'react-icons/fi';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const AnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [employeeMetrics, setEmployeeMetrics] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [employeeViewMode, setEmployeeViewMode] = useState('summary'); // 'summary' or 'detailed'
const [selectedEmployeeSessions, setSelectedEmployeeSessions] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  const chartRef = useRef(null);
  const reportRef = useRef(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];
  const DEPARTMENT_COLORS = {
    'Engineering': '#0088FE',
    'Marketing': '#00C49F',
    'Sales': '#FFBB28',
    'HR': '#FF8042',
    'Operations': '#8884D8'
  };

  const fetchDetailedSessionData = async () => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(
      `http://localhost:5000/api/analytics/employee-sessions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Update employee metrics with session data
        setEmployeeMetrics(prev => 
          prev.map(emp => {
            const empData = data.data.find(e => e.userId === emp.userId);
            return empData ? { ...emp, ...empData } : emp;
          })
        );
      }
    }
  } catch (error) {
    console.error('Error fetching session data:', error);
  }
};

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    try {
      // Fetch overview data
      const overviewRes = await fetch(
        `http://localhost:5000/api/analytics/overview?period=${period}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        if (overviewData.success) {
          setAnalyticsData(overviewData.data);
        }
      }
      
      // Fetch employee metrics
      const metricsRes = await fetch(
        `http://localhost:5000/api/analytics/employee-metrics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        if (metricsData.success) {
          setEmployeeMetrics(metricsData.data);
        }
      }
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
      createSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Create sample data for demonstration
  const createSampleData = () => {
    const sampleChartData = [];
    const now = new Date();
    
    // Generate 7 days of data
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      sampleChartData.push({
        date: dateStr,
        logins: Math.floor(Math.random() * 50) + 20,
        uniqueUsers: Math.floor(Math.random() * 15) + 5,
        avgDuration: Math.floor(Math.random() * 120) + 30,
        productivity: Math.floor(Math.random() * 30) + 70
      });
    }
    
    const samplePeakHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: i >= 9 && i <= 17 ? Math.floor(Math.random() * 30) + 10 : Math.floor(Math.random() * 5) + 1,
      label: `${i}:00`
    }));
    
    const sampleTopUsers = [
      { userId: 'john.doe', name: 'John Doe', sessions: 42, avgDuration: 125, productivityScore: 92 },
      { userId: 'jane.smith', name: 'Jane Smith', sessions: 38, avgDuration: 98, productivityScore: 87 },
      { userId: 'alex.johnson', name: 'Alex Johnson', sessions: 35, avgDuration: 156, productivityScore: 85 },
      { userId: 'sarah.wilson', name: 'Sarah Wilson', sessions: 31, avgDuration: 87, productivityScore: 79 },
      { userId: 'mike.brown', name: 'Mike Brown', sessions: 28, avgDuration: 112, productivityScore: 76 },
    ];
    
    setAnalyticsData({
      period: 'week',
      totalSessions: 174,
      totalUsers: 25,
      avgSessionDuration: 105,
      chartData: sampleChartData,
      peakHours: samplePeakHours,
      topUsers: sampleTopUsers
    });
    
    // Generate sample employee metrics
    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Operations'];
    const sampleMetrics = Array.from({ length: 15 }, (_, i) => ({
      userId: `EMP${1000 + i}`,
      employeeName: `Employee ${i + 1}`,
      department: departments[Math.floor(Math.random() * departments.length)],
      totalSessions: Math.floor(Math.random() * 40) + 5,
      totalDuration: Math.floor(Math.random() * 3000) + 500,
      avgDuration: Math.floor(Math.random() * 120) + 30,
      consistencyScore: Math.floor(Math.random() * 30) + 70,
      productivityScore: Math.floor(Math.random() * 30) + 70,
      lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    setEmployeeMetrics(sampleMetrics.sort((a, b) => b.productivityScore - a.productivityScore));
  };

  useEffect(() => {
    fetchAnalyticsData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAnalyticsData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [period, dateRange]);

  // ========== EXPORT FUNCTIONS ==========

  // Export to CSV
  const exportToCSV = () => {
    setIsExporting(true);
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'overview' && analyticsData) {
      csvContent += "Date,Logins,Unique Users,Avg Duration (min),Productivity Score\n";
      analyticsData.chartData.forEach(row => {
        csvContent += `${row.date},${row.logins},${row.uniqueUsers},${row.avgDuration || 0},${row.productivity || 0}\n`;
      });
    } else if (activeTab === 'employees' && employeeMetrics.length > 0) {
      csvContent += "Employee ID,Name,Department,Sessions,Total Hours,Avg Session (min),Consistency Score,Productivity Score,Last Login\n";
      employeeMetrics.forEach(emp => {
        csvContent += `${emp.userId},${emp.employeeName || 'Unknown'},${emp.department || 'N/A'},${emp.totalSessions},${(emp.totalDuration/60).toFixed(2)},${emp.avgDuration},${emp.consistencyScore},${emp.productivityScore},${emp.lastLogin}\n`;
      });
    } else if (activeTab === 'sessions' && analyticsData && analyticsData.recentSessions) {
      csvContent += "User ID,Login Time,Logout Time,Duration (min),Device,IP Address\n";
      analyticsData.recentSessions.forEach(session => {
        csvContent += `${session.userId || 'Unknown'},${session.loginTime || 'N/A'},${session.logoutTime || 'Active'},${session.duration || 0},${session.device || 'Unknown'},${session.ip || 'N/A'}\n`;
      });
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
  };

  // Export to Excel
  const exportToExcel = () => {
    setIsExporting(true);
    
    let worksheetData = [];
    
    if (activeTab === 'overview' && analyticsData) {
      worksheetData = analyticsData.chartData.map(row => ({
        Date: row.date,
        Logins: row.logins,
        'Unique Users': row.uniqueUsers,
        'Avg Duration (min)': row.avgDuration || 0,
        'Productivity Score': row.productivity || 0
      }));
    } else if (activeTab === 'employees' && employeeMetrics.length > 0) {
      worksheetData = employeeMetrics.map(emp => ({
        'Employee ID': emp.userId,
        Name: emp.employeeName || 'Unknown',
        Department: emp.department || 'N/A',
        Sessions: emp.totalSessions,
        'Total Hours': (emp.totalDuration/60).toFixed(2),
        'Avg Session (min)': emp.avgDuration,
        'Consistency Score': emp.consistencyScore,
        'Productivity Score': emp.productivityScore,
        'Last Login': emp.lastLogin
      }));
    }
    
    if (worksheetData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Data");
      
      // Add summary sheet
      const summaryData = [
        ['Analytics Report Summary'],
        ['Generated Date', new Date().toLocaleDateString()],
        ['Period', period],
        ['Total Records', worksheetData.length],
        ['', ''],
        ['Report Type', activeTab.charAt(0).toUpperCase() + activeTab.slice(1)]
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      
      XLSX.writeFile(workbook, `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
    
    setIsExporting(false);
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const imgWidth = 280;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Add metadata
      pdf.setProperties({
        title: `Analytics Report - ${new Date().toLocaleDateString()}`,
        subject: 'Work Forge Analytics',
        author: 'Work Forge System',
        keywords: 'analytics, report, employee, productivity'
      });
      
      pdf.save(`analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export based on selected format
  const handleExport = () => {
    switch (exportFormat) {
      case 'csv':
        exportToCSV();
        break;
      case 'excel':
        exportToExcel();
        break;
      case 'pdf':
        exportToPDF();
        break;
      default:
        exportToCSV();
    }
  };

  // Export all data
  const exportAllData = async () => {
    setIsExporting(true);
    
    // Create workbook with multiple sheets
    const workbook = XLSX.utils.book_new();
    
    // Overview sheet
    if (analyticsData?.chartData) {
      const overviewSheet = XLSX.utils.json_to_sheet(
        analyticsData.chartData.map(row => ({
          Date: row.date,
          Logins: row.logins,
          'Unique Users': row.uniqueUsers,
          'Avg Duration (min)': row.avgDuration || 0
        }))
      );
      XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");
    }
    
    // Employee metrics sheet
    if (employeeMetrics.length > 0) {
      const metricsSheet = XLSX.utils.json_to_sheet(
        employeeMetrics.map(emp => ({
          'Employee ID': emp.userId,
          Name: emp.employeeName || 'Unknown',
          Department: emp.department || 'N/A',
          Sessions: emp.totalSessions,
          'Total Hours': (emp.totalDuration/60).toFixed(2),
          'Avg Session (min)': emp.avgDuration,
          'Consistency Score': emp.consistencyScore,
          'Productivity Score': emp.productivityScore,
          'Last Login': emp.lastLogin
        }))
      );
      XLSX.utils.book_append_sheet(workbook, metricsSheet, "Employee Metrics");
    }
    
    // Peak hours sheet
    if (analyticsData?.peakHours) {
      const peakHoursSheet = XLSX.utils.json_to_sheet(
        analyticsData.peakHours.map(hour => ({
          Hour: `${hour.hour}:00`,
          Logins: hour.count
        }))
      );
      XLSX.utils.book_append_sheet(workbook, peakHoursSheet, "Peak Hours");
    }
    
    // Summary sheet
    const summaryData = [
      ['WORK FORGE ANALYTICS REPORT'],
      [''],
      ['Report Date', new Date().toLocaleDateString()],
      ['Period', period],
      ['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`],
      ['Total Sessions', analyticsData?.totalSessions || 0],
      ['Total Users', analyticsData?.totalUsers || 0],
      ['Avg Session Duration', `${analyticsData?.avgSessionDuration || 0} minutes`],
      [''],
      ['Generated by Work Forge Analytics System']
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Report Summary");
    
    XLSX.writeFile(workbook, `complete_analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setIsExporting(false);
  };

  // Print report
  const printReport = () => {
    const printContent = reportRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .chart-container { width: 100%; height: 400px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 30px; }
          @media print {
            .no-print { display: none; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Work Forge Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <p>Period: ${period} | Date Range: ${dateRange.startDate} to ${dateRange.endDate}</p>
        </div>
        ${printContent}
      </body>
      </html>
    `;
    
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // ========== CHART COMPONENTS WITH PROPER SIZING ==========

  // Login Trends Chart Component
  const LoginTrendsChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
            formatter={(value, name) => {
              if (name === 'avgDuration') return [`${value} min`, 'Avg Duration'];
              if (name === 'productivity') return [`${value}%`, 'Productivity'];
              return [value, name === 'logins' ? 'Logins' : 'Unique Users'];
            }}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="logins" 
            name="Total Logins"
            stroke="#3B82F6" 
            strokeWidth={2}
            dot={{ strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line 
            type="monotone" 
            dataKey="uniqueUsers" 
            name="Unique Users"
            stroke="#10B981" 
            strokeWidth={2}
            dot={{ strokeWidth: 2, r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="productivity" 
            name="Productivity %"
            stroke="#8B5CF6" 
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  // Peak Hours Chart Component
  const PeakHoursChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="hour" 
            stroke="#9CA3AF"
            tickFormatter={(value) => `${value}:00`}
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
            formatter={(value) => [value, 'Logins']}
            labelFormatter={(label) => `Hour: ${label}:00`}
          />
          <Bar 
            dataKey="count" 
            name="Login Count"
            fill="#8B5CF6"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // Department Performance Chart
  const DepartmentPerformanceChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="department" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
            formatter={(value, name) => {
              if (name === 'productivity') return [`${value}%`, 'Productivity'];
              if (name === 'sessions') return [value, 'Sessions'];
              return [`${value} hrs`, 'Avg Hours/Day'];
            }}
          />
          <Legend />
          <Bar dataKey="productivity" name="Productivity %" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sessions" name="Total Sessions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  // Productivity Distribution Chart
  const ProductivityDistributionChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            <Cell fill="#10B981" />
            <Cell fill="#F59E0B" />
            <Cell fill="#EF4444" />
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
            formatter={(value, name, props) => [
              value, 
              props.payload.name
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  // Time of Day Productivity Chart
  const TimeOfDayProductivityChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="hour" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
            formatter={(value) => [`${value}%`, 'Productivity']}
          />
          <Area 
            type="monotone" 
            dataKey="productivity" 
            stroke="#10B981" 
            fill="#10B981" 
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  // Department Radar Chart
  const DepartmentRadarChart = ({ data }) => (
    <div className="h-80 w-full min-h-0 min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="department" />
          <PolarRadiusAxis />
          <Radar 
            name="Productivity" 
            dataKey="productivity" 
            stroke="#8884d8" 
            fill="#8884d8" 
            fillOpacity={0.6} 
          />
          <Radar 
            name="Sessions" 
            dataKey="sessions" 
            stroke="#82ca9d" 
            fill="#82ca9d" 
            fillOpacity={0.6} 
          />
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  // Prepare department data
  const departmentData = [
    { department: 'Engineering', productivity: 85, sessions: 245, avgHours: 6.2 },
    { department: 'Marketing', productivity: 72, sessions: 189, avgHours: 5.1 },
    { department: 'Sales', productivity: 68, sessions: 156, avgHours: 4.8 },
    { department: 'HR', productivity: 91, sessions: 134, avgHours: 7.3 },
    { department: 'Operations', productivity: 79, sessions: 178, avgHours: 5.7 }
  ];

  const productivityDistribution = [
    { name: 'High (>80%)', value: employeeMetrics.filter(e => e.productivityScore >= 80).length },
    { name: 'Medium (60-79%)', value: employeeMetrics.filter(e => e.productivityScore >= 60 && e.productivityScore < 80).length },
    { name: 'Low (<60%)', value: employeeMetrics.filter(e => e.productivityScore < 60).length }
  ];

  const timeOfDayData = [
    { hour: '6 AM', productivity: 15 },
    { hour: '8 AM', productivity: 45 },
    { hour: '10 AM', productivity: 85 },
    { hour: '12 PM', productivity: 65 },
    { hour: '2 PM', productivity: 75 },
    { hour: '4 PM', productivity: 90 },
    { hour: '6 PM', productivity: 55 },
    { hour: '8 PM', productivity: 25 }
  ];

  return (
    <div className="p-6" ref={reportRef}>
      {/* Header with Export Options */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track employee activity, productivity, and system usage
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchAnalyticsData}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Refresh data"
            disabled={isExporting}
          >
            <FiRefreshCw className={isExporting ? 'animate-spin' : ''} />
          </button>
          
          <div className="flex items-center gap-2">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
              disabled={isExporting}
            >
              <option value="csv">CSV Format</option>
              <option value="excel">Excel Format</option>
              <option value="pdf">PDF Report</option>
            </select>
            
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <FiDownload className="mr-2" /> Export {exportFormat.toUpperCase()}
                </>
              )}
            </button>
            
            <button
              onClick={exportAllData}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
              title="Export all data to Excel"
            >
              <FiGrid className="mr-2" /> All Data
            </button>
            
            <button
              onClick={printReport}
              className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
            >
              <FiPrinter className="mr-2" /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          {['day', 'week', 'month', 'year'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                period === p
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <FiCalendar className="text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-800 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto mb-6 border-b border-gray-200 dark:border-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: <FiBarChart2 /> },
          { id: 'employees', label: 'Employee Analytics', icon: <FiUsers /> },
          { id: 'sessions', label: 'Session Details', icon: <FiClock /> },
          { id: 'productivity', label: 'Productivity', icon: <FiTrendingUp /> },
          { id: 'departments', label: 'Departments', icon: <FiActivity /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-3 -mb-px border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-black text-black dark:border-white dark:text-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analyticsData && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                  <FiActivity className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Total Sessions</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                    {analyticsData.totalSessions.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                  <FiUsers className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Active Users</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                    {analyticsData.totalUsers}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
                  <FiClock className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Avg Session</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                    {Math.round(analyticsData.avgSessionDuration)} min
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mr-3">
                  <FiTrendingUp className="text-yellow-600 dark:text-yellow-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Peak Hour</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white mt-1">
                    {analyticsData.peakHours?.length > 0 
                      ? `${analyticsData.peakHours[0]?.hour}:00` 
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Login Trends Chart */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Login Activity ({period})
              </h3>
              <LoginTrendsChart data={analyticsData.chartData} />
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Peak Activity Hours
              </h3>
              <PeakHoursChart data={analyticsData.peakHours} />
            </div>
          </div>

          {/* Top Users Table */}
          <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800 mb-6">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Active Users</h3>
              <button 
                onClick={() => exportToCSV()}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sessions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Avg Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Productivity Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                  {analyticsData.topUsers?.slice(0, 10).map((user, index) => (
                    <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm mr-3">
                            {(user.name || user.userId)?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.name || user.userId}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {user.userId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{user.sessions}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {Math.round(user.avgDuration)} min
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                user.productivityScore >= 80 ? 'bg-green-500' :
                                user.productivityScore >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${user.productivityScore}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${
                            user.productivityScore >= 80 ? 'text-green-600 dark:text-green-400' :
                            user.productivityScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {user.productivityScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Employee Analytics Tab */}
     {/* Employee Analytics Tab */}
{activeTab === 'employees' && employeeMetrics.length > 0 && (
  <div className="space-y-4">
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Productivity Distribution */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          Employee Productivity Distribution
        </h3>
        <ProductivityDistributionChart data={productivityDistribution} />
      </div>

      {/* Department Performance */}
      <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
          Department Performance
        </h3>
        <DepartmentPerformanceChart data={departmentData} />
      </div>
    </div>

    {/* Detailed Employee Login/Logout Tracking Section */}
    <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Employee Login/Logout Tracking ({employeeMetrics.length} employees)
        </h3>
        <div className="flex items-center space-x-2">
          <FiFilter className="text-gray-400" />
          <select className="px-3 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-black text-gray-800 dark:text-white text-sm">
            <option>All Departments</option>
            <option>Engineering</option>
            <option>Marketing</option>
            <option>Sales</option>
            <option>HR</option>
            <option>Operations</option>
          </select>
          <button
            onClick={() => fetchDetailedSessionData()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
            title="Refresh session data"
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>
      
      {/* Tabs for different views */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex">
          <button
            onClick={() => setEmployeeViewMode('summary')}
            className={`px-4 py-3 font-medium text-sm ${
              employeeViewMode === 'summary'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Summary View
          </button>
          <button
            onClick={() => setEmployeeViewMode('detailed')}
            className={`px-4 py-3 font-medium text-sm ${
              employeeViewMode === 'detailed'
                ? 'border-b-2 border-black dark:border-white text-black dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Detailed Session Log
          </button>
        </div>
      </div>

      {/* Employee Metrics Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Department
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Today's Login
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Today's Logout
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Session Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Today's Total Hours
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
            {employeeMetrics.map((employee) => {
              // Calculate today's sessions
              const todaySessions = employee.sessions?.filter(s => 
                new Date(s.loginTime).toDateString() === new Date().toDateString()
              ) || [];
              
              const latestSession = todaySessions[todaySessions.length - 1];
              const totalDurationToday = todaySessions.reduce((sum, session) => 
                sum + (session.duration || 0), 0
              );
              
              const isCurrentlyOnline = latestSession && !latestSession.logoutTime;
              
              return (
                <tr key={employee.userId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm mr-3">
                        {employee.employeeName?.charAt(0) || 'E'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {employee.employeeName || employee.userId}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {employee.userId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span 
                      className="px-2 py-1 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: `${DEPARTMENT_COLORS[employee.department]}20`,
                        color: DEPARTMENT_COLORS[employee.department]
                      }}
                    >
                      {employee.department || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {latestSession?.loginTime 
                        ? new Date(latestSession.loginTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        : 'Not logged in'
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {latestSession?.loginTime 
                        ? new Date(latestSession.loginTime).toLocaleDateString()
                        : ''
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {latestSession?.logoutTime 
                        ? new Date(latestSession.logoutTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: true 
                          })
                        : isCurrentlyOnline ? 'Currently online' : 'No session'
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {latestSession?.logoutTime 
                        ? new Date(latestSession.logoutTime).toLocaleDateString()
                        : ''
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {latestSession?.duration 
                        ? `${Math.floor(latestSession.duration / 60)}h ${latestSession.duration % 60}m`
                        : isCurrentlyOnline ? 'Active' : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {totalDurationToday > 0 
                        ? `${(totalDurationToday / 60).toFixed(1)} hours`
                        : '0 hours'
                      }
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        isCurrentlyOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      <span className={`text-xs font-medium ${
                        isCurrentlyOnline ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                      }`}>
                        {isCurrentlyOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => viewEmployeeSessions(employee)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      title="View session history"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}
      {/* Productivity Tab */}
      {activeTab === 'productivity' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time of Day Productivity */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Productivity by Time of Day
              </h3>
              <TimeOfDayProductivityChart data={timeOfDayData} />
            </div>

            {/* Department Radar Chart */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
                Department Comparison
              </h3>
              <DepartmentRadarChart data={departmentData} />
            </div>
          </div>

          {/* Productivity Insights */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Productivity Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Peak Productivity</h4>
                <p>Most productive hours are between 10 AM - 12 PM and 2 PM - 4 PM</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Department Performance</h4>
                <p>HR department shows highest productivity (91%) with longest average sessions</p>
              </div>
              <div className="bg-white/20 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Recommendations</h4>
                <p>Schedule important meetings during peak productivity hours for better outcomes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Stats */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Department Statistics
              </h3>
              <div className="space-y-3">
                {departmentData.map((dept, index) => (
                  <div key={dept.department} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: DEPARTMENT_COLORS[dept.department] }}
                      ></div>
                      <span className="font-medium text-gray-800 dark:text-white">{dept.department}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{dept.sessions} sessions</div>
                      <div className="text-lg font-bold" style={{ color: DEPARTMENT_COLORS[dept.department] }}>
                        {dept.productivity}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Comparison */}
            <div className="bg-white dark:bg-black rounded-xl shadow p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                Department Comparison
              </h3>
              <div className="space-y-4">
                {departmentData.map((dept, index) => (
                  <div key={dept.department} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{dept.department}</span>
                      <span className="font-medium">{dept.productivity}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full"
                        style={{ 
                          width: `${dept.productivity}%`,
                          backgroundColor: DEPARTMENT_COLORS[dept.department]
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Details Tab */}
      {activeTab === 'sessions' && analyticsData && analyticsData.recentSessions && (
        <div className="bg-white dark:bg-black rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-800">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Recent Sessions ({analyticsData.recentSessions.length})
            </h3>
            <button 
              onClick={() => exportToCSV()}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Login Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Logout Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
                {analyticsData.recentSessions.map((session, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.userId || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(session.loginTime).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {session.logoutTime 
                        ? new Date(session.logoutTime).toLocaleString()
                        : 'Still Active'
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {session.duration ? `${Math.round(session.duration)} min` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {session.device ? 
                          session.device.substring(0, 50) + (session.device.length > 50 ? '...' : '')
                          : 'Unknown'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {session.ip || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Summary */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium text-gray-800 dark:text-white mb-2">Export Options Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center">
            <FiFileText className="text-blue-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">CSV: Best for spreadsheet analysis</span>
          </div>
          <div className="flex items-center">
            <FiGrid className="text-green-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">Excel: Multiple sheets with formatting</span>
          </div>
          <div className="flex items-center">
            <FiFile className="text-red-500 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">PDF: Printable reports with charts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;