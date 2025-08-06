import React, { useState, useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import axios from 'axios';
import { 
  MapPin, 
  Filter, 
  Search, 
  DollarSign, 
  Calendar,
  Eye,
  Car,
  Building,
  ShoppingBag,
  X,
  Plus,
  Star,
  Clock,
  Users,
  TrendingUp,
  ArrowLeft,
  Home,
  MessageSquare,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { getAuthHeaders, getUser, logout } from '../utils/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotification } from './ui/notification';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const MarketplacePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();
  const [currentUser, setCurrentUser] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [campaign, setCampaign] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    division: 'all',
    district: 'all',
    minPrice: '',
    maxPrice: '',
    duration: '3_months'
  });
  const [stats, setStats] = useState({});
  const [viewMode, setViewMode] = useState('map');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [existingCampaigns, setExistingCampaigns] = useState([]);
  const [selectedCampaignForAsset, setSelectedCampaignForAsset] = useState(null);
  const [selectedAssetForOffer, setSelectedAssetForOffer] = useState(null);
  const [showNewCampaignWelcome, setShowNewCampaignWelcome] = useState(false);
  const [welcomeCampaignName, setWelcomeCampaignName] = useState('');
  
  // Asset Basket/Cart state
  const [assetBasket, setAssetBasket] = useState([]);
  const [showAssetBasket, setShowAssetBasket] = useState(false);
  const [basketLoading, setBasketLoading] = useState(false);
  
  const [offerDetails, setOfferDetails] = useState({
    campaignType: 'existing',
    campaignName: '',
    existingCampaignId: '',
    assetId: '',
    contractDuration: '3_months',
    estimatedBudget: '', // Add missing estimatedBudget field
    customStartDate: null,
    customEndDate: null,
    customDurationDays: null,
    serviceBundles: {
      printing: false,
      setup: false,
      monitoring: false
    },
    timeline: '',
    tentativeStartDate: null,
    selectedCampaignEndDate: null,
    assetExpirationDate: null,
    expirationWarning: null,
    specialRequirements: '',
    notes: ''
  });

  const assetTypeIcons = {
    'Billboard': Building,
    'Police Box': ShoppingBag,
    'Roadside Barrier': Car,
    'Traffic Height Restriction Overhead': Car,
    'Railway Station': TrendingUp,
    'Market': ShoppingBag,
    'Wall': Building,
    'Bridge': Building,
    'Bus Stop': Car,
    'Others': MapPin
  };

  const statusColors = {
    'Available': 'bg-green-500',
    'Booked': 'bg-orange-500',
    'Live': 'bg-blue-500',
    'Work in Progress': 'bg-yellow-500',
    'Unavailable': 'bg-gray-500',
    'Pending Approval': 'bg-purple-500'
  };

  const bangladeshDivisions = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rangpur', 'Rajshahi', 'Khulna', 'Barisal', 'Mymensingh'
  ];

  useEffect(() => {
    // Check authentication status
    const user = getUser();
    setCurrentUser(user);
    
    initializeMap();
    fetchAssets();
    fetchStats();
    
    if (user) {
      fetchExistingCampaigns();
    }
    
    // Set up automatic refresh every 30 seconds to keep asset status up-to-date
    const refreshInterval = setInterval(() => {
      fetchAssets();
      fetchStats();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  useEffect(() => {
    if (viewMode === 'map') {
      // Always reinitialize map when switching to map view
      setTimeout(() => {
        if (mapRef.current) {
          initializeMap();
        }
      }, 300); // Increased timeout for better reliability
    }
  }, [viewMode]);

  useEffect(() => {
    applyFilters();
  }, [assets, filters, searchTerm]);

  useEffect(() => {
    if (mapInstanceRef.current && filteredAssets.length > 0) {
      updateMapMarkers();
    }
  }, [filteredAssets]);

  useEffect(() => {
    // Check if user is coming from new campaign creation
    const urlParams = new URLSearchParams(location.search);
    const isNewCampaign = urlParams.get('newCampaign') === 'true';
    const campaignId = urlParams.get('campaign');
    
    if (isNewCampaign && campaignId) {
      // Get campaign name from sessionStorage
      const campaignFromSession = sessionStorage.getItem('selectedCampaignForOffer');
      if (campaignFromSession) {
        try {
          const campaignData = JSON.parse(campaignFromSession);
          setWelcomeCampaignName(campaignData.name);
          setShowNewCampaignWelcome(true);
          
          // Remove newCampaign parameter to avoid showing banner on refresh
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('newCampaign');
          window.history.replaceState({}, '', newUrl);
        } catch (error) {
          console.error('Error parsing campaign from session:', error);
        }
      }
    }
  }, [location.search]);

  const initializeMap = async () => {
    if (!mapRef.current || !GOOGLE_MAPS_API_KEY) {
      console.error('Map container or API key not available');
      return;
    }

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    try {
      await loader.load();
      
      // Clear existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
      
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 23.8103, lng: 90.4125 }, // Dhaka, Bangladesh
        zoom: 7,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      mapInstanceRef.current = map;
      
      // Update markers if assets are available
      if (filteredAssets.length > 0) {
        updateMapMarkers();
      }
    } catch (error) {
      console.error('Error loading Google Maps:', error);
    }
  };

  const updateMapMarkers = () => {
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create new markers
    filteredAssets.forEach(asset => {
      const marker = new window.google.maps.Marker({
        position: { lat: asset.location.lat, lng: asset.location.lng },
        map: mapInstanceRef.current,
        title: asset.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: asset.status === 'Booked' ? '#f59e0b' : '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(asset)
      });

      marker.addListener('click', () => {
        setSelectedAsset(asset);
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });
  };

  const createInfoWindowContent = (asset) => {
    const pricing = asset.pricing['3_months'] || Object.values(asset.pricing)[0];
    return `
      <div style="max-width: 300px; font-family: system-ui;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${asset.name}</h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${asset.address}</p>
        <div style="display: flex; gap: 8px; margin: 8px 0;">
          <span style="background: ${asset.status === 'Booked' ? '#fef3c7' : '#dcfce7'}; 
                       color: ${asset.status === 'Booked' ? '#d97706' : '#16a34a'}; 
                       padding: 2px 8px; border-radius: 12px; font-size: 12px;">${asset.status === 'Booked' ? 'Booked' : 'Available'}</span>
          <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${asset.type}</span>
        </div>
        <p style="margin: 8px 0; font-weight: 600;">From ৳${pricing.toLocaleString()}</p>
        <p style="margin: 0; font-size: 12px; color: #666;">${asset.dimensions} • ${asset.traffic_volume} traffic</p>
      </div>
    `;
  };

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${API}/assets/public`);
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleRequestBestOffer = async (asset) => {
    console.log('🎯 handleRequestBestOffer function called with asset:', asset);
    console.log('🎯 Current user check:', currentUser);
    
    if (!currentUser) {
      console.log('❌ No current user, showing alert');
      alert('Please sign in to request offers.');
      return;
    }
    
    console.log('✅ User authenticated, proceeding with asset selection');
    setSelectedAssetForOffer(asset);
    
    console.log('🚀 About to call fetchExistingCampaigns...');
    // Fetch campaigns first
    await fetchExistingCampaigns(); 
    console.log('✅ fetchExistingCampaigns completed');
    
    // Check both URL parameter and sessionStorage for campaign context
    const urlParams = new URLSearchParams(location.search);
    const campaignIdFromUrl = urlParams.get('campaign');
    const isNewCampaign = urlParams.get('newCampaign') === 'true';
    const campaignFromSession = sessionStorage.getItem('selectedCampaignForOffer');
    
    console.log('🔍 Checking campaign context:', { campaignIdFromUrl, campaignFromSession, isNewCampaign });
    
    // Show special message for new campaigns
    if (isNewCampaign && campaignIdFromUrl) {
      // Remove the newCampaign parameter from URL to avoid showing message repeatedly
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete('newCampaign');
      window.history.replaceState({}, '', newUrl);
    }
    
    let campaignToPreselect = null;
    
    // Try URL parameter first, then sessionStorage
    if (campaignIdFromUrl) {
      // Fetch campaign details for URL parameter
      try {
        const headers = getAuthHeaders();
        const response = await axios.get(`${API}/campaigns`, { headers });
        const campaigns = response.data || [];
        campaignToPreselect = campaigns.find(c => c.id === campaignIdFromUrl);
      } catch (error) {
        console.error('Error fetching campaign from URL parameter:', error);
      }
    } else if (campaignFromSession) {
      // Use sessionStorage data
      try {
        campaignToPreselect = JSON.parse(campaignFromSession);
        // Clear it after use to prevent stale data
        sessionStorage.removeItem('selectedCampaignForOffer');
      } catch (error) {
        console.error('Error parsing campaign from sessionStorage:', error);
      }
    }
    
    // Pre-populate if we found a campaign
    if (campaignToPreselect) {
      console.log('Pre-populating campaign:', campaignToPreselect);
      setTimeout(() => {
        setOfferDetails(prev => ({
          ...prev,
          campaignType: 'existing',
          existingCampaignId: campaignToPreselect.id,
          campaignName: campaignToPreselect.name,
          selectedCampaignEndDate: campaignToPreselect.end_date
        }));
      }, 500); // Increased timeout for better reliability
    }
    
    setShowOfferDialog(true);
  };

  // Calculate custom duration days
  const calculateCustomDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const fetchExistingCampaigns = async () => {
    if (!currentUser) {
      console.log('❌ No current user, cannot fetch campaigns');
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      console.log('🚀 Fetching campaigns with headers:', headers);
      const response = await axios.get(`${API}/campaigns`, { headers });
      console.log('✅ Fetched campaigns successfully:', response.data);
      console.log('🎯 Setting existingCampaigns state to:', response.data || []);
      setExistingCampaigns(response.data || []);
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      console.log('🎯 Setting existingCampaigns state to empty array');
      setExistingCampaigns([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/public`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = assets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(asset => 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.division.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filters.type && filters.type !== 'all') {
      filtered = filtered.filter(asset => asset.type === filters.type);
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(asset => asset.status === filters.status);
    }

    // Division filter
    if (filters.division && filters.division !== 'all') {
      filtered = filtered.filter(asset => asset.division === filters.division);
    }

    // District filter
    if (filters.district && filters.district !== 'all') {
      filtered = filtered.filter(asset => asset.district === filters.district);
    }

    // Price filter
    if (filters.minPrice || filters.maxPrice) {
      filtered = filtered.filter(asset => {
        const priceKey = filters.duration.replace('_months', '_months');
        const price = asset.pricing[priceKey] || Object.values(asset.pricing)[0];
        const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
        const max = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
        return price >= min && price <= max;
      });
    }

    setFilteredAssets(filtered);
  };

  const addToCampaign = (asset) => {
    if (!currentUser) {
      alert('Please log in to add assets to campaign');
      navigate('/login');
      return;
    }
    
    setSelectedCampaignForAsset(asset);
    setShowCampaignDialog(true);
    // Fetch existing campaigns when dialog opens
    fetchExistingCampaigns();
  };

  const addAssetToExistingCampaign = async (campaignId) => {
    console.log('addAssetToExistingCampaign called with campaignId:', campaignId);
    console.log('selectedCampaignForAsset:', selectedCampaignForAsset);
    console.log('existingCampaigns:', existingCampaigns);
    
    try {
      const headers = getAuthHeaders();
      const selectedCampaign = existingCampaigns.find(c => c.id === campaignId);
      console.log('Found selectedCampaign:', selectedCampaign);
      
      if (selectedCampaign) {
        const updatedAssets = [...(selectedCampaign.assets || [])];
        console.log('Current assets in campaign:', updatedAssets);
        console.log('Asset to add:', selectedCampaignForAsset.id);
        
        if (!updatedAssets.includes(selectedCampaignForAsset.id)) {
          updatedAssets.push(selectedCampaignForAsset.id);
          console.log('Updated assets array:', updatedAssets);
          
          console.log('Making API call to update campaign...');
          const response = await axios.put(`${API}/campaigns/${campaignId}`, {
            assets: updatedAssets
          }, { headers });
          console.log('API response:', response.data);
          
          // Add to temporary campaign for UI
          if (!campaign.find(item => item.id === selectedCampaignForAsset.id)) {
            setCampaign([...campaign, selectedCampaignForAsset]);
          }
          
          // Better UI feedback instead of alert
          setShowCampaignDialog(false);
          fetchExistingCampaigns(); // Refresh campaigns
          
          console.log('Asset added to campaign successfully!');
        } else {
          console.log('Asset is already in this campaign');
        }
      }
    } catch (error) {
      console.error('Error adding asset to campaign:', error);
      console.error('Error details:', error.response?.data);
      // Keep alert for errors since they're important
      alert('Failed to add asset to campaign. Error: ' + (error.response?.data?.detail || error.message));
    }
  };

  const createNewCampaignWithAsset = async (campaignName) => {
    try {
      const headers = getAuthHeaders();
      const newCampaign = {
        name: campaignName,
        description: `Campaign created from marketplace`,
        assets: [selectedCampaignForAsset.id],
        budget: 0
      };
      
      await axios.post(`${API}/campaigns`, newCampaign, { headers });
      
      // Add to temporary campaign for UI
      if (!campaign.find(item => item.id === selectedCampaignForAsset.id)) {
        setCampaign([...campaign, selectedCampaignForAsset]);
      }
      
      alert('New campaign created and asset added successfully!');
      setShowCampaignDialog(false);
      fetchExistingCampaigns(); // Refresh campaigns
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const removeFromCampaign = (assetId) => {
    setCampaign(campaign.filter(item => item.id !== assetId));
  };

  const calculateCampaignTotal = () => {
    return campaign.reduce((total, asset) => {
      const priceKey = offerDetails.duration || filters.duration;
      return total + (asset.pricing[priceKey] || Object.values(asset.pricing)[0]);
    }, 0);
  };

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

  const updateAssetExpirationDate = () => {
    let startDate = null;
    let campaignEndDate = null;
    
    // Always use tentativeStartDate as the asset start date
    if (offerDetails.tentativeStartDate) {
      startDate = offerDetails.tentativeStartDate;
    }
    
    // Check campaign end date for existing campaigns
    if (offerDetails.existingCampaignId && offerDetails.selectedCampaignEndDate) {
      campaignEndDate = new Date(offerDetails.selectedCampaignEndDate);
    }
    
    if (startDate) {
      const assetExpiration = calculateAssetExpirationDate(startDate, offerDetails.contractDuration, offerDetails.customEndDate);
      
      // Check if asset expiration exceeds campaign end date
      if (campaignEndDate && assetExpiration > campaignEndDate) {
        // Asset expiration cannot exceed campaign end date
        setOfferDetails(prev => ({
          ...prev,
          assetExpirationDate: campaignEndDate,
          expirationWarning: `Asset expiration adjusted to campaign end date (${campaignEndDate.toLocaleDateString()})`
        }));
      } else {
        setOfferDetails(prev => ({
          ...prev,
          assetExpirationDate: assetExpiration,
          expirationWarning: null
        }));
      }
    } else {
      setOfferDetails(prev => ({
        ...prev,
        assetExpirationDate: null,
        expirationWarning: null
      }));
    }
  };

  // Update asset expiration whenever relevant fields change
  React.useEffect(() => {
    updateAssetExpirationDate();
  }, [offerDetails.tentativeStartDate, offerDetails.contractDuration, offerDetails.existingCampaignId, offerDetails.selectedCampaignEndDate]);

  const handleOfferSubmit = async (redirectToDashboard = true) => {
    console.log('🚀 handleOfferSubmit function called!');
    console.log('🚀 Current offerDetails:', offerDetails);
    console.log('🚀 Selected asset:', selectedAssetForOffer);
    console.log('🚀 Current user:', currentUser);
    
    try {
      if (!currentUser) {
        console.log('❌ No current user, redirecting to login');
        alert('Please sign in to submit a campaign request.');
        navigate('/login');
        return;
      }

      // Validation for campaign selection
      if (!offerDetails.existingCampaignId) {
        console.log('❌ No campaign selected');
        notify.warning('Please select an existing campaign.');
        return;
      }

      // Asset start date validation
      if (!offerDetails.tentativeStartDate) {
        notify.warning('Please select an asset starting date.');
        return;
      }

      if (!selectedAssetForOffer) {
        notify.error('No asset selected for offer request.');
        return;
      }

      // Check asset availability before submitting
      try {
        const headers = getAuthHeaders();
        const assetCheckRes = await axios.get(`${API}/assets/${selectedAssetForOffer.id}`, { headers });
        const currentAssetStatus = assetCheckRes.data.status;
        
        if (currentAssetStatus === 'Booked') {
          alert(`Asset is no longer available. Current status: Booked. Please select a different asset.`);
          return;
        }
      } catch (error) {
        console.error('Error checking asset availability:', error);
        alert('Unable to verify asset availability. Please try again.');
        return;
      }

      const headers = getAuthHeaders();
      
      // Prepare offer request data
      const offerRequestData = {
        buyer_id: currentUser.id,
        buyer_name: currentUser.company_name,
        asset_id: selectedAssetForOffer.id,
        asset_name: selectedAssetForOffer.name,
        campaign_type: offerDetails.campaignType,
        campaign_name: offerDetails.campaignName,
        existing_campaign_id: offerDetails.existingCampaignId,
        contract_duration: offerDetails.contractDuration,
        estimated_budget: null, // Removed from buyer input as per requirements
        custom_start_date: offerDetails.contractDuration === 'custom' ? (offerDetails.customStartDate ? offerDetails.customStartDate.toISOString() : null) : null,
        custom_end_date: offerDetails.contractDuration === 'custom' ? (offerDetails.customEndDate ? offerDetails.customEndDate.toISOString() : null) : null,
        custom_duration_days: offerDetails.contractDuration === 'custom' ? offerDetails.customDurationDays : null,
        service_bundles: offerDetails.serviceBundles,
        timeline: offerDetails.timeline,
        asset_start_date: offerDetails.tentativeStartDate ? offerDetails.tentativeStartDate.toISOString() : null,
        asset_expiration_date: offerDetails.assetExpirationDate ? offerDetails.assetExpirationDate.toISOString() : null,
        special_requirements: offerDetails.specialRequirements,
        notes: offerDetails.notes
      };

      // Submit offer request
      console.log('🚀 About to submit offer request:', offerRequestData);
      const response = await axios.post(`${API}/offers/request`, offerRequestData, { headers });
      console.log('✅ Offer request submitted successfully:', response.data);
      
      // Add to asset basket with offer request ID
      setAssetBasket(prev => [...prev, {
        ...selectedAssetForOffer,
        campaign: offerDetails.campaignName || 'Selected Campaign',
        requestDate: new Date().toLocaleDateString(),
        offerRequestId: response.data.id, // Store the offer request ID for deletion
        campaignId: offerDetails.existingCampaignId
      }]);
      
      // Close dialog and reset form
      setShowOfferDialog(false);
      setSelectedAssetForOffer(null);
      setOfferDetails({
        campaignType: 'existing',
        campaignName: '',
        existingCampaignId: '',
        assetId: '',
        contractDuration: '3_months',
        customStartDate: null,
        customEndDate: null,
        customDurationDays: null,
        serviceBundles: {
          printing: false,
          setup: false,
          monitoring: false
        },
        timeline: '',
        tentativeStartDate: null,
        selectedCampaignEndDate: null,
        assetExpirationDate: null,
        expirationWarning: null,
        specialRequirements: '',
        notes: ''
      });

      // Refresh assets to show updated status
      fetchAssets();
      
      if (redirectToDashboard) {
        console.log('🔄 About to redirect to buyer dashboard...');
        
        // Show success message and redirect to Buyer Dashboard → Requested Offers tab
        notify.success('Your offer request has been submitted successfully! Redirecting to your Requested Offers...');
        
        // Use setTimeout to ensure the notification is shown before redirect
        setTimeout(() => {
          console.log('🎯 Executing redirect to /buyer/dashboard?tab=requested-offers');
          navigate('/buyer/dashboard?tab=requested-offers');
        }, 1500); // Slightly longer to show notification
      } else {
        // Show success message for continue shopping
        notify.success('Asset added to your requests! You can continue adding more assets.');
        setShowAssetBasket(true); // Show basket after adding
      }
      
    } catch (error) {
      console.error('Error submitting offer request:', error);
      
      // Check if this is an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        notify.error('Your session has expired. Please login again.');
        navigate('/login');
        return;
      }
      
      // For other errors, show the error but don't redirect
      notify.error('Error submitting request: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Handle individual asset removal from basket
  const handleRemoveFromBasket = async (asset, index) => {
    setBasketLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Delete the offer request from backend
      if (asset.offerRequestId) {
        await axios.delete(`${API}/offers/requests/${asset.offerRequestId}`, { headers });
        console.log(`✅ Deleted offer request ${asset.offerRequestId} for asset ${asset.name}`);
      }
      
      // Remove from basket
      setAssetBasket(prev => prev.filter((_, i) => i !== index));
      
      // Refresh assets to show updated status
      fetchAssets();
      
      notify.success(`Removed "${asset.name}" from your requests`);
      
    } catch (error) {
      console.error('❌ Error removing asset from basket:', error);
      notify.error('Error removing asset request: ' + (error.response?.data?.detail || error.message));
    } finally {
      setBasketLoading(false);
    }
  };

  // Handle clearing all assets from basket
  const handleClearBasket = async () => {
    setBasketLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // Delete all offer requests from backend
      const deletePromises = assetBasket.map(asset => {
        if (asset.offerRequestId) {
          return axios.delete(`${API}/offers/requests/${asset.offerRequestId}`, { headers });
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${assetBasket.length} offer requests`);
      
      // Clear basket
      setAssetBasket([]);
      
      // Refresh assets to show updated status
      fetchAssets();
      
      notify.success('All asset requests have been cancelled');
      
    } catch (error) {
      console.error('❌ Error clearing basket:', error);
      notify.error('Error clearing requests: ' + (error.response?.data?.detail || error.message));
    } finally {
      setBasketLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const user = getUser();
                  if (user) {
                    // Redirect to appropriate dashboard based on user role
                    if (user.role === 'admin') {
                      navigate('/admin/dashboard');
                    } else if (user.role === 'seller') {
                      navigate('/seller/dashboard');
                    } else if (user.role === 'buyer') {
                      navigate('/buyer/dashboard');
                    } else {
                      navigate('/');
                    }
                  } else {
                    navigate('/');
                  }
                }}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <img 
                src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png" 
                alt="BeatSpace Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">BeatSpace</h1>
                <p className="text-xs text-gray-500">Bangladesh Marketplace</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building className="w-4 h-4" />
                <span>{stats.total_assets} Assets</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Eye className="w-4 h-4" />
                <span>{stats.available_assets} Available</span>
              </div>
              {/* Enhanced Request Best Offer Dialog */}
              {showOfferDialog && (
                <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-orange-600" />
                        <span>Request Best Offer</span>
                      </DialogTitle>
                      <p className="text-sm text-gray-600">
                        Submit a detailed request to get the best pricing for your selected asset(s)
                      </p>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                      {/* Asset Summary */}
                      {selectedAssetForOffer && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Selected Asset</h4>
                          <div className="flex items-start space-x-3">
                            {selectedAssetForOffer.photos && selectedAssetForOffer.photos[0] && (
                              <img 
                                src={selectedAssetForOffer.photos[0]} 
                                alt={selectedAssetForOffer.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div>
                              <h5 className="font-medium">{selectedAssetForOffer.name}</h5>
                              <p className="text-sm text-gray-600">{selectedAssetForOffer.address}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-sm font-medium">{selectedAssetForOffer.type}</span>
                              </div>
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
                              value={offerDetails.existingCampaignId || ''} 
                              onValueChange={(value) => {
                                console.log('🎯 Campaign selected:', value);
                                const selectedCampaign = existingCampaigns.find(c => c.id === value);
                                console.log('🎯 Found campaign:', selectedCampaign);
                                setOfferDetails({
                                  ...offerDetails, 
                                  campaignType: 'existing',
                                  existingCampaignId: value,
                                  campaignName: selectedCampaign ? selectedCampaign.name : '',
                                  selectedCampaignEndDate: selectedCampaign ? selectedCampaign.end_date : null
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  existingCampaigns.length > 0 
                                    ? `Select from ${existingCampaigns.length} campaigns` 
                                    : "Loading campaigns..."
                                } />
                              </SelectTrigger>
                              <SelectContent>
                                {existingCampaigns.length === 0 ? (
                                  <SelectItem value="no-campaigns" disabled>
                                    No campaigns available
                                  </SelectItem>
                                ) : (
                                  existingCampaigns.map(campaign => {
                                    console.log('🎯 Rendering campaign option:', campaign);
                                    return (
                                      <SelectItem key={campaign.id} value={campaign.id}>
                                        📁 {campaign.name} ({(campaign.assets || []).length} assets)
                                      </SelectItem>
                                    );
                                  })
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {offerDetails.selectedCampaignEndDate && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-800">
                                <strong>Campaign End Date:</strong> {new Date(offerDetails.selectedCampaignEndDate).toLocaleDateString()}
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
                            value={offerDetails.contractDuration} 
                            onValueChange={(value) => {
                              setOfferDetails({
                                ...offerDetails, 
                                contractDuration: value,
                                customStartDate: value === 'custom' ? offerDetails.customStartDate : null,
                                customEndDate: value === 'custom' ? offerDetails.customEndDate : null,
                                customDurationDays: value === 'custom' ? offerDetails.customDurationDays : null
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
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

                        {/* Custom Duration Date Fields */}
                        {offerDetails.contractDuration === 'custom' && (
                          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-800">Custom Duration Settings</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Custom Start Date */}
                              <div>
                                <label className="block text-sm font-medium mb-2 text-blue-700">Start Date *</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal border-blue-300"
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      {offerDetails.customStartDate ? offerDetails.customStartDate.toLocaleDateString() : "Select start date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={offerDetails.customStartDate}
                                      onSelect={(date) => {
                                        const updatedDetails = {
                                          ...offerDetails, 
                                          customStartDate: date,
                                          tentativeStartDate: date, // Auto-sync Asset Starting Date
                                          customDurationDays: calculateCustomDuration(date, offerDetails.customEndDate)
                                        };
                                        setOfferDetails(updatedDetails);
                                        
                                        // Recalculate asset expiration date
                                        if (date && offerDetails.customEndDate) {
                                          updatedDetails.assetExpirationDate = offerDetails.customEndDate;
                                          setOfferDetails(updatedDetails);
                                        }
                                      }}
                                      disabled={(date) => date < new Date()}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Custom End Date */}
                              <div>
                                <label className="block text-sm font-medium mb-2 text-blue-700">End Date *</label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal border-blue-300"
                                    >
                                      <Calendar className="mr-2 h-4 w-4" />
                                      {offerDetails.customEndDate ? offerDetails.customEndDate.toLocaleDateString() : "Select end date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                      mode="single"
                                      selected={offerDetails.customEndDate}
                                      onSelect={(date) => {
                                        const updatedDetails = {
                                          ...offerDetails, 
                                          customEndDate: date,
                                          assetExpirationDate: date, // Auto-sync Asset Expiration Date
                                          customDurationDays: calculateCustomDuration(offerDetails.customStartDate, date)
                                        };
                                        setOfferDetails(updatedDetails);
                                      }}
                                      disabled={(date) => date < (offerDetails.customStartDate || new Date())}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>

                            {/* Duration Display */}
                            {offerDetails.customDurationDays && (
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <p className="text-sm font-medium text-blue-800">
                                  📅 Duration: {offerDetails.customDurationDays} days 
                                  ({Math.floor(offerDetails.customDurationDays / 30)} months, {offerDetails.customDurationDays % 30} days)
                                </p>
                              </div>
                            )}
                          </div>
                        )}
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
                              {offerDetails.tentativeStartDate 
                                ? offerDetails.tentativeStartDate.toLocaleDateString()
                                : "Select asset start date"
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarComponent
                              mode="single"
                              selected={offerDetails.tentativeStartDate}
                              onSelect={(date) => {
                                const updatedDetails = {...offerDetails, tentativeStartDate: date};
                                
                                // Auto-populate Asset Starting Date when custom duration is selected
                                if (offerDetails.contractDuration === 'custom' && offerDetails.customStartDate && !date) {
                                  updatedDetails.tentativeStartDate = offerDetails.customStartDate;
                                }
                                
                                setOfferDetails(updatedDetails);
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Asset Expiration Date */}
                      {offerDetails.assetExpirationDate && (
                        <div>
                          <label className="block text-sm font-semibold mb-2">Asset Expiration Date</label>
                          <div className="p-3 bg-gray-50 rounded-lg border">
                            <p className="text-sm font-medium text-gray-900">
                              {offerDetails.assetExpirationDate.toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {offerDetails.contractDuration === 'custom' 
                                ? 'Based on custom duration end date'
                                : `Calculated based on start date + ${offerDetails.contractDuration.replace('_', ' ')}`
                              }
                            </p>
                            {offerDetails.expirationWarning && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ {offerDetails.expirationWarning}
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
                              id="printing"
                              checked={offerDetails.serviceBundles.printing}
                              onChange={(e) => setOfferDetails({
                                ...offerDetails, 
                                serviceBundles: {...offerDetails.serviceBundles, printing: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="printing" className="text-sm">
                              🖨️ Printing & Design
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="setup"
                              checked={offerDetails.serviceBundles.setup}
                              onChange={(e) => setOfferDetails({
                                ...offerDetails, 
                                serviceBundles: {...offerDetails.serviceBundles, setup: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="setup" className="text-sm">
                              🔧 Installation & Setup
                            </label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="monitoring"
                              checked={offerDetails.serviceBundles.monitoring}
                              onChange={(e) => setOfferDetails({
                                ...offerDetails, 
                                serviceBundles: {...offerDetails.serviceBundles, monitoring: e.target.checked}
                              })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <label htmlFor="monitoring" className="text-sm">
                              📊 Monitoring & Reports
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Special Requirements */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Special Requirements</label>
                        <Textarea
                          value={offerDetails.specialRequirements}
                          onChange={(e) => setOfferDetails({...offerDetails, specialRequirements: e.target.value})}
                          placeholder="Any specific requirements, constraints, or special considerations..."
                          rows={3}
                        />
                      </div>

                      {/* Campaign Notes */}
                      <div>
                        <label className="block text-sm font-semibold mb-2">Campaign Notes & Instructions</label>
                        <Textarea
                          value={offerDetails.notes}
                          onChange={(e) => setOfferDetails({...offerDetails, notes: e.target.value})}
                          placeholder="Additional notes, campaign objectives, target audience, etc..."
                          rows={3}
                        />
                      </div>

                      {/* Summary Section */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">📋 Request Summary</h4>
                        <div className="text-sm text-blue-700 space-y-1">
                          <p><strong>Asset:</strong> {selectedAssetForOffer?.name || 'Selected asset'}</p>
                          <p><strong>Campaign:</strong> {
                            offerDetails.campaignType === 'new' 
                              ? `New Campaign - ${offerDetails.campaignName || 'Not specified'}` 
                              : `Existing Campaign - ${offerDetails.campaignName || 'Not selected'}`
                          }</p>
                          <p><strong>Duration:</strong> {offerDetails.contractDuration.replace('_', ' ').replace('months', 'Months')}</p>
                          <p><strong>Budget:</strong> {offerDetails.estimatedBudget ? `৳${parseInt(offerDetails.estimatedBudget).toLocaleString()}` : '⚠️ Required'}</p>
                          <p><strong>Services:</strong> {Object.entries(offerDetails.serviceBundles).filter(([_, selected]) => selected).map(([service, _]) => service).join(', ') || 'None selected'}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowOfferDialog(false)}
                        >
                          Cancel
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            console.log('🚨 Request More Assets button clicked!');
                            handleOfferSubmit(false); // Don't redirect to dashboard
                          }}
                          variant="outline"
                          className="flex-1 border-orange-600 text-orange-600 hover:bg-orange-50"
                          disabled={
                            !offerDetails.tentativeStartDate ||
                            (offerDetails.campaignType === 'new' && !(offerDetails.campaignName || '').trim()) ||
                            (offerDetails.campaignType === 'existing' && !offerDetails.existingCampaignId) ||
                            (offerDetails.contractDuration === 'custom' && (!offerDetails.customStartDate || !offerDetails.customEndDate))
                          }
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add & Request More
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            console.log('🚨 Submit & Complete button clicked!');
                            handleOfferSubmit(true); // Redirect to dashboard
                          }}
                          className="bg-orange-600 hover:bg-orange-700 flex-1"
                          disabled={
                            !offerDetails.tentativeStartDate ||
                            (offerDetails.campaignType === 'new' && !(offerDetails.campaignName || '').trim()) ||
                            (offerDetails.campaignType === 'existing' && !offerDetails.existingCampaignId) ||
                            (offerDetails.contractDuration === 'custom' && (!offerDetails.customStartDate || !offerDetails.customEndDate))
                          }
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Submit & Complete
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Campaign Selection Dialog */}
              {showCampaignDialog && (
                <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Asset to Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {selectedCampaignForAsset && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium text-sm text-gray-900">
                            {selectedCampaignForAsset.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {selectedCampaignForAsset.address}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Add to Existing Campaign
                        </label>
                        {existingCampaigns.length > 0 ? (
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {existingCampaigns.map((camp) => (
                              <div
                                key={camp.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                                onClick={() => addAssetToExistingCampaign(camp.id)}
                              >
                                <div>
                                  <div className="font-medium text-sm">{camp.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {(camp.assets || []).length} assets • ৳{(camp.budget || 0).toLocaleString()}
                                  </div>
                                </div>
                                <Plus className="w-4 h-4 text-blue-600" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 text-center text-gray-500 text-sm border border-dashed rounded-lg">
                            No existing campaigns found. Create a new campaign below.
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2">
                          Or Create New Campaign
                        </label>
                        <div className="flex space-x-2">
                          <Input
                            placeholder="Campaign name"
                            value={offerDetails.campaignName}
                            onChange={(e) => setOfferDetails({...offerDetails, campaignName: e.target.value})}
                            className="flex-1"
                          />
                          <Button
                            onClick={() => {
                              if ((offerDetails.campaignName || '').trim()) {
                                createNewCampaignWithAsset((offerDetails.campaignName || '').trim());
                              } else {
                                alert('Please enter a campaign name');
                              }
                            }}
                            disabled={!(offerDetails.campaignName || '').trim()}
                          >
                            Create
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowCampaignDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {currentUser ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    Welcome, {currentUser.company_name || currentUser.contact_name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Welcome Banner for New Campaigns */}
      {showNewCampaignWelcome && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 rounded-full p-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Campaign "{welcomeCampaignName}" Created Successfully! 🎉</h3>
                  <p className="text-orange-100">Now let's add your first asset. Browse the marketplace below and click "Request Best Offer" on any asset.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNewCampaignWelcome(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar - Fixed Left Position */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="sticky top-6">
              <Card className="shadow-sm border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <span>Filters</span>
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Search Assets</label>
                  <Input
                    placeholder="Search by location, name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <Separator />

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Asset Type</label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Types" />
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

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Availability Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Available">🟢 Available</SelectItem>
                      <SelectItem value="Booked">🔴 Booked</SelectItem>
                      <SelectItem value="Live">🟡 Live</SelectItem>
                      <SelectItem value="Work in Progress">🔨 Work in Progress</SelectItem>
                      <SelectItem value="Pending Approval">⏳ Pending Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Location - Division</label>
                  <Select value={filters.division} onValueChange={(value) => setFilters({...filters, division: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      <SelectItem value="Dhaka">🏢 Dhaka</SelectItem>
                      <SelectItem value="Chittagong">🚢 Chittagong</SelectItem>
                      <SelectItem value="Sylhet">🌿 Sylhet</SelectItem>
                      <SelectItem value="Rajshahi">🏛️ Rajshahi</SelectItem>
                      <SelectItem value="Khulna">🌊 Khulna</SelectItem>
                      <SelectItem value="Rangpur">🌾 Rangpur</SelectItem>
                      <SelectItem value="Mymensingh">🌱 Mymensingh</SelectItem>
                      <SelectItem value="Barisal">🏞️ Barisal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-700">Contract Duration</label>
                  <Select value={filters.duration} onValueChange={(value) => setFilters({...filters, duration: value})}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3_months">📅 3 Months</SelectItem>
                      <SelectItem value="6_months">📅 6 Months</SelectItem>
                      <SelectItem value="12_months">📅 12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Price Range (BDT)</label>
                  <div className="grid grid-cols-2 gap-3">
                  </div>
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => {
                    setFilters({
                      type: 'all',
                      status: 'all',
                      division: 'all',
                      district: 'all',
                      minPrice: '',
                      maxPrice: '',
                      duration: '3_months'
                    });
                    setSearchTerm('');
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Main Content Area - Flexible Width */}
          <div className="flex-1 min-w-0">
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="map">Map View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>

              <TabsContent value="map">
                <Card>
                  <CardContent className="p-0">
                    <div 
                      ref={mapRef} 
                      className="w-full h-[600px] rounded-lg"
                      style={{ minHeight: '600px' }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="list">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAssets.map((asset) => {
                    const IconComponent = assetTypeIcons[asset.type] || MapPin;
                    const pricing = asset.pricing[filters.duration] || Object.values(asset.pricing)[0];
                    const isInCampaign = campaign.find(item => item.id === asset.id);
                    
                    return (
                      <Card 
                        key={asset.id} 
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="w-5 h-5 text-gray-600" />
                              <h3 className="font-semibold text-lg">{asset.name}</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${statusColors[asset.status === 'Booked' ? 'Booked' : 'Available']}`} />
                              <span className="text-sm text-gray-600">{asset.status === 'Booked' ? 'Booked' : 'Available'}</span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-2 flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {asset.address}
                          </p>
                          
                          {asset.division && (
                            <p className="text-gray-500 text-xs mb-2">
                              {asset.district}, {asset.division} Division
                            </p>
                          )}
                          
                          {asset.photos && asset.photos.length > 0 && (
                            <div className="mb-3">
                              <img 
                                src={asset.photos[0]} 
                                alt={asset.name}
                                className="w-full h-32 object-cover rounded-md"
                              />
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mb-3">
                            <Badge variant="secondary">{asset.type}</Badge>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                            <span>{asset.dimensions}</span>
                            <div className="flex items-center space-x-1">
                              <Car className="w-4 h-4" />
                              <span>{asset.traffic_volume}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-4 h-4" />
                              <span>{asset.visibility_score}/10</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {asset.description}
                          </p>
                          
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestBestOffer(asset);
                              }}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              Request Best Offer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAsset(asset);
                              }}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Asset Detail Modal */}
      {selectedAsset && (
        <Dialog open={!!selectedAsset} onOpenChange={() => {
          setSelectedAsset(null);
          setSelectedImageIndex(0); // Reset image index when dialog closes
          setShowImageModal(false); // Close image modal if open
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[selectedAsset.status === 'Booked' ? 'Booked' : 'Available']}`} />
                <span>{selectedAsset.name}</span>
                <Badge variant="secondary">{selectedAsset.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Images and Basic Info */}
              <div className="space-y-4">
                {/* Image Gallery */}
                {selectedAsset.photos && selectedAsset.photos.length > 0 && (
                  <div>
                    {/* Main selected image */}
                    <div 
                      className="mb-3 cursor-pointer relative"
                      onClick={() => setShowImageModal(true)}
                    >
                      <img 
                        src={selectedAsset.photos[selectedImageIndex]} 
                        alt={`${selectedAsset.name} - Image ${selectedImageIndex + 1}`}
                        className="w-full h-64 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                    
                    {/* Dot navigation if more than one image */}
                    {selectedAsset.photos.length > 1 && (
                      <div className="flex justify-center space-x-2 mt-3">
                        {selectedAsset.photos.map((_, index) => (
                          <button
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all ${
                              index === selectedImageIndex 
                                ? 'bg-orange-500 w-6' 
                                : 'bg-gray-300 hover:bg-gray-400'
                            }`}
                            onClick={() => setSelectedImageIndex(index)}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Image counter */}
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      {selectedAsset.photos.length > 1 
                        ? `Image ${selectedImageIndex + 1} of ${selectedAsset.photos.length} • Click to view larger`
                        : 'Click to view larger'
                      }
                    </p>
                  </div>
                )}

                {/* Asset Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Building className="w-4 h-4 mr-2" />
                    Asset Information
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <div className="font-medium">{selectedAsset.type}</div>
                    </div>
                    
                    {selectedAsset.dimensions && (
                      <div>
                        <span className="text-gray-500">Dimensions:</span>
                        <div className="font-medium">{selectedAsset.dimensions}</div>
                      </div>
                    )}
                    
                    {selectedAsset.traffic_volume && (
                      <div>
                        <span className="text-gray-500">Traffic:</span>
                        <div className="font-medium">{selectedAsset.traffic_volume}</div>
                      </div>
                    )}
                    
                    {selectedAsset.visibility_score && (
                      <div>
                        <span className="text-gray-500">Visibility:</span>
                        <div className="font-medium">{selectedAsset.visibility_score}/10</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location with Small Map */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                    <MapPin className="w-4 h-4 mr-2" />
                    Location
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700">{selectedAsset.address}</span>
                    </div>
                    
                    {selectedAsset.district && selectedAsset.division && (
                      <div className="text-gray-600">
                        {selectedAsset.district}, {selectedAsset.division}
                      </div>
                    )}
                    
                    {/* Coordinates Display */}
                    {selectedAsset.location && selectedAsset.location.lat && selectedAsset.location.lng && (
                      <div className="text-xs text-gray-500">
                        📍 {selectedAsset.location.lat}, {selectedAsset.location.lng}
                      </div>
                    )}
                  </div>
                  
                  {/* Small Map Placeholder (you can integrate Google Maps later) */}
                  {selectedAsset.location && selectedAsset.location.lat && selectedAsset.location.lng && (
                    <div className="mt-3 bg-gray-200 h-32 rounded flex items-center justify-center">
                      <div className="text-center text-gray-600">
                        <MapPin className="w-6 h-6 mx-auto mb-1" />
                        <div className="text-xs">Map View</div>
                        <div className="text-xs text-gray-500">
                          {selectedAsset.location.lat.toFixed(4)}, {selectedAsset.location.lng.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Pricing and Details */}
              <div className="space-y-4">


                {/* Status Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Status</h4>
                  <div className="flex items-center space-x-2 mb-3">
                    <Badge 
                      variant={selectedAsset.status === 'Available' ? 'success' : selectedAsset.status === 'Booked' ? 'secondary' : 'default'}
                      className={
                        selectedAsset.status === 'Available' ? 'bg-green-100 text-green-800' :
                        selectedAsset.status === 'Booked' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }
                    >
                      {selectedAsset.status}
                    </Badge>
                  </div>
                  
                  {selectedAsset.next_available_date && (
                    <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Next available: {new Date(selectedAsset.next_available_date).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Seller Information */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                    <Users className="w-4 h-4 mr-2" />
                    Seller Information
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="font-medium">{selectedAsset.seller_name}</div>
                    {selectedAsset.seller_id && (
                      <div className="text-gray-500 text-xs">ID: {selectedAsset.seller_id}</div>
                    )}
                  </div>
                </div>

                {/* Technical Specifications */}
                {selectedAsset.specifications && Object.keys(selectedAsset.specifications).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Technical Details</h4>
                    <div className="space-y-2 text-sm">
                      {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-500 capitalize">{key}:</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedAsset.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedAsset.description}
                    </p>
                  </div>
                )}

                {/* Request Best Offer Button */}
                <Button 
                  size="lg"
                  className={`w-full ${
                    selectedAsset.status === 'Available' 
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (selectedAsset.status === 'Available') {
                      handleRequestBestOffer(selectedAsset);
                    }
                  }}
                  disabled={selectedAsset.status !== 'Available'}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {selectedAsset.status === 'Available' ? 'Request Best Offer' : 
                   selectedAsset.status === 'Booked' ? 'Currently Booked' : 'Not Available'}
                </Button>

                {!currentUser && selectedAsset.status === 'Available' && (
                  <p className="text-xs text-gray-500 text-center">
                    Please sign in to request offers
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Image Modal for larger view */}
      {showImageModal && selectedAsset?.photos && (
        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
          <DialogContent className="max-w-4xl max-h-[95vh] p-2">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-center">
                {selectedAsset.name} - Image {selectedImageIndex + 1} of {selectedAsset.photos.length}
              </DialogTitle>
            </DialogHeader>
            
            <div className="relative">
              {/* Large image display */}
              <img 
                src={selectedAsset.photos[selectedImageIndex]} 
                alt={`${selectedAsset.name} - Image ${selectedImageIndex + 1}`}
                className="w-full max-h-[70vh] object-contain mx-auto"
              />
              
              {/* Navigation arrows */}
              {selectedAsset.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex((prev) => 
                      prev === 0 ? selectedAsset.photos.length - 1 : prev - 1
                    )}
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  
                  <button
                    onClick={() => setSelectedImageIndex((prev) => 
                      prev === selectedAsset.photos.length - 1 ? 0 : prev + 1
                    )}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              {/* Thumbnail navigation at bottom */}
              {selectedAsset.photos.length > 1 && (
                <div className="flex justify-center space-x-2 mt-4 overflow-x-auto">
                  {selectedAsset.photos.map((photo, index) => (
                    <div
                      key={index}
                      className={`flex-shrink-0 cursor-pointer border-2 rounded overflow-hidden ${
                        index === selectedImageIndex 
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
      
      {/* Floating Asset Basket */}
      {assetBasket.length > 0 && (
        <div className="fixed top-4 right-4 z-50">
          <Card className="w-80 shadow-xl border border-orange-200">
            <CardHeader 
              className="bg-gradient-to-r from-orange-50 to-orange-100 cursor-pointer p-3"
              onClick={() => setShowAssetBasket(!showAssetBasket)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-sm font-semibold text-orange-800">
                    Asset Requests ({assetBasket.length})
                  </CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="p-1">
                  {showAssetBasket ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            
            {showAssetBasket && (
              <CardContent className="p-0 max-h-96 overflow-y-auto">
                {assetBasket.map((asset, index) => (
                  <div key={`basket-${asset.id}-${index}`} className="flex items-center p-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{asset.name}</div>
                      <div className="text-xs text-gray-500">{asset.address}</div>
                      <div className="text-xs text-orange-600 mt-1">
                        Campaign: {asset.campaign}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="success" className="text-xs">
                        Requested
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromBasket(asset, index)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove this asset request"
                        disabled={basketLoading}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <div className="p-3 bg-gray-50 border-t">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/buyer/dashboard?tab=requested-offers')}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View All Requests
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleClearBasket}
                      className="bg-red-600 hover:bg-red-700 flex-1 text-white"
                      title="Cancel all asset requests"
                      disabled={basketLoading}
                    >
                      <X className="w-3 h-3 mr-1" />
                      {basketLoading ? 'Cancelling...' : 'Cancel All'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;