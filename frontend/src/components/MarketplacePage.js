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
  MessageSquare
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
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
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
  const [offerDetails, setOfferDetails] = useState({
    campaignType: 'new', // 'new' or 'existing'
    campaignName: '',
    existingCampaignId: '',
    assetId: '',
    contractDuration: '3_months',
    estimatedBudget: '',
    serviceBundles: {
      printing: false,
      setup: false,
      monitoring: false
    },
    timeline: '',
    tentativeStartDate: null, // For new campaigns
    selectedCampaignEndDate: null, // For existing campaigns
    assetExpirationDate: null, // Auto-calculated
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
          fillColor: asset.status === 'Available' ? '#10b981' : '#f59e0b',
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
          <span style="background: ${asset.status === 'Available' ? '#dcfce7' : '#fef3c7'}; 
                       color: ${asset.status === 'Available' ? '#16a34a' : '#d97706'}; 
                       padding: 2px 8px; border-radius: 12px; font-size: 12px;">${asset.status}</span>
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

  const fetchExistingCampaigns = async () => {
    if (!currentUser) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API}/campaigns`, { headers });
      console.log('Fetched campaigns:', response.data); // Debug log
      setExistingCampaigns(response.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
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

  const calculateAssetExpirationDate = (startDate, contractDuration) => {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    let expirationDate = new Date(start);
    
    switch (contractDuration) {
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
    
    if (offerDetails.campaignType === 'new' && offerDetails.tentativeStartDate) {
      startDate = offerDetails.tentativeStartDate;
    } else if (offerDetails.campaignType === 'existing' && offerDetails.selectedCampaignEndDate) {
      const selectedCampaign = existingCampaigns.find(c => c.id === offerDetails.existingCampaignId);
      if (selectedCampaign && selectedCampaign.start_date) {
        startDate = new Date(selectedCampaign.start_date);
      }
      campaignEndDate = new Date(offerDetails.selectedCampaignEndDate);
    }
    
    if (startDate) {
      const assetExpiration = calculateAssetExpirationDate(startDate, offerDetails.contractDuration);
      
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
    }
  };

  // Update asset expiration whenever relevant fields change
  React.useEffect(() => {
    updateAssetExpirationDate();
  }, [offerDetails.tentativeStartDate, offerDetails.contractDuration, offerDetails.existingCampaignId, offerDetails.selectedCampaignEndDate]);

  const handleOfferSubmit = async () => {
    try {
      if (!currentUser) {
        alert('Please sign in to submit a campaign request.');
        navigate('/login');
        return;
      }

      // Validation for campaign selection
      if (offerDetails.campaignType === 'new' && !offerDetails.campaignName.trim()) {
        alert('Please enter a campaign name for the new campaign.');
        return;
      }
      
      if (offerDetails.campaignType === 'existing' && !offerDetails.existingCampaignId) {
        alert('Please select an existing campaign.');
        return;
      }

      // Mandatory budget validation
      if (!offerDetails.estimatedBudget || !offerDetails.estimatedBudget.trim()) {
        alert('Estimated budget is required to process your offer request.');
        return;
      }

      if (!selectedAssetForOffer) {
        alert('No asset selected for offer request.');
        return;
      }

      // Check asset availability before submitting
      try {
        const headers = getAuthHeaders();
        const assetCheckRes = await axios.get(`${API}/assets/${selectedAssetForOffer.id}`, { headers });
        const currentAssetStatus = assetCheckRes.data.status;
        
        if (currentAssetStatus !== 'Available') {
          alert(`Asset is no longer available. Current status: ${currentAssetStatus}. Please select a different asset.`);
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
        asset_id: selectedAssetForOffer.id,
        campaign_name: offerDetails.campaignName.trim(),
        campaign_type: offerDetails.campaignType,
        existing_campaign_id: offerDetails.campaignType === 'existing' ? offerDetails.existingCampaignId : null,
        contract_duration: offerDetails.contractDuration,
        estimated_budget: parseFloat(offerDetails.estimatedBudget),
        service_bundles: offerDetails.serviceBundles,
        timeline: offerDetails.campaignType === 'new' && offerDetails.tentativeStartDate 
          ? `Start from ${offerDetails.tentativeStartDate.toLocaleDateString()}`
          : (offerDetails.timeline || null),
        special_requirements: offerDetails.specialRequirements || null,
        notes: offerDetails.notes || null
      };

      // Submit offer request
      await axios.post(`${API}/offers/request`, offerRequestData, { headers });
      
      // Close dialog and reset form
      setShowOfferDialog(false);
      setSelectedAssetForOffer(null);
      setOfferDetails({
        campaignType: 'new',
        campaignName: '',
        existingCampaignId: '',
        assetId: '',
        contractDuration: '3_months',
        estimatedBudget: '',
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
      
      alert('Your offer request has been submitted successfully! You will be notified when we have a quote ready.');
      
    } catch (error) {
      console.error('Error submitting offer request:', error);
      alert('Error submitting request: ' + (error.response?.data?.detail || error.message));
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
                src="https://customer-assets.emergentagent.com/job_brandspotbd/artifacts/deqoe0i1_BeatSpace%20Transparent%20Logo.png" 
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
                                <span className="text-sm text-blue-600">
                                  ৳{selectedAssetForOffer.pricing?.['3_months']?.toLocaleString()}/3mo
                                </span>
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
                                const selectedCampaign = existingCampaigns.find(c => c.id === value);
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
                                <SelectValue placeholder="Select an existing campaign" />
                              </SelectTrigger>
                              <SelectContent>
                                {existingCampaigns.map(campaign => (
                                  <SelectItem key={campaign.id} value={campaign.id}>
                                    📁 {campaign.name} ({(campaign.assets || []).length} assets)
                                  </SelectItem>
                                ))}
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
                            onValueChange={(value) => setOfferDetails({...offerDetails, contractDuration: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3_months">3 Months</SelectItem>
                              <SelectItem value="6_months">6 Months</SelectItem>
                              <SelectItem value="12_months">12 Months</SelectItem>
                              <SelectItem value="custom">Custom Duration</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold mb-2">Estimated Budget (৳) *</label>
                          <Input
                            type="number"
                            value={offerDetails.estimatedBudget}
                            onChange={(e) => setOfferDetails({...offerDetails, estimatedBudget: e.target.value})}
                            placeholder="Enter your budget (required)"
                            required
                            className="border-2 border-orange-200 focus:border-orange-400"
                          />
                          <p className="text-xs text-orange-600 mt-1">* Budget is required for offer processing</p>
                        </div>
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
                              Calculated based on start date + {offerDetails.contractDuration.replace('_', ' ')}
                            </p>
                            {offerDetails.expirationWarning && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ {offerDetails.expirationWarning}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

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
                              onSelect={(date) => setOfferDetails({...offerDetails, tentativeStartDate: date})}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

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
                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowOfferDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleOfferSubmit}
                          className="bg-orange-600 hover:bg-orange-700"
                          disabled={
                            !offerDetails.estimatedBudget.trim() || 
                            (offerDetails.campaignType === 'new' && !offerDetails.campaignName.trim()) ||
                            (offerDetails.campaignType === 'existing' && !offerDetails.existingCampaignId)
                          }
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Submit Request
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
                              if (offerDetails.campaignName.trim()) {
                                createNewCampaignWithAsset(offerDetails.campaignName.trim());
                              } else {
                                alert('Please enter a campaign name');
                              }
                            }}
                            disabled={!offerDetails.campaignName.trim()}
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
                    <div>
                      <label className="block text-xs font-medium mb-2 text-gray-500">Min Price (৳)</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-2 text-gray-500">Max Price (৳)</label>
                      <Input
                        type="number"
                        placeholder="∞"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                      />
                    </div>
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
                      <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                              <IconComponent className="w-5 h-5 text-gray-600" />
                              <h3 className="font-semibold text-lg">{asset.name}</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${statusColors[asset.status]}`} />
                              <span className="text-sm text-gray-600">{asset.status}</span>
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
                            <span className="text-lg font-bold text-blue-600">
                              ৳{pricing.toLocaleString()}
                            </span>
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
                          
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
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
        <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${statusColors[selectedAsset.status]}`} />
                <span>{selectedAsset.name}</span>
                <Badge variant="secondary">{selectedAsset.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                {selectedAsset.photos && selectedAsset.photos.length > 0 && (
                  <div className="mb-4">
                    <img 
                      src={selectedAsset.photos[0]} 
                      alt={selectedAsset.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1">Location</h4>
                    <p className="text-gray-600 flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {selectedAsset.address}
                    </p>
                    {selectedAsset.division && (
                      <p className="text-gray-500 text-sm mt-1">
                        {selectedAsset.district}, {selectedAsset.division} Division
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">Description</h4>
                    <p className="text-gray-600">{selectedAsset.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-1">Specifications</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Dimensions: {selectedAsset.dimensions}</div>
                      <div>Visibility: {selectedAsset.visibility_score}/10</div>
                      <div>Traffic: {selectedAsset.traffic_volume}</div>
                      <div>Seller: {selectedAsset.seller_name}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold mb-3">Pricing Options</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedAsset.pricing).map(([duration, price]) => (
                      <div key={duration} className="flex justify-between items-center">
                        <span className="capitalize">{duration.replace('_', ' ')}</span>
                        <span className="font-semibold">৳{price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedAsset.specifications && Object.keys(selectedAsset.specifications).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold mb-3">Technical Details</h4>
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key}:</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Request Best Offer Button - Available for Available assets */}
                <Button 
                  variant="outline"
                  className="w-full border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    if (!currentUser) {
                      alert('Please sign in to request offers.');
                      // Optionally redirect to login page
                      // navigate('/login');
                      return;
                    }
                    setSelectedAssetForOffer(selectedAsset);
                    fetchExistingCampaigns(); // Fetch campaigns for dropdown
                    setShowOfferDialog(true);
                  }}
                  disabled={selectedAsset.status !== 'Available'}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {selectedAsset.status === 'Available' ? 'Request Best Offer' : `${selectedAsset.status} - Not Available`}
                </Button>
                
                {!currentUser && selectedAsset.status === 'Available' && (
                  <p className="text-xs text-gray-600 mt-2 text-center">
                    Sign in to request offers for this asset
                  </p>
                )}

                {selectedAsset.next_available_date && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Next available: {new Date(selectedAsset.next_available_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MarketplacePage;