import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, 
  Plus, 
  Eye, 
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders, logout, getUser } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    budget: '',
    notes: ''
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
      setCampaigns(campaignsRes.data);

      // Calculate stats with null safety
      const campaignData = campaignsRes.data || [];
      const totalCampaigns = campaignData.length;
      const activeCampaigns = campaignData.filter(c => c.status === 'Live').length;
      const pendingCampaigns = campaignData.filter(c => c.status === 'Pending Offer' || c.status === 'Negotiating').length;
      const totalBudget = campaignData.reduce((sum, c) => sum + (c.budget || 0), 0);

      setStats({
        totalCampaigns,
        activeCampaigns,
        pendingCampaigns,
        totalBudget
      });
    } catch (error) {
      console.error('Error fetching buyer data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
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
        budget: parseFloat(campaignForm.budget) || 0
      };

      await axios.post(`${API}/campaigns`, campaignData, { headers });
      alert('Campaign created successfully!');
      
      setShowCreateCampaign(false);
      setCampaignForm({
        name: '',
        description: '',
        budget: '',
        notes: ''
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
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
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-gray-500">{campaign.description}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {campaign.asset_ids.length} assets
                            </Badge>
                          </TableCell>
                          <TableCell>৳{campaign.budget.toLocaleString()}</TableCell>
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
                                  onClick={() => setSelectedCampaign(campaign)}
                                >
                                  <Eye className="w-4 h-4" />
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
                                          <strong>Assets:</strong> {selectedCampaign.asset_ids.length} selected
                                        </div>
                                        <div>
                                          <strong>Created:</strong> {new Date(selectedCampaign.created_at).toLocaleDateString()}
                                        </div>
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
    </div>
  );
};

export default BuyerDashboard;