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
  Home
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { getAuthHeaders, getUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const MarketplacePage = () => {
  const navigate = useNavigate();
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
  const [offerDetails, setOfferDetails] = useState({
    campaignName: '',
    budget: '',
    notes: '',
    duration: '3_months'
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
    initializeMap();
    fetchAssets();
    fetchStats();
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
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places']
    });

    try {
      await loader.load();
      
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
    if (!campaign.find(item => item.id === asset.id)) {
      setCampaign([...campaign, asset]);
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

  const submitBestOfferRequest = async () => {
    try {
      alert('Please sign in to submit a campaign request. This feature requires authentication.');
      navigate('/login');
    } catch (error) {
      console.error('Error submitting offer request:', error);
      alert('Error submitting request. Please try again.');
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
              {campaign.length > 0 && (
                <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Campaign ({campaign.length}) - Request Offer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Request Best Offer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Campaign Name</label>
                        <Input
                          value={offerDetails.campaignName}
                          onChange={(e) => setOfferDetails({...offerDetails, campaignName: e.target.value})}
                          placeholder="Enter campaign name"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Contract Duration</label>
                          <Select 
                            value={offerDetails.duration} 
                            onValueChange={(value) => setOfferDetails({...offerDetails, duration: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3_months">3 Months</SelectItem>
                              <SelectItem value="6_months">6 Months</SelectItem>
                              <SelectItem value="12_months">12 Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">Estimated Budget (৳)</label>
                          <Input
                            type="number"
                            value={offerDetails.budget}
                            onChange={(e) => setOfferDetails({...offerDetails, budget: e.target.value})}
                            placeholder={`${calculateCampaignTotal().toLocaleString()}`}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Special Requirements & Notes</label>
                        <Textarea
                          value={offerDetails.notes}
                          onChange={(e) => setOfferDetails({...offerDetails, notes: e.target.value})}
                          placeholder="Any special requirements, preferred timeline, or additional services needed..."
                          rows={3}
                        />
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Selected Assets ({campaign.length})</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {campaign.map(asset => (
                            <div key={asset.id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                              <span>{asset.name}</span>
                              <span className="font-medium">৳{(asset.pricing[offerDetails.duration] || Object.values(asset.pricing)[0]).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Estimate:</span>
                          <span>৳{calculateCampaignTotal().toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          onClick={submitBestOfferRequest} 
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          disabled={!offerDetails.campaignName || campaign.length === 0}
                        >
                          Submit Request for Best Offer
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowOfferDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <Input
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Asset Type</label>
                  <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Billboard">Billboard</SelectItem>
                      <SelectItem value="Police Box">Police Box</SelectItem>
                      <SelectItem value="Railway Station">Railway Station</SelectItem>
                      <SelectItem value="Wall">Wall</SelectItem>
                      <SelectItem value="Bridge">Bridge</SelectItem>
                      <SelectItem value="Bus Stop">Bus Stop</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Division</label>
                  <Select value={filters.division} onValueChange={(value) => setFilters({...filters, division: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {bangladeshDivisions.map(division => (
                        <SelectItem key={division} value={division}>{division}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contract Duration</label>
                  <Select value={filters.duration} onValueChange={(value) => setFilters({...filters, duration: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3_months">3 Months</SelectItem>
                      <SelectItem value="6_months">6 Months</SelectItem>
                      <SelectItem value="12_months">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2">Min Price (৳)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.minPrice}
                      onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Price (৳)</label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.maxPrice}
                      onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    />
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
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
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
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
                          
                          <div className="flex space-x-2">
                            {asset.status === 'Available' ? (
                              <Button
                                onClick={() => isInCampaign ? removeFromCampaign(asset.id) : addToCampaign(asset)}
                                variant={isInCampaign ? "destructive" : "default"}
                                size="sm"
                                className="flex-1"
                              >
                                {isInCampaign ? (
                                  <>
                                    <X className="w-4 h-4 mr-1" />
                                    Remove
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add to Campaign
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" className="flex-1" disabled>
                                <Clock className="w-4 h-4 mr-1" />
                                {asset.status === 'Booked' ? 'Currently Booked' : asset.status}
                              </Button>
                            )}
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
                
                {selectedAsset.status === 'Available' && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        const isInCampaign = campaign.find(item => item.id === selectedAsset.id);
                        if (isInCampaign) {
                          removeFromCampaign(selectedAsset.id);
                        } else {
                          addToCampaign(selectedAsset);
                        }
                      }}
                      className="w-full"
                      variant={campaign.find(item => item.id === selectedAsset.id) ? "destructive" : "default"}
                    >
                      {campaign.find(item => item.id === selectedAsset.id) ? (
                        <>
                          <X className="w-4 h-4 mr-2" />
                          Remove from Campaign
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Campaign
                        </>
                      )}
                    </Button>
                  </div>
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