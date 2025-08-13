import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
import { NotificationBell } from './ui/notification-bell';
import { useWebSocket } from '../utils/websocket';
import { useNotifications } from '../contexts/NotificationContext';
import { getAuthHeaders, logout } from '../utils/auth';
import axios from 'axios';
import {
  Users, ClipboardList, TrendingUp, Clock, CheckCircle2,
  AlertCircle, MapPin, Camera, Calendar, Filter, Search,
  MoreVertical, Plus, UserCheck, BarChart3,
  Settings, Download, Upload, RefreshCw, User,
  List, CalendarDays, Layout, Building2, Navigation
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ManagerDashboard = () => {
  // State management
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [operators, setOperators] = useState([]);
  const [services, setServices] = useState([]);
  const [performance, setPerformance] = useState({});
  const [monitoringAssets, setMonitoringAssets] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('tasks'); // Default to monitoring tab
  const [monitoringViewMode, setMonitoringViewMode] = useState('list'); // list, calendar, board
  const [selectedTasks, setSelectedTasks] = useState([]); // Will be used for selected assets
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [assetAssignments, setAssetAssignments] = useState(() => {
    // Load assignments from localStorage on initialization
    const saved = localStorage.getItem('managerAssetAssignments');
    return saved ? JSON.parse(saved) : {};
  });
  const [operatorDetailsDialog, setOperatorDetailsDialog] = useState(false);
  const [selectedOperatorDetails, setSelectedOperatorDetails] = useState(null);
  
  // Calendar view filters
  const [calendarAssigneeFilter, setCalendarAssigneeFilter] = useState('all');
  const [calendarAreaFilter, setCalendarAreaFilter] = useState('all');
  
  // Date details dialog
  const [dateDetailsDialog, setDateDetailsDialog] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState(null);
  
  // Asset details dialog
  const [assetDetailsDialog, setAssetDetailsDialog] = useState(false);
  const [selectedAssetDetails, setSelectedAssetDetails] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Notifications
  const { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning } = useNotifications();
  const notify = { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning };
  
  // WebSocket Integration
  const {
    isConnected,
    notifications,
    markNotificationAsRead,
    clearAllNotifications
  } = useWebSocket();

  // Data fetching
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle operator assignment to monitoring assets
  const handleAssigneeChange = (assetId, operatorId) => {
    if (operatorId === 'unassigned') {
      setAssetAssignments(prev => {
        const updated = {
          ...prev,
          [assetId]: 'Unassigned'
        };
        // Save to localStorage
        localStorage.setItem('managerAssetAssignments', JSON.stringify(updated));
        return updated;
      });
    } else {
      const operator = operators.find(op => op.id === operatorId);
      setAssetAssignments(prev => {
        const updated = {
          ...prev,
          [assetId]: operator ? operator.contact_name : 'Unassigned'
        };
        // Save to localStorage
        localStorage.setItem('managerAssetAssignments', JSON.stringify(updated));
        return updated;
      });
    }
    
    // Here you could also make an API call to persist the assignment
    // Example: axios.post(`${API}/api/monitoring/assets/${assetId}/assign`, { operator_id: operatorId })
  };

  // Fetch monitoring assets with subscription data
  const fetchMonitoringAssets = async () => {
    try {
      const headers = getAuthHeaders();
      
      // Get all monitoring services
      const servicesRes = await axios.get(`${API}/api/monitoring/services`, { headers });
      const monitoringServices = servicesRes.data?.services || [];
      
      // Get all assets to map asset details
      const assetsRes = await axios.get(`${API}/api/assets/public`, { headers });
      const allAssets = assetsRes.data || [];
      
      // Create monitoring assets data by combining services with asset details
      const monitoringAssetsData = [];
      const assetServiceMap = new Map(); // To track assets and their services
      
      monitoringServices.forEach(service => {
        if (service.asset_ids && Array.isArray(service.asset_ids)) {
          service.asset_ids.forEach(assetId => {
            const assetDetails = allAssets.find(asset => asset.id === assetId);
            if (assetDetails) {
              // Check if this asset already exists in our map
              const assetKey = assetId;
              if (assetServiceMap.has(assetKey)) {
                // Asset already exists, update with higher service level if premium
                const existingAsset = assetServiceMap.get(assetKey);
                if (service.service_level === 'premium' && existingAsset.serviceLevel === 'standard') {
                  existingAsset.serviceLevel = 'premium';
                  existingAsset.serviceId = service.id;
                  existingAsset.subscription = service;
                  existingAsset.frequency = service.frequency || 'monthly';
                  existingAsset.expiryDate = service.end_date ? new Date(service.end_date).toLocaleDateString() : 'N/A';
                  existingAsset.lastUpdateDate = service.updated_at ? new Date(service.updated_at).toLocaleDateString() : 'N/A';
                  existingAsset.nextInspectionDate = calculateNextInspectionDate(service);
                  existingAsset.startDate = service.start_date;
                }
              } else {
                // New asset, add to map
                const assetData = {
                  id: `${service.id}_${assetId}`,
                  serviceId: service.id,
                  assetId: assetId,
                  assetName: assetDetails.name || 'Unknown Asset',
                  address: assetDetails.address || 'N/A',
                  area: assetDetails.area || assetDetails.location?.area || 'N/A',
                  serviceLevel: service.service_level || 'standard',
                  frequency: service.frequency || 'monthly',
                  expiryDate: service.end_date ? new Date(service.end_date).toLocaleDateString() : 'N/A',
                  lastUpdateDate: service.updated_at ? new Date(service.updated_at).toLocaleDateString() : 'N/A',
                  assignee: assetAssignments[`${service.id}_${assetId}`] || 'Unassigned',
                  nextInspectionDate: calculateNextInspectionDate(service),
                  status: 'active',
                  startDate: service.start_date,
                  subscription: service
                };
                assetServiceMap.set(assetKey, assetData);
              }
            }
          });
        }
      });
      
      // Convert map to array
      monitoringAssetsData.push(...Array.from(assetServiceMap.values()));
      
      setMonitoringAssets(monitoringAssetsData);
    } catch (error) {
      console.error('Error fetching monitoring assets:', error);
      setMonitoringAssets([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const [tasksRes, operatorsRes, servicesRes, performanceRes] = await Promise.all([
        axios.get(`${API}/api/monitoring/tasks`, { headers }).catch(() => ({ data: { tasks: [] } })),
        axios.get(`${API}/api/users?role=monitoring_operator`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/api/monitoring/services`, { headers }).catch(() => ({ data: { services: [] } })),
        axios.get(`${API}/api/monitoring/performance`, { headers }).catch(() => ({ data: {} }))
      ]);
      
      setTasks(tasksRes.data?.tasks || []);
      setOperators(operatorsRes.data || []);
      setServices(servicesRes.data?.services || []);
      setPerformance(performanceRes.data || {});
      
      // Fetch monitoring assets data
      await fetchMonitoringAssets();
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      notify.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Assign assets to operator
  const assignTasksToOperator = async () => {
    if (!selectedOperator || selectedTasks.length === 0) {
      notify.error('Please select an operator and at least one asset');
      return;
    }

    try {
      // Update assignments locally
      selectedTasks.forEach(assetId => {
        handleAssigneeChange(assetId, selectedOperator);
      });

      notify.success(`Successfully assigned ${selectedTasks.length} assets to operator!`);
      setSelectedTasks([]);
      setSelectedOperator('');
      setTaskPriority('medium');
      setSpecialInstructions('');
      setAssignmentDialog(false);
      
    } catch (error) {
      console.error('Error assigning assets:', error);
      notify.error('Failed to assign assets');
    }
  };

  // Handle operator row click to show assigned assets
  const handleOperatorClick = (operator) => {
    setSelectedOperatorDetails(operator);
    setOperatorDetailsDialog(true);
  };

  // Get assigned assets for an operator
  const getAssignedAssetsForOperator = (operatorName) => {
    return monitoringAssets.filter(asset => 
      assetAssignments[asset.id] === operatorName
    );
  };

  // Calendar helper functions
  const getCurrentMonth = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      monthName: now.toLocaleString('default', { month: 'long' }),
      today: now.getDate()
    };
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Calculate recurring inspection dates based on frequency
  const getRecurringDates = (asset, currentMonth, currentYear) => {
    const dates = [];
    const startDate = new Date(asset.startDate);
    const frequency = asset.frequency?.toLowerCase() || 'monthly';
    
    let intervalDays;
    switch (frequency) {
      case 'daily': intervalDays = 1; break;
      case 'weekly': intervalDays = 7; break;
      case 'bi_weekly':
      case 'bi-weekly': intervalDays = 14; break;
      case 'monthly': intervalDays = 30; break;
      default: intervalDays = 30;
    }

    // Generate dates for the current month
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    
    let currentDate = new Date(startDate);
    while (currentDate <= monthEnd) {
      if (currentDate >= monthStart && currentDate <= monthEnd) {
        dates.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + intervalDays);
    }
    
    return dates;
  };

  // Get assets for a specific date
  const getAssetsForDate = (date, currentMonth, currentYear) => {
    const targetDate = new Date(currentYear, currentMonth, date);
    const assetsForDate = [];

    monitoringAssets.forEach(asset => {
      const assignedOperator = assetAssignments[asset.id];
      if (!assignedOperator || assignedOperator === 'Unassigned') return;

      // Apply filters
      if (calendarAssigneeFilter !== 'all' && assignedOperator !== calendarAssigneeFilter) return;
      if (calendarAreaFilter !== 'all' && asset.area !== calendarAreaFilter) return;

      const recurringDates = getRecurringDates(asset, currentMonth, currentYear);
      const hasInspectionOnDate = recurringDates.some(recurDate => 
        recurDate.getDate() === date
      );

      if (hasInspectionOnDate) {
        assetsForDate.push({
          ...asset,
          assignedOperator
        });
      }
    });

    return assetsForDate;
  };

  // Get operator colors (consistent colors for each operator)
  const getOperatorColor = (operatorName) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200', 
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200'
    ];
    
    let hash = 0;
    for (let i = 0; i < operatorName.length; i++) {
      const char = operatorName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle calendar date click
  const handleDateClick = (date, month, year) => {
    const assetsForDate = getAssetsForDate(date, month, year);
    setSelectedDateDetails({
      date,
      month,
      year,
      formattedDate: new Date(year, month, date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric'
      }),
      assets: assetsForDate
    });
    setDateDetailsDialog(true);
  };

  // Handle asset row click to show asset details
  const handleAssetClick = (asset) => {
    setSelectedAssetDetails(asset);
    setAssetDetailsDialog(true);
  };

  // Generate tasks
  const generateTasks = async () => {
    try {
      const headers = getAuthHeaders();
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.post(`${API}/api/monitoring/generate-tasks`, {
        date: today
      }, { headers });
      
      notify.success(response.data.message);
      fetchDashboardData();
    } catch (error) {
      console.error('Error generating tasks:', error);
      notify.error('Failed to generate tasks');
    }
  };

  // Helper function to calculate next inspection date based on frequency
  const calculateNextInspectionDate = (subscription) => {
    if (!subscription || !subscription.start_date) {
      return 'N/A';
    }

    const startDate = new Date(subscription.start_date);
    const frequency = subscription.frequency?.toLowerCase() || 'monthly';
    
    let nextInspectionDate = new Date(startDate);
    
    switch (frequency) {
      case 'daily':
        nextInspectionDate.setDate(startDate.getDate() + 1);
        break;
      case 'weekly':
        nextInspectionDate.setDate(startDate.getDate() + 7);
        break;
      case 'bi_weekly':
      case 'bi-weekly':
        nextInspectionDate.setDate(startDate.getDate() + 14);
        break;
      case 'monthly':
      default:
        nextInspectionDate.setMonth(startDate.getMonth() + 1);
        break;
    }
    
    return nextInspectionDate.toLocaleDateString();
  };

  // Stats calculation
  const calculateStats = () => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeOperators = Array.isArray(operators) ? operators : [];
    
    const totalTasks = safeTasks.length;
    const completedTasks = safeTasks.filter(t => t.status === 'completed').length;
    const activeTasks = safeTasks.filter(t => ['assigned', 'in_progress'].includes(t.status)).length;
    const overdueTasks = safeTasks.filter(t => t.status === 'overdue').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeOperators = safeOperators.filter(op => safeTasks.some(t => t.assigned_operator_id === op.id && ['assigned', 'in_progress'].includes(t.status))).length;
    
    return {
      totalTasks,
      completedTasks,
      activeTasks,
      overdueTasks,
      completionRate,
      activeOperators,
      totalOperators: safeOperators.length,
      averageTime: 45 // Could be calculated from performance data
    };
  };

  // Filter tasks
  const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesOperator = operatorFilter === 'all' || task.assigned_operator_id === operatorFilter;
    const matchesSearch = !searchTerm || 
      task.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesOperator && matchesSearch;
  });

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Manager Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Match Admin Dashboard Style */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png" 
                alt="BeatSpace Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
                <p className="text-xs text-gray-500">Monitoring Operations Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={(Array.isArray(notifications) ? notifications : []).filter(n => !n.read).length}
                onMarkAsRead={markNotificationAsRead}
                onClearAll={clearAllNotifications}
                isConnected={isConnected}
                className="relative"
              />
              <Button 
                onClick={fetchDashboardData} 
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="ghost"
                onClick={logout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Statistics Cards - Match Admin Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalTasks}</dd>
                    <dd className="text-xs text-gray-500">{stats.activeTasks} active, {stats.completedTasks} completed</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.completionRate}%</dd>
                    <dd className="text-xs text-gray-500">Platform activity</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCheck className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Operators</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeOperators}</dd>
                    <dd className="text-xs text-gray-500">of {stats.totalOperators} total</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Completion Time</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.averageTime}min</dd>
                    <dd className="text-xs text-gray-500">Per task average</dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tasks">Monitoring</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Monitoring Assets Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Asset Monitoring Management
                  </CardTitle>
                  <Button variant="outline" onClick={() => setAssignmentDialog(true)} className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Bulk Assign Tasks</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* View Mode Selector */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search assets..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                    <Button
                      variant={monitoringViewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMonitoringViewMode('list')}
                      className="flex items-center space-x-2"
                    >
                      <List className="w-4 h-4" />
                      <span>List</span>
                    </Button>
                    <Button
                      variant={monitoringViewMode === 'calendar' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMonitoringViewMode('calendar')}
                      className="flex items-center space-x-2"
                    >
                      <CalendarDays className="w-4 h-4" />
                      <span>Calendar</span>
                    </Button>
                    <Button
                      variant={monitoringViewMode === 'board' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMonitoringViewMode('board')}
                      className="flex items-center space-x-2"
                    >
                      <Layout className="w-4 h-4" />
                      <span>Board</span>
                    </Button>
                  </div>
                </div>

                {/* List View */}
                {monitoringViewMode === 'list' && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Service Level</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Last Update</TableHead>
                          <TableHead>Assignee</TableHead>
                          <TableHead>Next Inspection</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monitoringAssets.map((asset) => (
                          <TableRow 
                            key={asset.id} 
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleAssetClick(asset)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span>{asset.assetName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate" title={asset.address}>
                                {asset.address}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{asset.area}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={asset.serviceLevel === 'premium' ? 'default' : 'outline'}>
                                {asset.serviceLevel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="capitalize">{asset.frequency}</span>
                              </div>
                            </TableCell>
                            <TableCell>{asset.expiryDate}</TableCell>
                            <TableCell>{asset.lastUpdateDate}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Select 
                                value={(() => {
                                  const assignedName = assetAssignments[asset.id];
                                  if (!assignedName || assignedName === 'Unassigned') {
                                    return 'unassigned';
                                  }
                                  const operator = operators.find(op => op.contact_name === assignedName);
                                  return operator ? operator.id : 'unassigned';
                                })()}
                                onValueChange={(operatorId) => handleAssigneeChange(asset.id, operatorId)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue>
                                    <div className="flex items-center space-x-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span>
                                        {assetAssignments[asset.id] && assetAssignments[asset.id] !== 'Unassigned' 
                                          ? assetAssignments[asset.id]
                                          : 'Unassigned'
                                        }
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">
                                    <div className="flex items-center space-x-2">
                                      <User className="w-4 h-4 text-gray-400" />
                                      <span>Unassigned</span>
                                    </div>
                                  </SelectItem>
                                  {operators.map(operator => (
                                    <SelectItem key={operator.id} value={operator.id}>
                                      <div className="flex items-center space-x-2">
                                        <User className="w-4 h-4 text-blue-600" />
                                        <span>{operator.contact_name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-green-600" />
                                <span className="text-green-600 font-medium">{asset.nextInspectionDate}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {monitoringAssets.length === 0 && (
                      <div className="text-center py-8">
                        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Monitoring Assets</h3>
                        <p className="text-gray-500">No assets are currently subscribed to monitoring services.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Calendar View */}
                {monitoringViewMode === 'calendar' && (
                  <div className="space-y-4">
                    {/* Calendar Filters */}
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Filter by Assignee:</span>
                        <Select value={calendarAssigneeFilter} onValueChange={setCalendarAssigneeFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Assignees</SelectItem>
                            {[...new Set(Object.values(assetAssignments).filter(name => name !== 'Unassigned'))].map(assignee => (
                              <SelectItem key={assignee} value={assignee}>
                                {assignee}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Filter by Area:</span>
                        <Select value={calendarAreaFilter} onValueChange={setCalendarAreaFilter}>
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Areas</SelectItem>
                            {[...new Set(monitoringAssets.map(asset => asset.area).filter(Boolean))].map(area => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="bg-white border rounded-lg">
                      {(() => {
                        const { year, month, monthName, today } = getCurrentMonth();
                        const daysInMonth = getDaysInMonth(year, month);
                        const firstDay = getFirstDayOfMonth(year, month);
                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                        
                        return (
                          <div>
                            {/* Calendar Header */}
                            <div className="p-4 border-b bg-gray-50">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">{monthName} {year}</h3>
                                <div className="text-sm text-gray-500">
                                  Monitoring Schedule Calendar
                                </div>
                              </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="p-4">
                              {/* Day Headers */}
                              <div className="grid grid-cols-7 gap-2 mb-2">
                                {days.map(day => (
                                  <div key={day} className="p-2 text-center font-medium text-gray-600 text-sm">
                                    {day}
                                  </div>
                                ))}
                              </div>

                              {/* Calendar Days */}
                              <div className="grid grid-cols-7 gap-2">
                                {/* Empty cells for days before month starts */}
                                {Array.from({ length: firstDay }, (_, i) => (
                                  <div key={`empty-${i}`} className="h-24 p-1 border border-gray-100"></div>
                                ))}
                                
                                {/* Month days */}
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                  const date = i + 1;
                                  const assetsForDate = getAssetsForDate(date, month, year);
                                  const isToday = date === today;
                                  
                                  return (
                                    <div 
                                      key={date} 
                                      className={`h-24 p-1 border border-gray-200 cursor-pointer ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                                      onClick={() => handleDateClick(date, month, year)}
                                    >
                                      <div className="h-full flex flex-col">
                                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                                          {date}
                                        </div>
                                        
                                        <div className="flex-1 space-y-1 overflow-y-auto">
                                          {assetsForDate.slice(0, 3).map((asset, index) => {
                                            const operatorColor = getOperatorColor(asset.assignedOperator);
                                            return (
                                              <div 
                                                key={`${asset.id}-${index}`}
                                                className={`px-1 py-0.5 rounded text-xs border ${operatorColor} truncate`}
                                                title={`${asset.assetName} - ${asset.assignedOperator} - ${asset.area}`}
                                              >
                                                <div className="font-medium truncate">
                                                  {asset.assetName}
                                                </div>
                                                <div className="text-xs opacity-75 truncate">
                                                  {asset.assignedOperator} • {asset.area}
                                                </div>
                                              </div>
                                            );
                                          })}
                                          
                                          {assetsForDate.length > 3 && (
                                            <div className="text-xs text-gray-500 px-1">
                                              +{assetsForDate.length - 3} more
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Board View */}
                {monitoringViewMode === 'board' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Active Column */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="font-medium text-green-800">Active</h3>
                        <Badge variant="secondary" className="ml-auto">
                          {monitoringAssets.filter(a => a.status === 'active').length}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {monitoringAssets.filter(a => a.status === 'active').map(asset => (
                          <Card key={asset.id} className="p-3 bg-white border-green-200">
                            <div className="font-medium text-sm mb-1">{asset.assetName}</div>
                            <div className="text-xs text-gray-500 mb-2">{asset.area}</div>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">{asset.frequency}</Badge>
                              <span className="text-xs text-green-600">{asset.nextInspectionDate}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Pending Column */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <h3 className="font-medium text-yellow-800">Pending</h3>
                        <Badge variant="secondary" className="ml-auto">0</Badge>
                      </div>
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-yellow-300 mx-auto mb-2" />
                        <p className="text-sm text-yellow-600">No pending inspections</p>
                      </div>
                    </div>

                    {/* In Progress Column */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="font-medium text-blue-800">In Progress</h3>
                        <Badge variant="secondary" className="ml-auto">0</Badge>
                      </div>
                      <div className="text-center py-8">
                        <Navigation className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                        <p className="text-sm text-blue-600">No inspections in progress</p>
                      </div>
                    </div>

                    {/* Completed Column */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <h3 className="font-medium text-gray-800">Completed</h3>
                        <Badge variant="secondary" className="ml-auto">0</Badge>
                      </div>
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No completed inspections</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Operators Tab */}
          <TabsContent value="operators" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Operator Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned Tasks</TableHead>
                      <TableHead>Completed Today</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(operators) ? operators : []).map((operator) => {
                      // Calculate assigned assets for this operator
                      const assignedAssets = Object.values(assetAssignments).filter(
                        assigneeName => assigneeName === operator.contact_name
                      ).length;
                      
                      return (
                        <TableRow 
                          key={operator.id} 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleOperatorClick(operator)}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="font-medium">{operator.contact_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={assignedAssets > 0 ? 'default' : 'secondary'}>
                              {assignedAssets > 0 ? 'Active' : 'Available'}
                            </Badge>
                          </TableCell>
                          <TableCell>{assignedAssets}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">0</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Progress value={85} className="w-16 mr-2" />
                              <span className="text-sm">85%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {operator.last_login ? new Date(operator.last_login).toLocaleString() : 'Never'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Task Completion Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">This Week</span>
                      <span className="font-medium">89% completion rate</span>
                    </div>
                    <Progress value={89} />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Last Week</span>
                      <span className="font-medium">76% completion rate</span>
                    </div>
                    <Progress value={76} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Response Time</span>
                      <span className="font-medium">2.3 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tasks Completed on Time</span>
                      <span className="font-medium">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Photo Quality Score</span>
                      <span className="font-medium">8.7/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Customer Satisfaction</span>
                      <span className="font-medium">4.8/5.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Asset Assignment Dialog */}
        <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Assign Assets to Operator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Assets</label>
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {monitoringAssets
                    .filter(asset => !assetAssignments[asset.id] || assetAssignments[asset.id] === 'Unassigned')
                    .map((asset) => (
                    <div key={asset.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                      <Checkbox
                        checked={selectedTasks.includes(asset.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTasks([...selectedTasks, asset.id]);
                          } else {
                            setSelectedTasks(selectedTasks.filter(id => id !== asset.id));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{asset.assetName}</div>
                        <div className="text-xs text-gray-500">{asset.area} • {asset.serviceLevel}</div>
                      </div>
                    </div>
                  ))}
                  {monitoringAssets.filter(asset => !assetAssignments[asset.id] || assetAssignments[asset.id] === 'Unassigned').length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No unassigned monitoring assets available
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Operator</label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(operator => (
                      <SelectItem key={operator.id} value={operator.id}>
                        {operator.contact_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Special Instructions</label>
                <Input
                  placeholder="Any special instructions..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setAssignmentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={assignTasksToOperator}
                  disabled={selectedTasks.length === 0 || !selectedOperator}
                >
                  Assign {selectedTasks.length} Asset{selectedTasks.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Operator Details Dialog */}
        <Dialog open={operatorDetailsDialog} onOpenChange={setOperatorDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{selectedOperatorDetails?.contact_name}</div>
                  <div className="text-sm text-gray-500">Monitoring Operator</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedOperatorDetails && (
                <>
                  {/* Operator Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {getAssignedAssetsForOperator(selectedOperatorDetails.contact_name).length}
                          </div>
                          <div className="text-sm text-gray-500">Assigned Assets</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">0</div>
                          <div className="text-sm text-gray-500">Completed Today</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">85%</div>
                          <div className="text-sm text-gray-500">Performance</div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Assigned Assets List */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Building2 className="w-5 h-5 mr-2" />
                      Assigned Assets ({getAssignedAssetsForOperator(selectedOperatorDetails.contact_name).length})
                    </h3>
                    
                    {getAssignedAssetsForOperator(selectedOperatorDetails.contact_name).length === 0 ? (
                      <Card className="p-8 text-center">
                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Assets Assigned</h4>
                        <p className="text-gray-500">This operator has no monitoring assets assigned yet.</p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getAssignedAssetsForOperator(selectedOperatorDetails.contact_name).map((asset) => (
                          <Card key={asset.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-lg">{asset.assetName}</h4>
                                  <p className="text-sm text-gray-600">{asset.address}</p>
                                </div>
                                <Badge variant={asset.serviceLevel === 'premium' ? 'default' : 'outline'}>
                                  {asset.serviceLevel}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-500">Area:</span>
                                  <div className="font-medium">{asset.area}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Frequency:</span>
                                  <div className="font-medium capitalize">{asset.frequency}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Next Inspection:</span>
                                  <div className="font-medium text-green-600">{asset.nextInspectionDate}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Expiry:</span>
                                  <div className="font-medium">{asset.expiryDate}</div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">Location</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-600">Due: {asset.nextInspectionDate}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setOperatorDetailsDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Date Details Dialog */}
        <Dialog open={dateDetailsDialog} onOpenChange={setDateDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {selectedDateDetails?.formattedDate}
                  </div>
                  <div className="text-sm text-gray-500">
                    Scheduled Monitoring Inspections
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedDateDetails && (
                <>
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {selectedDateDetails.assets.length}
                          </div>
                          <div className="text-sm text-gray-500">Total Assets</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {[...new Set(selectedDateDetails.assets.map(a => a.assignedOperator))].length}
                          </div>
                          <div className="text-sm text-gray-500">Operators</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {[...new Set(selectedDateDetails.assets.map(a => a.area))].length}
                          </div>
                          <div className="text-sm text-gray-500">Areas</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold">
                            {selectedDateDetails.assets.filter(a => a.serviceLevel === 'premium').length}
                          </div>
                          <div className="text-sm text-gray-500">Premium</div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Assets by Operator */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Assets by Operator
                    </h3>
                    
                    {selectedDateDetails.assets.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Inspections Scheduled</h4>
                        <p className="text-gray-500">No monitoring inspections are scheduled for this date.</p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(
                          selectedDateDetails.assets.reduce((acc, asset) => {
                            if (!acc[asset.assignedOperator]) {
                              acc[asset.assignedOperator] = [];
                            }
                            acc[asset.assignedOperator].push(asset);
                            return acc;
                          }, {})
                        ).map(([operatorName, assets]) => {
                          const operatorColor = getOperatorColor(operatorName);
                          return (
                            <Card key={operatorName} className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <User className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-lg">{operatorName}</div>
                                      <div className="text-sm text-gray-500">
                                        {assets.length} asset{assets.length !== 1 ? 's' : ''} assigned
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`px-3 py-1 rounded-full text-sm font-medium border ${operatorColor}`}>
                                    {operatorName}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {assets.map((asset) => (
                                    <div key={asset.id} className="border rounded-lg p-3 bg-gray-50">
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                          <div>
                                            <h4 className="font-semibold">{asset.assetName}</h4>
                                            <p className="text-sm text-gray-600 truncate">{asset.address}</p>
                                          </div>
                                          <Badge variant={asset.serviceLevel === 'premium' ? 'default' : 'outline'} className="text-xs">
                                            {asset.serviceLevel}
                                          </Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                          <div>
                                            <span className="text-gray-500">Area:</span>
                                            <div className="font-medium">{asset.area}</div>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Frequency:</span>
                                            <div className="font-medium capitalize">{asset.frequency}</div>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Next Due:</span>
                                            <div className="font-medium text-green-600">{asset.nextInspectionDate}</div>
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Expires:</span>
                                            <div className="font-medium">{asset.expiryDate}</div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-2 border-t">
                                          <div className="flex items-center space-x-1">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            <span className="text-xs text-gray-600">{asset.area}</span>
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Clock className="w-3 h-3 text-blue-600" />
                                            <span className="text-xs text-blue-600 capitalize">{asset.frequency}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setDateDetailsDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Asset Details Dialog */}
        <Dialog open={assetDetailsDialog} onOpenChange={setAssetDetailsDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-semibold">{selectedAssetDetails?.assetName}</div>
                  <div className="text-sm text-gray-500">Asset Monitoring Details</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {selectedAssetDetails && (
                <>
                  {/* Asset Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Service Level</div>
                          <div className="font-semibold capitalize">{selectedAssetDetails.serviceLevel}</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Clock className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Frequency</div>
                          <div className="font-semibold capitalize">{selectedAssetDetails.frequency}</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Area</div>
                          <div className="font-semibold">{selectedAssetDetails.area}</div>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Assignee</div>
                          <div className="font-semibold">{selectedAssetDetails.assignee}</div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Main Content Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Asset Information */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <Building2 className="w-5 h-5 mr-2" />
                            Asset Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Asset Name</label>
                              <div className="font-semibold text-lg">{selectedAssetDetails.assetName}</div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium text-gray-500">Address</label>
                              <div className="text-gray-700">{selectedAssetDetails.address}</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Area</label>
                                <Badge variant="secondary" className="mt-1">
                                  {selectedAssetDetails.area}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Service Level</label>
                                <Badge 
                                  variant={selectedAssetDetails.serviceLevel === 'premium' ? 'default' : 'outline'}
                                  className="mt-1"
                                >
                                  {selectedAssetDetails.serviceLevel}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Monitoring Schedule */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <Calendar className="w-5 h-5 mr-2" />
                            Monitoring Schedule
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Frequency</label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span className="font-semibold capitalize">{selectedAssetDetails.frequency}</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Next Inspection</label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Calendar className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold text-green-600">{selectedAssetDetails.nextInspectionDate}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Last Update</label>
                                <div className="font-medium">{selectedAssetDetails.lastUpdateDate}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-500">Subscription Expires</label>
                                <div className="font-medium">{selectedAssetDetails.expiryDate}</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Assignment Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <User className="w-5 h-5 mr-2" />
                            Assignment Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Assigned Operator</label>
                              <div className="flex items-center space-x-2 mt-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getOperatorColor(selectedAssetDetails.assignee)}`}>
                                  <User className="w-3 h-3" />
                                </div>
                                <span className="font-semibold">{selectedAssetDetails.assignee}</span>
                              </div>
                            </div>
                            {selectedAssetDetails.assignee !== 'Unassigned' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const operator = operators.find(op => op.contact_name === selectedAssetDetails.assignee);
                                  if (operator) {
                                    setSelectedOperatorDetails(operator);
                                    setAssetDetailsDialog(false);
                                    setOperatorDetailsDialog(true);
                                  }
                                }}
                              >
                                View Operator Details
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Map View */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <MapPin className="w-5 h-5 mr-2" />
                            Asset Location
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Google Maps Embed */}
                            <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                              {selectedAssetDetails.subscription?.asset_ids && process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
                                // First check if we have lat/lng coordinates from the asset location
                                (() => {
                                  // Try to get the actual asset data with location
                                  const fullAssetData = monitoringAssets.find(a => a.id === selectedAssetDetails.id);
                                  if (fullAssetData && fullAssetData.subscription) {
                                    // Get the actual asset from the assets API to get location data
                                    return (
                                      <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(selectedAssetDetails.address)}&zoom=15`}
                                        allowFullScreen
                                        loading="lazy"
                                        title="Asset Location Map"
                                      />
                                    );
                                  } else {
                                    return (
                                      <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0 }}
                                        src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(selectedAssetDetails.address)}&zoom=15`}
                                        allowFullScreen
                                        loading="lazy"
                                        title="Asset Location Map"
                                      />
                                    );
                                  }
                                })()
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center">
                                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">Map view not available</p>
                                    <p className="text-xs text-gray-400">Google Maps API key not configured</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Location Details */}
                            <div className="space-y-2">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Full Address</label>
                                <div className="text-gray-700 bg-gray-50 p-2 rounded border">
                                  {selectedAssetDetails.address}
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span>Area: {selectedAssetDetails.area}</span>
                                </div>
                                {selectedAssetDetails.address && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedAssetDetails.address)}`, '_blank')}
                                  >
                                    <Navigation className="w-4 h-4 mr-1" />
                                    Open in Maps
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Actions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <Settings className="w-5 h-5 mr-2" />
                            Quick Actions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 gap-3">
                            <Button variant="outline" className="justify-start">
                              <Calendar className="w-4 h-4 mr-2" />
                              View Inspection History
                            </Button>
                            <Button variant="outline" className="justify-start">
                              <Camera className="w-4 h-4 mr-2" />
                              View Latest Photos
                            </Button>
                            <Button variant="outline" className="justify-start">
                              <Download className="w-4 h-4 mr-2" />
                              Download Reports
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setAssetDetailsDialog(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManagerDashboard;