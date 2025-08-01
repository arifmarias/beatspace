import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Building, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Edit,
  X,
  Plus,
  Settings,
  BarChart3,
  FileText,
  MapPin,
  AlertTriangle,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Mail,
  Phone,
  Globe,
  Calendar,
  Camera,
  MessageSquare,
  TrendingUp,
  DollarSign,
  Activity
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
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders, logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import OfferMediationPanel from './OfferMediationPanel';
import AssetMonitoringSystem from './AssetMonitoringSystem';
import AdvancedAnalytics from './AdvancedAnalytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [userFilter, setUserFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Asset form state
  const [assetForm, setAssetForm] = useState({
    name: '',
    description: '',
    address: '',
    district: '',
    division: '',
    type: 'Billboard',
    dimensions: '',
    traffic_volume: '',
    visibility_score: '',
    pricing: {
      weekly_rate: '',
      monthly_rate: '',
      yearly_rate: ''
    },
    photos: [],
    seller_id: '',
    seller_name: ''
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch all data in parallel
      const [usersRes, assetsRes, campaignsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/assets`, { headers }),
        axios.get(`${API}/campaigns`, { headers }),
        axios.get(`${API}/stats/public`)
      ]);

      setUsers(usersRes.data);
      setAssets(assetsRes.data);
      setCampaigns(campaignsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, status, reason = '') => {
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API}/admin/users/${userId}/status`, {
        status,
        reason
      }, { headers });
      
      // Refresh users list
      fetchDashboardData();
      setSelectedUser(null);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    }
  };

  const updateAssetStatus = async (assetId, status, reason = '') => {
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API}/admin/assets/${assetId}/status`, {
        status,
        reason
      }, { headers });
      
      // Refresh assets list
      fetchDashboardData();
      setSelectedAsset(null);
    } catch (error) {
      console.error('Error updating asset status:', error);
      alert('Failed to update asset status');
    }
  };

  // Asset CRUD Functions
  const handleCreateAsset = async () => {
    try {
      const headers = getAuthHeaders();
      
      const assetData = {
        ...assetForm,
        traffic_volume: parseInt(assetForm.traffic_volume) || 0,
        visibility_score: parseFloat(assetForm.visibility_score) || 0,
        pricing: {
          weekly_rate: parseFloat(assetForm.pricing.weekly_rate) || 0,
          monthly_rate: parseFloat(assetForm.pricing.monthly_rate) || 0,
          yearly_rate: parseFloat(assetForm.pricing.yearly_rate) || 0
        }
      };

      await axios.post(`${API}/assets`, assetData, { headers });
      alert('Asset created successfully!');
      
      setShowAddAsset(false);
      resetAssetForm();
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating asset:', error);
      alert('Failed to create asset: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editAsset = (asset) => {
    setAssetForm({
      name: asset.name || '',
      description: asset.description || '',
      address: asset.address || '',
      district: asset.district || '',
      division: asset.division || '',
      type: asset.type || 'Billboard',
      dimensions: asset.dimensions || '',
      traffic_volume: asset.traffic_volume?.toString() || '',
      visibility_score: asset.visibility_score?.toString() || '',
      pricing: {
        weekly_rate: asset.pricing?.weekly_rate?.toString() || '',
        monthly_rate: asset.pricing?.monthly_rate?.toString() || '',
        yearly_rate: asset.pricing?.yearly_rate?.toString() || ''
      },
      photos: asset.photos || [],
      seller_id: asset.seller_id || '',
      seller_name: asset.seller_name || ''
    });
    
    setEditingAsset(asset);
    setShowEditAsset(true);
  };

  const handleUpdateAsset = async () => {
    try {
      if (!editingAsset) {
        alert('Error: No asset selected for editing');
        return;
      }

      const headers = getAuthHeaders();
      
      const updateData = {
        ...assetForm,
        traffic_volume: parseInt(assetForm.traffic_volume) || 0,
        visibility_score: parseFloat(assetForm.visibility_score) || 0,
        pricing: {
          weekly_rate: parseFloat(assetForm.pricing.weekly_rate) || 0,
          monthly_rate: parseFloat(assetForm.pricing.monthly_rate) || 0,
          yearly_rate: parseFloat(assetForm.pricing.yearly_rate) || 0
        }
      };

      await axios.put(`${API}/assets/${editingAsset.id}`, updateData, { headers });
      alert('Asset updated successfully!');
      
      setShowEditAsset(false);
      setEditingAsset(null);
      resetAssetForm();
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error updating asset:', error);
      alert('Failed to update asset: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteAsset = async (asset) => {
    const confirmMessage = `Are you sure you want to delete the asset "${asset.name}"?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/assets/${asset.id}`, { headers });
      alert(`Asset "${asset.name}" deleted successfully!`);
      
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetAssetForm = () => {
    setAssetForm({
      name: '',
      description: '',
      address: '',
      district: '',
      division: '',
      type: 'Billboard',
      dimensions: '',
      traffic_volume: '',
      visibility_score: '',
      pricing: {
        weekly_rate: '',
        monthly_rate: '',
        yearly_rate: ''
      },
      photos: [],
      seller_id: '',
      seller_name: ''
    });
  };

  const filteredUsers = (users || []).filter(user => {
    const matchesFilter = userFilter === 'all' || user.status === userFilter;
    const matchesSearch = !searchTerm || 
      user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredAssets = (assets || []).filter(asset => {
    const matchesFilter = assetFilter === 'all' || asset.status === assetFilter;
    const matchesSearch = !searchTerm ||
      asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.address?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'suspended': 'bg-gray-100 text-gray-800',
      'Available': 'bg-green-100 text-green-800',
      'Pending Approval': 'bg-yellow-100 text-yellow-800',
      'Booked': 'bg-blue-100 text-blue-800',
      'Live': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
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
              <img 
                src="https://customer-assets.emergentagent.com/job_brandspotbd/artifacts/deqoe0i1_BeatSpace%20Transparent%20Logo.png" 
                alt="BeatSpace Logo" 
                className="w-8 h-8"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs text-gray-500">BeatSpace Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/marketplace')}
              >
                <MapPin className="w-4 h-4 mr-2" />
                View Marketplace
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
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{(users || []).length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {(users || []).filter(u => u.status === 'pending').length} pending approval
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-3xl font-bold text-gray-900">{(assets || []).length}</p>
                </div>
                <Building className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {(assets || []).filter(a => a.status === 'Pending Approval').length} pending approval
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                  <p className="text-3xl font-bold text-gray-900">{(campaigns || []).length}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Platform activity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {(users || []).filter(u => u.status === 'pending').length + 
                     (assets || []).filter(a => a.status === 'Pending Approval').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Requires attention
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="offers">Offer Mediation</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>User Management</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.company_name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.contact_name}</div>
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'buyer' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Company Information</h4>
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Company:</strong> {selectedUser.company_name}</p>
                                        <p><strong>Contact:</strong> {selectedUser.contact_name}</p>
                                        <p><strong>Email:</strong> {selectedUser.email}</p>
                                        <p><strong>Phone:</strong> {selectedUser.phone}</p>
                                        <p><strong>Role:</strong> {selectedUser.role}</p>
                                        {selectedUser.website && (
                                          <p><strong>Website:</strong> {selectedUser.website}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Account Status</h4>
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Status:</strong> 
                                          <Badge className={`ml-2 ${getStatusColor(selectedUser.status)}`}>
                                            {selectedUser.status}
                                          </Badge>
                                        </p>
                                        <p><strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleString()}</p>
                                        {selectedUser.verified_at && (
                                          <p><strong>Verified:</strong> {new Date(selectedUser.verified_at).toLocaleString()}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {selectedUser.address && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Address</h4>
                                      <p className="text-sm">{selectedUser.address}</p>
                                    </div>
                                  )}

                                  {selectedUser.status === 'pending' && (
                                    <div className="flex space-x-3 pt-4 border-t">
                                      <Button
                                        onClick={() => updateUserStatus(selectedUser.id, 'approved')}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <UserCheck className="w-4 h-4 mr-2" />
                                        Approve User
                                      </Button>
                                      <Button
                                        onClick={() => updateUserStatus(selectedUser.id, 'rejected', 'Rejected by admin')}
                                        variant="destructive"
                                      >
                                        <UserX className="w-4 h-4 mr-2" />
                                        Reject User
                                      </Button>
                                    </div>
                                  )}

                                  {selectedUser.status === 'approved' && (
                                    <div className="flex space-x-3 pt-4 border-t">
                                      <Button
                                        onClick={() => updateUserStatus(selectedUser.id, 'suspended', 'Suspended by admin')}
                                        variant="outline"
                                      >
                                        Suspend User
                                      </Button>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>Asset Management</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => setShowAddAsset(true)}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Asset
                    </Button>
                    <Input
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Select value={assetFilter} onValueChange={setAssetFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Booked">Booked</SelectItem>
                        <SelectItem value="Live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {asset.photos && asset.photos[0] && (
                              <img 
                                src={asset.photos[0]} 
                                alt={asset.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="font-medium">{asset.name}</div>
                              <div className="text-sm text-gray-500">{asset.dimensions}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{asset.district}</div>
                            <div className="text-sm text-gray-500">{asset.division}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.type}</Badge>
                        </TableCell>
                        <TableCell>{asset.seller_name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(asset.status)}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedAsset(asset)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Asset Details</DialogTitle>
                              </DialogHeader>
                              {selectedAsset && (
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div>
                                      {selectedAsset.photos && selectedAsset.photos[0] && (
                                        <img 
                                          src={selectedAsset.photos[0]} 
                                          alt={selectedAsset.name}
                                          className="w-full h-48 object-cover rounded-lg mb-4"
                                        />
                                      )}
                                      <h3 className="font-semibold text-lg mb-2">{selectedAsset.name}</h3>
                                      <p className="text-gray-600 mb-4">{selectedAsset.description}</p>
                                      <div className="space-y-2 text-sm">
                                        <p><strong>Address:</strong> {selectedAsset.address}</p>
                                        <p><strong>Type:</strong> {selectedAsset.type}</p>
                                        <p><strong>Dimensions:</strong> {selectedAsset.dimensions}</p>
                                        <p><strong>Traffic Volume:</strong> {selectedAsset.traffic_volume}</p>
                                        <p><strong>Visibility Score:</strong> {selectedAsset.visibility_score}/10</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Pricing</h4>
                                      <div className="space-y-2 text-sm mb-4">
                                        {Object.entries(selectedAsset.pricing).map(([duration, price]) => (
                                          <p key={duration}>
                                            <strong>{duration.replace('_', ' ')}:</strong> ৳{price.toLocaleString()}
                                          </p>
                                        ))}
                                      </div>
                                      
                                      <h4 className="font-semibold mb-2">Seller Information</h4>
                                      <div className="space-y-2 text-sm mb-4">
                                        <p><strong>Seller:</strong> {selectedAsset.seller_name}</p>
                                        <p><strong>Status:</strong> 
                                          <Badge className={`ml-2 ${getStatusColor(selectedAsset.status)}`}>
                                            {selectedAsset.status}
                                          </Badge>
                                        </p>
                                        <p><strong>Created:</strong> {new Date(selectedAsset.created_at).toLocaleString()}</p>
                                      </div>

                                      {selectedAsset.specifications && Object.keys(selectedAsset.specifications).length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-2">Specifications</h4>
                                          <div className="space-y-1 text-sm">
                                            {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                                              <p key={key}><strong>{key}:</strong> {value}</p>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {selectedAsset.status === 'Pending Approval' && (
                                    <div className="flex space-x-3 pt-4 border-t">
                                      <Button
                                        onClick={() => updateAssetStatus(selectedAsset.id, 'Available')}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve Asset
                                      </Button>
                                      <Button
                                        onClick={() => updateAssetStatus(selectedAsset.id, 'Unavailable', 'Rejected by admin')}
                                        variant="destructive"
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject Asset
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => editAsset(asset)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteAsset(asset)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Campaign Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(campaigns || []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead>Assets</TableHead>
                        <TableHead>Budget</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(campaigns || []).map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-sm text-gray-500">{campaign.description}</div>
                          </TableCell>
                          <TableCell>{campaign.buyer_name}</TableCell>
                          <TableCell>{(campaign.assets || []).length} assets</TableCell>
                          <TableCell>৳{(campaign.budget || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns created yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offer Mediation Tab */}
          <TabsContent value="offers" className="space-y-6">
            <OfferMediationPanel />
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <AssetMonitoringSystem />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AdvancedAnalytics />
          </TabsContent>
        </Tabs>

        {/* Add Asset Dialog */}
        <Dialog open={showAddAsset} onOpenChange={(open) => {
          setShowAddAsset(open);
          if (!open) resetAssetForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name *
                  </label>
                  <Input
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({...assetForm, name: e.target.value})}
                    placeholder="Enter asset name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={assetForm.description}
                    onChange={(e) => setAssetForm({...assetForm, description: e.target.value})}
                    placeholder="Asset description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <Input
                    value={assetForm.address}
                    onChange={(e) => setAssetForm({...assetForm, address: e.target.value})}
                    placeholder="Full address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <Input
                      value={assetForm.district}
                      onChange={(e) => setAssetForm({...assetForm, district: e.target.value})}
                      placeholder="District"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Input
                      value={assetForm.division}
                      onChange={(e) => setAssetForm({...assetForm, division: e.target.value})}
                      placeholder="Division"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type *
                  </label>
                  <Select 
                    value={assetForm.type} 
                    onValueChange={(value) => setAssetForm({...assetForm, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Billboard">Billboard</SelectItem>
                      <SelectItem value="Digital Display">Digital Display</SelectItem>
                      <SelectItem value="Transit Ad">Transit Ad</SelectItem>
                      <SelectItem value="Street Furniture">Street Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions
                  </label>
                  <Input
                    value={assetForm.dimensions}
                    onChange={(e) => setAssetForm({...assetForm, dimensions: e.target.value})}
                    placeholder="e.g., 10ft x 20ft"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Traffic Volume (daily)
                  </label>
                  <Input
                    type="number"
                    value={assetForm.traffic_volume}
                    onChange={(e) => setAssetForm({...assetForm, traffic_volume: e.target.value})}
                    placeholder="Daily traffic volume"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility Score (1-10)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={assetForm.visibility_score}
                    onChange={(e) => setAssetForm({...assetForm, visibility_score: e.target.value})}
                    placeholder="Visibility score"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing (৳) *
                  </label>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weekly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.weekly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, weekly_rate: e.target.value}
                      })}
                      placeholder="Weekly rate"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monthly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.monthly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, monthly_rate: e.target.value}
                      })}
                      placeholder="Monthly rate"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Yearly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.yearly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, yearly_rate: e.target.value}
                      })}
                      placeholder="Yearly rate"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seller Name *
                  </label>
                  <Input
                    value={assetForm.seller_name}
                    onChange={(e) => setAssetForm({...assetForm, seller_name: e.target.value})}
                    placeholder="Seller/Owner name"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddAsset(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAsset}
                className="bg-orange-600 hover:bg-orange-700"
                disabled={!assetForm.name || !assetForm.address || !assetForm.pricing.weekly_rate}
              >
                Create Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Asset Dialog */}
        <Dialog open={showEditAsset} onOpenChange={(open) => {
          setShowEditAsset(open);
          if (!open) {
            setEditingAsset(null);
            resetAssetForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Asset</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name *
                  </label>
                  <Input
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({...assetForm, name: e.target.value})}
                    placeholder="Enter asset name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    value={assetForm.description}
                    onChange={(e) => setAssetForm({...assetForm, description: e.target.value})}
                    placeholder="Asset description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <Input
                    value={assetForm.address}
                    onChange={(e) => setAssetForm({...assetForm, address: e.target.value})}
                    placeholder="Full address"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <Input
                      value={assetForm.district}
                      onChange={(e) => setAssetForm({...assetForm, district: e.target.value})}
                      placeholder="District"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Input
                      value={assetForm.division}
                      onChange={(e) => setAssetForm({...assetForm, division: e.target.value})}
                      placeholder="Division"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Type *
                  </label>
                  <Select 
                    value={assetForm.type} 
                    onValueChange={(value) => setAssetForm({...assetForm, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Billboard">Billboard</SelectItem>
                      <SelectItem value="Digital Display">Digital Display</SelectItem>
                      <SelectItem value="Transit Ad">Transit Ad</SelectItem>
                      <SelectItem value="Street Furniture">Street Furniture</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dimensions
                  </label>
                  <Input
                    value={assetForm.dimensions}
                    onChange={(e) => setAssetForm({...assetForm, dimensions: e.target.value})}
                    placeholder="e.g., 10ft x 20ft"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Traffic Volume (daily)
                  </label>
                  <Input
                    type="number"
                    value={assetForm.traffic_volume}
                    onChange={(e) => setAssetForm({...assetForm, traffic_volume: e.target.value})}
                    placeholder="Daily traffic volume"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility Score (1-10)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={assetForm.visibility_score}
                    onChange={(e) => setAssetForm({...assetForm, visibility_score: e.target.value})}
                    placeholder="Visibility score"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing (৳) *
                  </label>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Weekly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.weekly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, weekly_rate: e.target.value}
                      })}
                      placeholder="Weekly rate"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monthly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.monthly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, monthly_rate: e.target.value}
                      })}
                      placeholder="Monthly rate"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Yearly Rate</label>
                    <Input
                      type="number"
                      value={assetForm.pricing.yearly_rate}
                      onChange={(e) => setAssetForm({
                        ...assetForm, 
                        pricing: {...assetForm.pricing, yearly_rate: e.target.value}
                      })}
                      placeholder="Yearly rate"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seller Name *
                  </label>
                  <Input
                    value={assetForm.seller_name}
                    onChange={(e) => setAssetForm({...assetForm, seller_name: e.target.value})}
                    placeholder="Seller/Owner name"
                    required
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditAsset(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateAsset}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!assetForm.name || !assetForm.address || !assetForm.pricing.weekly_rate}
              >
                Update Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;