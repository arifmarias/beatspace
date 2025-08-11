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
  
  // WebSocket Integration - Fixed with proper parameters
  const { isConnected } = useWebSocket(currentUser?.id, (message) => {
    console.log('Operator received WebSocket message:', message);
    // Handle real-time updates here if needed
  });
  
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
    } else if (currentUser && currentUser.role !== 'monitoring_operator') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Separate useEffect for offline handling to avoid conflicts
  useEffect(() => {
    const cleanup = setupOfflineHandling();
    return cleanup;
  }, []);

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
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold mb-4">Operator Dashboard</h1>
      
      {/* Status indicator */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="flex items-center justify-between">
          <span>Connection Status:</span>
          <span className={`px-2 py-1 rounded text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span>Network:</span>
          <span className={`px-2 py-1 rounded text-sm ${isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="bg-white rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Today's Tasks ({tasks.length})</h2>
        {loading ? (
          <p>Loading tasks...</p>
        ) : tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{task.asset_id}</p>
                    <p className="text-sm text-gray-500">Status: {task.status}</p>
                  </div>
                  <button
                    onClick={() => startTask(task)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    disabled={task.status === 'completed'}
                  >
                    {task.status === 'completed' ? 'Completed' : 'Start'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tasks assigned</p>
        )}
      </div>

      {/* Location info */}
      {location.lat && (
        <div className="bg-white rounded shadow p-4 mt-4">
          <h3 className="font-semibold mb-2">Current Location</h3>
          <p className="text-sm text-gray-600">
            Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
};

export default OperatorDashboard;

export default OperatorDashboard;