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
  Star
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

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    budget: '',
    notes: '',
    startDate: null,
    endDate: null
  });

  useEffect(() => {
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
      setRequestedOffers(offersRes.data || []);

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
      if (!campaign || !campaign.assets || campaign.assets.length === 0) {
        setCampaignAssets([]);
        return;
      }

      // Fetch all public assets and filter by campaign asset IDs
      const response = await axios.get(`${API}/assets/public`);
      const allAssets = response.data || [];
      
      // Filter assets that are in this campaign
      const campaignAssetsList = allAssets.filter(asset => 
        campaign.assets.includes(asset.id)
      );
      
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

  const deleteOfferRequest = async (offerId) => {
    console.log('Delete offer request called with ID:', offerId);
    
    if (!window.confirm('Are you sure you want to delete this offer request? This action cannot be undone.')) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      console.log('Attempting to delete offer with headers:', headers);
      
      const response = await axios.delete(`${API}/offers/requests/${offerId}`, { headers });
      console.log('Delete response:', response);
      
      alert('Offer request deleted successfully!');
      fetchBuyerData(); // Refresh the data
    } catch (error) {
      console.error('Error deleting offer request:', error);
      console.error('Error response:', error.response);
      alert('Failed to delete offer request: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editOfferRequest = (offer) => {
    setEditingOffer(offer);
    setShowEditOfferDialog(true);
  };

  const updateOfferRequest = async (updatedOffer) => {
    try {
      const headers = getAuthHeaders();
      await axios.put(`${API}/offers/requests/${updatedOffer.id}`, updatedOffer, { headers });
      alert('Offer request updated successfully!');
      setShowEditOfferDialog(false);
      setEditingOffer(null);
      fetchBuyerData(); // Refresh the data
    } catch (error) {
      console.error('Error updating offer request:', error);
      alert('Failed to update offer request. Please try again.');
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
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Buyer Dashboard</h1>
                <p className="text-xs text-gray-500">{currentUser?.company_name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/marketplace')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                Browse Assets
              </Button>
              <Button
                onClick={() => setShowCreateCampaign(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                All campaigns
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeCampaigns}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Currently live
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingCampaigns}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                In negotiation
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Offer Requests</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.totalOfferRequests}</p>
                </div>
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Best offer requests
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Budget</p>
                  <p className="text-3xl font-bold text-purple-600">৳{stats.totalBudget?.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Allocated budget
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="campaigns" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="requested-offers">Requested Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Your Campaigns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(campaigns || []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Status</TableHead>
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
                            <Badge variant="outline">
                              {(campaign.asset_ids || campaign.assets || []).length} assets
                            </Badge>
                          </TableCell>
                          <TableCell>৳{(campaign.budget || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCampaign(campaign);
                                    fetchCampaignAssets(campaign);
                                  }}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Campaign Details</DialogTitle>
                                </DialogHeader>
                                {selectedCampaign && (
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">{selectedCampaign.name}</h4>
                                      <p className="text-gray-600 mb-4">{selectedCampaign.description}</p>
                                      
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <strong>Budget:</strong> ৳{selectedCampaign.budget.toLocaleString()}
                                        </div>
                                        <div>
                                          <strong>Status:</strong> 
                                          <Badge className={`ml-2 ${getStatusColor(selectedCampaign.status)}`}>
                                            {selectedCampaign.status}
                                          </Badge>
                                        </div>
                                        <div>
                                          <strong>Assets:</strong> {(selectedCampaign.asset_ids || selectedCampaign.assets || []).length} selected
                                        </div>
                                        <div>
                                          <strong>Created:</strong> {selectedCampaign.created_at ? new Date(selectedCampaign.created_at).toLocaleDateString() : 'N/A'}
                                        </div>
                                      </div>

                                      {/* Campaign Status Management - Admin Only */}
                                      {currentUser?.role === 'admin' && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                          <h5 className="font-medium mb-2">Campaign Management</h5>
                                          <div className="flex items-center space-x-2">
                                            {selectedCampaign.status === 'Draft' && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  onClick={() => updateCampaignStatus(selectedCampaign.id, 'Live')}
                                                  className="bg-green-600 hover:bg-green-700"
                                                >
                                                  🚀 Launch Campaign
                                                </Button>
                                                <p className="text-xs text-gray-600">
                                                  Once live, existing assets cannot be edited or removed
                                                </p>
                                              </>
                                            )}
                                            
                                            {selectedCampaign.status === 'Live' && (
                                              <>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => updateCampaignStatus(selectedCampaign.id, 'Paused')}
                                                >
                                                  ⏸️ Pause Campaign
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => updateCampaignStatus(selectedCampaign.id, 'Completed')}
                                                >
                                                  ✅ Mark Complete
                                                </Button>
                                                <p className="text-xs text-gray-600">
                                                  Campaign is live - assets are protected
                                                </p>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Campaign Assets Section */}
                                      <div className="mt-6">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-medium">Campaign Assets ({campaignAssets.length})</h5>
                                          {selectedCampaign.status === 'Live' && (
                                            <Badge variant="destructive" className="text-xs">
                                              Live Campaign - Limited Editing
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        {campaignAssets.length > 0 ? (
                                          <div className="space-y-3 max-h-60 overflow-y-auto">
                                            {campaignAssets.map((asset, index) => {
                                              // For live campaigns, only newly added assets (after campaign went live) can be edited
                                              const isEditableInLiveCampaign = selectedCampaign.status !== 'Live' || 
                                                (selectedCampaign.assets_added_after_live && 
                                                 selectedCampaign.assets_added_after_live.includes(asset.id));
                                              
                                              return (
                                                <div key={asset.id} className="border rounded-lg p-3 hover:shadow-sm">
                                                  <div className="flex items-start space-x-3">
                                                    {asset.photos && asset.photos[0] && (
                                                      <img 
                                                        src={asset.photos[0]} 
                                                        alt={asset.name}
                                                        className="w-12 h-12 object-cover rounded"
                                                      />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                          <h6 className="font-medium text-sm truncate">{asset.name}</h6>
                                                          <p className="text-xs text-gray-500 truncate">{asset.address}</p>
                                                          <p className="text-xs text-orange-600 truncate">
                                                            Expires: {asset.expiration_date ? new Date(asset.expiration_date).toLocaleDateString() : 'Not specified'}
                                                          </p>
                                                          <div className="flex items-center justify-between mt-1">
                                                            <span className="text-xs font-medium text-blue-600">
                                                              ৳{asset.pricing?.['3_months']?.toLocaleString()}/3mo
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                              {selectedCampaign.status === 'Live' ? 'Live' : asset.status}
                                                            </Badge>
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Action buttons based on campaign status */}
                                                        <div className="flex items-center space-x-1 ml-2">
                                                          {selectedCampaign.status === 'Draft' && (
                                                            <>
                                                              <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                                                                title="Edit asset"
                                                              >
                                                                <Edit className="w-3 h-3" />
                                                              </Button>
                                                              <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                                                title="Remove from campaign"
                                                                onClick={() => removeAssetFromCampaign(asset.id)}
                                                              >
                                                                <X className="w-3 h-3" />
                                                              </Button>
                                                            </>
                                                          )}
                                                          
                                                          {selectedCampaign.status === 'Live' && isEditableInLiveCampaign && (
                                                            <Button
                                                              size="sm"
                                                              variant="ghost"
                                                              className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                                                              title="Remove newly added asset"
                                                              onClick={() => removeAssetFromCampaign(asset.id)}
                                                            >
                                                              <X className="w-3 h-3" />
                                                            </Button>
                                                          )}
                                                          
                                                          {selectedCampaign.status === 'Live' && !isEditableInLiveCampaign && (
                                                            <Badge variant="secondary" className="text-xs">
                                                              🔒 Protected
                                                            </Badge>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="text-center py-8 border border-dashed rounded-lg">
                                            <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No assets added to this campaign yet</p>
                                            <Button
                                              size="sm"
                                              className="mt-2"
                                              onClick={() => navigate('/marketplace')}
                                            >
                                              Browse Assets
                                            </Button>
                                          </div>
                                        )}
                                      </div>

                                      {selectedCampaign.notes && (
                                        <div className="mt-4">
                                          <strong>Notes:</strong>
                                          <p className="text-gray-600 mt-1">{selectedCampaign.notes}</p>
                                        </div>
                                      )}
                                    </div>

                                    {selectedCampaign.status === 'Draft' && (
                                      <div className="pt-4 border-t">
                                        <Alert>
                                          <AlertCircle className="w-4 h-4" />
                                          <AlertDescription>
                                            This campaign is in draft mode. Go to the marketplace to select assets and submit for best offer.
                                          </AlertDescription>
                                        </Alert>
                                        <Button
                                          className="mt-3"
                                          onClick={() => navigate('/marketplace')}
                                        >
                                          <Building className="w-4 h-4 mr-2" />
                                          Browse Assets
                                        </Button>
                                      </div>
                                    )}

                                    {selectedCampaign.status === 'Pending Offer' && (
                                      <div className="pt-4 border-t">
                                        <Alert>
                                          <Clock className="w-4 h-4" />
                                          <AlertDescription>
                                            Your request has been submitted. Our team is preparing a customized offer for you.
                                          </AlertDescription>
                                        </Alert>
                                      </div>
                                    )}

                                    {selectedCampaign.status === 'Live' && (
                                      <div className="pt-4 border-t">
                                        <Alert>
                                          <CheckCircle className="w-4 h-4" />
                                          <AlertDescription>
                                            Your campaign is live! Monitor your assets and track performance.
                                          </AlertDescription>
                                        </Alert>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                    <p className="text-gray-500 mb-6">Create your first advertising campaign to get started</p>
                    <Button
                      onClick={() => setShowCreateCampaign(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Campaign
                    </Button>
                  </div>
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
                  <div className="space-y-4">
                    {(requestedOffers || []).map((offer) => (
                      <Card key={offer.id} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{offer.asset_name}</h3>
                              <p className="text-sm text-gray-600">Campaign: {offer.campaign_name}</p>
                            </div>
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
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-500">Budget</p>
                              <p className="font-medium">৳{offer.estimated_budget?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Duration</p>
                              <p className="font-medium">{offer.contract_duration?.replace('_', ' ')}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Type</p>
                              <p className="font-medium capitalize">{offer.campaign_type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Submitted</p>
                              <p className="font-medium">{new Date(offer.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          {offer.timeline && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-500">Timeline</p>
                              <p className="text-sm">{offer.timeline}</p>
                            </div>
                          )}

                          {offer.special_requirements && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-500">Special Requirements</p>
                              <p className="text-sm">{offer.special_requirements}</p>
                            </div>
                          )}

                          {offer.notes && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-500">Notes</p>
                              <p className="text-sm">{offer.notes}</p>
                            </div>
                          )}

                          {offer.admin_response && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-500 mb-1">Admin Response</p>
                              <p className="text-sm">{offer.admin_response}</p>
                            </div>
                          )}

                          {offer.final_offer && (
                            <div className="bg-green-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-500 mb-1">Final Offer Details</p>
                              <pre className="text-sm">{JSON.stringify(offer.final_offer, null, 2)}</pre>
                            </div>
                          )}

                          {/* Edit/Delete Actions - Only for Pending offers */}
                          {offer.status === 'Pending' && (
                            <div className="flex justify-end space-x-2 mt-4 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => editOfferRequest(offer)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteOfferRequest(offer.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics will be available once campaigns are live</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Budget tracking will appear here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Campaign Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
                  <p className="mb-6">Reports will be generated once campaigns are active</p>
                  <Button variant="outline" disabled>
                    <Download className="w-4 h-4 mr-2" />
                    Download Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Name</label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                placeholder="Enter campaign name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={campaignForm.description}
                onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                placeholder="Describe your campaign objectives..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Budget (BDT)</label>
              <Input
                type="number"
                value={campaignForm.budget}
                onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                placeholder="0"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Campaign Start Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {campaignForm.startDate 
                        ? campaignForm.startDate.toLocaleDateString()
                        : "Select start date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={campaignForm.startDate}
                      onSelect={(date) => setCampaignForm({...campaignForm, startDate: date})}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Campaign End Date *</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {campaignForm.endDate 
                        ? campaignForm.endDate.toLocaleDateString()
                        : "Select end date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={campaignForm.endDate}
                      onSelect={(date) => setCampaignForm({...campaignForm, endDate: date})}
                      disabled={(date) => !campaignForm.startDate || date <= campaignForm.startDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                value={campaignForm.notes}
                onChange={(e) => setCampaignForm({...campaignForm, notes: e.target.value})}
                placeholder="Any additional notes or requirements..."
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateCampaign(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCampaign}
                className="bg-green-600 hover:bg-green-700"
                disabled={!campaignForm.name}
              >
                Create Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Dialog */}
      <Dialog open={showEditOfferDialog} onOpenChange={setShowEditOfferDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>📝 Edit Offer Request</span>
            </DialogTitle>
          </DialogHeader>
          
          {editingOffer && (
            <div className="space-y-6">
              {/* Selected Asset */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Selected Asset</h3>
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-500">Asset</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{editingOffer.asset_name}</h4>
                    <p className="text-sm text-gray-600">Campaign: {editingOffer.campaign_name}</p>
                  </div>
                </div>
              </div>

              {/* Campaign Selection */}
              <div>
                <label className="block text-sm font-semibold mb-3">Campaign Selection *</label>
                <div className="space-y-4">
                  <div>
                    <Select 
                      value={editingOffer.existing_campaign_id || ''} 
                      onValueChange={(value) => {
                        // Find the selected campaign to get its details
                        const selectedCampaign = campaigns.find(c => c.id === value);
                        setEditingOffer({
                          ...editingOffer, 
                          existing_campaign_id: value,
                          campaign_name: selectedCampaign ? selectedCampaign.name : editingOffer.campaign_name
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
                </div>
              </div>

              {/* Contract Duration and Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Contract Duration *</label>
                  <Select 
                    value={editingOffer.contract_duration} 
                    onValueChange={(value) => setEditingOffer({...editingOffer, contract_duration: value})}
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
                    value={editingOffer.estimated_budget}
                    onChange={(e) => setEditingOffer({...editingOffer, estimated_budget: parseFloat(e.target.value)})}
                    placeholder="Enter your budget (required)"
                    className="border-2 border-orange-200 focus:border-orange-400"
                  />
                  <p className="text-xs text-orange-600 mt-1">* Budget is required for offer processing</p>
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
                      {editingOffer.timeline && editingOffer.timeline.includes('from') 
                        ? editingOffer.timeline.replace('Asset starts from ', '')
                        : "Select asset start date"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={editingOffer.timeline && editingOffer.timeline.includes('from') 
                        ? new Date(editingOffer.timeline.replace('Asset starts from ', ''))
                        : null
                      }
                      onSelect={(date) => setEditingOffer({
                        ...editingOffer, 
                        timeline: date ? `Asset starts from ${date.toLocaleDateString()}` : ''
                      })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Additional Services */}
              <div>
                <label className="block text-sm font-semibold mb-3">Additional Services</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-printing"
                      checked={editingOffer.service_bundles?.printing || false}
                      onChange={(e) => setEditingOffer({
                        ...editingOffer, 
                        service_bundles: {
                          ...editingOffer.service_bundles,
                          printing: e.target.checked
                        }
                      })}
                      className="rounded"
                    />
                    <label htmlFor="edit-printing" className="text-sm font-medium">🖨️ Printing & Design</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-setup"
                      checked={editingOffer.service_bundles?.setup || false}
                      onChange={(e) => setEditingOffer({
                        ...editingOffer, 
                        service_bundles: {
                          ...editingOffer.service_bundles,
                          setup: e.target.checked
                        }
                      })}
                      className="rounded"
                    />
                    <label htmlFor="edit-setup" className="text-sm font-medium">🔧 Installation & Setup</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="edit-monitoring"
                      checked={editingOffer.service_bundles?.monitoring || false}
                      onChange={(e) => setEditingOffer({
                        ...editingOffer, 
                        service_bundles: {
                          ...editingOffer.service_bundles,
                          monitoring: e.target.checked
                        }
                      })}
                      className="rounded"
                    />
                    <label htmlFor="edit-monitoring" className="text-sm font-medium">📊 Monitoring & Reports</label>
                  </div>
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-sm font-semibold mb-2">Special Requirements</label>
                <Textarea
                  value={editingOffer.special_requirements || ''}
                  onChange={(e) => setEditingOffer({...editingOffer, special_requirements: e.target.value})}
                  placeholder="Any specific requirements, constraints, or special considerations..."
                  rows={3}
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2">Additional Notes</label>
                <Textarea
                  value={editingOffer.notes || ''}
                  onChange={(e) => setEditingOffer({...editingOffer, notes: e.target.value})}
                  placeholder="Any additional notes or preferences..."
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditOfferDialog(false);
                    setEditingOffer(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateOfferRequest(editingOffer)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Update Offer Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerDashboard;