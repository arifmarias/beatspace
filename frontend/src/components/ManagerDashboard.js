import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  List, CalendarDays, Layout, Building2, Navigation,
  ChevronLeft, ChevronRight
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
  
  // Pagination state
  const [monitoringCurrentPage, setMonitoringCurrentPage] = useState(1);
  const [operatorsCurrentPage, setOperatorsCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Items per page for both tables
  
  // Route Assignment state
  const [selectedMapAssets, setSelectedMapAssets] = useState([]);
  const [mapFilters, setMapFilters] = useState({
    serviceTier: 'all',
    assignmentStatus: 'all',
    operator: 'all'
  });
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [assignmentPanelOpen, setAssignmentPanelOpen] = useState(false);
  const [bulkAssignmentOperator, setBulkAssignmentOperator] = useState('');
  const [mapAssetDetails, setMapAssetDetails] = useState(null);
  const [mapAssignmentModal, setMapAssignmentModal] = useState(false);
  
  // Google Maps references
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  
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
                  location: assetDetails.location || { lat: '', lng: '' }, // Include location coordinates
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

  // Pagination helper functions
  const getPaginatedData = (data, currentPage, itemsPerPage) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (totalItems, itemsPerPage) => {
    return Math.ceil(totalItems / itemsPerPage);
  };

  const handleMonitoringPageChange = (page) => {
    setMonitoringCurrentPage(page);
  };

  const handleOperatorsPageChange = (page) => {
    setOperatorsCurrentPage(page);
  };

  // Pagination component
  const PaginationControls = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
    if (totalPages <= 1) return null;
    
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {startItem} to {endItem} of {totalItems} results
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  };

  // Handle asset row click to show asset details
  const handleAssetClick = (asset) => {
    setSelectedAssetDetails(asset);
    setAssetDetailsDialog(true);
  };

  // Route Assignment Functions
  const getFilteredMapAssets = () => {
    return monitoringAssets.filter(asset => {
      const matchesSearch = !mapSearchTerm || 
        asset.assetName.toLowerCase().includes(mapSearchTerm.toLowerCase()) ||
        asset.address.toLowerCase().includes(mapSearchTerm.toLowerCase()) ||
        asset.area.toLowerCase().includes(mapSearchTerm.toLowerCase());

      const matchesServiceTier = mapFilters.serviceTier === 'all' || 
        asset.serviceLevel === mapFilters.serviceTier;

      const assignedOperator = assetAssignments[asset.id];
      const matchesAssignmentStatus = 
        mapFilters.assignmentStatus === 'all' ||
        (mapFilters.assignmentStatus === 'assigned' && assignedOperator && assignedOperator !== 'Unassigned') ||
        (mapFilters.assignmentStatus === 'unassigned' && (!assignedOperator || assignedOperator === 'Unassigned'));

      const matchesOperator = mapFilters.operator === 'all' || 
        assignedOperator === mapFilters.operator;

      return matchesSearch && matchesServiceTier && matchesAssignmentStatus && matchesOperator;
    });
  };

  const handleMapAssetClick = (asset) => {
    setMapAssetDetails(asset);
    setMapAssignmentModal(true);
  };

  // Route Assignment Map Selection
  const handleMapAssetSelection = (asset, isCtrlKey = false) => {
    console.log('handleMapAssetSelection called:', { 
      assetId: asset.id, 
      assetName: asset.assetName, 
      isCtrlKey, 
      currentSelection: selectedMapAssets 
    });
    
    setSelectedMapAssets(prev => {
      let newSelection;
      
      if (isCtrlKey) {
        // Multi-select with Ctrl key
        if (prev.includes(asset.id)) {
          // Remove if already selected
          newSelection = prev.filter(id => id !== asset.id);
          console.log('Removing asset from multi-selection:', asset.assetName);
        } else {
          // Add to selection
          newSelection = [...prev, asset.id];
          console.log('Adding asset to multi-selection:', asset.assetName);
        }
      } else {
        // Single select (toggle)
        if (prev.includes(asset.id)) {
          newSelection = prev.filter(id => id !== asset.id);
          console.log('Removing asset from single selection:', asset.assetName);
        } else {
          newSelection = [asset.id];
          console.log('Single selecting asset:', asset.assetName);
        }
      }
      
      console.log('Selection updated:', { 
        from: prev, 
        to: newSelection, 
        count: newSelection.length 
      });
      
      return newSelection;
    });
  };

  const handleBulkMapAssignment = () => {
    if (!bulkAssignmentOperator || selectedMapAssets.length === 0) {
      return;
    }
    
    selectedMapAssets.forEach(assetId => {
      handleAssigneeChange(assetId, bulkAssignmentOperator);
    });
    
    setSelectedMapAssets([]);
    setBulkAssignmentOperator('');
    setAssignmentPanelOpen(false);
  };

  const getMarkerColor = (asset) => {
    const assignedOperator = assetAssignments[asset.id];
    if (selectedMapAssets.includes(asset.id)) return '#ff6b35'; // Orange for selected
    if (!assignedOperator || assignedOperator === 'Unassigned') return '#10b981'; // Green for unassigned
    return '#3b82f6'; // Blue for assigned
  };

  const getMarkerIcon = (asset) => {
    const color = getMarkerColor(asset);
    const isPremium = asset.serviceLevel === 'premium';
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="24" height="36" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z" fill="${color}"/>
        <circle cx="12" cy="12" r="${isPremium ? 6 : 4}" fill="white"/>
        ${isPremium ? '<circle cx="12" cy="12" r="3" fill="#ffd700"/>' : ''}
      </svg>
    `)}`;
  };

  // Google Maps Integration
  const initializeMap = useCallback(() => {
    console.log('initializeMap called', {
      hasWindow: typeof window !== 'undefined',
      hasGoogle: !!window.google,
      hasMapRef: !!mapRef.current,
      mapRefElement: mapRef.current
    });
    
    if (!window.google) {
      console.log('Google Maps not loaded yet');
      return;
    }
    
    if (!mapRef.current) {
      console.log('Map ref not available, retrying in 100ms...');
      setTimeout(() => initializeMap(), 100);
      return;
    }

    console.log('Initializing Google Maps...');
    
    // Default center (Dhaka, Bangladesh)
    const defaultCenter = { lat: 23.8103, lng: 90.4125 };
    
    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;
    console.log('Google Maps initialized successfully');
    
    // Initialize markers after a short delay to ensure map is ready
    setTimeout(() => {
      updateMapMarkers();
    }, 1000);
  }, []);

  const loadGoogleMapsScript = useCallback(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log('Loading Google Maps script...', { apiKey: !!apiKey, hasExisting: !!window.google });
    
    if (window.google) {
      console.log('Google Maps already loaded');
      initializeMap();
      return;
    }

    if (!apiKey) {
      console.error('Google Maps API key not found');
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
    if (existingScript) {
      console.log('Google Maps script already loading, waiting...');
      existingScript.onload = initializeMap;
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Maps script loaded');
      initializeMap();
    };
    script.onerror = (error) => {
      console.error('Error loading Google Maps script:', error);
    };
    document.head.appendChild(script);
  }, [initializeMap]);

  const clearMarkers = () => {
    markersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    markersRef.current = [];
  };

  const updateMapMarkers = useCallback(() => {
    if (!mapInstanceRef.current) {
      console.log('Map instance not available for markers');
      return;
    }

    console.log('Updating map markers...', {
      assetsCount: monitoringAssets.length,
      hasAssets: monitoringAssets.length > 0,
      activeTab: activeTab
    });
    
    // If we don't have assets yet and we're on the route tab, wait and try again (only once)
    if (monitoringAssets.length === 0 && activeTab === 'route') {
      console.log('No monitoring assets available yet, will retry when data loads...');
      return; // Don't retry continuously, let useEffect handle data loading
    }
    
    // Clear existing markers
    clearMarkers();

    const filteredAssets = getFilteredMapAssets();
    console.log('Filtered assets for map:', filteredAssets.length);
    
    // Prevent unnecessary re-renders by checking if we actually have assets to show
    if (filteredAssets.length === 0) {
      console.log('No assets to display after filtering');
      mapInstanceRef.current.setCenter({ lat: 23.8103, lng: 90.4125 });
      mapInstanceRef.current.setZoom(12);
      return;
    }
    
    filteredAssets.forEach((asset, index) => {
      if (!asset.location || !asset.location.lat || !asset.location.lng) {
        return; // Skip assets without coordinates
      }

      const lat = parseFloat(asset.location.lat);
      const lng = parseFloat(asset.location.lng);
      
      if (isNaN(lat) || isNaN(lng)) {
        return;
      }

      const position = { lat, lng };

      const assignedOperator = assetAssignments[asset.id];
      const isSelected = selectedMapAssets.includes(asset.id);
      const isAssigned = assignedOperator && assignedOperator !== 'Unassigned';
      
      // Determine marker color
      let markerColor = '#10b981'; // Green for unassigned
      if (isSelected) {
        markerColor = '#ff6b35'; // Orange for selected
      } else if (isAssigned) {
        markerColor = '#3b82f6'; // Blue for assigned
      }

      // Create custom marker icon
      const markerIcon = {
        url: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="30" height="45" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 30 15 30s15-18.75 15-30c0-8.284-6.716-15-15-15z" fill="${markerColor}"/>
            <circle cx="15" cy="15" r="${asset.serviceLevel === 'premium' ? 8 : 6}" fill="white"/>
            ${asset.serviceLevel === 'premium' ? '<circle cx="15" cy="15" r="4" fill="#ffd700"/>' : ''}
            ${asset.serviceLevel === 'premium' ? '<text x="15" y="19" text-anchor="middle" font-size="8" fill="#000">P</text>' : ''}
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(30, 45),
        anchor: new window.google.maps.Point(15, 45)
      };

      // Create marker WITHOUT animation to prevent flickering
      const marker = new window.google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        icon: markerIcon,
        title: asset.assetName
      });

      // Store asset data with marker for easy access
      marker.assetData = asset;

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="font-family: Arial, sans-serif; max-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937;">${asset.assetName}</h3>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 14px;">${asset.address}</p>
            <div style="display: flex; gap: 8px; margin: 8px 0;">
              <span style="background: ${asset.serviceLevel === 'premium' ? '#3b82f6' : '#e5e7eb'}; color: ${asset.serviceLevel === 'premium' ? 'white' : '#374151'}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${asset.serviceLevel}</span>
              <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${asset.area}</span>
            </div>
            <p style="margin: 4px 0 8px 0; color: #374151; font-size: 14px;">
              <strong>Assignee:</strong> ${assignedOperator || 'Unassigned'}
            </p>
            <button 
              onclick="window.managerDashboard.handleMapAssetClick('${asset.id}')"
              style="background: #3b82f6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
            >
              ${isSelected ? 'Selected ✓' : 'Click to Select'}
            </button>
            <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 11px;">
              💡 Hold Ctrl + Click for multi-select
            </p>
          </div>
        `
      });

      // Add click listeners WITHOUT continuous updates
      marker.addListener('click', (event) => {
        const isCtrlKey = event.domEvent && (event.domEvent.ctrlKey || event.domEvent.metaKey);
        handleMapAssetSelection(asset, isCtrlKey);
        // Remove the automatic marker update to prevent flickering
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      markersRef.current.push(marker);
    });

    console.log(`Added ${markersRef.current.length} markers to map`);

    // Fit map to show all markers (only once when markers are first loaded)
    if (markersRef.current.length > 0 && !window.mapBoundsSet) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getPosition());
      });
      mapInstanceRef.current.fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(mapInstanceRef.current, "idle", () => {
        if (mapInstanceRef.current.getZoom() > 16) {
          mapInstanceRef.current.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
        window.mapBoundsSet = true; // Prevent repeated bounds setting
      });
    }
  }, [selectedMapAssets, assetAssignments, getFilteredMapAssets, monitoringAssets, activeTab]);

  // Expose functions to global scope for info window callbacks
  useEffect(() => {
    window.managerDashboard = {
      handleMapAssetClick: (assetId) => {
        const asset = monitoringAssets.find(a => a.id === assetId);
        if (asset) {
          console.log('Info window button clicked for:', asset.assetName);
          handleMapAssetSelection(asset, false); // Single select when clicked from info window
          // Don't call updateMapMarkers here to prevent flickering
        }
      }
    };
    
    return () => {
      delete window.managerDashboard;
    };
  }, [monitoringAssets, handleMapAssetSelection]);

  // Update only marker colors when selection changes (prevent flickering)
  useEffect(() => {
    if (mapInstanceRef.current && markersRef.current.length > 0) {
      updateMarkerColors();
    }
  }, [selectedMapAssets, updateMarkerColors]);

  // Function to update only marker colors (prevent flickering)
  const updateMarkerColors = useCallback(() => {
    if (!mapInstanceRef.current || markersRef.current.length === 0) {
      return;
    }

    console.log('Updating marker colors only (no flickering)');
    
    markersRef.current.forEach(marker => {
      const asset = marker.assetData;
      if (!asset) return;

      const assignedOperator = assetAssignments[asset.id];
      const isSelected = selectedMapAssets.includes(asset.id);
      const isAssigned = assignedOperator && assignedOperator !== 'Unassigned';
      
      // Determine marker color
      let markerColor = '#10b981'; // Green for unassigned
      if (isSelected) {
        markerColor = '#ff6b35'; // Orange for selected
      } else if (isAssigned) {
        markerColor = '#3b82f6'; // Blue for assigned
      }

      // Update marker icon with new color
      const markerIcon = {
        url: `data:image/svg+xml,${encodeURIComponent(`
          <svg width="30" height="45" viewBox="0 0 30 45" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 30 15 30s15-18.75 15-30c0-8.284-6.716-15-15-15z" fill="${markerColor}"/>
            <circle cx="15" cy="15" r="${asset.serviceLevel === 'premium' ? 8 : 6}" fill="white"/>
            ${asset.serviceLevel === 'premium' ? '<circle cx="15" cy="15" r="4" fill="#ffd700"/>' : ''}
            ${asset.serviceLevel === 'premium' ? '<text x="15" y="19" text-anchor="middle" font-size="8" fill="#000">P</text>' : ''}
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(30, 45),
        anchor: new window.google.maps.Point(15, 45)
      };

      marker.setIcon(markerIcon);
    });
  }, [selectedMapAssets, assetAssignments]);

  // Load Google Maps when component mounts or when Route Assignment tab is activated
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log('Manager Dashboard mounted - checking Google Maps...', { 
      apiKey: !!apiKey, 
      fullApiKey: apiKey,
      activeTab: activeTab 
    });
    
    if (apiKey) {
      loadGoogleMapsScript();
    } else {
      console.error('Google Maps API key is missing');
    }
  }, [loadGoogleMapsScript]);

  // Tab refresh functionality - properly handle map visibility on tab switch
  useEffect(() => {
    if (activeTab === 'route') {
      console.log('Route Assignment tab activated - ensuring map visibility...');
      
      // Refresh monitoring assets data when tab is activated
      fetchMonitoringAssets();
      
      // Handle map initialization/restoration with proper timing
      const ensureMapVisibility = () => {
        if (window.google && mapRef.current) {
          if (!mapInstanceRef.current) {
            // Map needs initial setup
            console.log('Initializing map for first time');
            initializeMap();
          } else {
            // Map exists but might be hidden due to tab switching
            console.log('Restoring map after tab switch');
            
            // Force map to be visible and properly sized
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
            
            // Ensure map is centered and visible
            setTimeout(() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setCenter({ lat: 23.8103, lng: 90.4125 });
                
                // If we have markers, fit bounds to show them
                if (markersRef.current.length > 0) {
                  const bounds = new window.google.maps.LatLngBounds();
                  markersRef.current.forEach(marker => {
                    bounds.extend(marker.getPosition());
                  });
                  mapInstanceRef.current.fitBounds(bounds);
                  
                  // Ensure minimum zoom
                  setTimeout(() => {
                    if (mapInstanceRef.current.getZoom() > 16) {
                      mapInstanceRef.current.setZoom(16);
                    }
                  }, 100);
                } else if (monitoringAssets.length > 0) {
                  // We have assets but no markers, create them
                  updateMapMarkers();
                }
              }
            }, 500);
          }
        }
      };

      // Use longer timeout to ensure DOM is ready after tab switch
      setTimeout(ensureMapVisibility, 100);
    }
  }, [activeTab, fetchMonitoringAssets, initializeMap, updateMapMarkers, monitoringAssets.length]);

  // Update markers when data changes (controlled to prevent flickering)
  useEffect(() => {
    console.log('Dependencies changed, checking if markers need update...', {
      hasMapInstance: !!mapInstanceRef.current,
      assetsCount: monitoringAssets.length,
      activeTab: activeTab
    });
    
    // Only update markers if we're on route tab, have map instance, and have assets
    if (activeTab === 'route' && mapInstanceRef.current && monitoringAssets.length > 0) {
      // Debounce marker updates to prevent flickering
      clearTimeout(window.markerUpdateDebounce);
      window.markerUpdateDebounce = setTimeout(() => {
        updateMapMarkers();
      }, 100);
    }
  }, [updateMapMarkers, mapFilters, mapSearchTerm, monitoringAssets.length, activeTab]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tasks">Monitoring</TabsTrigger>
            <TabsTrigger value="route">Route Assignment</TabsTrigger>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedData(monitoringAssets, monitoringCurrentPage, itemsPerPage).map((asset) => (
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination for Monitoring Assets */}
                    <PaginationControls
                      currentPage={monitoringCurrentPage}
                      totalPages={getTotalPages(monitoringAssets.length, itemsPerPage)}
                      onPageChange={handleMonitoringPageChange}
                      totalItems={monitoringAssets.length}
                      itemsPerPage={itemsPerPage}
                    />
                    
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

          {/* Route Assignment Tab */}
          <TabsContent value="route" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Map Container */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Route Assignment Map</CardTitle>
                          <p className="text-sm text-gray-500">Assign monitoring assets to operators visually</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Unassigned</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Assigned</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                          <span>Selected</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Streamlined Selection Controls - Single Row for Better UX */}
                    <div className="px-6 pb-4">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              const filteredAssets = getFilteredMapAssets();
                              const filteredIds = filteredAssets.map(asset => asset.id);
                              console.log('Selecting all visible assets:', filteredIds);
                              setSelectedMapAssets(filteredIds);
                            }}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                            disabled={getFilteredMapAssets().length === 0}
                          >
                            <span className="flex items-center space-x-2">
                              <span>📍 Select All</span>
                              <span className="bg-blue-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                                {getFilteredMapAssets().length}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              const unassignedAssets = getFilteredMapAssets().filter(asset => {
                                const assignedOperator = assetAssignments[asset.id];
                                return !assignedOperator || assignedOperator === 'Unassigned';
                              });
                              const unassignedIds = unassignedAssets.map(asset => asset.id);
                              console.log('Selecting unassigned assets:', unassignedIds);
                              setSelectedMapAssets(unassignedIds);
                            }}
                            className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                            disabled={getFilteredMapAssets().filter(asset => {
                              const assignedOperator = assetAssignments[asset.id];
                              return !assignedOperator || assignedOperator === 'Unassigned';
                            }).length === 0}
                          >
                            <span className="flex items-center space-x-2">
                              <span>🆕 Select Unassigned</span>
                              <span className="bg-green-400 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                                {getFilteredMapAssets().filter(asset => {
                                  const assignedOperator = assetAssignments[asset.id];
                                  return !assignedOperator || assignedOperator === 'Unassigned';
                                }).length}
                              </span>
                            </span>
                          </button>
                          <button
                            onClick={() => {
                              console.log('Clearing selection');
                              setSelectedMapAssets([]);
                            }}
                            className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                            disabled={selectedMapAssets.length === 0}
                          >
                            🚫 Clear
                          </button>
                        </div>
                        
                        {/* Streamlined Selection Status and Action */}
                        <div className="flex items-center space-x-3">
                          <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-4 py-2 rounded-lg border">
                            <span className="text-orange-600">{selectedMapAssets.length}</span> asset{selectedMapAssets.length !== 1 ? 's' : ''} selected
                          </div>
                          {selectedMapAssets.length > 0 && (
                            <Button 
                              size="sm" 
                              className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-6"
                              onClick={() => setAssignmentPanelOpen(true)}
                            >
                              🏃‍♂️ Assign Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Google Maps Container */}
                    <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden relative">
                      {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
                        <div 
                          ref={mapRef}
                          id="route-assignment-map"
                          className="w-full h-full"
                          style={{ minHeight: '600px', backgroundColor: '#f0f0f0' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Google Maps Not Available</h3>
                            <p className="text-gray-500">Google Maps API key not configured</p>
                            <p className="text-xs text-gray-400 mt-2">
                              Expected: REACT_APP_GOOGLE_MAPS_API_KEY<br/>
                              Current: {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? 'Present' : 'Missing'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Improved Asset Selection Info Overlay - Minimal and Clean */}
                      {selectedMapAssets.length > 0 && (
                        <div className="absolute bottom-6 left-6 right-6 bg-white rounded-lg shadow-lg p-3 border border-orange-200 z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">{selectedMapAssets.length}</span>
                              </div>
                              <div>
                                <span className="font-semibold text-gray-900">
                                  {selectedMapAssets.length} asset{selectedMapAssets.length !== 1 ? 's' : ''} selected
                                </span>
                                <div className="text-xs text-gray-500">
                                  Ready for assignment
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => setAssignmentPanelOpen(true)}
                              >
                                Assign Now
                              </Button>
                              <button
                                onClick={() => setSelectedMapAssets([])}
                                className="text-gray-400 hover:text-gray-600 p-1"
                                title="Clear selection"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Control Panel */}
              <div className="lg:col-span-1">
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Map Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Search Assets</label>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                          <Input
                            placeholder="Asset name or location..."
                            value={mapSearchTerm}
                            onChange={(e) => setMapSearchTerm(e.target.value)}
                            className="pl-9 text-sm"
                          />
                        </div>
                      </div>

                      {/* Service Tier Filter */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Service Tier</label>
                        <Select 
                          value={mapFilters.serviceTier} 
                          onValueChange={(value) => setMapFilters(prev => ({...prev, serviceTier: value}))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Tiers</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Assignment Status Filter */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Assignment Status</label>
                        <Select 
                          value={mapFilters.assignmentStatus} 
                          onValueChange={(value) => setMapFilters(prev => ({...prev, assignmentStatus: value}))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Assets</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Operator Filter */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Operator</label>
                        <Select 
                          value={mapFilters.operator} 
                          onValueChange={(value) => setMapFilters(prev => ({...prev, operator: value}))}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Operators</SelectItem>
                            {[...new Set(Object.values(assetAssignments).filter(name => name !== 'Unassigned'))].map(assignee => (
                              <SelectItem key={assignee} value={assignee}>
                                {assignee}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Asset Statistics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Asset Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Assets:</span>
                          <span className="font-medium">{getFilteredMapAssets().length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assigned:</span>
                          <span className="font-medium text-blue-600">
                            {getFilteredMapAssets().filter(asset => 
                              assetAssignments[asset.id] && assetAssignments[asset.id] !== 'Unassigned'
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Unassigned:</span>
                          <span className="font-medium text-green-600">
                            {getFilteredMapAssets().filter(asset => 
                              !assetAssignments[asset.id] || assetAssignments[asset.id] === 'Unassigned'
                            ).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Selected:</span>
                          <span className="font-medium text-orange-600">{selectedMapAssets.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setSelectedMapAssets([])}
                        disabled={selectedMapAssets.length === 0}
                      >
                        Clear Selection
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => {
                          const unassignedAssets = getFilteredMapAssets().filter(asset => 
                            !assetAssignments[asset.id] || assetAssignments[asset.id] === 'Unassigned'
                          );
                          setSelectedMapAssets(unassignedAssets.map(asset => asset.id));
                        }}
                      >
                        Select All Unassigned
                      </Button>
                      <Button 
                        size="sm" 
                        className="w-full text-xs"
                        onClick={() => setAssignmentPanelOpen(true)}
                        disabled={selectedMapAssets.length === 0}
                      >
                        Bulk Assign
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

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
                    {getPaginatedData((Array.isArray(operators) ? operators : []), operatorsCurrentPage, itemsPerPage).map((operator) => {
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
                
                {/* Pagination for Operators */}
                <PaginationControls
                  currentPage={operatorsCurrentPage}
                  totalPages={getTotalPages((Array.isArray(operators) ? operators : []).length, itemsPerPage)}
                  onPageChange={handleOperatorsPageChange}
                  totalItems={(Array.isArray(operators) ? operators : []).length}
                  itemsPerPage={itemsPerPage}
                />
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
                              {selectedAssetDetails.location && selectedAssetDetails.location.lat && selectedAssetDetails.location.lng && process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
                                <iframe
                                  width="100%"
                                  height="100%"
                                  frameBorder="0"
                                  style={{ border: 0 }}
                                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${selectedAssetDetails.location.lat},${selectedAssetDetails.location.lng}&zoom=16`}
                                  allowFullScreen
                                  loading="lazy"
                                  title="Asset Location Map"
                                />
                              ) : selectedAssetDetails.address && process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? (
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
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="text-center">
                                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500">
                                      {!process.env.REACT_APP_GOOGLE_MAPS_API_KEY 
                                        ? "Google Maps API key not configured" 
                                        : "No location data available"}
                                    </p>
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

        {/* Map Asset Details Modal */}
        <Dialog open={mapAssignmentModal} onOpenChange={setMapAssignmentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Asset Assignment
              </DialogTitle>
            </DialogHeader>
            {mapAssetDetails && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{mapAssetDetails.assetName}</h3>
                  <p className="text-sm text-gray-600">{mapAssetDetails.address}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant={mapAssetDetails.serviceLevel === 'premium' ? 'default' : 'outline'}>
                      {mapAssetDetails.serviceLevel}
                    </Badge>
                    <Badge variant="secondary">{mapAssetDetails.area}</Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Assignee</label>
                  <div className="text-sm text-gray-600">
                    {assetAssignments[mapAssetDetails.id] || 'Unassigned'}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Assign to Operator</label>
                  <Select 
                    value={bulkAssignmentOperator} 
                    onValueChange={setBulkAssignmentOperator}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {operators.map(operator => (
                        <SelectItem key={operator.id} value={operator.id}>
                          {operator.contact_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setMapAssignmentModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (bulkAssignmentOperator) {
                        handleAssigneeChange(mapAssetDetails.id, bulkAssignmentOperator);
                        setMapAssignmentModal(false);
                        setBulkAssignmentOperator('');
                      }
                    }}
                    disabled={!bulkAssignmentOperator}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Assignment Panel */}
        <Dialog open={assignmentPanelOpen} onOpenChange={setAssignmentPanelOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                Bulk Assignment
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Assign {selectedMapAssets.length} selected assets to an operator
                </p>
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2 text-xs">
                  {selectedMapAssets.map(assetId => {
                    const asset = monitoringAssets.find(a => a.id === assetId);
                    return asset ? (
                      <div key={assetId} className="flex justify-between py-1">
                        <span>{asset.assetName}</span>
                        <span className="text-gray-500">{asset.area}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Operator</label>
                <Select 
                  value={bulkAssignmentOperator} 
                  onValueChange={setBulkAssignmentOperator}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map(operator => (
                      <SelectItem key={operator.id} value={operator.id}>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>{operator.contact_name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAssignmentPanelOpen(false);
                    setBulkAssignmentOperator('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkMapAssignment}
                  disabled={!bulkAssignmentOperator || selectedMapAssets.length === 0}
                >
                  Assign {selectedMapAssets.length} Assets
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