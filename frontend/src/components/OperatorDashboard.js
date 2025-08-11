import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Camera, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Navigation,
  Upload,
  Eye,
  Star,
  Zap,
  FileText,
  Smartphone,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Home,
  List,
  User,
  Settings
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { getAuthHeaders, getUser, logout } from '../utils/auth';
import { useWebSocket } from '../utils/websocket';
import { useNotifications } from '../contexts/NotificationContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const OperatorDashboard = () => {
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
  const fileInputRef = useRef(null);
  
  // WebSocket Integration
  const { isConnected } = useWebSocket();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Task Execution State
  const [currentTask, setCurrentTask] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [reportData, setReportData] = useState({
    overall_condition: 8,
    notes: '',
    weather_condition: 'clear',
    lighting_condition: 'good',
    visibility_rating: 8,
    issues_found: [],
    maintenance_required: false,
    urgent_issues: false
  });
  
  // Location State
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState([]);

  // Initialize
  useEffect(() => {
    if (currentUser?.role === 'monitoring_operator') {
      fetchMyTasks();
      setupLocationTracking();
      
      // Setup offline handling with cleanup
      const cleanup = setupOfflineHandling();
      return cleanup; // Return cleanup function
    }
  }, [currentUser]);

  // Setup location tracking
  const setupLocationTracking = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          setLocationError('Location access denied. Please enable GPS for accurate monitoring.');
          console.error('Location error:', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  // Setup offline handling
  const setupOfflineHandling = () => {
    let isOnlineTimeout = null;
    
    const handleOnline = () => {
      // Debounce online/offline events to prevent rapid flickering
      if (isOnlineTimeout) clearTimeout(isOnlineTimeout);
      isOnlineTimeout = setTimeout(() => {
        setIsOnline(true);
        syncPendingData();
      }, 100);
    };
    
    const handleOffline = () => {
      if (isOnlineTimeout) clearTimeout(isOnlineTimeout);
      setIsOnline(false);
      notify.warning('You are now offline. Data will be synced when connection returns.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (isOnlineTimeout) clearTimeout(isOnlineTimeout);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  // Data fetching
  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const response = await axios.get(`${API}/api/monitoring/tasks`, { headers });
      setTasks(response.data.tasks || []);
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
      if (isOnline) {
        notify.error('Failed to load tasks');
      }
    } finally {
      setLoading(false);
    }
  };

  // Start task execution
  const startTask = async (task) => {
    try {
      // Update task status to in_progress
      const headers = getAuthHeaders();
      await axios.put(`${API}/api/monitoring/tasks/${task.id}`, {
        status: 'in_progress'
      }, { headers });

      setCurrentTask(task);
      setSelectedTask(task);
      setPhotos([]);
      setReportData({
        overall_condition: 8,
        notes: '',
        weather_condition: 'clear',
        lighting_condition: 'good',
        visibility_rating: 8,
        issues_found: [],
        maintenance_required: false,
        urgent_issues: false
      });

      notify.success('Task started! Begin by taking photos of the asset.');
      
    } catch (error) {
      console.error('Error starting task:', error);
      notify.error('Failed to start task');
    }
  };

  // Photo capture
  const capturePhoto = async (angle = 'general') => {
    if (!currentTask || !location) {
      notify.warning('Please ensure GPS is enabled and a task is selected');
      return;
    }

    if (!fileInputRef.current) return;
    
    fileInputRef.current.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentTask) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      notify.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      notify.error('Image size must be less than 10MB');
      return;
    }

    try {
      setLocationLoading(true);
      
      // Get current location for photo
      const currentLocation = await getCurrentLocation();
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('task_id', currentTask.id);
      formData.append('angle', 'general');
      formData.append('gps_lat', currentLocation.lat);
      formData.append('gps_lng', currentLocation.lng);

      if (isOnline) {
        // Upload immediately if online
        const headers = getAuthHeaders();
        const response = await axios.post(`${API}/api/monitoring/upload-photo`, formData, {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        });

        const photoData = {
          id: response.data.photo_id,
          file: file,
          angle: 'general',
          location: currentLocation,
          uploaded: true,
          location_verified: response.data.location_verified,
          timestamp: new Date().toISOString()
        };

        setPhotos(prev => [...prev, photoData]);
        
        if (response.data.location_verified) {
          notify.success('Photo uploaded successfully with GPS verification!');
        } else {
          notify.warning(`Photo uploaded but location accuracy: ${response.data.distance_accuracy}m`);
        }
      } else {
        // Store for later upload if offline
        const photoData = {
          id: Date.now().toString(),
          file: file,
          angle: 'general',
          location: currentLocation,
          uploaded: false,
          pending: true,
          timestamp: new Date().toISOString()
        };

        setPhotos(prev => [...prev, photoData]);
        setPendingUploads(prev => [...prev, { type: 'photo', data: formData }]);
        notify.info('Photo saved offline. Will upload when connection returns.');
      }

    } catch (error) {
      console.error('Error capturing photo:', error);
      notify.error('Failed to capture photo');
    } finally {
      setLocationLoading(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    });
  };

  // Submit monitoring report
  const submitReport = async () => {
    if (!currentTask || photos.length === 0) {
      notify.warning('Please capture at least one photo before submitting');
      return;
    }

    if (!location) {
      notify.warning('GPS location is required to submit report');
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      const reportPayload = {
        ...reportData,
        photos: photos.map(p => ({
          id: p.id,
          angle: p.angle,
          timestamp: p.timestamp,
          location: p.location
        })),
        gps_location: location,
        completion_time: Math.floor(Math.random() * 30) + 15 // Simulated completion time
      };

      if (isOnline) {
        await axios.post(`${API}/api/monitoring/tasks/${currentTask.id}/report`, reportPayload, { headers });
        
        notify.success('Monitoring report submitted successfully!');
        
        // Reset state
        setCurrentTask(null);
        setSelectedTask(null);
        setPhotos([]);
        
        // Refresh tasks
        fetchMyTasks();
        
      } else {
        // Store for offline submission
        setPendingUploads(prev => [...prev, { 
          type: 'report', 
          taskId: currentTask.id, 
          data: reportPayload 
        }]);
        notify.info('Report saved offline. Will submit when connection returns.');
      }

    } catch (error) {
      console.error('Error submitting report:', error);
      notify.error('Failed to submit report');
    }
  };

  // Sync pending data when online
  const syncPendingData = async () => {
    if (pendingUploads.length === 0) return;

    try {
      const headers = getAuthHeaders();
      
      for (const upload of pendingUploads) {
        if (upload.type === 'photo') {
          await axios.post(`${API}/api/monitoring/upload-photo`, upload.data, {
            headers: {
              ...headers,
              'Content-Type': 'multipart/form-data'
            }
          });
        } else if (upload.type === 'report') {
          await axios.post(`${API}/api/monitoring/tasks/${upload.taskId}/report`, upload.data, { headers });
        }
      }

      setPendingUploads([]);
      notify.success('Offline data synced successfully!');
      fetchMyTasks();

    } catch (error) {
      console.error('Error syncing offline data:', error);
      notify.error('Failed to sync offline data');
    }
  };

  // Get task status badge variant
  const getTaskStatusBadge = (status) => {
    switch (status) {
      case 'assigned': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduled_date).toDateString();
    const today = new Date().toDateString();
    return taskDate === today;
  });

  const completedToday = todayTasks.filter(task => task.status === 'completed').length;
  const totalToday = todayTasks.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Field Operations</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>{completedToday}/{totalToday} completed today</span>
                <div className={`flex items-center ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={fetchMyTasks} size="sm" variant="ghost">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={logout} size="sm" variant="outline">
                <User className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20"> {/* Bottom padding for mobile nav */}
        {currentTask ? (
          /* Task Execution Interface */
          <div className="p-4 space-y-6">
            {/* Current Task Header */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Current Task</CardTitle>
                  <Badge variant="default">IN PROGRESS</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  Asset: {currentTask.asset_id.slice(0, 8)}...
                </p>
              </CardHeader>
            </Card>

            {/* Photo Capture Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Photo Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo, index) => (
                        <div key={photo.id} className="relative">
                          <img
                            src={URL.createObjectURL(photo.file)}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <div className="absolute top-1 right-1">
                            {photo.uploaded ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 bg-white rounded-full" />
                            ) : (
                              <Clock className="w-5 h-5 text-orange-500 bg-white rounded-full" />
                            )}
                          </div>
                          {photo.location_verified && (
                            <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                              GPS ✓
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={capturePhoto}
                    className="w-full h-12"
                    size="lg"
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 mr-2" />
                    )}
                    Capture Photo
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Condition Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Condition Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Overall Condition (1-10)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="range"
                        min="1"
                        max="10"
                        value={reportData.overall_condition}
                        onChange={(e) => setReportData(prev => ({
                          ...prev,
                          overall_condition: parseInt(e.target.value)
                        }))}
                        className="flex-1"
                      />
                      <span className="w-8 text-center font-semibold">
                        {reportData.overall_condition}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Visibility Rating (1-10)
                    </label>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="range"
                        min="1"
                        max="10"
                        value={reportData.visibility_rating}
                        onChange={(e) => setReportData(prev => ({
                          ...prev,
                          visibility_rating: parseInt(e.target.value)
                        }))}
                        className="flex-1"
                      />
                      <span className="w-8 text-center font-semibold">
                        {reportData.visibility_rating}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={reportData.maintenance_required}
                        onChange={(e) => setReportData(prev => ({
                          ...prev,
                          maintenance_required: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Maintenance Required</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={reportData.urgent_issues}
                        onChange={(e) => setReportData(prev => ({
                          ...prev,
                          urgent_issues: e.target.checked
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm">Urgent Issues</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Notes
                    </label>
                    <Textarea
                      value={reportData.notes}
                      onChange={(e) => setReportData(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      placeholder="Add any observations or issues..."
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Report */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {!isOnline && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <WifiOff className="w-5 h-5 text-orange-600 mr-2" />
                        <span className="text-sm text-orange-800">
                          Offline mode - Report will be submitted when connection returns
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={submitReport}
                    className="w-full h-12"
                    size="lg"
                    disabled={photos.length === 0}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Submit Report
                  </Button>

                  <Button
                    onClick={() => {
                      setCurrentTask(null);
                      setSelectedTask(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Back to Tasks
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Task List Interface */
          <div className="p-4">
            {/* Today's Progress */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Today's Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span>{completedToday}/{totalToday}</span>
                  </div>
                  <Progress 
                    value={totalToday > 0 ? (completedToday / totalToday) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tasks List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">My Tasks</h2>
                {pendingUploads.length > 0 && (
                  <Badge variant="outline" className="text-orange-600">
                    {pendingUploads.length} pending
                  </Badge>
                )}
              </div>

              {todayTasks.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No tasks assigned for today</p>
                  </CardContent>
                </Card>
              ) : (
                todayTasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className={`cursor-pointer transition-colors ${
                      task.status === 'completed' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => task.status !== 'completed' && startTask(task)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getTaskStatusBadge(task.status)}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge 
                            className={getPriorityColor(task.priority)}
                            variant="secondary"
                          >
                            {task.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(task.scheduled_date).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span>Asset: {task.asset_id.slice(0, 12)}...</span>
                        </div>

                        {task.special_instructions && (
                          <div className="flex items-start text-sm text-gray-600">
                            <FileText className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                            <span className="line-clamp-2">{task.special_instructions}</span>
                          </div>
                        )}

                        {task.status === 'completed' && (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            <span>Completed at {new Date(task.completed_at).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </div>

                      {task.status !== 'completed' && (
                        <Button 
                          onClick={() => startTask(task)}
                          className="w-full mt-3" 
                          size="sm"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Start Task
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="grid grid-cols-4 py-2">
          <button 
            className={`flex flex-col items-center py-2 px-1 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('home')}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </button>
          
          <button 
            className={`flex flex-col items-center py-2 px-1 ${activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('tasks')}
          >
            <List className="w-5 h-5" />
            <span className="text-xs mt-1">Tasks</span>
            {todayTasks.filter(t => t.status !== 'completed').length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            )}
          </button>
          
          <button 
            className={`flex flex-col items-center py-2 px-1 ${activeTab === 'location' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('location')}
          >
            <Navigation className="w-5 h-5" />
            <span className="text-xs mt-1">Navigate</span>
          </button>
          
          <button 
            className={`flex flex-col items-center py-2 px-1 ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-600'}`}
            onClick={() => setActiveTab('profile')}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs mt-1">Settings</span>
            {pendingUploads.length > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;