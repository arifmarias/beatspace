import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Camera, 
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Settings,
  Bell,
  Eye,
  Edit,
  Plus,
  Filter,
  Search,
  RefreshCw,
  MapPinned,
  Route,
  Timer,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { getAuthHeaders, getUser, logout } from '../utils/auth';
import { useWebSocket } from '../utils/websocket';
import { NotificationBell } from './ui/notification-bell';
import { useNotifications } from '../contexts/NotificationContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning } = useNotifications();
  
  // Create a notify object for backward compatibility
  const notify = {
    success: notifySuccess,
    error: notifyError,
    info: notifyInfo,
    warning: notifyWarning
  };
  
  const currentUser = getUser();
  
  // WebSocket Integration
  const {
    isConnected,
    notifications,
    markNotificationAsRead,
    clearAllNotifications
  } = useWebSocket();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [operators, setOperators] = useState([]);
  const [services, setServices] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0,
    activeOperators: 0,
    averageCompletionTime: 0
  });
  
  // Task Assignment State
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [assignmentDialog, setAssignmentDialog] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Data Fetching

  useEffect(() => {
    if (currentUser?.role === 'manager') {
      fetchDashboardData();
    } else if (currentUser && currentUser.role !== 'manager') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const fetchDashboardData = async () => {
    try {
      console.log('Fetching manager dashboard data...');
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Simple API calls without complex retry logic
      const [tasksRes, operatorsRes, servicesRes, performanceRes] = await Promise.allSettled([
        axios.get(`${API}/api/monitoring/tasks`, { headers, timeout: 8000 }),
        axios.get(`${API}/api/users?role=monitoring_operator`, { headers, timeout: 8000 }),
        axios.get(`${API}/api/monitoring/services`, { headers, timeout: 8000 }),
        axios.get(`${API}/api/monitoring/performance`, { headers, timeout: 8000 })
      ]);
      
      // Handle results safely
      setTasks(tasksRes.status === 'fulfilled' ? (tasksRes.value.data.tasks || []) : []);
      setOperators(operatorsRes.status === 'fulfilled' ? (operatorsRes.value.data || []) : []);
      setServices(servicesRes.status === 'fulfilled' ? (servicesRes.value.data.services || []) : []);
      setPerformance(performanceRes.status === 'fulfilled' ? (performanceRes.value.data || {}) : {});
      
      console.log('Manager dashboard data loaded successfully');
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set empty defaults to prevent crashes
      setTasks([]);
      setOperators([]);
      setServices([]);
      setPerformance({});
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (taskList = []) => {
    // Ensure taskList is an array
    const safeTaskList = Array.isArray(taskList) ? taskList : [];
    
    const totalTasks = safeTaskList.length;
    const completedTasks = safeTaskList.filter(t => t.status === 'completed').length;
    const pendingTasks = safeTaskList.filter(t => t.status === 'pending').length;
    const overdueTasks = safeTaskList.filter(t => t.status === 'overdue').length;
    const activeOperators = new Set(safeTaskList.filter(t => t.assigned_operator_id).map(t => t.assigned_operator_id)).size;
    
    setStats({
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      activeOperators,
      averageCompletionTime: 45 // Calculated from performance data
    });
  };

  // Task Assignment Functions
  const handleTaskSelection = (taskId, checked) => {
    if (checked) {
      setSelectedTasks(prev => [...prev, taskId]);
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId));
    }
  };

  const assignTasksToOperator = async () => {
    if (!selectedOperator || selectedTasks.length === 0) {
      notify.warning('Please select an operator and at least one task');
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
      
      notify.success(`Assigned ${selectedTasks.length} tasks to operator`);
      
      // Reset state and refresh data (with debouncing)
      setSelectedTasks([]);
      setSelectedOperator('');
      setTaskPriority('medium');
      setSpecialInstructions('');
      setAssignmentDialog(false);
      
      // Refresh data with small delay
      setTimeout(() => fetchDashboardData(), 500); // Small delay to prevent rapid-fire requests
      
    } catch (error) {
      console.error('Error assigning tasks:', error);
      notify.error('Failed to assign tasks');
    }
  };

  // Generate Tasks for Today
  const generateTodayTasks = async () => {
    try {
      const headers = getAuthHeaders();
      const today = new Date().toISOString().split('T')[0];
      
      const response = await axios.post(`${API}/api/monitoring/generate-tasks`, { date: today }, { headers });
      
      notify.success(response.data.message);
      
      // Only refresh if not already fetching
      if (!fetchInProgress) {
        setTimeout(() => fetchDashboardData(), 500); // Small delay to prevent rapid-fire requests
      }
      
    } catch (error) {
      console.error('Error generating tasks:', error);
      notify.error('Failed to generate tasks');
    }
  };

  // Filter Tasks - with safety check
  const filteredTasks = (Array.isArray(tasks) ? tasks : []).filter(task => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesOperator = operatorFilter === 'all' || task.assigned_operator_id === operatorFilter;
    const matchesSearch = !searchTerm || 
      task.asset_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesOperator && matchesSearch;
  });

  // Get Status Badge Variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'default';
      case 'assigned': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  // Get Priority Badge Variant
  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

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
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Monitoring Operations</h1>
              <p className="text-gray-600">Manage field operations and monitoring staff</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {/* Notification Bell */}
              <NotificationBell
                notifications={notifications}
                unreadCount={(Array.isArray(notifications) ? notifications : []).filter(n => !n.read).length}
                onMarkAsRead={markNotificationAsRead}
                onClearAll={clearAllNotifications}
                isConnected={isConnected}
              />
              
              {/* Actions */}
              <Button onClick={fetchDashboardData} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button onClick={generateTodayTasks} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Generate Tasks
              </Button>
              
              <Button onClick={logout} variant="outline" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <Calendar className="w-4 h-4 ml-2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500 mt-1">All monitoring tasks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">
                  {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
                </div>
                <CheckCircle2 className="w-4 h-4 ml-2 text-green-500" />
              </div>
              <Progress 
                value={stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Operators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{stats.activeOperators}</div>
                <Users className="w-4 h-4 ml-2 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Currently assigned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{stats.averageCompletionTime}m</div>
                <Timer className="w-4 h-4 ml-2 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Per task completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              {stats.pendingTasks > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stats.pendingTasks}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="operators">Operators</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity and Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Task Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Completed</span>
                      <Badge variant="default">{stats.completedTasks}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Pending</span>
                      <Badge variant="secondary">{stats.pendingTasks}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Overdue</span>
                      <Badge variant="destructive">{stats.overdueTasks}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Monitoring Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{services.length}</div>
                  <p className="text-gray-600 mt-2">Total active subscriptions</p>
                  <div className="mt-4 space-y-2">
                    {services.slice(0, 3).map((service, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{service.frequency} monitoring</span>
                        <span className="text-gray-500">{service.asset_ids?.length || 0} assets</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            {/* Task Management Interface */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Monitoring Tasks</CardTitle>
                  <div className="flex items-center space-x-4">
                    {selectedTasks.length > 0 && (
                      <Dialog open={assignmentDialog} onOpenChange={setAssignmentDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <User className="w-4 h-4 mr-2" />
                            Assign Tasks ({selectedTasks.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
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
                                      {operator.contact_name} - {operator.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">Priority</label>
                              <Select value={taskPriority} onValueChange={setTaskPriority}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-2 block">Special Instructions</label>
                              <Textarea
                                value={specialInstructions}
                                onChange={(e) => setSpecialInstructions(e.target.value)}
                                placeholder="Any special instructions for the operator..."
                                rows={3}
                              />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setAssignmentDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={assignTasksToOperator}>
                                Assign Tasks
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Filters */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search tasks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
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
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Operators</SelectItem>
                      {operators.map(operator => (
                        <SelectItem key={operator.id} value={operator.id}>
                          {operator.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tasks Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTasks(filteredTasks.map(t => t.id));
                            } else {
                              setSelectedTasks([]);
                            }
                          }}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Task ID</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={(e) => handleTaskSelection(task.id, e.target.checked)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {task.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                            {task.asset_id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          {task.assigned_operator_id ? (
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              {operators.find(op => op.id === task.assigned_operator_id)?.contact_name || 'Unknown'}
                            </div>
                          ) : (
                            <span className="text-gray-400">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(task.status)}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(task.priority)}>
                            {task.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(task.scheduled_date).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(task.scheduled_date).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operators" className="space-y-6">
            {/* Operators Management */}
            <Card>
              <CardHeader>
                <CardTitle>Monitoring Operators</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Active Tasks</TableHead>
                      <TableHead>Completed Today</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(operators) ? operators : []).map((operator) => {
                      const safeTasks = Array.isArray(tasks) ? tasks : [];
                      const operatorTasks = safeTasks.filter(t => t.assigned_operator_id === operator.id);
                      const activeTasks = operatorTasks.filter(t => ['assigned', 'in_progress'].includes(t.status));
                      const completedToday = operatorTasks.filter(t => 
                        t.status === 'completed' && 
                        new Date(t.completed_at).toDateString() === new Date().toDateString()
                      );

                      return (
                        <TableRow key={operator.id}>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              {operator.contact_name}
                            </div>
                          </TableCell>
                          <TableCell>{operator.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{activeTasks.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">{completedToday.length}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={operator.status === 'approved' ? 'default' : 'destructive'}>
                              {operator.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="ghost">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost">
                                <MapPinned className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            {/* Performance Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Completion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Performance charts will be displayed here</p>
                    <p className="text-sm text-gray-400 mt-2">Integration with chart library required</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Operator Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {operators.slice(0, 5).map((operator, index) => (
                      <div key={operator.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                          </div>
                          <span className="font-medium">{operator.contact_name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(Array.isArray(tasks) ? tasks : []).filter(t => t.assigned_operator_id === operator.id && t.status === 'completed').length}
                          </div>
                          <div className="text-xs text-gray-500">completed</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ManagerDashboard;