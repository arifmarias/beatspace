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
  const [activeTab, setActiveTab] = useState('overview');
  const [monitoringViewMode, setMonitoringViewMode] = useState('list'); // list, calendar, board
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
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
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      notify.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Task assignment
  const assignTasksToOperator = async () => {
    if (!selectedOperator || selectedTasks.length === 0) {
      notify.error('Please select an operator and at least one task');
      return;
    }

    try {
      const headers = getAuthHeaders();
      await axios.post(`${API}/api/monitoring/tasks/assign`, {
        task_ids: selectedTasks,
        operator_id: selectedOperator,
        priority: taskPriority,
        special_instructions: specialInstructions
      }, { headers });

      notify.success('Tasks assigned successfully!');
      setSelectedTasks([]);
      setSelectedOperator('');
      setTaskPriority('medium');
      setSpecialInstructions('');
      setAssignmentDialog(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      notify.error('Failed to assign tasks');
    }
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={generateTasks}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Today's Tasks
                  </Button>
                  <Button variant="outline" onClick={() => setAssignmentDialog(true)}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Bulk Assign Tasks
                  </Button>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {/* Task Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="w-5 h-5 mr-2" />
                  Task Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search tasks..."
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operators</SelectItem>
                      {operators.map(op => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tasks Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTasks(filteredTasks.map(t => t.id));
                              } else {
                                setSelectedTasks([]);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Asset</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => {
                        const assignedOperator = operators.find(op => op.id === task.assigned_operator_id);
                        return (
                          <TableRow key={task.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTasks.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTasks([...selectedTasks, task.id]);
                                  } else {
                                    setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {task.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>{task.asset_id}</TableCell>
                            <TableCell>
                              <Badge variant={
                                task.status === 'completed' ? 'default' :
                                task.status === 'in_progress' ? 'secondary' :
                                task.status === 'overdue' ? 'destructive' : 'outline'
                              }>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignedOperator ? assignedOperator.contact_name : 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={task.priority === 'high' ? 'destructive' : 'outline'}>
                                {task.priority || 'medium'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {selectedTasks.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-600">
                        {selectedTasks.length} tasks selected
                      </span>
                      <Button onClick={() => setAssignmentDialog(true)} size="sm">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Assign Tasks
                      </Button>
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
                      <TableHead>Active Tasks</TableHead>
                      <TableHead>Completed Today</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(operators) ? operators : []).map((operator) => {
                      const safeTasks = Array.isArray(tasks) ? tasks : [];
                      const operatorTasks = safeTasks.filter(t => t.assigned_operator_id === operator.id);
                      const activeTasks = operatorTasks.filter(t => ['assigned', 'in_progress'].includes(t.status));
                      const completedToday = operatorTasks.filter(t => 
                        t.status === 'completed' && 
                        new Date(t.completed_at || t.updated_at).toDateString() === new Date().toDateString()
                      );
                      
                      return (
                        <TableRow key={operator.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <div className="font-medium">{operator.contact_name}</div>
                                <div className="text-sm text-gray-500">{operator.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={activeTasks.length > 0 ? 'default' : 'secondary'}>
                              {activeTasks.length > 0 ? 'Active' : 'Available'}
                            </Badge>
                          </TableCell>
                          <TableCell>{activeTasks.length}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {completedToday.length}
                            </div>
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

        {/* Task Assignment Dialog */}
        <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Tasks to Operator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <label className="text-sm font-medium mb-2 block">Priority Level</label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
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
                <Button onClick={assignTasksToOperator}>
                  Assign {selectedTasks.length} Tasks
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ManagerDashboard;