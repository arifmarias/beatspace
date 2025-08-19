import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, 
  Plus, 
  Eye, 
  Edit,
  Edit3,
  X,
  XCircle,
  MapPin, 
  Calendar,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  Users,
  TrendingUp,
  FileText,
  Download,
  Star,
  MessageSquare,
  MoreVertical,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  List,
  Map,
  FolderOpen,
  Activity,
  Tag,
  CalendarDays,
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DashboardLoading } from './ui/loading';
import { generateCampaignPDF } from '../utils/pdfGenerator';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import NotificationBell from './ui/notification-bell';
import { useNotifications } from '../contexts/NotificationContext';
import { getAuthHeaders, logout, getUser, isAuthenticated, getToken } from '../utils/auth';
import { useWebSocket, getWebSocketUserId, WEBSOCKET_EVENTS } from '../utils/websocket';
import { useNavigate, useLocation } from 'react-router-dom';
import RequestsCategoryTabs from './RequestsCategoryTabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getUser();
  const [campaigns, setCampaigns] = useState([]);
  const [requestedOffers, setRequestedOffers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [campaignAssets, setCampaignAssets] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showEditOfferDialog, setShowEditOfferDialog] = useState(false);
  const [selectedAssetForEdit, setSelectedAssetForEdit] = useState(null); // Add state for asset data
  const [showPOUploadModal, setShowPOUploadModal] = useState(false);
  const [selectedOfferForPO, setSelectedOfferForPO] = useState(null);
  const [uploadingPO, setUploadingPO] = useState(false);
  const [showCongratulationsModal, setShowCongratulationsModal] = useState(false);
  const [congratulationsData, setCongratulationsData] = useState({});
  
  // Monitoring Service State
  const [monitoringServices, setMonitoringServices] = useState([]);
  const [monitoringReports, setMonitoringReports] = useState([]);
  const [showMonitoringSubscription, setShowMonitoringSubscription] = useState(false);
  const [monitoringFrequency, setMonitoringFrequency] = useState('weekly');
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    in_app: true,
    whatsapp: false
  });
  
  // Monitoring Subscription Form State
  const [monitoringFormData, setMonitoringFormData] = useState({
    frequency: 'monthly',
    startDate: null,
    endDate: null,
    selectedAssets: [],
    serviceLevel: 'basic',
    notificationPreferences: {
      email: true,
      in_app: true,
      whatsapp: false
    }
  });
  const [campaignAssetsForMonitoring, setCampaignAssetsForMonitoring] = useState([]);
  const [monitoringSubmitting, setMonitoringSubmitting] = useState(false);
  
  // Initialize activeTab based on URL parameter, default to 'my-assets'
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl === 'requested-offers') return 'requested-offers';
    if (tabFromUrl === 'campaigns') return 'campaigns';
    return 'my-assets'; // Default to My Assets tab
  });

  // My Assets state
  const [liveAssets, setLiveAssets] = useState([]);
  const [myAssetsView, setMyAssetsView] = useState('list');
  const [selectedMapAsset, setSelectedMapAsset] = useState(null); // 'list', 'map', 'campaign'
  
  // Cancel request dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [offerToCancel, setOfferToCancel] = useState(null);
  
  // Monitoring Dialog state
  const [selectedAssetMonitoring, setSelectedAssetMonitoring] = useState(null);
  const [monitoringData, setMonitoringData] = useState(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  
  // Image modal states for monitoring dialog
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [requestedOffersLoading, setRequestedOffersLoading] = useState(false); // Loading state for requested offers refresh
  const [selectedOfferDetails, setSelectedOfferDetails] = useState(null); // For asset details dialog

  // Pagination and search state for Campaigns
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignCurrentPage, setCampaignCurrentPage] = useState(1);
  const [campaignItemsPerPage] = useState(5);

  // Pagination and search state for Requested Offers  
  const [offerSearch, setOfferSearch] = useState('');
  const [offerCurrentPage, setOfferCurrentPage] = useState(1);
  const [offerItemsPerPage] = useState(5);

  // Pagination and search state for My Assets
  const [assetsCurrentPage, setAssetsCurrentPage] = useState(1);
  const [assetsItemsPerPage] = useState(5);

  // Collapsible state for Requested Offers - default to collapsed
  const [collapsedCampaigns, setCollapsedCampaigns] = useState({});

  // Notification system
  const { notifications, addNotification, markAsRead, clearAll } = useNotifications();
  const { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning } = useNotifications();
  
  // Create a notify object for backward compatibility
  const notify = {
    success: notifySuccess,
    error: notifyError,
    info: notifyInfo,
    warning: notifyWarning
  };

  // Handle PO upload for buyers
  const handlePOUpload = async (offerId, file) => {
    try {
      if (!file || file.type !== 'application/pdf') {
        notify.error('Please select a PDF file');
        return;
      }

      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaded_by', 'buyer');

      await axios.post(
        `${API}/offers/${offerId}/upload-po`,
        formData,
        {
          headers: {
            ...headers,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      notify.success('PO uploaded successfully! Waiting for admin approval.');
      
      // Refresh buyer data
      await fetchBuyerData();
      if (activeTab === 'requested-offers') {
        fetchRequestedOffers();
      }

    } catch (error) {
      console.error('Error uploading PO:', error);
      notify.error('Failed to upload PO: ' + (error.response?.data?.detail || error.message));
    }
  };

  // WebSocket connection for real-time updates with enhanced notifications
  const handleWebSocketMessage = (message) => {
    console.log('🔔 Buyer Dashboard: Received real-time update:', message);
    
    // Only handle messages if WebSocket connection is stable
    if (!isConnected) {
      console.warn('⚠️ Buyer Dashboard: Ignoring WebSocket message - connection not stable');
      return;
    }
    
    // Debounce refresh calls using setTimeout to prevent rapid successive calls
    const scheduleRefresh = () => {
      setTimeout(() => {
        console.log('🔄 Buyer Dashboard: Scheduled refresh triggered after WebSocket event');
        if (typeof fetchRequestedOffers === 'function') {
          fetchRequestedOffers();
        }
      }, 2000); // Increased to 2 second delay for more stability
    };
    
    switch (message.type) {
      case WEBSOCKET_EVENTS.OFFER_QUOTED:
        notifySuccess(
          'New Price Quote! 💰',
          `Price quote received: ৳${message.price?.toLocaleString()} for ${message.asset_name}`
        );
        scheduleRefresh();
        break;
        
      case WEBSOCKET_EVENTS.ASSET_STATUS_CHANGED:
        notifyInfo(
          'Asset Status Updated',
          `Status changed for ${message.asset_name}`
        );
        scheduleRefresh();
        break;
        
      case WEBSOCKET_EVENTS.CONNECTION_STATUS:
        console.log(`📊 WebSocket Status: ${message.message} (${message.active_connections} active)`);
        break;
        
      default:
        console.log('📥 Unknown message type:', message.type);
    }
  };

  const websocketUserId = currentUser?.email || 'buyer'; // Use email or fallback to 'buyer'
  const { isConnected, connectionCount, sendMessage, userInfo, error } = useWebSocket(websocketUserId, handleWebSocketMessage);

  // Edit offer form state - same structure as MarketplacePage
  const [editOfferDetails, setEditOfferDetails] = useState({
    campaignType: 'existing', // Default to existing for edits
    campaignName: '',
    existingCampaignId: '',
    contractDuration: '1_month',
    tentativeStartDate: null,
    assetExpirationDate: null,
    serviceBundles: {
      printing: false,
      setup: false,
      monitoring: false
    },
    monitoringServiceLevel: 'basic', // Add monitoring service level
    specialRequirements: '',
    notes: '',
    customStartDate: null,
    customEndDate: null,
    customDurationDays: null
  });
  
  // Creative editing state
  const [editingCreative, setEditingCreative] = useState(null); // Asset ID being edited
  const [creativeForm, setCreativeForm] = useState({
    tags: '',
    timeline: null
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Map filter state
  const [mapFilters, setMapFilters] = useState({
    assetType: 'all',
    location: 'all'
  });
  
  // Asset list display state
  const [showAllMapAssets, setShowAllMapAssets] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    budget: '',
    notes: '',
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    console.log('🚨 BuyerDashboard component mounted/updated');
    console.log('🚨 Current requested offers:', requestedOffers);
    
    // Add global test functions for debugging
    window.debugDeleteOffer = (offerId) => {
      console.log('🧪 GLOBAL DELETE TEST called with:', offerId);
      if (window.confirm('Global delete test - proceed?')) {
        deleteOfferRequest(offerId);
      }
    };
    
    window.debugEditOffer = (offer) => {
      console.log('🧪 GLOBAL EDIT TEST called with:', offer);
      editOfferRequest(offer);
    };
    
    fetchBuyerData();
  }, []);

  // State to track if we've fetched assets for this session
  const [assetsFetched, setAssetsFetched] = useState(false);

  // Refresh assets when switching to My Assets tab
  useEffect(() => {
    if (activeTab === 'my-assets' && isAuthenticated()) {
      if (!assetsFetched) {
        fetchLiveAssets();
        setAssetsFetched(true);
      } else {
        // Always refresh when switching to My Assets to ensure latest data (no spinner)
        fetchLiveAssets(false, false);  // Background refresh without spinner
      }
    }
  }, [activeTab, assetsFetched]);

  // Additional effect to refresh assets when coming back from campaigns tab
  useEffect(() => {
    // If user switches from campaigns tab to my-assets tab, always refresh
    if (activeTab === 'my-assets' && assetsFetched) {
      const timeoutId = setTimeout(() => {
        fetchAssetsOnly(); // Subtle refresh without loading spinner
      }, 100); // Small delay to avoid rapid successive calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab]);

  // Additional effect to refresh campaigns when switching to campaigns tab
  useEffect(() => {
    if (activeTab === 'campaigns' && isAuthenticated()) {
      const timeoutId = setTimeout(() => {
        fetchCampaignsOnly(); // Subtle refresh without full page loading
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab]);

  // Additional effect to refresh requested offers when switching to requested offers tab
  useEffect(() => {
    if (activeTab === 'requested-offers' && isAuthenticated()) {
      const timeoutId = setTimeout(() => {
        fetchRequestedOffers(); // Refresh requested offers data
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab]);

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch essential data in parallel
      const [campaignsRes, offersRes] = await Promise.all([
        axios.get(`${API}/campaigns`, { headers }),
        axios.get(`${API}/offers/requests`, { headers })
      ]);
      
      setCampaigns(campaignsRes.data || []);
      console.log('🚨 FETCHED OFFERS RAW:', offersRes.data);
      
      // Set basic offers data immediately without enrichment for faster loading
      const basicOffers = offersRes.data || [];
      setRequestedOffers(basicOffers);
      console.log('🚨 OFFERS SET TO STATE INITIALLY:', basicOffers);

      // Calculate stats immediately with basic data
      const campaignData = campaignsRes.data || [];  
      const offerData = offersRes.data || [];
      const totalCampaigns = campaignData.length;
      const activeCampaigns = campaignData.filter(c => c.status === 'Live').length;
      const pendingCampaigns = campaignData.filter(c => c.status === 'Pending Offer' || c.status === 'Negotiating').length;
      const totalBudget = campaignData.reduce((sum, c) => sum + (c.budget || 0), 0);
      // Only count offers that are actually shown in the display (same filtering as getFilteredOffers)
      const totalOfferRequests = offerData.filter(offer => 
        // Hide cancelled and rejected offers from count (same as display filter)
        offer.status !== 'Rejected' && 
        offer.status !== 'Cancelled' &&
        offer.status !== 'rejected' &&
        offer.status !== 'cancelled' &&
        // Exclude approved/accepted offers from the requested offers count
        offer.status !== 'Approved' && 
        offer.status !== 'Accepted'
      ).length;

      setStats({
        totalCampaigns,
        activeCampaigns,
        pendingCampaigns,
        totalBudget,
        totalOfferRequests
      });

      // Load secondary data asynchronously after initial load
      setTimeout(() => {
        fetchMonitoringServices();
        
        // Enrich offers with pricing data in background (non-blocking)
        enrichOffersWithPricing(basicOffers);
      }, 100);
      
    } catch (error) {
      console.error('Error fetching buyer data:', error);
      // Set default empty states on error
      setCampaigns([]);
      setRequestedOffers([]);
      setStats({
        totalCampaigns: 0,
        activeCampaigns: 0,
        pendingCampaigns: 0,
        totalBudget: 0,
        totalOfferRequests: 0
      });
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to enrich offers with pricing data asynchronously
  const enrichOffersWithPricing = async (offers) => {
    try {
      const enrichedOffers = await Promise.all(offers.map(async (offer) => {
        try {
          // Fetch asset details to get pricing
          const assetRes = await axios.get(`${API}/assets/public`);
          const allAssets = assetRes.data || [];
          const assetDetails = allAssets.find(asset => asset.id === offer.asset_id);
          
          return {
            ...offer,
            asset_pricing: assetDetails?.pricing || null
          };
        } catch (error) {
          console.error('Error fetching asset pricing for offer:', offer.id, error);
          return offer; // Return offer without pricing if fetch fails
        }
      }));
      
      setRequestedOffers(enrichedOffers);
      console.log('🚨 OFFERS ENRICHED WITH PRICING:', enrichedOffers);
    } catch (error) {
      console.error('Error enriching offers with pricing:', error);
    }
  };

  // Fetch requested offers only (sectional refresh)
  const fetchRequestedOffers = async () => {
    try {
      setRequestedOffersLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch requested offers
      const offersRes = await axios.get(`${API}/offers/requests`, { headers });
      console.log('🔄 REFRESHED OFFERS RAW:', offersRes.data);
      
      // Enrich offers with asset pricing data
      const enrichedOffers = await Promise.all((offersRes.data || []).map(async (offer) => {
        try {
          // Fetch asset details to get pricing
          const assetRes = await axios.get(`${API}/assets/public`);
          const allAssets = assetRes.data || [];
          const assetDetails = allAssets.find(asset => asset.id === offer.asset_id);
          
          return {
            ...offer,
            asset_pricing: assetDetails?.pricing || null
          };
        } catch (error) {
          console.error('Error fetching asset pricing for offer:', offer.id, error);
          return offer; // Return offer without pricing if fetch fails
        }
      }));
      
      setRequestedOffers(enrichedOffers);
      console.log('✅ OFFERS REFRESHED WITH PRICING:', enrichedOffers);
      
    } catch (error) {
      console.error('Error refreshing requested offers:', error);
      notify.error('Failed to refresh requested offers');
    } finally {
      setRequestedOffersLoading(false);
    }
  };

  const fetchLiveAssets = async (isManualRefresh = false, showSpinner = true) => {
    console.log('🔄 fetchLiveAssets called', isManualRefresh ? '(manual refresh)' : '');
    
    // Only show spinner for initial loads, not for background refreshes
    if (showSpinner && (liveAssets.length === 0 || isManualRefresh)) {
      setAssetsLoading(true);
    }
    
    // Set a shorter timeout for better UX
    const timeoutId = setTimeout(() => {
      console.log('⏰ API call timeout - stopping loading');
      if (showSpinner) {
        setAssetsLoading(false);
      }
    }, 5000); // Reduced to 5 seconds
    
    try {
      const token = getToken();
      if (!token) {
        console.error('❌ No auth token found');
        setLiveAssets([]);
        return;
      }
      
      const headers = getAuthHeaders();
      console.log('🔑 Auth headers:', headers);
      
      console.log('📡 Calling API:', `${API}/assets/live`);
      
      // Use the dedicated live assets API - this now includes all necessary data
      const response = await axios.get(`${API}/assets/live`, { headers });
      console.log('✅ API response:', response);
      
      const liveAssetsData = response.data || [];
      console.log('📊 Live assets data:', liveAssetsData);
      
      // Set assets immediately - monitoring data now included in main response
      setLiveAssets(liveAssetsData);
      
      console.log('✅ Live assets fetched successfully:', liveAssetsData.length, 'assets');
      console.log('📊 Live assets details:', liveAssetsData.map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        campaignName: a.campaignName
      })));
      
      // Fetch monitoring services in background (non-blocking)
      setTimeout(() => {
        fetchMonitoringServices();
      }, 100);
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      
    } catch (error) {
      console.error('❌ Error in fetchLiveAssets:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      setLiveAssets([]);
      
      // Clear timeout on error
      clearTimeout(timeoutId);
    } finally {
      if (showSpinner && (liveAssets.length === 0 || isManualRefresh)) {
        setAssetsLoading(false);
      }
    }
  };


  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  const downloadCampaignPDF = async (campaign) => {
    try {
      // Fetch campaign assets
      const headers = getAuthHeaders();
      const assetsResponse = await axios.get(`${API}/assets/public`, { headers });
      const allAssets = assetsResponse.data || [];
      
      // Get assets for this campaign
      const campaignAssets = [];
      if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
        for (const campaignAsset of campaign.campaign_assets) {
          const asset = allAssets.find(a => a.id === campaignAsset.asset_id);
          if (asset) {
            campaignAssets.push(asset);
          }
        }
      }
      
      // Generate PDF
      generateCampaignPDF(campaign, campaignAssets);
      notify.success('Campaign draft PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      notify.error('Failed to generate PDF. Please try again.');
    }
  };

  // Subtle refresh functions without full page loading
  const fetchCampaignsOnly = async () => {
    try {
      const headers = getAuthHeaders();
      const campaignsRes = await axios.get(`${API}/campaigns`, { headers });
      setCampaigns(campaignsRes.data || []);
      console.log('✅ Campaigns refreshed subtly');
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
    }
  };

  const fetchAssetsOnly = async () => {
    try {
      await fetchLiveAssets(true, false); // Manual refresh but no spinner
      console.log('✅ Assets refreshed subtly');
    } catch (error) {
      console.error('Error refreshing assets:', error);
    }
  };

  const updateCampaignStatus = async (campaignId, newStatus) => {
    try {
      const headers = getAuthHeaders();
      
      await axios.put(`${API}/campaigns/${campaignId}/status`, {
        status: newStatus
      }, { headers });
      
      // Refresh data
      fetchBuyerData();
      
      alert(`Campaign status updated to ${newStatus} successfully!`);
      
    } catch (error) {
      console.error('Error updating campaign status:', error);
      alert('Failed to update campaign status. Please try again.');
    }
  };

  const removeAssetFromCampaign = async (assetId) => {
    if (!selectedCampaign) return;
    
    try {
      const headers = getAuthHeaders();
      
      // Remove asset from campaign
      const updatedAssets = (selectedCampaign.assets || []).filter(id => id !== assetId);
      
      await axios.put(`${API}/campaigns/${selectedCampaign.id}`, {
        assets: updatedAssets
      }, { headers });
      
      // Refresh campaign assets
      fetchCampaignAssets(selectedCampaign);
      fetchBuyerData(); // Refresh campaign list
      
      // Show success message
      alert('Asset removed from campaign successfully!');
      
    } catch (error) {
      console.error('Error removing asset from campaign:', error);
      alert('Failed to remove asset from campaign. Please try again.');
    }
  };

  const fetchCampaignAssets = async (campaign) => {
    try {
      console.log('🚀 OPTIMIZED: Fetching assets for campaign:', campaign.name, 'ID:', campaign.id);
      
      const headers = getAuthHeaders();
      
      // Use the new optimized campaign assets endpoint
      const response = await axios.get(`${API}/campaigns/${campaign.id}/assets`, { headers });
      const campaignAssetsList = response.data || [];
      
      console.log('✅ OPTIMIZED: Fetched campaign assets directly:', campaignAssetsList.length);
      setCampaignAssets(campaignAssetsList);
      
    } catch (error) {
      console.error('❌ Error fetching campaign assets:', error);
      
      // Fallback to the old method if the new endpoint fails
      console.log('⚠️ Falling back to old method...');
      
      try {
        // Fetch all public assets (fallback)
        const assetsResponse = await axios.get(`${API}/assets/public`);
        const allAssets = assetsResponse.data || [];
        
        // Start with assets that are in the campaign_assets array (new structure)
        let campaignAssetsList = [];
        
        // Check for new campaign_assets structure first
        if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
          campaignAssetsList = campaign.campaign_assets.map(campaignAsset => {
            const asset = allAssets.find(a => a.id === campaignAsset.asset_id);
            if (asset) {
              return {
                ...asset,
                asset_start_date: campaignAsset.asset_start_date,
                asset_expiration_date: campaignAsset.asset_expiration_date,
                isInCampaign: true
              };
            }
            return null;
          }).filter(Boolean);
        }
        // Fallback to old assets array structure
        else if (campaign.assets && campaign.assets.length > 0) {
          campaignAssetsList = allAssets.filter(asset => 
            campaign.assets.includes(asset.id)
          );
        }
        
        console.log('🚨 Direct campaign assets (fallback):', campaignAssetsList.length);
        
        // For both Draft AND Live campaigns, include assets that have pending offer requests
        if (campaign.status === 'Draft' || campaign.status === 'Live') {
          const headers = getAuthHeaders();
          const offersResponse = await axios.get(`${API}/offers/requests`, { headers });
          const allOfferRequests = offersResponse.data || [];
          
          // Find offer requests for this campaign (include all active statuses)
          // Match by either campaign ID or campaign name (for backward compatibility)
          const campaignOfferRequests = allOfferRequests.filter(offer => 
            (offer.existing_campaign_id === campaign.id || offer.campaign_name === campaign.name) && 
            (offer.status === 'Pending' || offer.status === 'Processing' || offer.status === 'In Process' || 
             offer.status === 'Quoted' || offer.status === 'Accepted' || offer.status === 'Approved')
          );
          
          console.log('🚨 Found offer requests for campaign (fallback):', campaignOfferRequests.length);
          
          // Add assets from offer requests that aren't already in the campaign
          campaignOfferRequests.forEach(offer => {
            const requestedAsset = allAssets.find(asset => asset.id === offer.asset_id);
            if (requestedAsset && !campaignAssetsList.find(existing => existing.id === requestedAsset.id)) {
              // Mark this asset as "requested" so we can display it differently
              requestedAsset.isRequested = true;
              requestedAsset.offerStatus = offer.status;
              requestedAsset.offerId = offer.id;
              campaignAssetsList.push(requestedAsset);
            }
          });
        }
        
        console.log('🚨 Total campaign assets (including requested - fallback):', campaignAssetsList.length);
        setCampaignAssets(campaignAssetsList);
        
      } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
        setCampaignAssets([]);
      }
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const headers = getAuthHeaders();
      
      const campaignData = {
        ...campaignForm,
        buyer_id: currentUser.id,
        buyer_name: currentUser.company_name,
        asset_ids: [], // Will be populated when assets are selected
        budget: parseFloat(campaignForm.budget) || 0,
        start_date: campaignForm.startDate ? campaignForm.startDate.toISOString() : null,
        end_date: campaignForm.endDate ? campaignForm.endDate.toISOString() : null
      };

      const response = await axios.post(`${API}/campaigns`, campaignData, { headers });
      const newCampaign = response.data;
      
      // Store campaign context for marketplace pre-population
      sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
        id: newCampaign.id,
        name: newCampaign.name,
        end_date: newCampaign.end_date
      }));
      
      // Close dialog and reset form
      setShowCreateCampaign(false);
      setCampaignForm({
        name: '',
        description: '',
        budget: '',
        notes: '',
        startDate: null,
        endDate: null
      });
      
      // Show success message and redirect to marketplace
      notify.success(`Campaign "${newCampaign.name}" created successfully! Let's add your first asset...`);
      
      // Redirect to marketplace with campaign context for immediate asset selection
      navigate(`/marketplace?campaign=${newCampaign.id}&newCampaign=true`);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      notify.error('Failed to create campaign. Please try again.');
    }
  };

  const editCampaign = (campaign) => {
    console.log('Editing campaign:', campaign);
    
    // Populate form with existing campaign data
    setCampaignForm({
      name: campaign.name || '',
      description: campaign.description || '',
      budget: campaign.budget?.toString() || '',
      notes: campaign.notes || '',
      startDate: campaign.start_date ? new Date(campaign.start_date) : null,
      endDate: campaign.end_date ? new Date(campaign.end_date) : null
    });
    
    setEditingCampaign(campaign);
    setShowEditCampaign(true);
  };

  const handleUpdateCampaign = async () => {
    try {
      if (!editingCampaign) {
        alert('Error: No campaign selected for editing');
        return;
      }

      const headers = getAuthHeaders();
      
      const updateData = {
        name: campaignForm.name,
        description: campaignForm.description,
        budget: parseFloat(campaignForm.budget) || 0,
        notes: campaignForm.notes,
        start_date: campaignForm.startDate ? campaignForm.startDate.toISOString() : null,
        end_date: campaignForm.endDate ? campaignForm.endDate.toISOString() : null
      };

      await axios.put(`${API}/campaigns/${editingCampaign.id}`, updateData, { headers });
      notify.success('Campaign updated successfully!');
      
      setShowEditCampaign(false);
      setEditingCampaign(null);
      setCampaignForm({
        name: '',
        description: '',
        budget: '',
        notes: '',
        startDate: null,
        endDate: null
      });
      fetchBuyerData();
      
    } catch (error) {
      console.error('Error updating campaign:', error);
      notify.error('Failed to update campaign. Please try again.');
    }
  };

  const deleteCampaign = async (campaign) => {
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete the campaign "${campaign.name}"?\n\nThis action cannot be undone and will also delete any associated offer requests.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/campaigns/${campaign.id}`, { headers });
      notify.success(`Campaign "${campaign.name}" deleted successfully!`);
      
      fetchBuyerData(); // Refresh the campaign list
      
    } catch (error) {
      console.error('Error deleting campaign:', error);
      notify.error('Failed to delete campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Helper functions for filtering and pagination
  const getFilteredCampaigns = () => {
    return (campaigns || []).filter(campaign =>
      campaign.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      campaign.status.toLowerCase().includes(campaignSearch.toLowerCase())
    );
  };

  const getPaginatedCampaigns = () => {
    const filtered = getFilteredCampaigns();
    const start = (campaignCurrentPage - 1) * campaignItemsPerPage;
    const end = start + campaignItemsPerPage;
    return filtered.slice(start, end);
  };

  const getCampaignTotalPages = () => {
    return Math.ceil(getFilteredCampaigns().length / campaignItemsPerPage);
  };

  const getFilteredOffers = () => {
    return (requestedOffers || []).filter(offer => {
      // Hide cancelled and rejected offers from buyer view (same as display filter)
      const isNotCancelled = offer.status !== 'Rejected' && 
                             offer.status !== 'Cancelled' &&
                             offer.status !== 'rejected' &&
                             offer.status !== 'cancelled';
      
      // Exclude approved/accepted offers from the requested offers list
      const isNotApproved = offer.status !== 'Approved' && offer.status !== 'Accepted';
      
      // Apply search filter
      const matchesSearch = offer.asset_name.toLowerCase().includes(offerSearch.toLowerCase()) ||
                           offer.campaign_name.toLowerCase().includes(offerSearch.toLowerCase()) ||
                           offer.status.toLowerCase().includes(offerSearch.toLowerCase());
                           
      return isNotCancelled && isNotApproved && matchesSearch;
    });
  };

  const getGroupedAndFilteredOffers = () => {
    const filtered = getFilteredOffers();
    const grouped = {};
    
    filtered.forEach(offer => {
      const campaignName = offer.campaign_name || 'Unknown Campaign';
      if (!grouped[campaignName]) {
        grouped[campaignName] = [];
      }
      grouped[campaignName].push(offer);
    });

    // Apply pagination to grouped offers
    const entries = Object.entries(grouped);
    const start = (offerCurrentPage - 1) * offerItemsPerPage;
    const end = start + offerItemsPerPage;
    
    return Object.fromEntries(entries.slice(start, end));
  };

  const getOfferTotalPages = () => {
    const filtered = getFilteredOffers();
    const grouped = {};
    filtered.forEach(offer => {
      const campaignName = offer.campaign_name || 'Unknown Campaign';
      if (!grouped[campaignName]) {
        grouped[campaignName] = [];
      }
      grouped[campaignName].push(offer);
    });
    
    return Math.ceil(Object.keys(grouped).length / offerItemsPerPage);
  };

  const toggleCampaignCollapse = (campaignName) => {
    setCollapsedCampaigns(prev => ({
      ...prev,
      [campaignName]: prev[campaignName] === false ? true : false // Toggle between collapsed (true) and expanded (false)
    }));
  };

  // Helper functions for My Assets pagination
  const getPaginatedAssets = () => {
    const filteredAssets = getFilteredAssets();
    const start = (assetsCurrentPage - 1) * assetsItemsPerPage;
    const end = start + assetsItemsPerPage;
    return filteredAssets.slice(start, end);
  };

  const getAssetsTotalPages = () => {
    const filteredAssets = getFilteredAssets();
    return Math.ceil(filteredAssets.length / assetsItemsPerPage);
  };

  // Helper function to get monitoring subscription for an asset
  const getAssetMonitoringSubscription = (assetId) => {
    // Ensure monitoringServices is an array before using .find()
    if (!Array.isArray(monitoringServices)) {
      return null;
    }
    return monitoringServices.find(service => 
      service.asset_ids && service.asset_ids.includes(assetId)
    );
  };

  // Helper function to get monitoring button text and state
  const getMonitoringButtonInfo = (assetId) => {
    // Safety check for assetId
    if (!assetId) {
      return {
        text: 'Subscribe to Monitoring',
        subscribed: false,
        disabled: false,
        variant: 'default',
        className: 'bg-blue-600 hover:bg-blue-700 text-white'
      };
    }

    // Check for active monitoring subscription first
    const subscription = getAssetMonitoringSubscription(assetId);
    if (subscription) {
      const frequency = subscription.frequency || 'monthly';
      return {
        text: `Subscribed (${frequency.charAt(0).toUpperCase() + frequency.slice(1)})`,
        subscribed: true,
        disabled: true, // Disable subscribed buttons
        variant: 'outline',
        className: 'text-green-600 border-green-300 bg-green-50 cursor-not-allowed opacity-75'
      };
    }

    // Check for pending monitoring service request
    const monitoringRequest = requestedOffers.find(offer => 
      offer.request_type === 'monitoring_service' && 
      offer.service_details?.asset_ids?.includes(assetId) &&
      ['Pending', 'Quoted', 'PO Required', 'PO Uploaded'].includes(offer.status)
    );

    if (monitoringRequest) {
      let statusText = '';
      switch (monitoringRequest.status) {
        case 'Pending':
          statusText = 'Pending Admin Review';
          break;
        case 'Quoted':
          statusText = 'Quoted - Awaiting PO';
          break;
        case 'PO Required':
          statusText = 'PO Required';
          break;
        case 'PO Uploaded':
          statusText = 'Awaiting Activation';
          break;
        default:
          statusText = 'Under Review';
      }
      
      return {
        text: statusText,
        subscribed: false,
        disabled: true,
        variant: 'outline',
        className: 'text-orange-600 border-orange-300 bg-orange-50 cursor-not-allowed opacity-75'
      };
    }

    return {
      text: 'Subscribe to Monitoring',
      subscribed: false,
      disabled: false,
      variant: 'default',
      className: 'bg-blue-600 hover:bg-blue-700 text-white'
    };
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

  const getPaginatedCampaignAssets = () => {
    // Group assets by campaign first
    const groupedAssets = {};
    liveAssets.forEach(asset => {
      const campaignName = asset.campaignName || 'Unknown Campaign';
      if (!groupedAssets[campaignName]) {
        groupedAssets[campaignName] = [];
      }
      groupedAssets[campaignName].push(asset);
    });

    // Apply pagination to campaign groups
    const campaignKeys = Object.keys(groupedAssets);
    const start = (assetsCurrentPage - 1) * assetsItemsPerPage;
    const end = start + assetsItemsPerPage;
    const paginatedKeys = campaignKeys.slice(start, end);
    
    const paginatedGroups = {};
    paginatedKeys.forEach(key => {
      paginatedGroups[key] = groupedAssets[key];
    });
    
    return paginatedGroups;
  };

  const getCampaignAssetsTotalPages = () => {
    const groupedAssets = {};
    liveAssets.forEach(asset => {
      const campaignName = asset.campaignName || 'Unknown Campaign';
      if (!groupedAssets[campaignName]) {
        groupedAssets[campaignName] = [];
      }
      groupedAssets[campaignName].push(asset);
    });
    return Math.ceil(Object.keys(groupedAssets).length / assetsItemsPerPage);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Pending Offer': 'bg-yellow-100 text-yellow-800',
      'Negotiating': 'bg-blue-100 text-blue-800',
      'Approved': 'bg-green-100 text-green-800',
      'Live': 'bg-purple-100 text-purple-800',
      'Completed': 'bg-slate-100 text-slate-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate asset price based on duration
  const calculateAssetPrice = (offer) => {
    // Asset pricing should come from the asset database via asset_pricing field
    if (!offer.asset_pricing) {
      return 'N/A'; // If pricing info not available
    }
    
    const pricing = offer.asset_pricing;
    const duration = offer.contract_duration;
    
    let calculatedPrice = 0;
    
    switch (duration) {
      case '1_week':
        calculatedPrice = pricing.weekly_rate || 0;
        break;
      case '2_weeks':
        calculatedPrice = (pricing.weekly_rate || 0) * 2;
        break;
      case '1_month':
        calculatedPrice = pricing.monthly_rate || (pricing.weekly_rate || 0) * 4;
        break;
      case '3_months':
        calculatedPrice = (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 3;
        break;
      case '6_months':
        calculatedPrice = (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 6;
        break;
      case '12_months':
      case '1_year':
        calculatedPrice = pricing.yearly_rate || (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 12;
        break;
      default:
        calculatedPrice = 0;
    }
    
    return calculatedPrice;
  };

  // Compare user offer with asset price
  const getPriceComparison = (offer) => {
    const assetPrice = calculateAssetPrice(offer);
    const userOffer = offer.estimated_budget || 0;
    
    if (assetPrice === 'N/A') return null;
    
    const difference = userOffer - assetPrice;
    const percentDiff = ((difference / assetPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return { type: 'higher', text: `+${percentDiff}%`, color: 'text-green-600' };
    } else if (difference < 0) {
      return { type: 'lower', text: `${percentDiff}%`, color: 'text-red-600' };
    } else {
      return { type: 'equal', text: 'Match', color: 'text-gray-600' };
    }
  };

  // Asset expiration calculation functions for edit form
  const calculateAssetExpirationDate = (startDate, contractDuration, customEndDate = null) => {
    if (!startDate) return null;
    
    // If custom duration is selected, use the custom end date
    if (contractDuration === 'custom' && customEndDate) {
      return customEndDate;
    }
    
    const start = new Date(startDate);
    let expirationDate = new Date(start);
    
    switch (contractDuration) {
      case '1_month':
        expirationDate.setMonth(start.getMonth() + 1);
        break;
      case '3_months':
        expirationDate.setMonth(start.getMonth() + 3);
        break;
      case '6_months':
        expirationDate.setMonth(start.getMonth() + 6);
        break;
      case '12_months':
        expirationDate.setFullYear(start.getFullYear() + 1);
        break;
      default:
        expirationDate.setMonth(start.getMonth() + 3);
        break;
    }
    
    return expirationDate;
  };

  const updateEditAssetExpirationDate = () => {
    console.log('🚨 updateEditAssetExpirationDate called');
    
    // Get current state values
    const currentDetails = editOfferDetails;
    console.log('🚨 Current tentativeStartDate:', currentDetails.tentativeStartDate);
    console.log('🚨 Current contractDuration:', currentDetails.contractDuration);
    
    let startDate = null;
    let campaignEndDate = null;
    
    // Always use tentativeStartDate as the asset start date
    if (currentDetails.tentativeStartDate) {
      startDate = currentDetails.tentativeStartDate;
    }
    
    // Check campaign end date for existing campaigns
    if (currentDetails.existingCampaignId && currentDetails.selectedCampaignEndDate) {
      campaignEndDate = new Date(currentDetails.selectedCampaignEndDate);
    }
    
    if (startDate && currentDetails.contractDuration) {
      const assetExpiration = calculateAssetExpirationDate(startDate, currentDetails.contractDuration, currentDetails.customEndDate);
      console.log('🚨 Calculated assetExpiration:', assetExpiration);
      
      // Check if asset expiration exceeds campaign end date
      if (campaignEndDate && assetExpiration > campaignEndDate) {
        // Asset expiration cannot exceed campaign end date
        setEditOfferDetails(prev => ({
          ...prev,
          assetExpirationDate: campaignEndDate,
          expirationWarning: `Asset expiration adjusted to campaign end date (${campaignEndDate.toLocaleDateString()})`
        }));
        console.log('🚨 Set to campaign end date:', campaignEndDate);
      } else {
        setEditOfferDetails(prev => ({
          ...prev,
          assetExpirationDate: assetExpiration,
          expirationWarning: null
        }));
        console.log('🚨 Set to calculated expiration:', assetExpiration);
      }
    } else {
      console.log('🚨 Missing startDate or contractDuration, clearing expiration');
      setEditOfferDetails(prev => ({
        ...prev,
        assetExpirationDate: null,
        expirationWarning: null
      }));
    }
  };

  // Update asset expiration whenever relevant fields change in edit form
  useEffect(() => {
    console.log('🚨 useEffect triggered for asset expiration calculation');
    console.log('🚨 showEditOfferDialog:', showEditOfferDialog);
    console.log('🚨 tentativeStartDate:', editOfferDetails.tentativeStartDate);
    console.log('🚨 contractDuration:', editOfferDetails.contractDuration);
    
    if (showEditOfferDialog && (editOfferDetails.tentativeStartDate || editOfferDetails.contractDuration)) {
      updateEditAssetExpirationDate();
    }
  }, [showEditOfferDialog, editOfferDetails.tentativeStartDate, editOfferDetails.contractDuration, editOfferDetails.customEndDate]);

  // Move button handlers outside JSX to prevent recreation on each render
  const handleEditOffer = (offer) => {
    console.log('🚨 HANDLE EDIT CALLED - offer:', offer?.id);
    
    try {
      editOfferRequest(offer);
    } catch (error) {
      console.error('🚨 Error in handleEditOffer:', error);
      alert('Error in handle edit: ' + error.message);
    }
  };

  const handleDeleteOffer = (offerId, event) => {
    console.log('🚨 DELETE HANDLER CALLED - offer ID:', offerId);
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    try {
      deleteOfferRequest(offerId);
    } catch (error) {
      console.error('🚨 Delete function error:', error);
      alert('Error calling delete function: ' + error.message);
    }
  };

  const deleteOfferRequest = async (offerId) => {
    console.log('🚨 DELETE FUNCTION ENTRY - ID:', offerId);
    
    if (!offerId) {
      console.error('🚨 ERROR: No offer ID provided');
      alert('Error: Cannot delete offer - no ID provided');
      return;
    }
    
    try {
      console.log('🚨 SKIPPING CONFIRMATION FOR TESTING...');
      console.log('🚨 Starting delete request...');
      
      const headers = getAuthHeaders();
      console.log('🚨 Headers obtained:', headers);
      
      if (!headers || !headers.Authorization) {
        console.error('🚨 ERROR: No auth headers available');
        alert('Error: Not authenticated. Please log in again.');
        return;
      }
      
      const deleteUrl = `${API}/offers/requests/${offerId}`;
      console.log('🚨 DELETE URL:', deleteUrl);
      
      console.log('🚨 ABOUT TO MAKE DELETE REQUEST...');
      const response = await axios.delete(deleteUrl, { headers });
      console.log('🚨 DELETE REQUEST COMPLETED - Response:', response);
      
      console.log('🚨 ABOUT TO SHOW SUCCESS ALERT...');
      alert('🎉 OFFER REQUEST DELETED SUCCESSFULLY!');
      console.log('🚨 SUCCESS ALERT CALLED');
      
      console.log('🚨 ABOUT TO REFRESH DATA...');
      await fetchBuyerData();
      setAssetsFetched(false); // Reset flag to allow refresh
      fetchLiveAssets(false, false); // Background refresh without spinner
      console.log('🚨 DATA REFRESH COMPLETED');
      
    } catch (error) {
      console.error('🚨 Delete request failed:', error);
      alert('Failed to delete offer request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editOfferRequest = async (offer) => {
    console.log('🚨 EDIT FUNCTION START - offer received:', offer);
    
    try {
      // Fetch asset data for the selected asset
      const headers = getAuthHeaders();
      const assetResponse = await axios.get(`${API}/assets/public`);
      const allAssets = assetResponse.data || [];
      const assetData = allAssets.find(asset => asset.id === offer.asset_id);
      
      if (!assetData) {
        alert('Error: Could not find asset information');
        return;
      }
      
      // Set the selected asset for display
      setSelectedAssetForEdit(assetData);
      
      // Populate the edit form with existing offer data (removed estimatedBudget)
      setEditOfferDetails({
        campaignType: offer.campaign_type || 'existing',
        campaignName: offer.campaign_name || '',
        existingCampaignId: offer.existing_campaign_id || '',
        assetId: offer.asset_id || '',
        contractDuration: offer.contract_duration || '3_months',
        serviceBundles: {
          printing: offer.service_bundles?.printing || false,
          setup: offer.service_bundles?.setup || false,
          monitoring: offer.service_bundles?.monitoring || false
        },
        monitoringServiceLevel: offer.monitoring_service_level || 'basic', 
        timeline: offer.timeline || '',
        // Try all possible field names for dates
        tentativeStartDate: offer.asset_start_date ? new Date(offer.asset_start_date) : 
                          (offer.tentative_start_date ? new Date(offer.tentative_start_date) : 
                           (offer.created_at ? new Date(offer.created_at) : null)), 
        selectedCampaignEndDate: offer.selected_campaign_end_date ? new Date(offer.selected_campaign_end_date) : null,
        assetExpirationDate: offer.asset_expiration_date ? new Date(offer.asset_expiration_date) : 
                           (offer.tentative_end_date ? new Date(offer.tentative_end_date) : null),
        specialRequirements: offer.special_requirements || '',
        notes: offer.notes || ''
      });
      
      console.log('🚨 ALL OFFER KEYS:', Object.keys(offer));
      console.log('🚨 DATE FIELDS CHECK:');
      console.log('  - asset_start_date:', offer.asset_start_date);
      console.log('  - asset_expiration_date:', offer.asset_expiration_date);
      console.log('  - tentative_start_date:', offer.tentative_start_date);
      console.log('  - tentative_end_date:', offer.tentative_end_date);
      console.log('  - created_at:', offer.created_at);
      console.log('🚨 SERVICE BUNDLES:', offer.service_bundles);
      console.log('🚨 MONITORING LEVEL:', offer.monitoring_service_level);
      
      // Set the offer being edited
      setEditingOffer(offer);
      
      // Show the dialog
      setShowEditOfferDialog(true);
      
      // Trigger asset expiration calculation after state is set
      setTimeout(() => {
        updateEditAssetExpirationDate();
      }, 100);
      
      console.log('🚨 Edit dialog should now be visible');
      console.log('🚨 Asset data set:', assetData);
      console.log('🚨 Offer dates - asset_start_date:', offer.asset_start_date);
      console.log('🚨 Offer dates - asset_expiration_date:', offer.asset_expiration_date);
      
    } catch (error) {
      console.error('🚨 ERROR in editOfferRequest:', error);
      alert('Error preparing edit form: ' + error.message);
    }
  };

  // Calculate asset expiration date (same logic as MarketplacePage)
  useEffect(() => {
    if (editOfferDetails.tentativeStartDate && editOfferDetails.contractDuration) {
      const startDate = new Date(editOfferDetails.tentativeStartDate);
      let expirationDate;
      
      switch (editOfferDetails.contractDuration) {
        case '3_months':
          expirationDate = new Date(startDate);
          expirationDate.setMonth(expirationDate.getMonth() + 3);
          break;
        case '6_months':
          expirationDate = new Date(startDate);
          expirationDate.setMonth(expirationDate.getMonth() + 6);
          break;
        case '12_months':
          expirationDate = new Date(startDate);
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          break;
        default:
          expirationDate = null;
      }

      // Check against campaign end date if it exists
      let expirationWarning = '';
      if (expirationDate && editOfferDetails.selectedCampaignEndDate) {
        const campaignEndDate = new Date(editOfferDetails.selectedCampaignEndDate);
        if (expirationDate > campaignEndDate) {
          expirationWarning = 'Asset expiration extends beyond campaign end date';
        }
      }

      setEditOfferDetails(prev => ({
        ...prev,
        assetExpirationDate: expirationDate,
        expirationWarning
      }));
    }
  }, [editOfferDetails.tentativeStartDate, editOfferDetails.contractDuration, editOfferDetails.selectedCampaignEndDate]);

  const updateOfferRequest = async () => {
    console.log('🚨 UPDATE OFFER REQUEST CALLED');
    console.log('🚨 editingOffer:', editingOffer);
    console.log('🚨 editOfferDetails:', editOfferDetails);
    
    if (!editingOffer) {
      console.error('🚨 ERROR: No offer being edited');
      alert('Error: No offer selected for editing');
      return;
    }
    
    try {
      console.log('🚨 Starting update process...');
      
      const headers = getAuthHeaders();
      console.log('🚨 Auth headers:', headers);
      
      // Prepare the update payload - ONLY include fields that backend expects
      const updatePayload = {
        asset_id: editingOffer.asset_id, // Required field - don't change
        campaign_name: editOfferDetails.campaignName,
        campaign_type: editOfferDetails.campaignType,
        existing_campaign_id: editOfferDetails.existingCampaignId || null,
        contract_duration: editOfferDetails.contractDuration,
        service_bundles: editOfferDetails.serviceBundles, // This matches ServiceBundles model
        monitoring_service_level: editOfferDetails.serviceBundles.monitoring ? editOfferDetails.monitoringServiceLevel : null, // Include monitoring service level if monitoring is selected
        timeline: editOfferDetails.timeline || '',
        asset_start_date: editOfferDetails.tentativeStartDate ? editOfferDetails.tentativeStartDate.toISOString() : null,
        asset_expiration_date: editOfferDetails.assetExpirationDate ? editOfferDetails.assetExpirationDate.toISOString() : null,
        special_requirements: editOfferDetails.specialRequirements || '',
        notes: editOfferDetails.notes || ''
        // Removed estimated_budget field to match Request Best Offer dialog
      };
      
      console.log('🚨 Update payload prepared:', updatePayload);
      console.log('🚨 API endpoint:', `${API}/offers/requests/${editingOffer.id}`);
      
      console.log('🚨 Making API call...');
      const response = await axios.put(`${API}/offers/requests/${editingOffer.id}`, updatePayload, { headers });
      console.log('🚨 API response:', response);
      
      console.log('🚨 Update successful, showing success message...');
      alert('🎉 Offer request updated successfully!');
      
      console.log('🚨 Closing dialog and resetting state...');
      setShowEditOfferDialog(false);
      setEditingOffer(null);
      
      console.log('🚨 Setting active tab to requested-offers...');
      setActiveTab('requested-offers');
      
      console.log('🚨 Refreshing buyer data...');
      await fetchBuyerData();
      // Also refresh requested offers since we're switching to that tab
      fetchRequestedOffers();
      
      // Refresh buyer data to ensure all stats and counts are updated
      fetchBuyerData();
      
      console.log('🚨 Data refresh completed');
      
    } catch (error) {
      console.error('🚨 Error updating offer request:', error);
      console.error('🚨 Error response:', error.response);
      console.error('🚨 Error data:', error.response?.data);
      alert('Failed to update offer request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleApproveOffer = async (offer) => {
    try {
      const confirmMessage = `Are you sure you want to approve the offer for "${offer.asset_name}" at ৳${offer.admin_quoted_price?.toLocaleString()}?`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      console.log('🚨 APPROVING OFFER:', offer.id);
      
      const headers = getAuthHeaders();
      
      // Call backend endpoint to approve offer
      await axios.put(`${API}/offers/${offer.id}/respond`, {
        action: 'accept'
      }, { headers });
      
      // Show custom congratulations modal
      setCongratulationsData({
        assetName: offer.asset_name,
        quotedPrice: offer.admin_quoted_price
      });
      setShowCongratulationsModal(true);
      
      // Immediate refresh for real-time updates
      await fetchBuyerData();
      // Also refresh requested offers if user is on that tab
      if (activeTab === 'requested-offers') {
        fetchRequestedOffers();
      }
      console.log('✅ Data refreshed after offer approval');
      
    } catch (error) {
      console.error('🚨 Error approving offer:', error);
      notify.error('Failed to approve offer: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRejectOffer = async (offer) => {
    try {
      const confirmMessage = `Are you sure you want to reject the offer for "${offer.asset_name}"?\n\nThis will return the asset to available status.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      console.log('🚨 REJECTING OFFER:', offer.id);
      
      const headers = getAuthHeaders();
      
      // Call backend endpoint to reject offer
      await axios.put(`${API}/offers/${offer.id}/respond`, {
        action: 'reject'
      }, { headers });
      
      notify.info(`Offer rejected. Asset "${offer.asset_name}" is now available again.`);
      
      // Refresh buyer data
      await fetchBuyerData();
      // Also refresh requested offers if user is on that tab  
      if (activeTab === 'requested-offers') {
        fetchRequestedOffers();
      }
      
    } catch (error) {
      console.error('🚨 Error rejecting offer:', error);
      notify.error('Failed to reject offer: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Handle revised offer request
  const handleRevisedOffer = async (offer) => {
    try {
      await axios.put(`${API}/offers/${offer.id}/respond`, {
        action: 'request_revision',
        reason: 'Buyer has requested a price revision for this offer'
      }, {
        headers: getAuthHeaders()
      });
      
      notify.success('Revised Offer sent to Admin. Thank you!');
      
      // Immediate refresh for real-time updates
      await fetchBuyerData();
      // Also refresh requested offers if user is on that tab
      if (activeTab === 'requested-offers') {
        fetchRequestedOffers();
      }
      console.log('✅ Data refreshed after revision request');
    } catch (error) {
      console.error('Error requesting revision:', error);
      notify.error('Failed to send revision request: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Handle cancel request - show dialog instead of browser popup
  const handleCancelRequest = (offer) => {
    setOfferToCancel(offer);
    setShowCancelDialog(true);
  };

  // Execute cancel request
  const executeCancelRequest = async () => {
    if (!offerToCancel) return;
    
    try {
      // For quoted offers or revision requested offers, reject them using respond endpoint
      if (offerToCancel.status === 'Quoted' || offerToCancel.status === 'Revise Request') {
        await axios.put(`${API}/offers/${offerToCancel.id}/respond`, {
          action: 'reject',
          reason: 'Buyer cancelled the request'
        }, {
          headers: getAuthHeaders()
        });
        notify.success('Offer rejected successfully!');
      } else {
        // For pending offers, delete them using the correct API endpoint
        await axios.delete(`${API}/offers/requests/${offerToCancel.id}`, {
          headers: getAuthHeaders()
        });
        notify.success('Request cancelled successfully!');
      }
      
      setShowCancelDialog(false);
      setOfferToCancel(null);
      
      // Immediate refresh for real-time updates
      await fetchBuyerData();
      // Also refresh requested offers if user is on that tab
      if (activeTab === 'requested-offers') {
        fetchRequestedOffers();
      }
      console.log('✅ Data refreshed after request cancellation');
    } catch (error) {
      console.error('Error cancelling request:', error);
      notify.error('Failed to cancel request: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Helper function to get total asset count for a campaign (only what's actually displayed)
  const getCampaignAssetCount = (campaign) => {
    // Count direct campaign assets
    const directAssets = (campaign.campaign_assets || []).length;
    
    // Count assets from offer requests that are NOT already in campaign_assets
    const activeCampaignOffers = (requestedOffers || []).filter(offer => 
      (offer.existing_campaign_id === campaign.id || offer.campaign_name === campaign.name) &&
      // Include active statuses only (same as fetchCampaignAssets logic)
      (offer.status === 'Pending' || offer.status === 'Processing' || offer.status === 'In Process' || 
       offer.status === 'Quoted' || offer.status === 'Accepted' || offer.status === 'Approved')
    );
    
    // Only count requested assets that are NOT already in campaign_assets
    const uniqueRequestedAssets = activeCampaignOffers.filter(offer => {
      const isAlreadyInCampaign = (campaign.campaign_assets || []).some(
        campaignAsset => campaignAsset.asset_id === offer.asset_id
      );
      return !isAlreadyInCampaign;
    });
    
    return directAssets + uniqueRequestedAssets.length; // No double counting
  };

  // Add asset to campaign from marketplace request
  const addToDefaultCampaign = (asset) => {
    setCampaignAssets(prev => {
      const isAlreadyAdded = prev.some(item => item.id === asset.id);
      if (isAlreadyAdded) {
        return prev;
      }
      return [...prev, asset];
    });
    
    // Refresh live assets to ensure "My Assets" tab is up to date
    setTimeout(() => {
      fetchLiveAssets(true, false); // No spinner for automatic updates
      // Also refresh campaign data if user is on campaigns tab (subtle refresh)
      if (activeTab === 'campaigns') {
        fetchCampaignsOnly();
      }
    }, 500);
    
    notify.success(`${asset.name} added to campaign!`);
  };
  
  // Fetch monitoring data for selected asset
  const fetchMonitoringData = async (assetId) => {
    try {
      setMonitoringLoading(true);
      const response = await axios.get(`${API}/assets/${assetId}/monitoring`, {
        headers: getAuthHeaders()
      });
      setMonitoringData(response.data);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      notify.error('Failed to load monitoring data');
    } finally {
      setMonitoringLoading(false);
    }
  };
  
  // Request inspection for an asset
  const requestInspection = async (assetId, reason) => {
    try {
      await axios.post(`${API}/assets/${assetId}/request-inspection`, {
        reason: reason || 'General inspection request'
      }, {
        headers: getAuthHeaders()
      });
      notify.success('Inspection request submitted successfully!');
      // Refresh monitoring data
      fetchMonitoringData(assetId);
    } catch (error) {
      console.error('Error requesting inspection:', error);
      notify.error('Failed to submit inspection request');
    }
  };
  
  // Handle asset row click for monitoring
  const handleAssetMonitoringClick = (asset) => {
    setSelectedAssetMonitoring(asset);
    fetchMonitoringData(asset.id);
  };

  // Monitoring Subscription Functions
  const fetchCampaignAssetsForMonitoring = async (campaignId) => {
    try {
      // Get campaign details to extract asset information
      const campaignResponse = await axios.get(`${API}/campaigns/${campaignId}`, {
        headers: getAuthHeaders()
      });
      const campaign = campaignResponse.data;
      
      if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
        // Extract asset details from campaign_assets
        const assetPromises = campaign.campaign_assets.map(async (campaignAsset) => {
          try {
            const assetResponse = await axios.get(`${API}/assets/${campaignAsset.asset_id}`, {
              headers: getAuthHeaders()
            });
            return {
              id: campaignAsset.asset_id,
              name: campaignAsset.asset_name,
              address: assetResponse.data.address || 'N/A',
              type: assetResponse.data.type || 'N/A'
            };
          } catch (error) {
            console.error(`Failed to fetch asset ${campaignAsset.asset_id}:`, error);
            return {
              id: campaignAsset.asset_id,
              name: campaignAsset.asset_name,
              address: 'N/A',
              type: 'N/A'
            };
          }
        });
        
        const assets = await Promise.all(assetPromises);
        setCampaignAssetsForMonitoring(assets);
        
        // Pre-select all assets by default
        setMonitoringFormData(prev => ({
          ...prev,
          selectedAssets: assets.map(asset => asset.id)
        }));
      } else {
        setCampaignAssetsForMonitoring([]);
        setMonitoringFormData(prev => ({
          ...prev,
          selectedAssets: []
        }));
      }
    } catch (error) {
      console.error('Error fetching campaign assets for monitoring:', error);
      notify.error('Failed to load campaign assets');
    }
  };

  const handleMonitoringSubscriptionOpen = (campaign) => {
    setSelectedCampaign(campaign);
    setShowMonitoringSubscription(true);
    
    // Reset form data
    setMonitoringFormData({
      frequency: 'monthly',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from now
      selectedAssets: [],
      serviceLevel: 'basic',
      notificationPreferences: {
        email: true,
        in_app: true,
        whatsapp: false
      }
    });
    
    // Fetch campaign assets
    fetchCampaignAssetsForMonitoring(campaign.id);
  };

  const handleCreateMonitoringSubscription = async () => {
    // Handle individual asset monitoring (no campaign selected)
    if (!selectedCampaign && monitoringFormData.selectedAssets.length > 0) {
      if (monitoringFormData.selectedAssets.length === 0) {
        notify.error('Please select at least one asset to monitor');
        return;
      }

      try {
        setMonitoringSubmitting(true);
        
        // Get the selected asset to use its expiry date
        const selectedAsset = liveAssets.find(asset => 
          monitoringFormData.selectedAssets.includes(asset.id)
        );
        
        // Use asset expiry date or default to 30 days from now
        let endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default fallback
        if (selectedAsset && selectedAsset.expiryDate) {
          endDate = new Date(selectedAsset.expiryDate);
        }
        
        const subscriptionData = {
          asset_ids: monitoringFormData.selectedAssets,
          frequency: monitoringFormData.frequency,
          service_level: monitoringFormData.serviceLevel,
          notification_preferences: monitoringFormData.notificationPreferences,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString()
          // Note: campaign_id is intentionally omitted for individual asset monitoring
        };

        console.log('📝 Creating monitoring service request:', subscriptionData);
        
        const response = await axios.post(`${API}/monitoring/services`, subscriptionData, {
          headers: getAuthHeaders()
        });

        console.log('✅ Monitoring service request created successfully:', response.data);
        notify.success('Monitoring service request submitted! Admin will review and provide quote.');
        setShowMonitoringSubscription(false);
        
        // Reset form data
        setMonitoringFormData({
          startDate: null,
          endDate: null,
          selectedAssets: [],
          frequency: 'monthly',
          serviceLevel: 'basic',
          notificationPreferences: {
            email: true,
            in_app: true,
            whatsapp: false
          }
        });
        
        // Refresh data to show request status
        await fetchBuyerData();
        await fetchLiveAssets(true, false);

        return;
      } catch (error) {
        console.error('Error creating monitoring service request:', error);
        
        // Handle validation errors properly
        let errorMessage = 'Failed to submit monitoring service request';
        if (error.response?.data?.detail) {
          if (typeof error.response.data.detail === 'string') {
            errorMessage = error.response.data.detail;
          } else if (Array.isArray(error.response.data.detail)) {
            // Handle Pydantic validation errors
            errorMessage = error.response.data.detail.map(err => 
              typeof err === 'string' ? err : err.msg || 'Validation error'
            ).join(', ');
          } else {
            errorMessage = 'Validation error occurred';
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        notify.error(errorMessage);
        return;
      } finally {
        setMonitoringSubmitting(false);
      }
    }

    // Handle campaign-based monitoring (original logic)
    if (!selectedCampaign) {
      notify.error('No campaign selected');
      return;
    }

    if (monitoringFormData.selectedAssets.length === 0) {
      notify.error('Please select at least one asset to monitor');
      return;
    }

    if (!monitoringFormData.startDate || !monitoringFormData.endDate) {
      notify.error('Please select start and end dates');
      return;
    }

    if (monitoringFormData.endDate <= monitoringFormData.startDate) {
      notify.error('End date must be after start date');
      return;
    }

    try {
      setMonitoringSubmitting(true);
      
      const subscriptionData = {
        campaign_id: selectedCampaign.id,
        asset_ids: monitoringFormData.selectedAssets,
        frequency: monitoringFormData.frequency,
        start_date: monitoringFormData.startDate.toISOString(),
        end_date: monitoringFormData.endDate.toISOString(),
        service_level: monitoringFormData.serviceLevel,
        notification_preferences: monitoringFormData.notificationPreferences
      };

      const response = await axios.post(`${API}/monitoring/services`, subscriptionData, {
        headers: getAuthHeaders()
      });

      notify.success('Monitoring service subscription created successfully!');
      setShowMonitoringSubscription(false);
      setSelectedCampaign(null);
      
      // Refresh monitoring services to update button states
      await fetchMonitoringServices();
      
      // Also refresh live assets to ensure button state changes are reflected
      await fetchLiveAssets(true, false);

    } catch (error) {
      console.error('Error creating monitoring subscription:', error);
      
      // Handle validation errors properly
      let errorMessage = 'Failed to create monitoring subscription';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle Pydantic validation errors
          errorMessage = error.response.data.detail.map(err => 
            typeof err === 'string' ? err : err.msg || 'Validation error'
          ).join(', ');
        } else {
          errorMessage = 'Validation error occurred';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      notify.error(errorMessage);
    } finally {
      setMonitoringSubmitting(false);
    }
  };

  const fetchMonitoringServices = async () => {
    try {
      const response = await axios.get(`${API}/monitoring/services`, {
        headers: getAuthHeaders()
      });
      console.log('📊 Monitoring services response:', response.data);
      
      // Handle the backend response format: {"services": [...]}
      const services = response.data?.services || response.data;
      setMonitoringServices(Array.isArray(services) ? services : []);
      console.log('📋 Set monitoring services to state:', services);
    } catch (error) {
      console.error('Error fetching monitoring services:', error);
      // Set to empty array on error to prevent runtime errors
      setMonitoringServices([]);
    }
  };

  const handleAssetSelectionChange = (assetId, checked) => {
    setMonitoringFormData(prev => ({
      ...prev,
      selectedAssets: checked 
        ? [...prev.selectedAssets, assetId]
        : prev.selectedAssets.filter(id => id !== assetId)
    }));
  };

  // Creative management functions
  const handleEditCreative = (asset) => {
    setEditingCreative(asset.id);
    setCreativeForm({
      tags: (asset.creative_tags || []).join(', '),
      timeline: asset.creative_timeline ? new Date(asset.creative_timeline) : null
    });
  };

  const handleSaveCreative = async (assetId) => {
    try {
      const tags = creativeForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      
      // Validate that tags are required for timeline
      if (creativeForm.timeline && tags.length === 0) {
        notify.error('Creative tags are required to set creative timeline');
        return;
      }
      
      // If no tags, also clear timeline
      const timelineValue = tags.length > 0 ? creativeForm.timeline : null;
      
      await axios.patch(`${API}/assets/${assetId}/creative`, {
        creative_tags: tags,
        creative_timeline: timelineValue ? timelineValue.toISOString() : null
      }, { headers: getAuthHeaders() });
      
      notify.success('Creative data updated successfully!');
      setEditingCreative(null);
      fetchLiveAssets(false, false); // Background refresh without spinner
    } catch (error) {
      console.error('Error updating creative data:', error);
      notify.error('Failed to update creative data');
    }
  };

  const handleCancelCreativeEdit = () => {
    setEditingCreative(null);
    setCreativeForm({ tags: '', timeline: null });
  };

  // Color generator for tags
  const generateTagColor = (tag) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-pink-100 text-pink-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
      'bg-red-100 text-red-800',
      'bg-gray-100 text-gray-800'
    ];
    
    // Generate consistent color based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Filter assets based on search term
  const getFilteredAssets = () => {
    if (!searchTerm.trim()) return liveAssets;
    
    const searchLower = searchTerm.toLowerCase();
    return liveAssets.filter(asset => 
      asset.name?.toLowerCase().includes(searchLower) ||
      asset.campaignName?.toLowerCase().includes(searchLower) ||
      asset.address?.toLowerCase().includes(searchLower) ||
      (asset.creative_tags && asset.creative_tags.some(tag => 
        tag.toLowerCase().includes(searchLower)
      ))
    );
  };

  // Filter assets for map based on type and location
  const getMapFilteredAssets = () => {
    return liveAssets.filter(asset => {
      // Filter by asset type
      if (mapFilters.assetType !== 'all' && asset.type !== mapFilters.assetType) {
        return false;
      }
      
      // Filter by location (using area field primarily, fallback to address)
      if (mapFilters.location !== 'all') {
        let locationMatch = false;
        
        // First check area field if available
        if (asset.area && asset.area.trim()) {
          locationMatch = asset.area.toLowerCase().includes(mapFilters.location.toLowerCase());
        } else {
          // Fallback to address-based filtering if no area field
          const addressLower = asset.address?.toLowerCase() || '';
          locationMatch = addressLower.includes(mapFilters.location.toLowerCase());
        }
        
        if (!locationMatch) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Get unique locations from assets for location filter - use area field
  const getUniqueLocations = () => {
    const locations = liveAssets.map(asset => {
      // Use area field if available, otherwise fallback to extracting from address
      if (asset.area && asset.area.trim()) {
        return asset.area.trim();
      }
      
      // Fallback: Extract city/area from address
      const address = asset.address || '';
      const parts = address.split(',');
      return parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].split(' ')[0];
    }).filter(loc => loc && loc !== '');
    
    return [...new Set(locations)].sort();
  };

  if (loading) {
    return <DashboardLoading type="buyer" userName={currentUser?.company_name} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">BeatSpace</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationBell
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onClearAll={clearAll}
                className="relative"
              />
              
              {/* Removed WebSocket Connection Status for cleaner UI */}
              
              <Button variant="outline" onClick={() => navigate('/marketplace')}>
                Explore Marketplace
              </Button>
              <Button variant="ghost" onClick={() => {
                logout();
                navigate('/');
              }}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {currentUser?.company_name}!</h2>
              <p className="text-gray-600">Manage your advertising campaigns and track performance.</p>
            </div>
            
            {/* Removed WebSocket Connection Status for cleaner UI */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns || 0}</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeCampaigns || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Campaigns</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingCampaigns || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold text-blue-600">৳{(stats.totalBudget || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Offer Requests</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalOfferRequests || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-assets">My Assets</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="requested-offers">Requested Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* My Assets Tab */}
          <TabsContent value="my-assets" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>My Assets</span>
                  </CardTitle>
                  
                  <div className="flex items-center space-x-4">
                    {/* Refresh Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('🔄 Manual assets refresh clicked');
                        fetchLiveAssets(true, true); // Manual refresh with spinner for user feedback
                      }}
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </Button>
                    
                    {/* View Toggle Buttons */}
                    <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                      <Button
                        variant={myAssetsView === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMyAssetsView('list')}
                        className="px-3 py-1"
                      >
                        <List className="w-4 h-4 mr-1" />
                        List
                      </Button>
                      <Button
                        variant={myAssetsView === 'map' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMyAssetsView('map')}
                        className="px-3 py-1"
                      >
                        <Map className="w-4 h-4 mr-1" />
                        Map
                      </Button>
                      <Button
                        variant={myAssetsView === 'campaign' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMyAssetsView('campaign')}
                        className="px-3 py-1"
                      >
                        <Building className="w-4 h-4 mr-1" />
                        Campaign
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {assetsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading live assets...</p>
                      <button 
                        onClick={() => {
                          console.log('🔄 Manual refresh clicked');
                          setAssetsFetched(false); // Reset the fetched flag
                          fetchLiveAssets(true, true); // Manual refresh with spinner for user feedback
                        }}
                        className="mt-2 text-sm text-orange-600 hover:text-orange-700 underline"
                      >
                        Having trouble? Click to retry
                      </button>
                    </div>
                  </div>
                ) : liveAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Live Assets Yet</h3>
                    <p className="text-gray-500 mb-4">
                      You don't have any booked advertising assets yet. Start by creating campaigns and requesting assets.
                    </p>
                    <Button onClick={() => setActiveTab('campaigns')} className="bg-orange-600 hover:bg-orange-700">
                      Create Campaign
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* List View */}
                    {myAssetsView === 'list' && (
                      <div className="space-y-4">
                        {/* Search Input */}
                        <div className="flex items-center space-x-2">
                          <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder="Search by name, campaign, tags, or address..."
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setAssetsCurrentPage(1); // Reset to first page on search
                              }}
                              className="pl-10"
                            />
                          </div>
                          {searchTerm && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSearchTerm('');
                                setAssetsCurrentPage(1);
                              }}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Showing {getPaginatedAssets().length} of {getFilteredAssets().length} live asset{getFilteredAssets().length > 1 ? 's' : ''}
                            {searchTerm && <span> (filtered from {liveAssets.length} total)</span>}
                          </p>
                        </div>
                        
                        {getPaginatedAssets().length === 0 && searchTerm ? (
                          <div className="text-center py-8">
                            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                            <p className="text-gray-500 mb-4">
                              No assets found matching "{searchTerm}". Try adjusting your search terms.
                            </p>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setSearchTerm('');
                                setAssetsCurrentPage(1);
                              }}
                            >
                              Clear Search
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Campaign</TableHead>
                              <TableHead>Last Inspection</TableHead>
                              <TableHead>Creative Tag</TableHead>
                              <TableHead>Creative Timeline</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Cost</TableHead>
                              <TableHead>Expiry</TableHead>
                              <TableHead>Monitoring</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedAssets().map((asset) => (
                              <TableRow 
                                key={asset.id} 
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleAssetMonitoringClick(asset)}
                              >
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{asset.name}</div>
                                    <div className="text-sm text-gray-500 max-w-xs leading-tight break-words">
                                      {asset.address}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                    {asset.campaignName}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {asset.lastInspectionDate ? (
                                      <div>
                                        <div className="font-medium text-gray-900">
                                          {new Date(asset.lastInspectionDate).toLocaleDateString()}
                                        </div>
                                        <div className="text-gray-500">
                                          {new Date(asset.lastInspectionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-500">No inspection yet</div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                {/* Creative Tags Column */}
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {editingCreative === asset.id ? (
                                    <div className="space-y-2">
                                      <Input
                                        placeholder="Enter tags separated by commas"
                                        value={creativeForm.tags}
                                        onChange={(e) => setCreativeForm(prev => ({...prev, tags: e.target.value}))}
                                        className="text-xs"
                                      />
                                      <div className="flex space-x-1">
                                        <Button size="sm" onClick={() => handleSaveCreative(asset.id)}>
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={handleCancelCreativeEdit}>
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      {asset.creative_tags && asset.creative_tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                          {asset.creative_tags.map((tag, index) => (
                                            <Badge key={index} className={`text-xs ${generateTagColor(tag)}`}>
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleEditCreative(asset)}
                                        className="text-xs text-blue-600 hover:text-blue-700 p-1"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                
                                {/* Creative Timeline Column */}
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {editingCreative === asset.id ? (
                                    <div className="space-y-2">
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full text-xs"
                                            disabled={!creativeForm.tags || creativeForm.tags.trim().length === 0}
                                          >
                                            <CalendarDays className="w-3 h-3 mr-1" />
                                            {creativeForm.timeline ? 
                                              creativeForm.timeline.toLocaleDateString() : 
                                              "Select date"
                                            }
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                          <CalendarComponent
                                            mode="single"
                                            selected={creativeForm.timeline}
                                            onSelect={(date) => setCreativeForm(prev => ({...prev, timeline: date}))}
                                            disabled={(date) => date < new Date()}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      {(!creativeForm.tags || creativeForm.tags.trim().length === 0) && (
                                        <p className="text-xs text-gray-500">Add tags first to set timeline</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      {asset.creative_timeline && (
                                        <div className="text-sm font-medium text-gray-900">
                                          {new Date(asset.creative_timeline).toLocaleDateString()}
                                        </div>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => handleEditCreative(asset)}
                                        className="text-xs text-blue-600 hover:text-blue-700 p-1"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{asset.duration}</TableCell>
                                <TableCell>
                                  <span className="text-green-600 font-medium">
                                    ৳{asset.cost ? asset.cost.toLocaleString() : '0'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  {(() => {
                                    const buttonInfo = getMonitoringButtonInfo(asset.id);
                                    return (
                                      <Button
                                        size="sm"
                                        variant={buttonInfo.variant}
                                        disabled={buttonInfo.disabled}
                                        className={`${buttonInfo.className} text-xs px-2 py-1`}
                                        onClick={() => {
                                          if (!buttonInfo.disabled) {
                                            // Pre-select this asset in the monitoring form
                                            setMonitoringFormData(prev => ({
                                              ...prev,
                                              selectedAssets: [asset.id]
                                            }));
                                            setShowMonitoringSubscription(true);
                                          }
                                        }}
                                      >
                                        {buttonInfo.text}
                                      </Button>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>

                        {/* Total Cost Summary */}
                        {liveAssets.length > 0 && (
                          <div className="flex justify-end items-center p-4 bg-gray-50 rounded-lg border">
                            <div className="text-right">
                              <p className="text-sm text-gray-600 mb-1">Total Investment</p>
                              <p className="text-xl font-bold text-green-600">
                                ৳{liveAssets.reduce((total, asset) => total + (asset.cost || 0), 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Pagination for List View */}
                        {getAssetsTotalPages() > 1 && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page {assetsCurrentPage} of {getAssetsTotalPages()}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setAssetsCurrentPage(Math.max(1, assetsCurrentPage - 1))}
                                disabled={assetsCurrentPage === 1}
                                variant="outline"
                              >
                                Previous
                              </Button>
                              <Button
                                onClick={() => setAssetsCurrentPage(Math.min(getAssetsTotalPages(), assetsCurrentPage + 1))}
                                disabled={assetsCurrentPage === getAssetsTotalPages()}
                                variant="outline"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                        </>
                        )}
                      </div>
                    )}

                    {/* Map View */}
                    {myAssetsView === 'map' && (
                      <div className="space-y-4">
                        {liveAssets.length > 0 ? (
                          <div className="bg-white rounded-lg border overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                              <h3 className="text-lg font-medium text-gray-800 flex items-center">
                                <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                                My Assets Locations ({getMapFilteredAssets().length} of {liveAssets.length} assets)
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Interactive map showing your booked assets across Bangladesh
                              </p>
                            </div>
                            
                            {/* Map Filters */}
                            <div className="p-4 bg-white border-b">
                              <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-gray-700">Filters:</span>
                                </div>
                                
                                {/* Asset Type Filter */}
                                <div className="flex items-center space-x-2">
                                  <Tag className="w-4 h-4 text-gray-500" />
                                  <Select
                                    value={mapFilters.assetType}
                                    onValueChange={(value) => {
                                      setMapFilters(prev => ({...prev, assetType: value}));
                                      setShowAllMapAssets(false);
                                    }}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-xs">
                                      <SelectValue placeholder="Asset Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Types</SelectItem>
                                      <SelectItem value="Billboard">📄 Billboard</SelectItem>
                                      <SelectItem value="Police Box">🚓 Police Box</SelectItem>
                                      <SelectItem value="Railway Station">🚂 Railway Station</SelectItem>
                                      <SelectItem value="Wall">🧱 Wall</SelectItem>
                                      <SelectItem value="Bridge">🌉 Bridge</SelectItem>
                                      <SelectItem value="Bus Stop">🚌 Bus Stop</SelectItem>
                                      <SelectItem value="Others">📍 Others</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Location Filter */}
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4 text-gray-500" />
                                  <Select
                                    value={mapFilters.location}
                                    onValueChange={(value) => {
                                      setMapFilters(prev => ({...prev, location: value}));
                                      setShowAllMapAssets(false);
                                    }}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-xs">
                                      <SelectValue placeholder="Location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Areas</SelectItem>
                                      {getUniqueLocations().map((location) => (
                                        <SelectItem key={location} value={location}>
                                          📍 {location}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Clear Filters */}
                                {(mapFilters.assetType !== 'all' || mapFilters.location !== 'all') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setMapFilters({ assetType: 'all', location: 'all' });
                                      setShowAllMapAssets(false);
                                    }}
                                    className="h-8 text-xs"
                                  >
                                    <X className="w-3 h-3 mr-1" />
                                    Clear
                                  </Button>
                                )}

                                {/* Filter Summary */}
                                <div className="text-xs text-gray-500">
                                  {mapFilters.assetType !== 'all' && (
                                    <span className="mr-2">Type: {mapFilters.assetType}</span>
                                  )}
                                  {mapFilters.location !== 'all' && (
                                    <span>Location: {mapFilters.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Interactive Map Container */}
                            <div className="relative">
                              <iframe
                                src={`https://www.google.com/maps/embed/v1/view?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&center=${
                                  selectedMapAsset?.location?.lat && selectedMapAsset?.location?.lng 
                                    ? `${selectedMapAsset.location.lat},${selectedMapAsset.location.lng}&zoom=16`
                                    : '23.8103,90.4125&zoom=12'
                                }`}
                                className="w-full h-96 border-0"
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="My Assets Map"
                              />
                              
                              {/* Asset markers overlay */}
                              <div className="absolute inset-0 pointer-events-none">
                                {(() => {
                                  // Determine which assets to show markers for
                                  let assetsToShow = [];
                                  
                                  if (selectedMapAsset) {
                                    // If a specific asset is selected, only show that asset's marker
                                    assetsToShow = [selectedMapAsset];
                                  } else {
                                    // If no specific asset selected, show filtered assets
                                    assetsToShow = getMapFilteredAssets();
                                  }
                                  
                                  return assetsToShow.map((asset, index) => {
                                    if (!asset.location?.lat || !asset.location?.lng) return null;
                                    
                                    // Calculate approximate position on the map
                                    const centerLat = selectedMapAsset?.location?.lat || 23.8103;
                                    const centerLng = selectedMapAsset?.location?.lng || 90.4125;
                                    const mapWidth = 100; // percentage
                                    const mapHeight = 100; // percentage
                                    
                                    // Simple offset calculation (not precise, but gives visual indication)
                                    const latDiff = asset.location.lat - centerLat;
                                    const lngDiff = asset.location.lng - centerLng;
                                    
                                    const left = Math.max(5, Math.min(95, 50 + (lngDiff * 20))); // rough conversion
                                    const top = Math.max(5, Math.min(95, 50 - (latDiff * 20))); // rough conversion
                                  
                                  return (
                                    <div
                                      key={asset.id}
                                      className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                                      style={{
                                        left: `${left}%`,
                                        top: `${top}%`
                                      }}
                                    >
                                      <div className="relative group cursor-pointer">
                                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform">
                                          <Building className="w-4 h-4 text-white" />
                                        </div>
                                        
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                          <div className="bg-black text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                            <div className="font-medium">{asset.name}</div>
                                            <div className="text-gray-300">{asset.district}</div>
                                            <div className="text-green-300">৳{asset.cost?.toLocaleString()}</div>
                                          </div>
                                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black"></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                                })()}
                              </div>
                            </div>
                            
                            {/* Assets List Below Map */}
                            <div className="p-4 bg-gray-50 border-t">
                              <h4 className="font-medium text-gray-800 mb-3">Asset Details ({getMapFilteredAssets().length} assets)</h4>
                              {getMapFilteredAssets().length === 0 ? (
                                <div className="text-center py-8">
                                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                  <h3 className="text-sm font-medium text-gray-900 mb-1">No Assets Found</h3>
                                  <p className="text-xs text-gray-500 mb-3">
                                    No assets match your current filter criteria.
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMapFilters({ assetType: 'all', location: 'all' })}
                                    className="h-7 text-xs"
                                  >
                                    Clear Filters
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(showAllMapAssets ? getMapFilteredAssets() : getMapFilteredAssets().slice(0, 6)).map((asset) => (
                                      <div 
                                        key={asset.id} 
                                        className={`flex items-center space-x-3 p-2 rounded border cursor-pointer transition-all hover:shadow-md ${
                                          selectedMapAsset?.id === asset.id 
                                            ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                                            : 'bg-white hover:bg-gray-50'
                                        }`}
                                        onClick={() => setSelectedMapAsset(asset)}
                                      >
                                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                          selectedMapAsset?.id === asset.id ? 'bg-blue-500' : 'bg-red-500'
                                        }`}></div>
                                        <div className="flex-1 min-w-0">
                                          <div className={`font-medium text-sm truncate ${
                                            selectedMapAsset?.id === asset.id ? 'text-blue-900' : 'text-gray-900'
                                          }`}>{asset.name}</div>
                                          <div className="text-xs text-gray-500">{asset.address}</div>
                                        </div>
                                        <div className={`text-sm font-medium ${
                                          selectedMapAsset?.id === asset.id ? 'text-blue-600' : 'text-green-600'
                                        }`}>
                                          ৳{asset.cost?.toLocaleString()}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Show More/Less Controls */}
                                  {getMapFilteredAssets().length > 6 && (
                                    <div className="text-center mt-4">
                                      <div className="flex items-center justify-center space-x-4">
                                        <p className="text-xs text-gray-500">
                                          Showing {showAllMapAssets ? getMapFilteredAssets().length : Math.min(6, getMapFilteredAssets().length)} of {getMapFilteredAssets().length} filtered assets
                                        </p>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowAllMapAssets(!showAllMapAssets)}
                                          className="h-7 text-xs"
                                        >
                                          {showAllMapAssets ? (
                                            <>
                                              <ChevronUp className="w-3 h-3 mr-1" />
                                              Show Less
                                            </>
                                          ) : (
                                            <>
                                              <ChevronDown className="w-3 h-3 mr-1" />
                                              Show More ({getMapFilteredAssets().length - 6} more)
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-lg p-8 text-center">
                            <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-700 mb-2">No Assets to Display</h3>
                            <p className="text-gray-500">
                              You don't have any booked assets to show on the map yet.
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                              Start by requesting offers from the marketplace!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Campaign View */}
                    {myAssetsView === 'campaign' && (
                      <div className="space-y-6">
                        {(() => {
                          // Use paginated campaign assets
                          const groupedAssets = getPaginatedCampaignAssets();
                          
                          return Object.entries(groupedAssets).map(([campaignName, assets]) => {
                            const isCollapsed = collapsedCampaigns[campaignName] !== false; // Default to collapsed (true)
                            const totalCost = assets.reduce((sum, asset) => sum + (asset.cost || 0), 0);
                            
                            return (
                            <div key={campaignName} className="bg-white border rounded-lg overflow-hidden">
                              <div 
                                className="bg-gray-50 px-6 py-4 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => toggleCampaignCollapse(campaignName)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    {isCollapsed ? (
                                      <ChevronRight className="w-4 h-4 text-gray-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    )}
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{campaignName}</h4>
                                      <p className="text-sm text-gray-500">{assets.length} asset{assets.length > 1 ? 's' : ''}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                      <p className="text-sm text-gray-500">Total Cost</p>
                                      <p className="font-semibold text-green-600">
                                        ৳{totalCost.toLocaleString()}
                                      </p>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      Live
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              {!isCollapsed && (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Asset Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Cost</TableHead>
                                    <TableHead>Expires</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assets.map((asset) => (
                                    <TableRow key={asset.id}>
                                      <TableCell>
                                        <div className="font-medium">{asset.name}</div>
                                        <div className="text-sm text-gray-500">{asset.type}</div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="text-sm">{asset.address}</div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={asset.lastStatus === 'Booked' ? 'success' : 'secondary'}>
                                          {asset.lastStatus}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{asset.duration}</TableCell>
                                      <TableCell>
                                        <span className="text-green-600 font-medium">
                                          ৳{asset.cost ? asset.cost.toLocaleString() : '0'}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              )}
                            </div>
                          );
                          });
                        })()}
                        
                        {/* Pagination for Campaign View */}
                        {getCampaignAssetsTotalPages() > 1 && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                              Page {assetsCurrentPage} of {getCampaignAssetsTotalPages()}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setAssetsCurrentPage(Math.max(1, assetsCurrentPage - 1))}
                                disabled={assetsCurrentPage === 1}
                                variant="outline"
                              >
                                Previous
                              </Button>
                              <Button
                                onClick={() => setAssetsCurrentPage(Math.min(getCampaignAssetsTotalPages(), assetsCurrentPage + 1))}
                                disabled={assetsCurrentPage === getCampaignAssetsTotalPages()}
                                variant="outline"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span>Your Campaigns</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🔄 Manual campaigns refresh clicked');
                      fetchCampaignsOnly();
                    }}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                  <Button 
                    onClick={() => setShowCreateCampaign(true)}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(campaigns || []).length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaigns Yet</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first advertising campaign to get started.
                    </p>
                    <Button 
                      onClick={() => setShowCreateCampaign(true)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Create Your First Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search campaigns by name, description, or status..."
                          value={campaignSearch}
                          onChange={(e) => {
                            setCampaignSearch(e.target.value);
                            setCampaignCurrentPage(1); // Reset to first page when searching
                          }}
                          className="pl-10"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        {getFilteredCampaigns().length} of {(campaigns || []).length} campaigns
                      </div>
                    </div>

                    {/* Campaigns Table */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Assets</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedCampaigns().map((campaign) => (
                          <TableRow 
                            key={campaign.id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={(e) => {
                              // Prevent row click when clicking on action buttons
                              if (e.target.closest('button') || e.target.closest('[role="button"]')) {
                                return;
                              }
                              
                              setSelectedCampaign(campaign);
                              // Load assets in background without blocking UI
                              fetchCampaignAssets(campaign);
                            }}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{campaign.name}</div>
                                <div className="text-sm text-gray-500">{campaign.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>৳{campaign.budget?.toLocaleString()}</TableCell>
                          <TableCell>{getCampaignAssetCount(campaign)} selected</TableCell>
                          <TableCell>
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'Not set'}
                          </TableCell>
                          <TableCell>
                            {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Not set'}
                          </TableCell>
                          <TableCell>
                            {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Store campaign context and navigate to marketplace
                                    sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                                      id: campaign.id,
                                      name: campaign.name,
                                      end_date: campaign.end_date
                                    }));
                                    navigate(`/marketplace?campaign=${campaign.id}`);
                                  }}
                                  className="cursor-pointer text-orange-600"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Asset
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedCampaign(campaign);
                                    // Load assets in background without blocking UI
                                    fetchCampaignAssets(campaign);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => editCampaign(campaign)}
                                  className="cursor-pointer text-blue-600"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Campaign
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => downloadCampaignPDF(campaign)}
                                  className="cursor-pointer text-purple-600"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Campaign Planning PDF
                                </DropdownMenuItem>
                                
                                {/* Monitoring Service Option for Live/Active campaigns */}
                                {(campaign.status === 'Live' || campaign.status === 'Approved') && (
                                  <DropdownMenuItem
                                    onClick={() => handleMonitoringSubscriptionOpen(campaign)}
                                    className="cursor-pointer text-green-600"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Monitoring Service
                                  </DropdownMenuItem>
                                )}
                                
                                {/* Only show delete for Draft campaigns */}
                                {campaign.status === 'Draft' && (
                                  <DropdownMenuItem
                                    onClick={() => deleteCampaign(campaign)}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Delete Campaign
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {getCampaignTotalPages() > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Page {campaignCurrentPage} of {getCampaignTotalPages()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(Math.max(1, campaignCurrentPage - 1))}
                          disabled={campaignCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(Math.min(getCampaignTotalPages(), campaignCurrentPage + 1))}
                          disabled={campaignCurrentPage === getCampaignTotalPages()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Requested Offers Tab with Categorization */}
          <TabsContent value="requested-offers" className="space-y-6">
            <RequestsCategoryTabs 
              requestedOffers={requestedOffers}
              requestedOffersLoading={requestedOffersLoading}
              fetchRequestedOffers={fetchRequestedOffers}
              navigate={navigate}
              onApproveOffer={handleApproveOffer}
              onRejectOffer={handleRejectOffer}
              onReviseOffer={handleRevisedOffer}
              onCancelRequest={handleCancelRequest}
              onEditOffer={handleEditOffer}
              onPOUpload={handlePOUpload}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Reach</span>
                      <span className="text-2xl font-bold">250K+</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Engagement Rate</span>
                      <span className="text-2xl font-bold">12.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cost Per View</span>
                      <span className="text-2xl font-bold">৳0.15</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Allocated</span>
                      <span className="text-lg font-bold">৳{(stats.totalBudget || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Used</span>
                      <span className="text-lg font-bold text-green-600">৳{Math.round((stats.totalBudget || 0) * 0.65).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Remaining</span>
                      <span className="text-lg font-bold text-blue-600">৳{Math.round((stats.totalBudget || 0) * 0.35).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Campaign Details Dialog */}
        {selectedCampaign && (
          <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Campaign Details: {selectedCampaign.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge className={getStatusColor(selectedCampaign.status)}>
                      {selectedCampaign.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Budget</label>
                    <p className="text-lg font-semibold">৳{selectedCampaign.budget?.toLocaleString()}</p>
                  </div>
                </div>

                {/* Campaign Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Start Date</label>
                    <p className="text-gray-900">
                      {selectedCampaign.start_date 
                        ? new Date(selectedCampaign.start_date).toLocaleDateString() 
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">End Date</label>
                    <p className="text-gray-900">
                      {selectedCampaign.end_date 
                        ? new Date(selectedCampaign.end_date).toLocaleDateString() 
                        : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* Campaign Duration */}
                {selectedCampaign.start_date && selectedCampaign.end_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-gray-900">
                      {calculateDuration(selectedCampaign.start_date, selectedCampaign.end_date)}
                    </p>
                  </div>
                )}

                {/* Campaign Created Date */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Request Date</label>
                  <p className="text-gray-900">
                    {selectedCampaign.created_at 
                      ? new Date(selectedCampaign.created_at).toLocaleDateString() 
                      : 'Not available'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{selectedCampaign.description}</p>
                </div>

                {selectedCampaign.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-gray-900">{selectedCampaign.notes}</p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-medium text-gray-500">Campaign Assets</label>
                    {(selectedCampaign.status === 'Draft' || selectedCampaign.status === 'Live') && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          // Store campaign context more reliably using sessionStorage
                          sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                            id: selectedCampaign.id,
                            name: selectedCampaign.name,
                            end_date: selectedCampaign.end_date
                          }));
                          // Close current dialog and navigate to marketplace with campaign context
                          setSelectedCampaign(null);
                          navigate(`/marketplace?campaign=${selectedCampaign.id}`);
                        }}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Asset
                      </Button>
                    )}
                  </div>
                  
                  {(campaignAssets || []).length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-3">No assets selected for this campaign yet.</p>
                      {(selectedCampaign.status === 'Draft' || selectedCampaign.status === 'Live') && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            // Store campaign context more reliably using sessionStorage
                            sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                              id: selectedCampaign.id,
                              name: selectedCampaign.name,
                              end_date: selectedCampaign.end_date
                            }));
                            // Close current dialog and navigate to marketplace with campaign context
                            setSelectedCampaign(null);
                            navigate(`/marketplace?campaign=${selectedCampaign.id}`);
                          }}
                          className="bg-orange-600 hover:bg-orange-700"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Your First Asset
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(campaignAssets || []).map((asset) => (
                        <Card key={asset.id} className={`border ${asset.isRequested ? 'border-orange-200 bg-orange-50' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-medium text-gray-900">{asset.name}</h4>
                                  {asset.isRequested && (
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' 
                                          ? "text-green-600 border-green-300 bg-green-50" 
                                          : "text-orange-600 border-orange-300"
                                      }
                                    >
                                      {asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' ? 'Booked' : 'Requested'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{asset.address}</p>
                                <div className="flex items-center space-x-4">
                                  <Badge variant="outline">{asset.type}</Badge>
                                  
                                  {asset.isRequested ? (
                                    <Badge className="bg-orange-100 text-orange-800">
                                      {asset.offerStatus}
                                    </Badge>
                                  ) : (
                                    <Badge className={getStatusColor(asset.status === 'Available' && selectedCampaign.status === 'Live' ? 'Live' : asset.status)}>
                                      {asset.status === 'Available' && selectedCampaign.status === 'Live' ? 'Live' : asset.status}
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Show Asset Expiry Date for Live Campaign assets (non-requested) only when PO Uploaded */}
                                {selectedCampaign.status === 'Live' && !asset.isRequested && asset.waiting_for_go_live && asset.asset_expiry_date && (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-blue-600 font-medium">
                                      🗓️ Asset Expiry: {new Date(asset.asset_expiry_date).toLocaleDateString()}
                                    </p>
                                    {selectedCampaign.end_date && (
                                      <p className="text-xs text-gray-500">
                                        Campaign End: {new Date(selectedCampaign.end_date).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* For requested assets, show different info based on status */}
                                {asset.isRequested && (
                                  <div className="mt-2">
                                    {asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' ? (
                                      <p className="text-xs text-green-600">
                                        ✅ {asset.offerStatus}
                                      </p>
                                    ) : asset.offerStatus === 'Quoted' ? (
                                      <p className="text-xs text-blue-600">
                                        💰 Price quoted - Check Requested Offers tab
                                      </p>
                                    ) : (
                                      <p className="text-xs text-amber-600">
                                        ⏳ {asset.offerStatus}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* For Draft campaigns, show availability info only when PO Uploaded */}
                                {selectedCampaign.status === 'Draft' && !asset.isRequested && asset.waiting_for_go_live && asset.asset_expiry_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Available after: {new Date(asset.asset_expiry_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex space-x-2">
                                {selectedCampaign.status === 'Draft' && !asset.isRequested && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeAssetFromCampaign(asset.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                {asset.isRequested && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Find and edit the offer request
                                      const offerToEdit = requestedOffers.find(offer => offer.id === asset.offerId);
                                      if (offerToEdit) {
                                        setSelectedCampaign(null); // Close campaign dialog
                                        editOfferRequest(offerToEdit); // Open edit dialog
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setSelectedCampaign(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Create Campaign Dialog */}
        <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name *
                </label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  placeholder="Enter campaign name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  placeholder="Describe your campaign objectives"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (৳) *
                </label>
                <Input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                  placeholder="Enter total budget"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {campaignForm.startDate ? campaignForm.startDate.toLocaleDateString() : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={campaignForm.startDate}
                        onSelect={(date) => setCampaignForm({...campaignForm, startDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {campaignForm.endDate ? campaignForm.endDate.toLocaleDateString() : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={campaignForm.endDate}
                        onSelect={(date) => setCampaignForm({...campaignForm, endDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Textarea
                  value={campaignForm.notes}
                  onChange={(e) => setCampaignForm({...campaignForm, notes: e.target.value})}
                  placeholder="Additional notes or requirements"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowCreateCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={!campaignForm.name}
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Offer Request Dialog - Same as Request Best Offer */}
        <Dialog open={showEditOfferDialog} onOpenChange={setShowEditOfferDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span>Edit Offer Request</span>
              </DialogTitle>
              <p className="text-sm text-gray-600">
                Modify your offer request details and get updated pricing
              </p>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Asset Summary - Same as Request Best Offer Dialog */}
              {selectedAssetForEdit && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Selected Asset</h4>
                  <div className="flex items-start space-x-3">
                    {selectedAssetForEdit.photos && selectedAssetForEdit.photos[0] && (
                      <img 
                        src={selectedAssetForEdit.photos[0]} 
                        alt={selectedAssetForEdit.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h5 className="font-medium">{selectedAssetForEdit.name}</h5>
                      <p className="text-sm text-gray-600">{selectedAssetForEdit.address}</p>
                      <p className="text-sm text-gray-500">{selectedAssetForEdit.type} • {selectedAssetForEdit.area}, {selectedAssetForEdit.district}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">Campaign Selection *</label>
                <div className="space-y-4">
                  <div>
                    <Select 
                      value={editOfferDetails.existingCampaignId || ''} 
                      onValueChange={(value) => {
                        const selectedCampaign = campaigns.find(c => c.id === value);
                        setEditOfferDetails({
                          ...editOfferDetails, 
                          campaignType: 'existing',
                          existingCampaignId: value,
                          campaignName: selectedCampaign ? selectedCampaign.name : '',
                          selectedCampaignEndDate: selectedCampaign ? selectedCampaign.end_date : null
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an existing campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map(campaign => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            📁 {campaign.name} ({(campaign.assets || []).length} assets)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editOfferDetails.selectedCampaignEndDate && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Campaign End Date:</strong> {new Date(editOfferDetails.selectedCampaignEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contract Duration and Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Contract Duration *</label>
                  <Select 
                    value={editOfferDetails.contractDuration} 
                    onValueChange={(value) => {
                      setEditOfferDetails({...editOfferDetails, contractDuration: value});
                      // Trigger asset expiration calculation immediately
                      setTimeout(() => {
                        updateEditAssetExpirationDate();
                      }, 10);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_month">1 Month</SelectItem>
                      <SelectItem value="3_months">3 Months</SelectItem>
                      <SelectItem value="6_months">6 Months</SelectItem>
                      <SelectItem value="12_months">12 Months</SelectItem>
                      <SelectItem value="custom">Custom Duration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Asset Starting Date */}
              <div>
                <label className="block text-sm font-semibold mb-2">Asset Starting Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {editOfferDetails.tentativeStartDate 
                        ? editOfferDetails.tentativeStartDate.toLocaleDateString()
                        : "Select asset start date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editOfferDetails.tentativeStartDate}
                      onSelect={(date) => {
                        setEditOfferDetails({...editOfferDetails, tentativeStartDate: date});
                        // Trigger asset expiration calculation immediately
                        setTimeout(() => {
                          updateEditAssetExpirationDate();
                        }, 10);
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Asset Expiration Date */}
              {editOfferDetails.assetExpirationDate && (
                <div>
                  <label className="block text-sm font-semibold mb-2">Asset Expiration Date</label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-sm font-medium text-gray-900">
                      {editOfferDetails.assetExpirationDate.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Calculated based on start date + {editOfferDetails.contractDuration.replace('_', ' ')}
                    </p>
                    {editOfferDetails.expirationWarning && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ {editOfferDetails.expirationWarning}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Service Bundles */}
              <div>
                <label className="block text-sm font-semibold mb-3">Additional Services</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-printing"
                      checked={editOfferDetails.serviceBundles.printing}
                      onChange={(e) => setEditOfferDetails({
                        ...editOfferDetails, 
                        serviceBundles: {...editOfferDetails.serviceBundles, printing: e.target.checked}
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="edit-printing" className="text-sm">
                      🖨️ Printing & Design
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-setup"
                      checked={editOfferDetails.serviceBundles.setup}
                      onChange={(e) => setEditOfferDetails({
                        ...editOfferDetails, 
                        serviceBundles: {...editOfferDetails.serviceBundles, setup: e.target.checked}
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="edit-setup" className="text-sm">
                      🔧 Installation & Setup
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-monitoring"
                      checked={editOfferDetails.serviceBundles.monitoring}
                      onChange={(e) => setEditOfferDetails({
                        ...editOfferDetails, 
                        serviceBundles: {...editOfferDetails.serviceBundles, monitoring: e.target.checked}
                      })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="edit-monitoring" className="text-sm">
                      📊 Monitoring & Reports
                    </label>
                  </div>
                  
                  {/* Service Level Selection - appears when monitoring is checked */}
                  {editOfferDetails.serviceBundles.monitoring && (
                    <div className="mt-3 ml-6 space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Service Level
                      </label>
                      <select
                        value={editOfferDetails.monitoringServiceLevel}
                        onChange={(e) => setEditOfferDetails({
                          ...editOfferDetails, 
                          monitoringServiceLevel: e.target.value
                        })}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="basic">Basic (Monthly)</option>
                        <option value="standard">Standard (Weekly)</option>
                        <option value="premium">Premium (Daily)</option>
                      </select>
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        {editOfferDetails.monitoringServiceLevel === 'basic' && (
                          <>
                            <span className="font-medium">Basic:</span> Monthly monitoring with basic photo documentation and email notifications
                          </>
                        )}
                        {editOfferDetails.monitoringServiceLevel === 'standard' && (
                          <>
                            <span className="font-medium">Standard:</span> Weekly monitoring with detailed reporting and condition analysis
                          </>
                        )}
                        {editOfferDetails.monitoringServiceLevel === 'premium' && (
                          <>
                            <span className="font-medium">Premium:</span> Daily monitoring with comprehensive reports, real-time alerts, and WhatsApp notifications
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-semibold mb-2">Special Requirements</label>
                <Textarea
                  value={editOfferDetails.specialRequirements}
                  onChange={(e) => setEditOfferDetails({...editOfferDetails, specialRequirements: e.target.value})}
                  placeholder="Any specific requirements, constraints, or special considerations..."
                  rows={3}
                />
              </div>

              {/* Campaign Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2">Campaign Notes & Instructions</label>
                <Textarea
                  value={editOfferDetails.notes}
                  onChange={(e) => setEditOfferDetails({...editOfferDetails, notes: e.target.value})}
                  placeholder="Additional notes, campaign objectives, target audience, etc..."
                  rows={3}
                />
              </div>

              {/* Summary Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">📋 Updated Request Summary</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Asset:</strong> {selectedAssetForEdit?.name || 'Selected asset'}</p>
                  <p><strong>Campaign:</strong> {editOfferDetails.campaignName || 'Not selected'}</p>
                  <p><strong>Duration:</strong> {editOfferDetails.contractDuration.replace('_', ' ').replace('months', 'Months')}</p>
                  <p><strong>Services:</strong> {
                    (() => {
                      const selectedServices = Object.entries(editOfferDetails.serviceBundles)
                        .filter(([_, selected]) => selected)
                        .map(([service, _]) => {
                          if (service === 'monitoring') {
                            const level = editOfferDetails.monitoringServiceLevel;
                            let frequency = '';
                            
                            // Map service level to frequency
                            if (level === 'basic') {
                              frequency = 'Basic - Monthly';
                            } else if (level === 'standard') {
                              frequency = 'Standard - Weekly';
                            } else if (level === 'premium') {
                              frequency = 'Premium - Daily';
                            } else {
                              frequency = level.charAt(0).toUpperCase() + level.slice(1);
                            }
                            
                            return `Monitoring (${frequency})`;
                          }
                          return service.charAt(0).toUpperCase() + service.slice(1);
                        });
                      return selectedServices.length > 0 ? selectedServices.join(', ') : 'None selected';
                    })()
                  }</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditOfferDialog(false)}
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={updateOfferRequest}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    !editOfferDetails.existingCampaignId
                  }
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Update Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditCampaign} onOpenChange={(open) => {
          setShowEditCampaign(open);
          if (!open) {
            // Reset form when closing
            setEditingCampaign(null);
            setCampaignForm({
              name: '',
              description: '',
              budget: '',
              notes: '',
              startDate: null,
              endDate: null
            });
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign Name *
                </label>
                <Input
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                  placeholder="Enter campaign name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                  placeholder="Describe your campaign objectives"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget (৳) *
                </label>
                <Input
                  type="number"
                  value={campaignForm.budget}
                  onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                  placeholder="Enter total budget"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {campaignForm.startDate ? campaignForm.startDate.toLocaleDateString() : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={campaignForm.startDate}
                        onSelect={(date) => setCampaignForm({...campaignForm, startDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {campaignForm.endDate ? campaignForm.endDate.toLocaleDateString() : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={campaignForm.endDate}
                        onSelect={(date) => setCampaignForm({...campaignForm, endDate: date})}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Textarea
                  value={campaignForm.notes}
                  onChange={(e) => setCampaignForm({...campaignForm, notes: e.target.value})}
                  placeholder="Additional notes or requirements"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCampaign}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!campaignForm.name}
              >
                Update Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Asset Monitoring Dialog */}
        <Dialog open={!!selectedAssetMonitoring} onOpenChange={() => {
          setSelectedAssetMonitoring(null);
          setMonitoringData(null);
          setSelectedImageIndex(0);
          setShowImageModal(false);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Asset Monitoring Report</span>
              </DialogTitle>
            </DialogHeader>
            
            {selectedAssetMonitoring && (
              <div className="space-y-6">
                {/* Asset Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-blue-600" />
                    {selectedAssetMonitoring.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">📍 Location:</span>
                      <div className="font-medium">{selectedAssetMonitoring.address}</div>
                      <div className="text-gray-600">{selectedAssetMonitoring.district}, {selectedAssetMonitoring.division}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">📅 Campaign:</span>
                      <div className="font-medium">{selectedAssetMonitoring.campaignName || 'N/A'}</div>
                      <span className="text-gray-500">💰 Investment:</span>
                      <div className="font-medium text-green-600">৳{selectedAssetMonitoring.cost?.toLocaleString() || '0'}</div>
                    </div>
                  </div>
                </div>

                {/* Monitoring Subscription Status */}
                {(() => {
                  const subscription = getAssetMonitoringSubscription(selectedAssetMonitoring.id);
                  return (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-green-600" />
                        Monitoring Service Status
                      </h4>
                      {subscription ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Active - {subscription.frequency.charAt(0).toUpperCase() + subscription.frequency.slice(1)} Monitoring
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Service Level:</span>
                              <div className="font-medium">{subscription.service_level}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Monthly Cost:</span>
                              <div className="font-medium text-green-600">৳{subscription.cost?.toLocaleString() || '0'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Start Date:</span>
                              <div className="font-medium">{subscription.start_date ? new Date(subscription.start_date).toLocaleDateString() : 'N/A'}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Next Inspection:</span>
                              <div className="font-medium">{calculateNextInspectionDate(subscription)}</div>
                            </div>
                          </div>
                          {subscription.notification_preferences && (
                            <div>
                              <span className="text-gray-600 text-sm">Notifications:</span>
                              <div className="flex gap-2 mt-1">
                                {subscription.notification_preferences.email && (
                                  <Badge variant="outline" className="text-xs">📧 Email</Badge>
                                )}
                                {subscription.notification_preferences.whatsapp && (
                                  <Badge variant="outline" className="text-xs">📱 WhatsApp</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 mb-3">No monitoring service active for this asset</p>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              // Pre-select this asset and open monitoring dialog
                              setMonitoringFormData(prev => ({
                                ...prev,
                                selectedAssets: [selectedAssetMonitoring.id]
                              }));
                              setSelectedAssetMonitoring(null); // Close this dialog
                              setShowMonitoringSubscription(true); // Open subscription dialog
                            }}
                          >
                            Subscribe to Monitoring Service
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {monitoringLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading monitoring data...</p>
                    </div>
                  </div>
                ) : monitoringData ? (
                  <>
                    {/* Status Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <CheckCircle className={`w-4 h-4 mr-2 ${
                            monitoringData.condition_status === 'Excellent' ? 'text-green-500' :
                            monitoringData.condition_status === 'Good' ? 'text-yellow-500' :
                            monitoringData.condition_status === 'Fair' ? 'text-orange-500' :
                            'text-red-500'
                          }`} />
                          Overall Condition
                        </h4>
                        <div className={`text-lg font-semibold ${
                          monitoringData.condition_status === 'Excellent' ? 'text-green-600' :
                          monitoringData.condition_status === 'Good' ? 'text-yellow-600' :
                          monitoringData.condition_status === 'Fair' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {monitoringData.condition_status}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(monitoringData.last_inspection_date).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Clock className={`w-4 h-4 mr-2 ${
                            monitoringData.maintenance_status === 'Up to date' ? 'text-green-500' :
                            monitoringData.maintenance_status === 'Due soon' ? 'text-yellow-500' :
                            'text-red-500'
                          }`} />
                          Maintenance
                        </h4>
                        <div className={`text-lg font-semibold ${
                          monitoringData.maintenance_status === 'Up to date' ? 'text-green-600' :
                          monitoringData.maintenance_status === 'Due soon' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {monitoringData.maintenance_status}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Next due: {new Date(monitoringData.next_inspection_due).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                          <AlertCircle className={`w-4 h-4 mr-2 ${
                            monitoringData.active_issues ? 'text-red-500' : 'text-green-500'
                          }`} />
                          Active Issues
                        </h4>
                        <div className={`text-lg font-semibold ${
                          monitoringData.active_issues ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {monitoringData.active_issues || 'None reported'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Status monitored daily
                        </p>
                      </div>
                    </div>

                    {/* Photos Display */}
                    {monitoringData && monitoringData.photos && monitoringData.photos.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                          <Eye className="w-4 h-4 mr-2 text-gray-600" />
                          Recent Photos ({monitoringData.photos.length} available)
                        </h4>
                        
                        {/* Main selected image */}
                        <div 
                          className="mb-3 cursor-pointer relative"
                          onClick={() => setShowImageModal(true)}
                        >
                          <img 
                            src={[...monitoringData.photos].reverse()[selectedImageIndex || 0]} 
                            alt={`${selectedAssetMonitoring.name} - Photo ${(selectedImageIndex || 0) + 1}`}
                            className="w-full h-48 object-cover rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                            <Eye className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        
                        {/* Dot navigation if more than one image */}
                        {monitoringData.photos.length > 1 && (
                          <div className="flex justify-center space-x-3 mt-3">
                            {monitoringData.photos.map((_, index) => (
                              <button
                                key={index}
                                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                                  index === (selectedImageIndex || 0)
                                    ? 'bg-orange-500 transform scale-125' 
                                    : 'bg-gray-400 hover:bg-gray-600'
                                }`}
                                onClick={() => setSelectedImageIndex(index)}
                                aria-label={`View image ${index + 1}`}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Image counter */}
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {monitoringData.photos.length > 1 
                            ? `Image ${(selectedImageIndex || 0) + 1} of ${monitoringData.photos.length} • Click to view larger`
                            : 'Click to view larger • Latest photos shown first'
                          }
                        </p>
                      </div>
                    )}

                    {/* Inspection Data */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-600" />
                        Inspection History
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">• Last Inspection: {new Date(monitoringData.last_inspection_date).toLocaleDateString()} at {new Date(monitoringData.last_inspection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            <p className="text-sm text-gray-600">Inspector: {monitoringData.inspector_name}</p>
                            <p className="text-sm text-gray-600">Next Due: {new Date(monitoringData.next_inspection_due).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {monitoringData.inspection_notes && (
                          <div className="bg-white rounded p-3 border-l-4 border-blue-500">
                            <p className="font-medium text-sm text-gray-700">Notes:</p>
                            <p className="text-sm text-gray-600 mt-1">"{monitoringData.inspection_notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex space-x-3 pt-4 border-t">
                      <Button 
                        onClick={() => {
                          const reason = prompt("Please describe the reason for inspection request (optional):");
                          if (reason !== null) {
                            requestInspection(selectedAssetMonitoring.id, reason);
                          }
                        }}
                        className="bg-orange-600 hover:bg-orange-700 flex items-center space-x-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Request Inspection</span>
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedAssetMonitoring(null);
                          setMonitoringData(null);
                        }}
                      >
                        Close
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Monitoring data not available</h3>
                    <p className="text-gray-500">Unable to load monitoring information for this asset.</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Modal for larger view - Monitoring Dialog */}
        {showImageModal && selectedAssetMonitoring && monitoringData?.photos && (
          <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
            <DialogContent className="max-w-4xl max-h-[95vh] p-2">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-center">
                  {selectedAssetMonitoring.name} - Monitoring Photo {(selectedImageIndex || 0) + 1} of {monitoringData.photos.length}
                </DialogTitle>
              </DialogHeader>
              
              <div className="relative">
                {/* Large image display */}
                <img 
                  src={[...monitoringData.photos].reverse()[selectedImageIndex || 0]} 
                  alt={`${selectedAssetMonitoring.name} - Photo ${(selectedImageIndex || 0) + 1}`}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                />
                
                {/* Navigation arrows */}
                {monitoringData.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => 
                        (prev || 0) === 0 ? monitoringData.photos.length - 1 : (prev || 0) - 1
                      )}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    
                    <button
                      onClick={() => setSelectedImageIndex((prev) => 
                        (prev || 0) === monitoringData.photos.length - 1 ? 0 : (prev || 0) + 1
                      )}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}
                
                {/* Thumbnail navigation at bottom */}
                {monitoringData.photos.length > 1 && (
                  <div className="flex justify-center space-x-2 mt-4 overflow-x-auto">
                    {[...monitoringData.photos].reverse().map((photo, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 cursor-pointer border-2 rounded overflow-hidden ${
                          index === (selectedImageIndex || 0)
                            ? 'border-orange-500' 
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img 
                          src={photo} 
                          alt={`Thumbnail ${index + 1}`}
                          className="w-12 h-12 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        
        {/* Cancel Request Confirmation Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-orange-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Cancel Request
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to cancel this request? 
                {offerToCancel?.status === 'Quoted' 
                  ? ' This will reject the quoted offer from the admin.'
                  : ' This action cannot be undone.'
                }
              </p>
              
              {offerToCancel && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm">
                    <div className="font-semibold">{offerToCancel.asset_name}</div>
                    <div className="text-gray-600">Campaign: {offerToCancel.campaign_name}</div>
                    <div className="text-gray-600">Status: {offerToCancel.status}</div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCancelDialog(false);
                    setOfferToCancel(null);
                  }}
                >
                  Keep Request
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={executeCancelRequest}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {offerToCancel?.status === 'Quoted' ? 'Reject Offer' : 'Cancel Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Asset Details Dialog */}
        <Dialog open={!!selectedOfferDetails} onOpenChange={() => setSelectedOfferDetails(null)}>
          <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b border-gray-200">
              <DialogTitle className="flex items-center text-xl font-bold text-blue-600">
                <FileText className="h-6 w-6 mr-3" />
                Requested Asset Details
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Complete information about your asset request</p>
            </DialogHeader>
            
            {selectedOfferDetails && (
              <div className="space-y-6 pt-4">
                
                {/* Header Summary Card */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl p-6 shadow-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h2 className="text-xl font-bold mb-1">{selectedOfferDetails.asset_name}</h2>
                      <p className="text-blue-100 text-sm">Campaign: {selectedOfferDetails.campaign_name}</p>
                    </div>
                    <div className="text-center">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {selectedOfferDetails.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Request Date</p>
                      <p className="font-semibold">{new Date(selectedOfferDetails.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                    
                    {/* Asset Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 ml-3">Asset Information</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Asset Name:</span>
                          <span className="text-gray-900 font-semibold">{selectedOfferDetails.asset_name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Campaign:</span>
                          <span className="text-gray-900">{selectedOfferDetails.campaign_name}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600 font-medium">Status:</span>
                          <Badge 
                            variant={selectedOfferDetails.status === 'Quoted' ? 'success' : 'secondary'}
                            className={
                              selectedOfferDetails.status === 'Quoted' ? 'bg-green-100 text-green-800 border-green-300' :
                              selectedOfferDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                              'bg-gray-100 text-gray-800 border-gray-300'
                            }
                          >
                            {selectedOfferDetails.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Requested Dates */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-4">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 ml-3">Campaign Duration</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {selectedOfferDetails.asset_start_date && selectedOfferDetails.asset_expiration_date ? (
                          <>
                            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                              <CalendarDays className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-sm text-gray-600">Start Date</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(selectedOfferDetails.asset_start_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                              <CalendarDays className="w-4 h-4 text-red-600" />
                              <div>
                                <p className="text-sm text-gray-600">End Date</p>
                                <p className="font-semibold text-gray-900">
                                  {new Date(selectedOfferDetails.asset_expiration_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-500 italic">No specific dates provided</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    
                    {/* Pricing Information */}
                    {selectedOfferDetails.admin_quoted_price && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 ml-3">Admin Quoted Price</h3>
                        </div>
                        
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-sm text-gray-600 mb-1">Monthly Rate</p>
                          <p className="text-3xl font-bold text-green-600">
                            ৳{selectedOfferDetails.admin_quoted_price?.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">per month</p>
                        </div>
                      </div>
                    )}

                    {/* Additional Services */}
                    {(selectedOfferDetails.service_bundles || selectedOfferDetails.additional_services) && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-4">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Star className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 ml-3">Additional Services</h3>
                        </div>
                        
                        <div className="space-y-2">
                          {selectedOfferDetails.service_bundles && Object.entries(selectedOfferDetails.service_bundles).map(([service, enabled]) => (
                            enabled && (
                              <div key={service} className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-purple-600" />
                                <span className="text-gray-900 capitalize">{service.replace('_', ' ')}</span>
                              </div>
                            )
                          ))}
                          {selectedOfferDetails.additional_services && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">{selectedOfferDetails.additional_services}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Full Width Sections */}
                
                {/* Special Requirements */}
                {selectedOfferDetails.special_requirements && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 ml-3">Special Requirements</h3>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {selectedOfferDetails.special_requirements}
                      </p>
                    </div>
                  </div>
                )}

                {/* Campaign Notes & Instructions */}
                {selectedOfferDetails.notes && (
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 ml-3">Campaign Notes & Instructions</h3>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {selectedOfferDetails.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons for Quoted Offers */}
                {selectedOfferDetails.status === 'Quoted' && (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      Available Actions
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        onClick={() => {
                          handleApproveOffer(selectedOfferDetails);
                          setSelectedOfferDetails(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Offer
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedOfferDetails(null);
                        }}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Request Revision
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          handleRejectOffer(selectedOfferDetails);
                          setSelectedOfferDetails(null);
                        }}
                        className="border-red-300 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Offer
                      </Button>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedOfferDetails(null)}
                    className="px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Monitoring Service Subscription Dialog */}
        <Dialog open={showMonitoringSubscription} onOpenChange={(open) => {
          setShowMonitoringSubscription(open);
          if (!open) {
            setSelectedCampaign(null);
            setCampaignAssetsForMonitoring([]);
            setMonitoringFormData({
              frequency: 'monthly',
              startDate: null,
              endDate: null,
              selectedAssets: [],
              serviceLevel: 'basic',
              notificationPreferences: {
                email: true,
                in_app: true,
                sms: false
              }
            });
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-600" />
                <span>Subscribe to Monitoring Service</span>
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set up real-time monitoring for your campaign assets
              </p>
            </DialogHeader>
            
            {/* Content for campaign-based monitoring */}
            {selectedCampaign && (
              <div className="space-y-6">
                {/* Campaign Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 flex items-center">
                    <Building className="w-5 h-5 mr-2 text-blue-600" />
                    {selectedCampaign.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <Badge className="ml-2 bg-green-100 text-green-800">{selectedCampaign.status}</Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <span className="font-medium text-green-600 ml-2">৳{selectedCampaign.budget?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Asset Selection */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Select Assets to Monitor
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({monitoringFormData.selectedAssets.length} of {campaignAssetsForMonitoring.length} selected)
                    </span>
                  </h4>
                  
                  {campaignAssetsForMonitoring.length > 0 ? (
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                      {campaignAssetsForMonitoring.map((asset) => (
                        <div key={asset.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            id={`asset-${asset.id}`}
                            checked={monitoringFormData.selectedAssets.includes(asset.id)}
                            onChange={(e) => handleAssetSelectionChange(asset.id, e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`asset-${asset.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium text-gray-900">{asset.name}</div>
                            <div className="text-sm text-gray-500">{asset.address} • {asset.type}</div>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No assets found for this campaign</p>
                    </div>
                  )}
                </div>

                {/* Monitoring Frequency - Controlled by Service Level */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    Monitoring Frequency
                  </h4>
                  <Select
                    value={monitoringFormData.frequency}
                    onValueChange={(value) => setMonitoringFormData(prev => ({...prev, frequency: value}))}
                    disabled={true}
                  >
                    <SelectTrigger className="w-full opacity-75 cursor-not-allowed">
                      <SelectValue placeholder="Select monitoring frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Monitoring</SelectItem>
                      <SelectItem value="weekly">Weekly Monitoring</SelectItem>
                      <SelectItem value="monthly">Monthly Monitoring</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium mb-1">Frequency automatically set by Service Level:</div>
                    {monitoringFormData.frequency === 'daily' && <p>• Daily photos and condition reports (Premium Level)</p>}
                    {monitoringFormData.frequency === 'weekly' && <p>• Weekly detailed inspections with photo documentation (Standard Level)</p>}
                    {monitoringFormData.frequency === 'monthly' && <p>• Monthly thorough asset health assessments (Basic Level)</p>}
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monitoring Start Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {monitoringFormData.startDate ? monitoringFormData.startDate.toLocaleDateString() : "Select start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={monitoringFormData.startDate}
                          onSelect={(date) => setMonitoringFormData(prev => ({...prev, startDate: date}))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monitoring End Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {monitoringFormData.endDate ? monitoringFormData.endDate.toLocaleDateString() : "Select end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={monitoringFormData.endDate}
                          onSelect={(date) => setMonitoringFormData(prev => ({...prev, endDate: date}))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Service Level */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-600" />
                    Service Level
                  </h4>
                  <Select
                    value={monitoringFormData.serviceLevel}
                    onValueChange={(value) => {
                      let newFrequency = 'weekly'; // default
                      let autoSelectWhatsApp = false;
                      
                      // Set frequency based on service level and auto-select WhatsApp for premium
                      if (value === 'basic') {
                        newFrequency = 'monthly';
                      } else if (value === 'standard') {
                        newFrequency = 'weekly';
                      } else if (value === 'premium') {
                        newFrequency = 'daily';
                        autoSelectWhatsApp = true;
                      }
                      
                      setMonitoringFormData(prev => ({
                        ...prev, 
                        serviceLevel: value,
                        frequency: newFrequency,
                        notificationPreferences: {
                          ...prev.notificationPreferences,
                          whatsapp: autoSelectWhatsApp || prev.notificationPreferences.whatsapp
                        }
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select service level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic (Monthly)</SelectItem>
                      <SelectItem value="standard">Standard (Weekly)</SelectItem>
                      <SelectItem value="premium">Premium (Daily)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="font-medium mb-1">Basic Level:</div>
                        <ul className="text-xs space-y-1">
                          <li>• Monthly monitoring</li>
                          <li>• Basic photo documentation</li>
                          <li>• Email notifications only</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Standard Level:</div>
                        <ul className="text-xs space-y-1">
                          <li>• Weekly monitoring</li>
                          <li>• Photo documentation</li>
                          <li>• Condition reporting</li>
                          <li>• Basic maintenance alerts</li>
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Premium Level:</div>
                        <ul className="text-xs space-y-1">
                          <li>• Daily monitoring</li>
                          <li>• Comprehensive reporting</li>
                          <li>• Real-time alerts</li>
                          <li>• WhatsApp notifications</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notification Preferences */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2 text-purple-600" />
                    Notification Preferences
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="email-notifications"
                        checked={monitoringFormData.notificationPreferences.email}
                        onChange={(e) => setMonitoringFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            email: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="email-notifications" className="text-sm text-gray-700">
                        Email notifications for monitoring reports and alerts
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="app-notifications"
                        checked={monitoringFormData.notificationPreferences.in_app}
                        onChange={(e) => setMonitoringFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            in_app: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="app-notifications" className="text-sm text-gray-700">
                        In-app notifications and dashboard alerts
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="sms-notifications"
                        checked={monitoringFormData.notificationPreferences.sms}
                        onChange={(e) => setMonitoringFormData(prev => ({
                          ...prev,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            sms: e.target.checked
                          }
                        }))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="sms-notifications" className="text-sm text-gray-700">
                        SMS alerts for urgent issues (premium feature)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">📋 Subscription Summary</h4>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Campaign:</strong> {selectedCampaign.name}</p>
                    <p><strong>Assets:</strong> {monitoringFormData.selectedAssets.length} selected</p>
                    <p><strong>Frequency:</strong> {monitoringFormData.frequency.replace('_', '-')} monitoring</p>
                    <p><strong>Duration:</strong> {monitoringFormData.startDate && monitoringFormData.endDate 
                      ? `${monitoringFormData.startDate.toLocaleDateString()} - ${monitoringFormData.endDate.toLocaleDateString()}`
                      : 'Please select dates'
                    }</p>
                    <p><strong>Service Level:</strong> {monitoringFormData.serviceLevel} monitoring</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowMonitoringSubscription(false)}
                    disabled={monitoringSubmitting}
                  >
                    Cancel
                  </Button>
                  
                  <Button 
                    onClick={handleCreateMonitoringSubscription}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={
                      monitoringSubmitting ||
                      monitoringFormData.selectedAssets.length === 0 ||
                      !monitoringFormData.startDate ||
                      !monitoringFormData.endDate
                    }
                  >
                    {monitoringSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Monitoring Service
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Content for individual asset monitoring */}
            {!selectedCampaign && monitoringFormData.selectedAssets.length > 0 && (
              <div className="space-y-6">
                {/* Selected Assets Display */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Selected Assets ({monitoringFormData.selectedAssets.length})
                  </h4>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {liveAssets.filter(asset => monitoringFormData.selectedAssets.includes(asset.id)).map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <div>
                          <div className="font-medium text-gray-900">{asset.name}</div>
                          <div className="text-sm text-gray-500 truncate">{asset.address}</div>
                          <div className="text-xs text-gray-400">Campaign: {asset.campaignName}</div>
                        </div>
                        <div className="text-xs text-green-600 font-medium">
                          ৳{asset.cost?.toLocaleString() || '0'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monitoring Configuration for Individual Assets */}
                <div className="space-y-6">
                  {/* Service Level */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Service Level
                    </label>
                    <select
                      value={monitoringFormData.serviceLevel}
                      onChange={(e) => {
                        const newServiceLevel = e.target.value;
                        let newFrequency = 'weekly'; // default
                        let autoSelectWhatsApp = false;
                        
                        // Set frequency based on service level and auto-select WhatsApp for premium
                        if (newServiceLevel === 'basic') {
                          newFrequency = 'monthly';
                        } else if (newServiceLevel === 'standard') {
                          newFrequency = 'weekly';
                        } else if (newServiceLevel === 'premium') {
                          newFrequency = 'daily';
                          autoSelectWhatsApp = true;
                        }
                        
                        setMonitoringFormData(prev => ({
                          ...prev, 
                          serviceLevel: newServiceLevel,
                          frequency: newFrequency,
                          notificationPreferences: {
                            ...prev.notificationPreferences,
                            whatsapp: autoSelectWhatsApp || prev.notificationPreferences.whatsapp
                          }
                        }));
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="basic">Basic (Monthly)</option>
                      <option value="standard">Standard (Weekly)</option>
                      <option value="premium">Premium (Daily)</option>
                    </select>
                  </div>

                  {/* Frequency - Now controlled by Service Level */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Monitoring Frequency
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['daily', 'weekly', 'monthly'].map((freq) => {
                        const isDisabled = (
                          (monitoringFormData.serviceLevel === 'basic' && freq !== 'monthly') ||
                          (monitoringFormData.serviceLevel === 'standard' && freq !== 'weekly') ||
                          (monitoringFormData.serviceLevel === 'premium' && freq !== 'daily')
                        );
                        
                        return (
                          <label 
                            key={freq} 
                            className={`flex items-center space-x-2 ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                          >
                            <input
                              type="radio"
                              name="frequency"
                              value={freq}
                              checked={monitoringFormData.frequency === freq}
                              disabled={isDisabled}
                              onChange={(e) => setMonitoringFormData(prev => ({...prev, frequency: e.target.value}))}
                              className="text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={`text-sm font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-700'} capitalize`}>
                              {freq}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Selected service level determines frequency:</span>
                      <br />
                      • Basic: Monthly monitoring only
                      <br />
                      • Standard: Weekly monitoring only  
                      <br />
                      • Premium: Daily monitoring only
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-900">
                      Notification Preferences
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={monitoringFormData.notificationPreferences.email}
                          onChange={(e) => setMonitoringFormData(prev => ({
                            ...prev,
                            notificationPreferences: {...prev.notificationPreferences, email: e.target.checked}
                          }))}
                          className="text-blue-600 focus:ring-blue-500 rounded"
                        />
                        <span className="text-sm text-gray-700">📧 Email notifications</span>
                      </label>
                      <label className={`flex items-center space-x-2 cursor-pointer ${monitoringFormData.serviceLevel !== 'premium' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="checkbox"
                          checked={monitoringFormData.notificationPreferences.whatsapp}
                          disabled={monitoringFormData.serviceLevel !== 'premium'}
                          onChange={(e) => setMonitoringFormData(prev => ({
                            ...prev,
                            notificationPreferences: {...prev.notificationPreferences, whatsapp: e.target.checked}
                          }))}
                          className="text-blue-600 focus:ring-blue-500 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-700">
                          📱 WhatsApp notifications 
                          {monitoringFormData.serviceLevel !== 'premium' && (
                            <span className="text-xs text-gray-500 ml-1">(Premium only)</span>
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Summary and Submit */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Monitoring Service Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Assets:</span>
                      <div className="font-medium">{monitoringFormData.selectedAssets.length} selected</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Service Level:</span>
                      <div className="font-medium capitalize">{monitoringFormData.serviceLevel}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <div className="font-medium capitalize">{monitoringFormData.frequency}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Notifications:</span>
                      <div className="font-medium">
                        {monitoringFormData.notificationPreferences.email && monitoringFormData.notificationPreferences.whatsapp ? 'Email + WhatsApp' :
                         monitoringFormData.notificationPreferences.email ? 'Email only' :
                         monitoringFormData.notificationPreferences.whatsapp ? 'WhatsApp only' : 'None'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowMonitoringSubscription(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateMonitoringSubscription}
                    disabled={monitoringSubmitting || monitoringFormData.selectedAssets.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                  >
                    {monitoringSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Monitoring Service
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Show message when no assets are selected and no campaign */}
            {!selectedCampaign && monitoringFormData.selectedAssets.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Please select assets to set up monitoring service.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Congratulations Modal */}
        <Dialog open={showCongratulationsModal} onOpenChange={setShowCongratulationsModal}>
          <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-blue-50">
            <div className="text-center p-6">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 Congratulations!</h2>
              
              {/* Asset Info */}
              <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
                <p className="text-lg font-semibold text-gray-800 mb-1">
                  "{congratulationsData.assetName}"
                </p>
                <p className="text-green-600 font-medium">is now locked for you!</p>
                {congratulationsData.quotedPrice && (
                  <p className="text-sm text-gray-600 mt-2">
                    Quoted Price: ৳{congratulationsData.quotedPrice.toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Next Steps */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  📋 Next Steps:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Please send the Purchase Order (PO) within <strong>7 days</strong></li>
                  <li>• Our admin team will review and finalize your booking</li>
                  <li>• You'll receive confirmation once PO is processed</li>
                </ul>
              </div>
              
              {/* Thank You */}
              <p className="text-gray-600 mb-6">
                Thank you for choosing our platform! 🚀
              </p>
              
              {/* Close Button */}
              <Button 
                onClick={() => setShowCongratulationsModal(false)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
              >
                Great! Got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BuyerDashboard;