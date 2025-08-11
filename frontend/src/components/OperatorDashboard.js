import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useWebSocket } from '../utils/websocket';
import { useNotifications } from '../contexts/NotificationContext';
import { getUser, getAuthHeaders } from '../utils/auth';
import axios from 'axios';
import {
  Home, ClipboardList, Navigation, Settings, MapPin, Camera,
  CheckCircle, Clock, AlertCircle, Upload, Wifi, WifiOff,
  User, Phone, Calendar, Star, Award, Target
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const fileInputRef = useRef(null);

  // Notification system
  const { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning } = useNotifications();
  const notify = { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning };

  // WebSocket Integration - Fixed with proper parameters
  const { isConnected } = useWebSocket(currentUser?.id, (message) => {
    console.log('Operator received WebSocket message:', message);
    // Handle real-time updates here if needed
  });

  // State management
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [currentTab, setCurrentTab] = useState('home');
  
  // Location and GPS
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locationError, setLocationError] = useState(null);
  
  // Photo and reporting
  const [photos, setPhotos] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [taskReport, setTaskReport] = useState({
    overall_condition: 8,
    notes: '',
    weather_condition: 'clear',
    lighting_condition: 'good',
    visibility_rating: 8
  });
  
  // Offline capabilities
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState([]);

  // Data fetching and setup
  useEffect(() => {
    fetchMyTasks();
    setupLocationTracking();
  }, []);

  // Separate useEffect for offline handling
  useEffect(() => {
    const cleanup = setupOfflineHandling();
    return cleanup;
  }, []);

  // Location tracking setup
  const setupLocationTracking = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          notify.success('Location access granted');
        },
        (error) => {
          setLocationError(error.message);
          notify.error('Location access denied. Please enable GPS for accurate monitoring.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  };

  // Offline handling with cleanup
  const setupOfflineHandling = () => {
    let isOnlineTimeout = null;
    
    const handleOnline = () => {
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
      setTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      notify.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Task management
  const startTask = async (task) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(`${API}/api/monitoring/tasks/${task.id}`, {
        status: 'in_progress'
      }, { headers });
      
      setSelectedTask(task);
      fetchMyTasks();
      notify.success('Task started successfully!');
    } catch (error) {
      console.error('Error starting task:', error);
      notify.error('Failed to start task');
    }
  };

  // Photo handling
  const handlePhotoCapture = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        notify.error('Please select only image files');
        continue;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        notify.error('File size must be less than 10MB');
        continue;
      }

      // Create photo object with location data
      const photoData = {
        file,
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        location: location.lat ? { lat: location.lat, lng: location.lng } : null,
        uploaded: false
      };

      setPhotos(prev => [...prev, photoData]);

      // Upload if online
      if (isOnline) {
        await uploadPhoto(photoData);
      } else {
        setPendingUploads(prev => [...prev, photoData]);
        notify.info('Photo saved for upload when connection returns');
      }
    }
  };

  const uploadPhoto = async (photoData) => {
    try {
      setUploadProgress(prev => ({ ...prev, [photoData.id]: 0 }));
      
      const formData = new FormData();
      formData.append('photo', photoData.file);
      formData.append('task_id', selectedTask?.id || '');
      formData.append('timestamp', photoData.timestamp);
      
      if (photoData.location) {
        formData.append('latitude', photoData.location.lat);
        formData.append('longitude', photoData.location.lng);
      }

      const headers = getAuthHeaders();
      const response = await axios.post(`${API}/api/monitoring/upload-photo`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [photoData.id]: progress }));
        }
      });

      // Update photo status
      setPhotos(prev => prev.map(p => 
        p.id === photoData.id ? { ...p, uploaded: true, url: response.data.url } : p
      ));
      
      setUploadProgress(prev => ({ ...prev, [photoData.id]: 100 }));
      notify.success('Photo uploaded successfully!');

    } catch (error) {
      console.error('Upload error:', error);
      notify.error('Failed to upload photo');
      setUploadProgress(prev => ({ ...prev, [photoData.id]: -1 }));
    }
  };

  // Sync offline data
  const syncPendingData = async () => {
    if (pendingUploads.length === 0) return;

    try {
      for (const photoData of pendingUploads) {
        await uploadPhoto(photoData);
      }
      setPendingUploads([]);
      notify.success('Offline data synced successfully!');
      fetchMyTasks();
    } catch (error) {
      console.error('Sync error:', error);
      notify.error('Failed to sync offline data');
    }
  };

  // Complete task
  const completeTask = async () => {
    if (!selectedTask) return;

    try {
      const headers = getAuthHeaders();
      
      const reportData = {
        ...taskReport,
        photos: photos.filter(p => p.uploaded).map(p => ({ url: p.url, timestamp: p.timestamp })),
        gps_location: location.lat ? { lat: location.lat, lng: location.lng } : null
      };

      await axios.post(`${API}/api/monitoring/tasks/${selectedTask.id}/report`, reportData, { headers });
      
      notify.success('Task completed successfully!');
      setSelectedTask(null);
      setPhotos([]);
      setTaskReport({
        overall_condition: 8,
        notes: '',
        weather_condition: 'clear',
        lighting_condition: 'good',
        visibility_rating: 8
      });
      fetchMyTasks();
    } catch (error) {
      console.error('Error completing task:', error);
      notify.error('Failed to complete task');
    }
  };

  // Task filtering - today's tasks
  const todaysTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduled_date || task.created_at);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  });

  // Mobile bottom navigation
  const mobileNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'navigate', label: 'Navigate', icon: Navigation },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Field Operations</h1>
              <p className="text-sm text-gray-600">{currentUser?.contact_name || 'Operator'}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-600" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-600" />
                )}
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Home Tab */}
        {currentTab === 'home' && (
          <div className="space-y-4">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Today's Tasks</p>
                      <p className="text-xl font-bold">{todaysTasks.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Completed</p>
                      <p className="text-xl font-bold">
                        {todaysTasks.filter(t => t.status === 'completed').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Today's Tasks ({todaysTasks.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center text-gray-500 py-4">Loading tasks...</p>
                ) : todaysTasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No tasks assigned for today</p>
                ) : (
                  <div className="space-y-3">
                    {todaysTasks.map(task => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-sm">{task.asset_id}</span>
                          </div>
                          <Badge variant={
                            task.status === 'completed' ? 'default' :
                            task.status === 'in_progress' ? 'secondary' :
                            task.status === 'overdue' ? 'destructive' : 'outline'
                          }>
                            {task.status}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-gray-500 mb-3">
                          <p>Priority: {task.priority || 'Medium'}</p>
                          <p>Due: {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : 'Today'}</p>
                        </div>

                        {task.status !== 'completed' && (
                          <Button 
                            onClick={() => startTask(task)}
                            className="w-full mt-3" 
                            size="sm"
                          >
                            {task.status === 'in_progress' ? 'Continue Task' : 'Start Task'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tasks Tab */}
        {currentTab === 'tasks' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All My Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No tasks assigned</p>
                ) : (
                  <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{task.asset_id}</p>
                            <p className="text-sm text-gray-500">Status: {task.status}</p>
                            <p className="text-xs text-gray-400">
                              {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString() : 'No due date'}
                            </p>
                          </div>
                          <Button
                            onClick={() => startTask(task)}
                            size="sm"
                            disabled={task.status === 'completed'}
                          >
                            {task.status === 'completed' ? 'Completed' : 
                             task.status === 'in_progress' ? 'Continue' : 'Start'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigate Tab */}
        {currentTab === 'navigate' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Current Location</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {location.lat ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Latitude: {location.lat.toFixed(6)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Longitude: {location.lng.toFixed(6)}
                    </p>
                    <div className="mt-4">
                      <Button onClick={setupLocationTracking} variant="outline" size="sm">
                        <Navigation className="w-4 h-4 mr-2" />
                        Refresh Location
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 mb-4">Location access required</p>
                    <Button onClick={setupLocationTracking}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Enable GPS
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Route to next task */}
            {todaysTasks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Next Task Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">Asset: {todaysTasks[0].asset_id}</p>
                  <Button className="w-full">
                    <Navigation className="w-4 h-4 mr-2" />
                    Get Directions
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{currentUser?.contact_name}</p>
                      <p className="text-sm text-gray-500">{currentUser?.email}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Network Status</span>
                    <Badge variant={isOnline ? 'default' : 'destructive'}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">WebSocket</span>
                    <Badge variant={isConnected ? 'default' : 'secondary'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">GPS Location</span>
                    <Badge variant={location.lat ? 'default' : 'destructive'}>
                      {location.lat ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Task Execution Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[90vh] overflow-y-auto rounded-t-2xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Execute Task</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{selectedTask.asset_id}</p>
            </div>

            <div className="p-4 space-y-6">
              {/* Photo Section */}
              <div>
                <h4 className="font-medium mb-3">Photo Documentation</h4>
                <div className="grid grid-cols-2 gap-3">
                  {photos.map(photo => (
                    <div key={photo.id} className="relative">
                      <img 
                        src={URL.createObjectURL(photo.file)} 
                        alt="Task documentation"
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      {uploadProgress[photo.id] !== undefined && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xs">
                            {uploadProgress[photo.id] === -1 ? 'Failed' : `${uploadProgress[photo.id]}%`}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handlePhotoCapture}
                  className="w-full mt-3"
                  variant="outline"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Condition Assessment */}
              <div>
                <h4 className="font-medium mb-3">Condition Assessment</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Overall Condition (1-10)
                    </label>
                    <Select 
                      value={taskReport.overall_condition.toString()} 
                      onValueChange={(value) => setTaskReport(prev => ({...prev, overall_condition: parseInt(value)}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} - {num <= 3 ? 'Poor' : num <= 6 ? 'Fair' : num <= 8 ? 'Good' : 'Excellent'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <Textarea
                      value={taskReport.notes}
                      onChange={(e) => setTaskReport(prev => ({...prev, notes: e.target.value}))}
                      placeholder="Additional observations..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Complete Task Button */}
              <Button 
                onClick={completeTask}
                className="w-full"
                disabled={photos.filter(p => p.uploaded).length === 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="grid grid-cols-4 gap-1">
          {mobileNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-colors ${
                currentTab === item.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;