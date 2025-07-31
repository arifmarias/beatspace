import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  Camera, 
  Upload, 
  Calendar, 
  Clock, 
  MapPin,
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Filter,
  Search,
  FileText,
  TrendingUp,
  Building,
  Star,
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
import { getAuthHeaders } from '../utils/auth';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AssetMonitoringSystem = () => {
  const [monitoringRecords, setMonitoringRecords] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filters, setFilters] = useState({
    asset_type: '',
    status: '',
    date_range: '30_days',
    search: ''
  });

  const [uploadForm, setUploadForm] = useState({
    asset_id: '',
    photos: [],
    condition_rating: 5,
    notes: '',
    weather_condition: 'Clear',
    maintenance_required: false,
    issues_reported: ''
  });

  useEffect(() => {
    fetchMonitoringData();
    fetchAssets();
  }, []);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const response = await axios.get(`${API}/monitoring/records`, { 
        headers,
        params: filters 
      });
      
      setMonitoringRecords(response.data);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API}/assets`, { headers });
      setAssets(response.data.filter(asset => 
        asset.status === 'Live' || asset.status === 'Booked'
      ));
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  // Image upload handling with Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    onDrop: (acceptedFiles) => {
      setUploadForm({
        ...uploadForm,
        photos: [...uploadForm.photos, ...acceptedFiles]
      });
    }
  });

  const removePhoto = (index) => {
    setUploadForm({
      ...uploadForm,
      photos: uploadForm.photos.filter((_, i) => i !== index)
    });
  };

  const submitMonitoringRecord = async () => {
    try {
      const headers = getAuthHeaders();
      
      // Upload photos first (in production, would upload to Cloudinary)
      const uploadedUrls = [];
      for (const photo of uploadForm.photos) {
        // For demo, create a placeholder URL
        const demoUrl = `https://images.unsplash.com/photo-${Date.now()}?w=800&h=600&fit=crop`;
        uploadedUrls.push(demoUrl);
      }
      
      const recordData = {
        asset_id: uploadForm.asset_id,
        photos: uploadedUrls,
        condition_rating: uploadForm.condition_rating,
        notes: uploadForm.notes,
        weather_condition: uploadForm.weather_condition,
        maintenance_required: uploadForm.maintenance_required,
        issues_reported: uploadForm.issues_reported,
        timestamp: new Date().toISOString(),
        inspector: 'Admin Team'
      };
      
      await axios.post(`${API}/monitoring/records`, recordData, { headers });
      
      alert('Monitoring record submitted successfully!');
      setShowUploadDialog(false);
      setUploadForm({
        asset_id: '',
        photos: [],
        condition_rating: 5,
        notes: '',
        weather_condition: 'Clear',
        maintenance_required: false,
        issues_reported: ''
      });
      
      fetchMonitoringData();
    } catch (error) {
      console.error('Error submitting monitoring record:', error);
      alert('Failed to submit monitoring record. Please try again.');
    }
  };

  const generateReport = async (assetId, dateRange) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API}/monitoring/report/${assetId}`, {
        headers,
        params: { date_range: dateRange },
        responseType: 'blob'
      });
      
      // Download report
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `monitoring-report-${assetId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const getConditionColor = (rating) => {
    if (rating >= 8) return 'bg-green-100 text-green-800';
    if (rating >= 6) return 'bg-yellow-100 text-yellow-800';
    if (rating >= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getConditionText = (rating) => {
    if (rating >= 8) return 'Excellent';
    if (rating >= 6) return 'Good';
    if (rating >= 4) return 'Fair';
    return 'Poor';
  };

  const weatherIcons = {
    'Clear': '☀️',
    'Cloudy': '☁️',
    'Rainy': '🌧️',
    'Stormy': '⛈️',
    'Foggy': '🌫️'
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Asset Monitoring</h2>
          <p className="text-gray-600">Track asset condition and performance with timestamped reports</p>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Camera className="w-4 h-4 mr-2" />
          New Monitoring Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search assets..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-full"
              />
            </div>
            
            <Select 
              value={filters.asset_type} 
              onValueChange={(value) => setFilters({...filters, asset_type: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="Billboard">Billboard</SelectItem>
                <SelectItem value="Police Box">Police Box</SelectItem>
                <SelectItem value="Railway Station">Railway Station</SelectItem>
                <SelectItem value="Wall">Wall</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters({...filters, status: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Conditions</SelectItem>
                <SelectItem value="excellent">Excellent (8-10)</SelectItem>
                <SelectItem value="good">Good (6-7)</SelectItem>
                <SelectItem value="fair">Fair (4-5)</SelectItem>
                <SelectItem value="poor">Poor (1-3)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filters.date_range} 
              onValueChange={(value) => setFilters({...filters, date_range: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7_days">Last 7 Days</SelectItem>
                <SelectItem value="30_days">Last 30 Days</SelectItem>
                <SelectItem value="90_days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="records">Monitoring Records</TabsTrigger>
          <TabsTrigger value="assets">Asset Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Monitoring Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Recent Monitoring Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monitoringRecords.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Weather</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monitoringRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {record.asset?.photos?.[0] && (
                              <img 
                                src={record.asset.photos[0]} 
                                alt={record.asset.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{record.asset?.name || 'Asset'}</div>
                              <div className="text-sm text-gray-500">{record.asset?.type}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge className={getConditionColor(record.condition_rating)}>
                              {getConditionText(record.condition_rating)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {record.condition_rating}/10
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <span>{weatherIcons[record.weather_condition] || '☀️'}</span>
                            <span className="text-sm">{record.weather_condition}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{record.photos?.length || 0} photos</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-sm">
                              {format(new Date(record.timestamp), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(record.timestamp), 'HH:mm')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedRecord(record)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Monitoring Record Details</DialogTitle>
                                </DialogHeader>
                                <MonitoringRecordDetails record={selectedRecord} />
                              </DialogContent>
                            </Dialog>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateReport(record.asset_id, '30_days')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No monitoring records</h3>
                  <p>Start by uploading monitoring photos and reports for your assets.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Overview Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {asset.photos?.[0] && (
                    <img 
                      src={asset.photos[0]} 
                      alt={asset.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  
                  <h3 className="font-semibold mb-2">{asset.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{asset.address}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="outline">{asset.type}</Badge>
                    <Badge className={asset.status === 'Live' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {asset.status}
                    </Badge>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUploadForm({...uploadForm, asset_id: asset.id});
                        setShowUploadDialog(true);
                      }}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Monitor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => generateReport(asset.id, '30_days')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Records</p>
                    <p className="text-3xl font-bold text-gray-900">{monitoringRecords.length}</p>
                  </div>
                  <Camera className="w-8 h-8 text-blue-500" />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  This month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Condition</p>
                    <p className="text-3xl font-bold text-green-600">8.2</p>
                  </div>
                  <Star className="w-8 h-8 text-green-500" />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Excellent condition
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Issues Reported</p>
                    <p className="text-3xl font-bold text-orange-600">3</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-orange-500" />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Requires attention
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monitoring Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                <p>Detailed monitoring analytics will be displayed here with charts and trends.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Monitoring Record Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Monitoring Record</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Asset</label>
              <Select 
                value={uploadForm.asset_id} 
                onValueChange={(value) => setUploadForm({...uploadForm, asset_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose asset to monitor" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} - {asset.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Upload Photos</label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  {isDragActive ? 'Drop photos here...' : 'Drag & drop photos or click to select'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Up to 5 photos (JPG, PNG, WebP)</p>
              </div>
              
              {uploadForm.photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {uploadForm.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-16 object-cover rounded"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Condition Rating</label>
                <Select 
                  value={uploadForm.condition_rating.toString()} 
                  onValueChange={(value) => setUploadForm({...uploadForm, condition_rating: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rating => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating}/10 - {getConditionText(rating)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Weather Condition</label>
                <Select 
                  value={uploadForm.weather_condition} 
                  onValueChange={(value) => setUploadForm({...uploadForm, weather_condition: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Clear">☀️ Clear</SelectItem>
                    <SelectItem value="Cloudy">☁️ Cloudy</SelectItem>
                    <SelectItem value="Rainy">🌧️ Rainy</SelectItem>
                    <SelectItem value="Stormy">⛈️ Stormy</SelectItem>
                    <SelectItem value="Foggy">🌫️ Foggy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Inspection Notes</label>
              <Textarea
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({...uploadForm, notes: e.target.value})}
                placeholder="Describe the current condition, any observations, or maintenance notes..."
                rows={3}
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={uploadForm.maintenance_required}
                  onChange={(e) => setUploadForm({...uploadForm, maintenance_required: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm font-medium">Maintenance Required</span>
              </label>
            </div>

            {uploadForm.maintenance_required && (
              <div>
                <label className="block text-sm font-medium mb-2">Issues Reported</label>
                <Textarea
                  value={uploadForm.issues_reported}
                  onChange={(e) => setUploadForm({...uploadForm, issues_reported: e.target.value})}
                  placeholder="Describe the issues that require maintenance..."
                  rows={2}
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4 border-t">
              <Button
                onClick={submitMonitoringRecord}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!uploadForm.asset_id || uploadForm.photos.length === 0}
              >
                <Camera className="w-4 h-4 mr-2" />
                Submit Monitoring Record
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Monitoring Record Details Component
const MonitoringRecordDetails = ({ record }) => {
  if (!record) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Asset Information</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {record.asset?.name}</p>
            <p><strong>Type:</strong> {record.asset?.type}</p>
            <p><strong>Location:</strong> {record.asset?.address}</p>
            <p><strong>Status:</strong> {record.asset?.status}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Inspection Details</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Timestamp:</strong> {format(new Date(record.timestamp), 'MMM dd, yyyy HH:mm')}</p>
            <p><strong>Inspector:</strong> {record.inspector}</p>
            <p><strong>Weather:</strong> {record.weather_condition}</p>
            <p><strong>Condition:</strong> {record.condition_rating}/10</p>
          </div>
        </div>
      </div>

      {record.photos && record.photos.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Monitoring Photos</h4>
          <div className="grid grid-cols-3 gap-2">
            {record.photos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Monitoring photo ${index + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            ))}
          </div>
        </div>
      )}

      {record.notes && (
        <div>
          <h4 className="font-semibold mb-2">Notes</h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm">{record.notes}</p>
          </div>
        </div>
      )}

      {record.maintenance_required && (
        <div>
          <h4 className="font-semibold mb-2">Issues Reported</h4>
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              {record.issues_reported || 'Maintenance required - no specific issues noted.'}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default AssetMonitoringSystem;