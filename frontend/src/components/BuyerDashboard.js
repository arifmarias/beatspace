import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, 
  Plus, 
  Eye, 
  Edit,
  X,
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
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders, logout, getUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [campaigns, setCampaigns] = useState([]);
  const [requestedOffers, setRequestedOffers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignAssets, setCampaignAssets] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showEditOfferDialog, setShowEditOfferDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Edit offer form state - same structure as MarketplacePage
  const [editOfferDetails, setEditOfferDetails] = useState({
    campaignType: 'existing', // Default to existing for edits
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
    specialRequirements: '',
    notes: ''
  });

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

  const fetchBuyerData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch buyer's campaigns
      const campaignsRes = await axios.get(`${API}/campaigns`, { headers });
      setCampaigns(campaignsRes.data || []);

      // Fetch requested offers
      const offersRes = await axios.get(`${API}/offers/requests`, { headers });
      console.log('🚨 FETCHED OFFERS RAW:', offersRes.data);
      setRequestedOffers(offersRes.data || []);
      console.log('🚨 OFFERS SET TO STATE:', offersRes.data || []);

      // Calculate stats with null safety
      const campaignData = campaignsRes.data || [];  
      const offerData = offersRes.data || [];
      const totalCampaigns = campaignData.length;
      const activeCampaigns = campaignData.filter(c => c.status === 'Live').length;
      const pendingCampaigns = campaignData.filter(c => c.status === 'Pending Offer' || c.status === 'Negotiating').length;
      const totalBudget = campaignData.reduce((sum, c) => sum + (c.budget || 0), 0);
      const totalOfferRequests = offerData.length;

      setStats({
        totalCampaigns,
        activeCampaigns,
        pendingCampaigns,
        totalBudget,
        totalOfferRequests
      });
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
      console.log('🚨 Fetching assets for campaign:', campaign.name, 'ID:', campaign.id);
      
      // Fetch all public assets
      const assetsResponse = await axios.get(`${API}/assets/public`);
      const allAssets = assetsResponse.data || [];
      
      // Start with assets that are already in the campaign
      let campaignAssetsList = allAssets.filter(asset => 
        campaign.assets.includes(asset.id)
      );
      
      console.log('🚨 Direct campaign assets:', campaignAssetsList.length);
      
      // For Draft campaigns, also include assets that have pending offer requests for this campaign
      if (campaign.status === 'Draft') {
        const headers = getAuthHeaders();
        const offersResponse = await axios.get(`${API}/offers/requests`, { headers });
        const allOfferRequests = offersResponse.data || [];
        
        // Find offer requests for this campaign
        const campaignOfferRequests = allOfferRequests.filter(offer => 
          offer.existing_campaign_id === campaign.id && 
          (offer.status === 'Pending' || offer.status === 'Processing')
        );
        
        console.log('🚨 Found offer requests for campaign:', campaignOfferRequests.length);
        
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
      
      console.log('🚨 Total campaign assets (including requested):', campaignAssetsList.length);
      setCampaignAssets(campaignAssetsList);
      
    } catch (error) {
      console.error('Error fetching campaign assets:', error);
      setCampaignAssets([]);
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

      await axios.post(`${API}/campaigns`, campaignData, { headers });
      alert('Campaign created successfully!');
      
      setShowCreateCampaign(false);
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
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign. Please try again.');
    }
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

  // Move button handlers outside JSX to prevent recreation on each render
  const handleEditOffer = (offer) => {
    console.log('🚨 HANDLE EDIT CALLED - offer:', offer?.id);
    alert('🚨 HANDLE EDIT FUNCTION WORKING!');
    
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
      console.log('🚨 DATA REFRESH COMPLETED');
      
    } catch (error) {
      console.error('🚨 Delete request failed:', error);
      alert('Failed to delete offer request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editOfferRequest = (offer) => {
    console.log('🚨 EDIT FUNCTION START - offer received:', offer);
    
    try {
      // Populate the edit form with existing offer data
      setEditOfferDetails({
        campaignType: offer.campaign_type || 'existing',
        campaignName: offer.campaign_name || '',
        existingCampaignId: offer.existing_campaign_id || '',
        assetId: offer.asset_id || '',
        contractDuration: offer.contract_duration || '3_months',
        estimatedBudget: offer.estimated_budget?.toString() || '',
        serviceBundles: {
          printing: offer.service_bundles?.printing || false,
          setup: offer.service_bundles?.setup || false,
          monitoring: offer.service_bundles?.monitoring || false
        },
        timeline: offer.timeline || '',
        tentativeStartDate: offer.tentative_start_date ? new Date(offer.tentative_start_date) : null,
        selectedCampaignEndDate: offer.selected_campaign_end_date ? new Date(offer.selected_campaign_end_date) : null,
        assetExpirationDate: offer.asset_expiration_date ? new Date(offer.asset_expiration_date) : null,
        specialRequirements: offer.special_requirements || '',
        notes: offer.notes || ''
      });
      
      // Set the offer being edited
      setEditingOffer(offer);
      
      // Show the dialog
      setShowEditOfferDialog(true);
      
      console.log('🚨 Edit dialog should now be visible');
      
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
        estimated_budget: parseFloat(editOfferDetails.estimatedBudget) || 0,
        service_bundles: editOfferDetails.serviceBundles, // This matches ServiceBundles model
        timeline: editOfferDetails.timeline || '',
        special_requirements: editOfferDetails.specialRequirements || '',
        notes: editOfferDetails.notes || ''
        // Removed fields that backend doesn't expect:
        // - tentative_start_date (not in OfferRequestCreate)
        // - asset_expiration_date (not in OfferRequestCreate)
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
      console.log('🚨 Data refresh completed');
      
    } catch (error) {
      console.error('🚨 Error updating offer request:', error);
      console.error('🚨 Error response:', error.response);
      console.error('🚨 Error data:', error.response?.data);
      alert('Failed to update offer request: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading buyer dashboard...</p>
        </div>
      </div>
    );
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {currentUser?.company_name}!</h2>
          <p className="text-gray-600">Manage your advertising campaigns and track performance.</p>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="requested-offers">Requested Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5" />
                  <span>Your Campaigns</span>
                </CardTitle>
                <Button 
                  onClick={() => setShowCreateCampaign(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
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
                      {(campaigns || []).map((campaign) => (
                        <TableRow key={campaign.id}>
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
                          <TableCell>{(campaign.assets || []).length} selected</TableCell>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                fetchCampaignAssets(campaign);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Requested Offers Tab */}
          <TabsContent value="requested-offers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Requested Offers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(requestedOffers || []).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Offer Requests Yet</h3>
                    <p className="text-gray-500 mb-4">
                      You haven't submitted any "Request Best Offer" requests yet.
                    </p>
                    <Button onClick={() => navigate('/marketplace')} className="bg-orange-600 hover:bg-orange-700">
                      Explore Marketplace
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset Name</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(requestedOffers || []).map((offer) => {
                        // Debug logging for each offer
                        console.log('🚨 RENDERING OFFER IN TABLE:', {
                          id: offer.id,
                          campaign_name: offer.campaign_name,
                          status: offer.status,
                          asset_name: offer.asset_name
                        });
                        
                        return (
                          <TableRow key={`offer-${offer.id}`}>
                            <TableCell>
                              <div className="font-medium">{offer.asset_name}</div>
                            </TableCell>
                            <TableCell>{offer.campaign_name}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  offer.status === 'Pending' ? 'secondary' :
                                  offer.status === 'Processing' ? 'default' :
                                  offer.status === 'Quoted' ? 'success' :
                                  offer.status === 'Accepted' ? 'success' :
                                  'destructive'
                                }
                              >
                                {offer.status}
                              </Badge>
                            </TableCell>
                            <TableCell>৳{offer.estimated_budget?.toLocaleString()}</TableCell>
                            <TableCell>{offer.contract_duration?.replace('_', ' ')}</TableCell>
                            <TableCell className="capitalize">{offer.campaign_type}</TableCell>
                            <TableCell>{new Date(offer.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {(() => {
                                console.log('🚨 RENDERING ACTIONS for offer:', offer.id, 'status:', offer.status);
                                return offer.status === 'Pending';
                              })() && (
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      alert('🚨 EDIT BUTTON CLICKED!');
                                      console.log('🚨 EDIT BUTTON JSX RENDER - Button clicked!');
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleEditOffer(offer);
                                    }}
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      alert('🚨 DELETE BUTTON CLICKED!');
                                      console.log('🚨 DELETE BUTTON JSX RENDER - Button clicked!');
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteOffer(offer.id, e);
                                    }}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                              {offer.status !== 'Pending' && (
                                <span className="text-gray-500 text-sm">
                                  No actions available (Status: {offer.status})
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
                    {selectedCampaign.status === 'Draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          // Close current dialog and navigate to marketplace
                          setSelectedCampaign(null);
                          navigate('/marketplace');
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
                      {selectedCampaign.status === 'Draft' && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            setSelectedCampaign(null);
                            navigate('/marketplace');
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
                                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                                      Requested
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
                                
                                {/* Show Asset Expiry Date for Live Campaign assets */}
                                {selectedCampaign.status === 'Live' && !asset.isRequested && (
                                  <div className="mt-2 space-y-1">
                                    {asset.next_available_date && (
                                      <p className="text-xs text-blue-600 font-medium">
                                        🗓️ Asset Expiry: {new Date(asset.next_available_date).toLocaleDateString()}
                                      </p>
                                    )}
                                    {selectedCampaign.end_date && (
                                      <p className="text-xs text-gray-500">
                                        Campaign End: {new Date(selectedCampaign.end_date).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* For requested assets, show different info */}
                                {asset.isRequested && (
                                  <div className="mt-2">
                                    <p className="text-xs text-orange-600">
                                      📋 Offer request submitted - waiting for admin response
                                    </p>
                                  </div>
                                )}
                                
                                {/* For non-Live campaigns, show availability info */}
                                {selectedCampaign.status !== 'Live' && !asset.isRequested && asset.next_available_date && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Available until: {new Date(asset.next_available_date).toLocaleDateString()}
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
                disabled={!campaignForm.name || !campaignForm.budget}
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
              {/* Asset Summary */}
              {editingOffer && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Selected Asset</h4>
                  <div className="flex items-start space-x-3">
                    <div>
                      <h5 className="font-medium">{editingOffer.asset_name}</h5>
                      <p className="text-sm text-gray-600">Asset ID: {editingOffer.asset_id}</p>
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
                    onValueChange={(value) => setEditOfferDetails({...editOfferDetails, contractDuration: value})}
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
                    value={editOfferDetails.estimatedBudget}
                    onChange={(e) => setEditOfferDetails({...editOfferDetails, estimatedBudget: e.target.value})}
                    placeholder="Enter your budget (required)"
                    required
                    className="border-2 border-blue-200 focus:border-blue-400"
                  />
                  <p className="text-xs text-blue-600 mt-1">* Budget is required for offer processing</p>
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
                      onSelect={(date) => setEditOfferDetails({...editOfferDetails, tentativeStartDate: date})}
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
                  <p><strong>Asset:</strong> {editingOffer?.asset_name || 'Selected asset'}</p>
                  <p><strong>Campaign:</strong> {editOfferDetails.campaignName || 'Not selected'}</p>
                  <p><strong>Duration:</strong> {editOfferDetails.contractDuration.replace('_', ' ').replace('months', 'Months')}</p>
                  <p><strong>Budget:</strong> {editOfferDetails.estimatedBudget ? `৳${parseInt(editOfferDetails.estimatedBudget).toLocaleString()}` : '⚠️ Required'}</p>
                  <p><strong>Services:</strong> {Object.entries(editOfferDetails.serviceBundles).filter(([_, selected]) => selected).map(([service, _]) => service).join(', ') || 'None selected'}</p>
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
                    !editOfferDetails.estimatedBudget.trim() || 
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
      </div>
    </div>
  );
};

export default BuyerDashboard;