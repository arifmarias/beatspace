import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Building, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  MapPin, 
  DollarSign,
  BarChart3,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Camera,
  Save,
  X
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
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;

const SellerDashboard = () => {
  const navigate = useNavigate();
  const currentUser = getUser();
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [assetForm, setAssetForm] = useState({
    name: '',
    type: 'Billboard',
    address: '',
    location: { lat: 23.8103, lng: 90.4125 },
    dimensions: '',
    description: '',
    photos: [],
    pricing: {
      '3_months': '',
      '6_months': '',
      '12_months': ''
    },
    specifications: {},
    visibility_score: 5,
    traffic_volume: 'Medium',
    district: '',
    division: 'Dhaka'
  });

  const assetTypes = [
    'Billboard', 'Police Box', 'Roadside Barrier', 'Traffic Height Restriction Overhead',
    'Railway Station', 'Market', 'Wall', 'Bridge', 'Bus Stop', 'Others'
  ];

  const bangladeshDivisions = [
    'Dhaka', 'Chittagong', 'Sylhet', 'Rangpur', 'Rajshahi', 'Khulna', 'Barisal', 'Mymensingh'
  ];

  const trafficVolumes = ['Low', 'Medium', 'High', 'Very High'];

  useEffect(() => {
    fetchSellerData();
  }, []);

  const fetchSellerData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch seller's assets
      const assetsRes = await axios.get(`${API}/assets`, { headers });
      setAssets(assetsRes.data);

      // Calculate stats
      const totalAssets = assetsRes.data.length;
      const availableAssets = assetsRes.data.filter(a => a.status === 'Available').length;
      const pendingAssets = assetsRes.data.filter(a => a.status === 'Pending Approval').length;
      const bookedAssets = assetsRes.data.filter(a => a.status === 'Booked' || a.status === 'Live').length;

      setStats({
        totalAssets,
        availableAssets,
        pendingAssets,
        bookedAssets
      });
    } catch (error) {
      console.error('Error fetching seller data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files) => {
    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'beatspace_assets'); // You'd set this up in Cloudinary
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

        // For demo purposes, we'll use a placeholder URL
        // In production, you'd upload to Cloudinary
        const demoUrl = `https://images.unsplash.com/photo-${Date.now()}?w=800&h=600&fit=crop`;
        uploadedUrls.push(demoUrl);
      }

      setAssetForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setAssetForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmitAsset = async () => {
    try {
      const headers = getAuthHeaders();
      
      if (editingAsset) {
        // Update existing asset
        await axios.put(`${API}/assets/${editingAsset.id}`, assetForm, { headers });
        alert('Asset updated successfully!');
      } else {
        // Create new asset
        await axios.post(`${API}/assets`, assetForm, { headers });
        alert('Asset created successfully! It will be reviewed by admin before going live.');
      }

      setShowAddAsset(false);
      setEditingAsset(null);
      resetForm();
      fetchSellerData();
    } catch (error) {
      console.error('Error saving asset:', error);
      alert('Failed to save asset. Please try again.');
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API}/assets/${assetId}`, { headers });
      alert('Asset deleted successfully!');
      fetchSellerData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset. Please try again.');
    }
  };

  const resetForm = () => {
    setAssetForm({
      name: '',
      type: 'Billboard',
      address: '',
      location: { lat: 23.8103, lng: 90.4125 },
      dimensions: '',
      description: '',
      photos: [],
      pricing: {
        '3_months': '',
        '6_months': '',
        '12_months': ''
      },
      specifications: {},
      visibility_score: 5,
      traffic_volume: 'Medium',
      district: '',
      division: 'Dhaka'
    });
  };

  const startEditing = (asset) => {
    setAssetForm(asset);
    setEditingAsset(asset);
    setShowAddAsset(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Available': 'bg-green-100 text-green-800',
      'Pending Approval': 'bg-yellow-100 text-yellow-800',
      'Booked': 'bg-blue-100 text-blue-800',
      'Live': 'bg-purple-100 text-purple-800',
      'Unavailable': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading seller dashboard...</p>
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
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="text-xs text-gray-500">{currentUser?.company_name}</p>
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
                onClick={() => {
                  resetForm();
                  setShowAddAsset(true);
                  setEditingAsset(null);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Asset
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
                  <p className="text-sm font-medium text-gray-600">Total Assets</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAssets}</p>
                </div>
                <Building className="w-8 h-8 text-blue-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Your inventory
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-3xl font-bold text-green-600">{stats.availableAssets}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Ready for booking
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingAssets}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Awaiting approval
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.bookedAssets}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Booked/Live assets
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assets Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Your Assets</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pricing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
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
                      <TableCell>
                        <div className="text-sm">
                          <div>3m: ৳{asset.pricing['3_months']?.toLocaleString()}</div>
                          <div className="text-gray-500">6m: ৳{asset.pricing['6_months']?.toLocaleString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(asset.status)}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(asset)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assets yet</h3>
                <p className="text-gray-500 mb-6">Start by adding your first advertising asset</p>
                <Button
                  onClick={() => {
                    resetForm();
                    setShowAddAsset(true);
                    setEditingAsset(null);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Asset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Asset Name</label>
                  <Input
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({...assetForm, name: e.target.value})}
                    placeholder="e.g., Dhanmondi Lake Billboard"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Asset Type</label>
                  <Select 
                    value={assetForm.type} 
                    onValueChange={(value) => setAssetForm({...assetForm, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address</label>
                <Input
                  value={assetForm.address}
                  onChange={(e) => setAssetForm({...assetForm, address: e.target.value})}
                  placeholder="Complete address with landmark"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Division</label>
                  <Select 
                    value={assetForm.division} 
                    onValueChange={(value) => setAssetForm({...assetForm, division: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bangladeshDivisions.map(division => (
                        <SelectItem key={division} value={division}>{division}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">District</label>
                  <Input
                    value={assetForm.district}
                    onChange={(e) => setAssetForm({...assetForm, district: e.target.value})}
                    placeholder="District name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Dimensions</label>
                  <Input
                    value={assetForm.dimensions}
                    onChange={(e) => setAssetForm({...assetForm, dimensions: e.target.value})}
                    placeholder="e.g., 20 x 40 ft"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({...assetForm, description: e.target.value})}
                  placeholder="Detailed description of the advertising location..."
                  rows={3}
                />
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Photos</h3>
              
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleImageUpload(Array.from(e.target.files))}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <Camera className="w-5 h-5 mr-2 text-gray-400" />
                  {uploadingImages ? 'Uploading...' : 'Upload Photos'}
                </label>
              </div>

              {assetForm.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {assetForm.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo}
                        alt={`Asset photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing (BDT)</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">3 Months</label>
                  <Input
                    type="number"
                    value={assetForm.pricing['3_months']}
                    onChange={(e) => setAssetForm({
                      ...assetForm,
                      pricing: {...assetForm.pricing, '3_months': parseFloat(e.target.value) || 0}
                    })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">6 Months</label>
                  <Input
                    type="number"
                    value={assetForm.pricing['6_months']}
                    onChange={(e) => setAssetForm({
                      ...assetForm,
                      pricing: {...assetForm.pricing, '6_months': parseFloat(e.target.value) || 0}
                    })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">12 Months</label>
                  <Input
                    type="number"
                    value={assetForm.pricing['12_months']}
                    onChange={(e) => setAssetForm({
                      ...assetForm,
                      pricing: {...assetForm.pricing, '12_months': parseFloat(e.target.value) || 0}
                    })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Additional Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Traffic Volume</label>
                  <Select 
                    value={assetForm.traffic_volume} 
                    onValueChange={(value) => setAssetForm({...assetForm, traffic_volume: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trafficVolumes.map(volume => (
                        <SelectItem key={volume} value={volume}>{volume}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Visibility Score (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={assetForm.visibility_score}
                    onChange={(e) => setAssetForm({...assetForm, visibility_score: parseInt(e.target.value) || 5})}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddAsset(false);
                  setEditingAsset(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAsset}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingAsset ? 'Update Asset' : 'Create Asset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerDashboard;