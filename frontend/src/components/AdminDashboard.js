import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Building, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Pause,
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
  MoreVertical,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders, logout } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './ui/notification';
import OfferMediationPanel from './OfferMediationPanel';
import AssetMonitoringSystem from './AssetMonitoringSystem';
import AdvancedAnalytics from './AdvancedAnalytics';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showEditAsset, setShowEditAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [userFilter, setUserFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [offerRequests, setOfferRequests] = useState([]);
  const [selectedOfferRequest, setSelectedOfferRequest] = useState(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    offerId: '',
    quotedPrice: '',
    notes: '',
    validUntil: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [campaignCurrentPage, setCampaignCurrentPage] = useState(1);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [assetCurrentPage, setAssetCurrentPage] = useState(1);
  const [offerCurrentPage, setOfferCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Items per page for pagination
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [assetSearchTerm, setAssetSearchTerm] = useState('');

  // Bangladesh districts and divisions data
  const [bangladeshDistricts] = useState([
    'Bagerhat', 'Bandarban', 'Barguna', 'Barishal', 'Bhola', 'Bogura', 'Brahmanbaria',
    'Chandpur', 'Chattogram', 'Chuadanga', 'Comilla', 'Cox\'s Bazar', 'Cumilla',
    'Dhaka', 'Dinajpur', 'Faridpur', 'Feni', 'Gaibandha', 'Gazipur', 'Gopalganj',
    'Habiganj', 'Jamalpur', 'Jashore', 'Jhalokathi', 'Jhenaidah', 'Joypurhat',
    'Khagrachhari', 'Khulna', 'Kishoreganj', 'Kurigram', 'Kushtia', 'Lakshmipur',
    'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj', 'Meherpur', 'Moulvibazar',
    'Munshiganj', 'Mymensingh', 'Naogaon', 'Narail', 'Narayanganj', 'Narsingdi',
    'Natore', 'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh',
    'Patuakhali', 'Pirojpur', 'Rajbari', 'Rajshahi', 'Rangamati', 'Rangpur',
    'Satkhira', 'Shariatpur', 'Sherpur', 'Sirajganj', 'Sunamganj', 'Sylhet',
    'Tangail', 'Thakurgaon'
  ]);

  const [bangladeshDivisions] = useState([
    'Barishal', 'Chattogram', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet'
  ]);

  const [sellers, setSellers] = useState([]);

  // User form state
  const [userForm, setUserForm] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    role: 'buyer',
    status: 'pending' // Default status for new users
  });

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    description: '',
    buyer_id: '',
    budget: '',
    start_date: '',
    end_date: '',
    status: 'Draft', // Default status for new campaigns
    campaign_assets: [] // Array of {asset_id, asset_name, asset_start_date, asset_expiration_date}
  });

  // Available assets for campaign selection
  const [availableAssets, setAvailableAssets] = useState([]);

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
    status: 'Available', // Default status
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

      const allUsers = usersRes.data || [];
      setUsers(allUsers);
      setAssets(assetsRes.data);
      setCampaigns(campaignsRes.data);
      setStats(statsRes.data);

      // Filter sellers for the asset form dropdown
      const sellerUsers = allUsers.filter(user => user.role === 'seller');
      setSellers(sellerUsers);

      // Fetch available assets for campaign management
      const availableAssetsResponse = await axios.get(`${API}/assets/public`);
      const availableAssetsData = availableAssetsResponse.data.filter(asset => asset.status === 'Available');
      setAvailableAssets(availableAssetsData);

      // Fetch offer requests for admin mediation
      try {
        const offerRequestsResponse = await axios.get(`${API}/admin/offer-requests`, { headers });
        const offerRequestsData = offerRequestsResponse.data || [];
        
        // Fetch asset prices for each offer request
        const enrichedOfferRequests = await Promise.all(
          offerRequestsData.map(async (offer) => {
            try {
              const assetResponse = await axios.get(`${API}/assets/${offer.asset_id}`, { headers });
              return {
                ...offer,
                asset_price: assetResponse.data.pricing?.weekly_rate || 0
              };
            } catch (error) {
              console.error(`Error fetching asset price for ${offer.asset_id}:`, error);
              return {
                ...offer,
                asset_price: 0
              };
            }
          })
        );
        
        setOfferRequests(enrichedOfferRequests);
      } catch (error) {
        console.error('Error fetching offer requests:', error);
        // If admin endpoint doesn't exist, try the general offers endpoint
        try {
          const fallbackResponse = await axios.get(`${API}/offers/requests`, { headers });
          const fallbackData = fallbackResponse.data || [];
          
          // Fetch asset prices for fallback data too
          const enrichedFallbackRequests = await Promise.all(
            fallbackData.map(async (offer) => {
              try {
                const assetResponse = await axios.get(`${API}/assets/${offer.asset_id}`, { headers });
                return {
                  ...offer,
                  asset_price: assetResponse.data.pricing?.weekly_rate || 0
                };
              } catch (error) {
                console.error(`Error fetching asset price for ${offer.asset_id}:`, error);
                return {
                  ...offer,
                  asset_price: 0
                };
              }
            })
          );
          
          setOfferRequests(enrichedFallbackRequests);
        } catch (fallbackError) {
          console.error('Error fetching offer requests (fallback):', fallbackError);
          setOfferRequests([]);
        }
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtering and pagination logic
  const getFilteredOfferRequests = () => {
    if (!offerRequests) return [];
    
    return offerRequests.filter(offer => {
      const searchLower = searchTerm.toLowerCase();
      return (
        offer.asset_name?.toLowerCase().includes(searchLower) ||
        offer.buyer_name?.toLowerCase().includes(searchLower) ||
        offer.campaign_name?.toLowerCase().includes(searchLower) ||
        offer.status?.toLowerCase().includes(searchLower)
      );
    });
  };

  // Get pending offers grouped by buyer
  const getPendingOffersByBuyer = () => {
    const pendingOffers = getFilteredOfferRequests().filter(offer => offer.status === 'Pending');
    const buyerGroups = pendingOffers.reduce((groups, offer) => {
      const buyerKey = `${offer.buyer_name}-${offer.buyer_email}`;
      if (!groups[buyerKey]) {
        groups[buyerKey] = {
          buyer: { 
            name: offer.buyer_name, 
            email: offer.buyer_email 
          },
          offers: []
        };
      }
      groups[buyerKey].offers.push(offer);
      return groups;
    }, {});
    
    return Object.values(buyerGroups);
  };

  const getPaginatedOfferRequests = () => {
    const filtered = getFilteredOfferRequests();
    const startIndex = (offerCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredOfferRequests();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Campaign filtering and pagination
  const getFilteredCampaigns = () => {
    if (!campaigns) return [];
    
    return campaigns.filter(campaign => {
      const searchLower = campaignSearchTerm.toLowerCase();
      return (
        campaign.name?.toLowerCase().includes(searchLower) ||
        campaign.buyer_name?.toLowerCase().includes(searchLower) ||
        campaign.status?.toLowerCase().includes(searchLower)
      );
    });
  };

  const getPaginatedCampaigns = () => {
    const filtered = getFilteredCampaigns();
    const startIndex = (campaignCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getCampaignsTotalPages = () => {
    const filtered = getFilteredCampaigns();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // User filtering and pagination
  const getFilteredUsers = () => {
    if (!users) return [];
    
    let filtered = users.filter(user => {
      const searchLower = userSearchTerm.toLowerCase();
      return (
        user.company_name?.toLowerCase().includes(searchLower) ||
        user.contact_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.role?.toLowerCase().includes(searchLower) ||
        user.status?.toLowerCase().includes(searchLower)
      );
    });

    // Apply user filter (all, pending, approved, etc.)
    if (userFilter !== 'all') {
      filtered = filtered.filter(user => user.status === userFilter);
    }

    return filtered;
  };

  const getPaginatedUsers = () => {
    const filtered = getFilteredUsers();
    const startIndex = (userCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getUsersTotalPages = () => {
    const filtered = getFilteredUsers();
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Asset filtering and pagination
  const getFilteredAssets = () => {
    if (!assets) return [];
    
    let filtered = assets.filter(asset => {
      const searchLower = assetSearchTerm.toLowerCase();
      return (
        asset.name?.toLowerCase().includes(searchLower) ||
        asset.address?.toLowerCase().includes(searchLower) ||
        asset.type?.toLowerCase().includes(searchLower) ||
        asset.seller_name?.toLowerCase().includes(searchLower) ||
        asset.status?.toLowerCase().includes(searchLower)
      );
    });

    // Apply asset filter (all, Available, Booked, etc.)
    if (assetFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === assetFilter);
    }

    return filtered;
  };

  const getPaginatedAssets = () => {
    const filtered = getFilteredAssets();
    const startIndex = (assetCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getAssetsTotalPages = () => {
    const filtered = getFilteredAssets();
    return Math.ceil(filtered.length / itemsPerPage);
  };
  const updateOfferRequestStatus = async (offerId, newStatus) => {
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API}/admin/offer-requests/${offerId}/status`, {
        status: newStatus
      }, { headers });
      
      alert(`Offer request status updated to ${newStatus}`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating offer request status:', error);
      alert('Failed to update offer request status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteOfferRequest = async (offerRequest) => {
    const confirmMessage = `Are you sure you want to delete the offer request for "${offerRequest.asset_name}"?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/offers/requests/${offerRequest.id}`, { headers });
      alert(`Offer request for "${offerRequest.asset_name}" deleted successfully!`);
      
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error deleting offer request:', error);
      alert('Failed to delete offer request: ' + (error.response?.data?.detail || error.message));
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

  // User CRUD Functions
  const handleCreateUser = async () => {
    try {
      const headers = getAuthHeaders();
      
      const userData = {
        ...userForm,
        password: 'tempPassword123' // Default password for admin-created users
      };

      const response = await axios.post(`${API}/auth/register`, userData, { headers });
      alert('User created successfully!');
      
      setShowAddUser(false);
      resetUserForm();
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editUser = (user) => {
    setUserForm({
      company_name: user.company_name || '',
      contact_name: user.contact_name || '',
      email: user.email || '',
      phone: user.phone || '',
      website: user.website || '',
      address: user.address || '',
      role: user.role || 'buyer',
      status: user.status || 'pending'
    });
    
    setEditingUser(user);
    setShowEditUser(true);
  };

  const handleUpdateUser = async () => {
    try {
      if (!editingUser) {
        alert('Error: No user selected for editing');
        return;
      }

      const headers = getAuthHeaders();
      
      const updateData = {
        ...userForm
      };

      await axios.put(`${API}/admin/users/${editingUser.id}`, updateData, { headers });
      alert('User updated successfully!');
      
      setShowEditUser(false);
      setEditingUser(null);
      resetUserForm();
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteUser = async (user) => {
    const confirmMessage = `Are you sure you want to delete the user "${user.company_name}"?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/admin/users/${user.id}`, { headers });
      alert(`User "${user.company_name}" deleted successfully!`);
      
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetUserForm = () => {
    setUserForm({
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      role: 'buyer',
      status: 'pending'
    });
  };

  // Campaign CRUD Functions
  const handleCreateCampaign = async () => {
    try {
      const headers = getAuthHeaders();
      
      const campaignData = {
        ...campaignForm,
        budget: parseFloat(campaignForm.budget) || 0,
        start_date: campaignForm.start_date ? new Date(campaignForm.start_date).toISOString() : null,
        end_date: campaignForm.end_date ? new Date(campaignForm.end_date).toISOString() : null
      };

      const response = await axios.post(`${API}/admin/campaigns`, campaignData, { headers });
      alert('Campaign created successfully!');
      
      setShowAddCampaign(false);
      resetCampaignForm();
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  const editCampaign = (campaign) => {
    setCampaignForm({
      name: campaign.name || '',
      description: campaign.description || '',
      buyer_id: campaign.buyer_id || '',
      budget: campaign.budget?.toString() || '',
      start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : '',
      end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '',
      status: campaign.status || 'Draft',
      campaign_assets: campaign.campaign_assets || []
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
        ...campaignForm,
        budget: parseFloat(campaignForm.budget) || 0,
        start_date: campaignForm.start_date ? new Date(campaignForm.start_date).toISOString() : null,
        end_date: campaignForm.end_date ? new Date(campaignForm.end_date).toISOString() : null
      };

      await axios.put(`${API}/admin/campaigns/${editingCampaign.id}`, updateData, { headers });
      alert('Campaign updated successfully!');
      
      setShowEditCampaign(false);
      setEditingCampaign(null);
      resetCampaignForm();
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error updating campaign:', error);
      alert('Failed to update campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteCampaign = async (campaign) => {
    const confirmMessage = `Are you sure you want to delete the campaign "${campaign.name}"?\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/admin/campaigns/${campaign.id}`, { headers });
      alert(`Campaign "${campaign.name}" deleted successfully!`);
      
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      description: '',
      buyer_id: '',
      budget: '',
      start_date: '',
      end_date: '',
      status: 'Draft',
      campaign_assets: []
    });
  };

  // Campaign Asset Management Functions
  const addAssetToCampaign = () => {
    const newAsset = {
      asset_id: '',
      asset_name: '',
      asset_start_date: campaignForm.start_date || '',
      asset_expiration_date: campaignForm.end_date || ''
    };
    
    setCampaignForm(prev => ({
      ...prev,
      campaign_assets: [...prev.campaign_assets, newAsset]
    }));
  };

  const removeAssetFromCampaign = (index) => {
    setCampaignForm(prev => ({
      ...prev,
      campaign_assets: prev.campaign_assets.filter((_, i) => i !== index)
    }));
  };

  const updateCampaignAsset = (index, field, value) => {
    setCampaignForm(prev => ({
      ...prev,
      campaign_assets: prev.campaign_assets.map((asset, i) => 
        i === index ? { ...asset, [field]: value } : asset
      )
    }));
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
        traffic_volume: assetForm.traffic_volume || "Medium", // Keep as string, not parseInt
        visibility_score: parseInt(assetForm.visibility_score) || 5, // Keep as integer
        location: { lat: 23.8103, lng: 90.4125 }, // Default Dhaka coordinates
        pricing: {
          weekly_rate: parseFloat(assetForm.pricing.weekly_rate) || 0,
          monthly_rate: parseFloat(assetForm.pricing.monthly_rate) || 0,
          yearly_rate: parseFloat(assetForm.pricing.yearly_rate) || 0
        }
      };

      const response = await axios.post(`${API}/assets`, assetData, { headers });
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
      status: asset.status || 'Available', // Include current status
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
        traffic_volume: assetForm.traffic_volume || "Medium", // Keep as string, not parseInt
        visibility_score: parseInt(assetForm.visibility_score) || 5, // Keep as integer
        location: editingAsset.location || { lat: 23.8103, lng: 90.4125 }, // Use existing or default location
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

  // Image upload handler
  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Create FormData for multiple file upload
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      // Upload to Cloudinary via backend
      const response = await axios.post(`${API}/upload/images`, formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add uploaded image URLs to form
      const uploadedUrls = response.data.images.map(img => img.url);
      setAssetForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
      
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Remove image from upload
  const removeImage = async (index) => {
    try {
      const imageUrl = assetForm.photos[index];
      
      // Extract public_id from Cloudinary URL if it's a Cloudinary image
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        
        // Optional: Delete from Cloudinary (you can implement this endpoint if needed)
        // await axios.delete(`${API}/upload/image/${publicId}`, { headers: getAuthHeaders() });
      }
      
      // Remove from local state
      setAssetForm(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index)
      }));
    } catch (error) {
      console.error('Error removing image:', error);
      // Still remove from local state even if deletion fails
      setAssetForm(prev => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index)
      }));
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
      status: 'Available', // Default status
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

  const updateCampaignStatus = async (campaignId, newStatus) => {
    try {
      const headers = getAuthHeaders();
      await axios.patch(`${API}/admin/campaigns/${campaignId}/status`, 
        { status: newStatus }, 
        { headers }
      );
      
      notify.success(`Campaign status updated to ${newStatus} successfully!`);
      fetchDashboardData(); // Refresh dashboard data
      
    } catch (error) {
      console.error('Error updating campaign status:', error);
      notify.error('Failed to update campaign status: ' + (error.response?.data?.detail || error.message));
    }
  };

  const submitQuote = async () => {
    try {
      const headers = getAuthHeaders();
      const quoteData = {
        quoted_price: parseFloat(quoteForm.quotedPrice),
        admin_notes: quoteForm.notes,
        valid_until: quoteForm.validUntil ? quoteForm.validUntil.toISOString() : null
      };

      await axios.put(`${API}/admin/offers/${quoteForm.offerId}/quote`, quoteData, { headers });
      
      alert('Price quote submitted successfully!');
      
      // Reset form and close dialog
      setShowQuoteDialog(false);
      setQuoteForm({
        offerId: '',
        quotedPrice: '',
        notes: '',
        validUntil: null
      });
      
      // Refresh offer requests
      fetchDashboardData();
      
    } catch (error) {
      console.error('Error submitting quote:', error);
      alert('Failed to submit quote: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleQuoteOffer = (offer) => {
    setQuoteForm({
      offerId: offer.id,
      quotedPrice: '',
      notes: '',
      validUntil: null
    });
    setSelectedOfferRequest(offer);
    setShowQuoteDialog(true);
  };

  const adminAssetOperations = {
  };

  const filteredUsers = getFilteredUsers(); // Use the new pagination function
  const filteredAssets = getFilteredAssets(); // Use the new pagination function

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
                src="https://customer-assets.emergentagent.com/job_campaign-nexus-4/artifacts/tui73r6o_BeatSpace%20Icon%20Only.png" 
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
                    <Button 
                      onClick={() => setShowAddUser(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => {
                        setUserSearchTerm(e.target.value);
                        setUserCurrentPage(1); // Reset to first page when searching
                      }}
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
                {getFilteredUsers().length > 0 ? (
                  <div>
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
                        {getPaginatedUsers().map((user) => (
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div 
                                      className="flex items-center cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm w-full"
                                      onClick={() => setSelectedUser(user)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </div>
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
                              </DropdownMenuItem>
                              
                              {/* Quick Approve User Button */}
                              {user.status === 'pending' && (
                                <DropdownMenuItem 
                                  onClick={() => updateUserStatus(user.id, 'approved', 'User approved by admin')}
                                  className="flex items-center cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Approve User
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={() => editUser(user)}
                                className="flex items-center cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit User
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => deleteUser(user)}
                                className="flex items-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  
                  {/* Users Pagination Controls */}
                  {getUsersTotalPages() > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {((userCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(userCurrentPage * itemsPerPage, getFilteredUsers().length)} of {getFilteredUsers().length} users
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={userCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {userCurrentPage} of {getUsersTotalPages()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserCurrentPage(prev => Math.min(prev + 1, getUsersTotalPages()))}
                          disabled={userCurrentPage === getUsersTotalPages()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No users found matching your criteria.
                  </div>
                )}
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
                      value={assetSearchTerm}
                      onChange={(e) => {
                        setAssetSearchTerm(e.target.value);
                        setAssetCurrentPage(1); // Reset to first page when searching
                      }}
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
                {getFilteredAssets().length > 0 ? (
                  <div>
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
                        {getPaginatedAssets().map((asset) => (
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <div 
                                      className="flex items-center cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm w-full"
                                      onClick={() => setSelectedAsset(asset)}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Details
                                    </div>
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
                                            
                                            <div className="space-y-3">
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Location:</span>
                                                <span className="font-medium">{selectedAsset.district}, {selectedAsset.division}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Type:</span>
                                                <span className="font-medium">{selectedAsset.type}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Dimensions:</span>
                                                <span className="font-medium">{selectedAsset.dimensions}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Traffic Volume:</span>
                                                <span className="font-medium">{selectedAsset.traffic_volume?.toLocaleString()}/day</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Visibility Score:</span>
                                                <span className="font-medium">{selectedAsset.visibility_score}/10</span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <h4 className="font-semibold mb-3">Pricing Information</h4>
                                            <div className="space-y-3">
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Weekly Rate:</span>
                                                <span className="font-medium">৳{selectedAsset.pricing?.weekly_rate?.toLocaleString()}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Monthly Rate:</span>
                                                <span className="font-medium">৳{selectedAsset.pricing?.monthly_rate?.toLocaleString()}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span className="text-gray-500">Yearly Rate:</span>
                                                <span className="font-medium">৳{selectedAsset.pricing?.yearly_rate?.toLocaleString()}</span>
                                              </div>
                                            </div>
                                            
                                            <div className="mt-6">
                                              <h4 className="font-semibold mb-3">Status</h4>
                                              <Badge className={getStatusColor(selectedAsset.status)}>
                                                {selectedAsset.status}
                                              </Badge>
                                            </div>
                                            
                                            <div className="mt-6">
                                              <h4 className="font-semibold mb-3">Seller Information</h4>
                                              <p className="font-medium">{selectedAsset.seller_name}</p>
                                            </div>
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
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => editAsset(asset)}
                                className="cursor-pointer text-blue-600"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Asset
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem
                                onClick={() => deleteAsset(asset)}
                                className="cursor-pointer text-red-600"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Delete Asset
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Assets Pagination Controls */}
                {getAssetsTotalPages() > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {((assetCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(assetCurrentPage * itemsPerPage, getFilteredAssets().length)} of {getFilteredAssets().length} assets
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={assetCurrentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {assetCurrentPage} of {getAssetsTotalPages()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssetCurrentPage(prev => Math.min(prev + 1, getAssetsTotalPages()))}
                        disabled={assetCurrentPage === getAssetsTotalPages()}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {assetSearchTerm || assetFilter !== 'all' ? 
                    "No assets match your search criteria. Try adjusting your filters." : 
                    "No assets found. Create your first asset to get started."
                  }
                </div>
              )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Campaign Management</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => setShowAddCampaign(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Campaign
                    </Button>
                    <Input
                      placeholder="Search campaigns..."
                      value={campaignSearchTerm}
                      onChange={(e) => {
                        setCampaignSearchTerm(e.target.value);
                        setCampaignCurrentPage(1); // Reset to first page when searching
                      }}
                      className="w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {getFilteredCampaigns().length > 0 ? (
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Buyer</TableHead>
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
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              {campaign.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {campaign.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{campaign.buyer_name}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {campaign.budget ? `৳${campaign.budget.toLocaleString()}` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {campaign.campaign_assets?.length || 0} assets
                          </TableCell>
                          <TableCell>
                            {campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div 
                                        className="flex items-center cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm w-full"
                                        onClick={() => setSelectedCampaign(campaign)}
                                      >
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl">
                                      <DialogHeader>
                                        <DialogTitle>Campaign Details</DialogTitle>
                                      </DialogHeader>
                                      {selectedCampaign && (
                                        <div className="space-y-6">
                                          <div className="grid grid-cols-2 gap-6">
                                            <div>
                                              <h4 className="font-semibold mb-3">Campaign Information</h4>
                                              <div className="space-y-2 text-sm">
                                                <p><strong>Name:</strong> {selectedCampaign.name}</p>
                                                <p><strong>Description:</strong> {selectedCampaign.description || 'No description'}</p>
                                                <p><strong>Buyer:</strong> {selectedCampaign.buyer_name}</p>
                                                <p><strong>Budget:</strong> {selectedCampaign.budget ? `৳${selectedCampaign.budget.toLocaleString()}` : 'Not specified'}</p>
                                                <p><strong>Status:</strong> 
                                                  <Badge className={`ml-2 ${getStatusColor(selectedCampaign.status)}`}>
                                                    {selectedCampaign.status}
                                                  </Badge>
                                                </p>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-semibold mb-3">Timeline</h4>
                                              <div className="space-y-2 text-sm">
                                                <p><strong>Start Date:</strong> {selectedCampaign.start_date ? new Date(selectedCampaign.start_date).toLocaleDateString() : 'Not set'}</p>
                                                <p><strong>End Date:</strong> {selectedCampaign.end_date ? new Date(selectedCampaign.end_date).toLocaleDateString() : 'Not set'}</p>
                                                <p><strong>Created:</strong> {new Date(selectedCampaign.created_at).toLocaleString()}</p>
                                                {selectedCampaign.updated_at && (
                                                  <p><strong>Last Updated:</strong> {new Date(selectedCampaign.updated_at).toLocaleString()}</p>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          {selectedCampaign.campaign_assets && selectedCampaign.campaign_assets.length > 0 && (
                                            <div>
                                              <h4 className="font-semibold mb-3">Campaign Assets ({selectedCampaign.campaign_assets.length})</h4>
                                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                                {selectedCampaign.campaign_assets.map((asset, index) => (
                                                  <div key={index} className="border rounded-lg p-3 space-y-1">
                                                    <div className="flex justify-between items-start">
                                                      <span className="font-medium text-sm">{asset.asset_name || `Asset ${index + 1}`}</span>
                                                      <span className="text-xs text-gray-500">ID: {asset.asset_id}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                                                      <div>
                                                        <strong>Start:</strong> {asset.asset_start_date ? new Date(asset.asset_start_date).toLocaleDateString() : 'Not set'}
                                                      </div>
                                                      <div>
                                                        <strong>Expiry:</strong> {asset.asset_expiration_date ? new Date(asset.asset_expiration_date).toLocaleDateString() : 'Not set'}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {(!selectedCampaign.campaign_assets || selectedCampaign.campaign_assets.length === 0) && (
                                            <div>
                                              <h4 className="font-semibold mb-3">Campaign Assets</h4>
                                              <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                                                No assets assigned to this campaign
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                </DropdownMenuItem>
                                
                                {/* Quick Make Live Button */}
                                {campaign.status === 'Draft' && (
                                  <DropdownMenuItem 
                                    onClick={() => updateCampaignStatus(campaign.id, 'Live')}
                                    className="flex items-center cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Make Live
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem 
                                  onClick={() => editCampaign(campaign)}
                                  className="flex items-center cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Campaign
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => deleteCampaign(campaign)}
                                  className="flex items-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Delete Campaign
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {/* Campaigns Pagination Controls */}
                  {getCampaignsTotalPages() > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {((campaignCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(campaignCurrentPage * itemsPerPage, getFilteredCampaigns().length)} of {getFilteredCampaigns().length} campaigns
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={campaignCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {campaignCurrentPage} of {getCampaignsTotalPages()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(prev => Math.min(prev + 1, getCampaignsTotalPages()))}
                          disabled={campaignCurrentPage === getCampaignsTotalPages()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {campaignSearchTerm ? 
                      `No campaigns match "${campaignSearchTerm}". Try adjusting your search.` : 
                      "No campaigns found. Create your first campaign to get started."
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Offer Mediation Tab */}
          <TabsContent value="offers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Offer Mediation</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Search offer requests..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setOfferCurrentPage(1); // Reset to first page when searching
                      }}
                      className="w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {getFilteredOfferRequests().length > 0 ? (
                  <div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Asset</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Offered Price</TableHead>
                          <TableHead>Asset Price</TableHead>
                          <TableHead>Difference</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedOfferRequests().map((offer) => {
                        // Calculate price difference
                        const assetPrice = offer.asset_price || 0;
                        const offeredPrice = offer.estimated_budget || 0;
                        const difference = offeredPrice - assetPrice;
                        const percentageDiff = assetPrice > 0 ? ((difference / assetPrice) * 100).toFixed(1) : 0;
                        
                        return (
                          <TableRow key={offer.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{offer.asset_name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{offer.buyer_name}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{offer.campaign_name}</div>
                                <div className="text-sm text-gray-500 capitalize">{offer.campaign_type} campaign</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(offer.status)}`}>
                                {offer.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {offeredPrice ? `৳${offeredPrice.toLocaleString()}` : 'Not specified'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {assetPrice ? `৳${assetPrice.toLocaleString()}` : 'Not available'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {assetPrice > 0 && offeredPrice > 0 ? (
                                <div className="flex flex-col">
                                  <span className={`font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {difference >= 0 ? '+' : ''}৳{difference.toLocaleString()}
                                  </span>
                                  <span className={`text-xs ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({percentageDiff >= 0 ? '+' : ''}{percentageDiff}%)
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {offer.contract_duration || 'Not specified'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(offer.created_at).toLocaleDateString()}
                              </div>
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
                                    onClick={() => handleQuoteOffer(offer)}
                                    className="flex items-center cursor-pointer text-blue-600"
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Price Quotation
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem asChild>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <div 
                                          className="flex items-center cursor-pointer px-2 py-1.5 text-sm hover:bg-gray-100 rounded-sm w-full"
                                          onClick={() => setSelectedOfferRequest(offer)}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </div>
                                      </DialogTrigger>
                                      <DialogContent className="max-w-3xl">
                                        <DialogHeader>
                                          <DialogTitle>Offer Request Details</DialogTitle>
                                        </DialogHeader>
                                        {selectedOfferRequest && (
                                          <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                              <div>
                                                <h4 className="font-semibold mb-3">Request Information</h4>
                                                <div className="space-y-2 text-sm">
                                                  <p><strong>Asset:</strong> {selectedOfferRequest.asset_name}</p>
                                                  <p><strong>Buyer:</strong> {selectedOfferRequest.buyer_name}</p>
                                                  <p><strong>Campaign:</strong> {selectedOfferRequest.campaign_name}</p>
                                                  <p><strong>Campaign Type:</strong> <span className="capitalize">{selectedOfferRequest.campaign_type}</span></p>
                                                  <p><strong>Duration:</strong> {selectedOfferRequest.contract_duration || 'Not specified'}</p>
                                                  <p><strong>Status:</strong> 
                                                    <Badge className={`ml-2 ${getStatusColor(selectedOfferRequest.status)}`}>
                                                      {selectedOfferRequest.status}
                                                    </Badge>
                                                  </p>
                                                </div>
                                              </div>
                                              <div>
                                                <h4 className="font-semibold mb-3">Financial Details</h4>
                                                <div className="space-y-2 text-sm">
                                                  <p><strong>Offered Price:</strong> {selectedOfferRequest.estimated_budget ? `৳${selectedOfferRequest.estimated_budget.toLocaleString()}` : 'Not specified'}</p>
                                                  <p><strong>Asset Price:</strong> {selectedOfferRequest.asset_price ? `৳${selectedOfferRequest.asset_price.toLocaleString()}` : 'Not available'}</p>
                                                  {selectedOfferRequest.asset_price && selectedOfferRequest.estimated_budget && (
                                                    <p><strong>Difference:</strong> 
                                                      <span className={`ml-1 ${(selectedOfferRequest.estimated_budget - selectedOfferRequest.asset_price) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {(selectedOfferRequest.estimated_budget - selectedOfferRequest.asset_price) >= 0 ? '+' : ''}৳{(selectedOfferRequest.estimated_budget - selectedOfferRequest.asset_price).toLocaleString()}
                                                      </span>
                                                    </p>
                                                  )}
                                                  <p><strong>Submitted:</strong> {new Date(selectedOfferRequest.created_at).toLocaleString()}</p>
                                                </div>
                                              </div>
                                            </div>

                                            {selectedOfferRequest.special_requirements && (
                                              <div>
                                                <h4 className="font-semibold mb-2">Special Requirements</h4>
                                                <p className="text-sm bg-gray-50 p-3 rounded">{selectedOfferRequest.special_requirements}</p>
                                              </div>
                                            )}

                                            {selectedOfferRequest.notes && (
                                              <div>
                                                <h4 className="font-semibold mb-2">Additional Notes</h4>
                                                <p className="text-sm bg-gray-50 p-3 rounded">{selectedOfferRequest.notes}</p>
                                              </div>
                                            )}

                                            <div className="flex justify-between items-center pt-4 border-t">
                                              <div className="text-sm text-gray-600">
                                                <strong>Current Status:</strong> {selectedOfferRequest.status}
                                              </div>
                                              <div className="flex space-x-2">
                                                <Button
                                                  onClick={() => updateOfferRequestStatus(selectedOfferRequest.id, 'In Process')}
                                                  size="sm"
                                                  variant="outline"
                                                  disabled={selectedOfferRequest.status === 'In Process'}
                                                >
                                                  Mark In Process
                                                </Button>
                                                <Button
                                                  onClick={() => updateOfferRequestStatus(selectedOfferRequest.id, 'On Hold')}
                                                  size="sm"
                                                  variant="outline"
                                                  disabled={selectedOfferRequest.status === 'On Hold'}
                                                >
                                                  Put On Hold
                                                </Button>
                                                <Button
                                                  onClick={() => updateOfferRequestStatus(selectedOfferRequest.id, 'Approved')}
                                                  size="sm"
                                                  className="bg-green-600 hover:bg-green-700"
                                                  disabled={selectedOfferRequest.status === 'Approved'}
                                                >
                                                  Approve
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={() => updateOfferRequestStatus(offer.id, 'In Process')}
                                    className="flex items-center cursor-pointer"
                                    disabled={offer.status === 'In Process'}
                                  >
                                    <Clock className="h-4 w-4 mr-2" />
                                    Mark In Process
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={() => updateOfferRequestStatus(offer.id, 'On Hold')}
                                    className="flex items-center cursor-pointer text-yellow-600"
                                    disabled={offer.status === 'On Hold'}
                                  >
                                    <Pause className="h-4 w-4 mr-2" />
                                    Put On Hold
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={() => updateOfferRequestStatus(offer.id, 'Approved')}
                                    className="flex items-center cursor-pointer text-green-600"
                                    disabled={offer.status === 'Approved'}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    onClick={() => deleteOfferRequest(offer)}
                                    className="flex items-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Delete Request
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination Controls */}
                  {getTotalPages() > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {((offerCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(offerCurrentPage * itemsPerPage, getFilteredOfferRequests().length)} of {getFilteredOfferRequests().length} offer requests
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOfferCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={offerCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {offerCurrentPage} of {getTotalPages()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOfferCurrentPage(prev => Math.min(prev + 1, getTotalPages()))}
                          disabled={offerCurrentPage === getTotalPages()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No offer requests found.</p>
                    <p className="text-sm">
                      {searchTerm ? 
                        `No offer requests match "${searchTerm}". Try adjusting your search.` : 
                        "Offer requests from buyers will appear here for admin review."
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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

        {/* Add User Dialog */}
        <Dialog open={showAddUser} onOpenChange={(open) => {
          setShowAddUser(open);
          if (!open) resetUserForm();
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <Input
                  value={userForm.company_name}
                  onChange={(e) => setUserForm({...userForm, company_name: e.target.value})}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name *
                </label>
                <Input
                  value={userForm.contact_name}
                  onChange={(e) => setUserForm({...userForm, contact_name: e.target.value})}
                  placeholder="Enter contact name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  value={userForm.website}
                  onChange={(e) => setUserForm({...userForm, website: e.target.value})}
                  placeholder="Enter website URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Textarea
                  value={userForm.address}
                  onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                  placeholder="Enter company address"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({...userForm, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Input
                  value={userForm.status}
                  disabled
                  className="bg-gray-50 text-gray-600"
                  placeholder="Pending (Default)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  New users are created with "Pending" status by default
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateUser}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!userForm.company_name || !userForm.contact_name || !userForm.email}
              >
                Create User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUser} onOpenChange={(open) => {
          setShowEditUser(open);
          if (!open) {
            setEditingUser(null);
            resetUserForm();
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <Input
                  value={userForm.company_name}
                  onChange={(e) => setUserForm({...userForm, company_name: e.target.value})}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name *
                </label>
                <Input
                  value={userForm.contact_name}
                  onChange={(e) => setUserForm({...userForm, contact_name: e.target.value})}
                  placeholder="Enter contact name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <Input
                  value={userForm.website}
                  onChange={(e) => setUserForm({...userForm, website: e.target.value})}
                  placeholder="Enter website URL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Textarea
                  value={userForm.address}
                  onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                  placeholder="Enter company address"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({...userForm, role: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buyer">Buyer</SelectItem>
                    <SelectItem value="seller">Seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <Select 
                  value={userForm.status} 
                  onValueChange={(value) => setUserForm({...userForm, status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Update user status based on review and approval
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditUser(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateUser}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!userForm.company_name || !userForm.contact_name || !userForm.email}
              >
                Update User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Campaign Dialog */}
        <Dialog open={showAddCampaign} onOpenChange={(open) => {
          setShowAddCampaign(open);
          if (!open) resetCampaignForm();
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Campaign</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
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
                    placeholder="Enter campaign description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer *
                  </label>
                  <Select 
                    value={campaignForm.buyer_id} 
                    onValueChange={(value) => setCampaignForm({...campaignForm, buyer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users || []).filter(user => user.role === 'buyer').map(buyer => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.company_name} ({buyer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget (৳)
                  </label>
                  <Input
                    type="number"
                    value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                    placeholder="Enter budget amount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      value={campaignForm.start_date}
                      onChange={(e) => setCampaignForm({...campaignForm, start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <Input
                      type="date"
                      value={campaignForm.end_date}
                      onChange={(e) => setCampaignForm({...campaignForm, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Input
                    value={campaignForm.status}
                    disabled
                    className="bg-gray-50 text-gray-600"
                    placeholder="Draft (Default)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    New campaigns are created with "Draft" status by default
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Campaign Assets
                    </label>
                    <Button 
                      type="button"
                      onClick={addAssetToCampaign}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Asset
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {campaignForm.campaign_assets.map((asset, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">Asset {index + 1}</span>
                          <Button
                            type="button"
                            onClick={() => removeAssetFromCampaign(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Asset *
                          </label>
                          <Select 
                            value={asset.asset_id} 
                            onValueChange={(value) => {
                              const selectedAsset = availableAssets.find(a => a.id === value);
                              updateCampaignAsset(index, 'asset_id', value);
                              updateCampaignAsset(index, 'asset_name', selectedAsset?.name || '');
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select available asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAssets.map(availableAsset => (
                                <SelectItem key={availableAsset.id} value={availableAsset.id}>
                                  {availableAsset.name} - {availableAsset.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Asset Start Date *
                            </label>
                            <Input
                              type="date"
                              value={asset.asset_start_date}
                              onChange={(e) => updateCampaignAsset(index, 'asset_start_date', e.target.value)}
                              className="h-8 text-xs"
                              min={campaignForm.start_date}
                              max={campaignForm.end_date}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Asset Expiry Date *
                            </label>
                            <Input
                              type="date"
                              value={asset.asset_expiration_date}
                              onChange={(e) => updateCampaignAsset(index, 'asset_expiration_date', e.target.value)}
                              className="h-8 text-xs"
                              min={asset.asset_start_date || campaignForm.start_date}
                              max={campaignForm.end_date}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {campaignForm.campaign_assets.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                        No assets added yet. Click "Add Asset" to get started.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCampaign}
                className="bg-green-600 hover:bg-green-700"
                disabled={!campaignForm.name || !campaignForm.buyer_id || !campaignForm.start_date || !campaignForm.end_date}
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditCampaign} onOpenChange={(open) => {
          setShowEditCampaign(open);
          if (!open) {
            setEditingCampaign(null);
            resetCampaignForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-6">
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
                    placeholder="Enter campaign description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer *
                  </label>
                  <Select 
                    value={campaignForm.buyer_id} 
                    onValueChange={(value) => setCampaignForm({...campaignForm, buyer_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                    <SelectContent>
                      {(users || []).filter(user => user.role === 'buyer').map(buyer => (
                        <SelectItem key={buyer.id} value={buyer.id}>
                          {buyer.company_name} ({buyer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Budget (৳)
                  </label>
                  <Input
                    type="number"
                    value={campaignForm.budget}
                    onChange={(e) => setCampaignForm({...campaignForm, budget: e.target.value})}
                    placeholder="Enter budget amount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <Input
                      type="date"
                      value={campaignForm.start_date}
                      onChange={(e) => setCampaignForm({...campaignForm, start_date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <Input
                      type="date"
                      value={campaignForm.end_date}
                      onChange={(e) => setCampaignForm({...campaignForm, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <Select 
                    value={campaignForm.status} 
                    onValueChange={(value) => setCampaignForm({...campaignForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Negotiation">Negotiation</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Live">Live</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Update campaign status based on current stage
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Campaign Assets
                    </label>
                    <Button 
                      type="button"
                      onClick={addAssetToCampaign}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Asset
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {campaignForm.campaign_assets.map((asset, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">Asset {index + 1}</span>
                          <Button
                            type="button"
                            onClick={() => removeAssetFromCampaign(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Asset *
                          </label>
                          <Select 
                            value={asset.asset_id} 
                            onValueChange={(value) => {
                              const selectedAsset = availableAssets.find(a => a.id === value);
                              updateCampaignAsset(index, 'asset_id', value);
                              updateCampaignAsset(index, 'asset_name', selectedAsset?.name || '');
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select available asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAssets.map(availableAsset => (
                                <SelectItem key={availableAsset.id} value={availableAsset.id}>
                                  {availableAsset.name} - {availableAsset.address}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Asset Start Date *
                            </label>
                            <Input
                              type="date"
                              value={asset.asset_start_date}
                              onChange={(e) => updateCampaignAsset(index, 'asset_start_date', e.target.value)}
                              className="h-8 text-xs"
                              min={campaignForm.start_date}
                              max={campaignForm.end_date}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Asset Expiry Date *
                            </label>
                            <Input
                              type="date"
                              value={asset.asset_expiration_date}
                              onChange={(e) => updateCampaignAsset(index, 'asset_expiration_date', e.target.value)}
                              className="h-8 text-xs"
                              min={asset.asset_start_date || campaignForm.start_date}
                              max={campaignForm.end_date}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {campaignForm.campaign_assets.length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                        No assets added yet. Click "Add Asset" to get started.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCampaign}
                className="bg-green-600 hover:bg-green-700"
                disabled={!campaignForm.name || !campaignForm.buyer_id || !campaignForm.start_date || !campaignForm.end_date}
              >
                Update Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                    <Select 
                      value={assetForm.district} 
                      onValueChange={(value) => setAssetForm({...assetForm, district: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {bangladeshDistricts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Select 
                      value={assetForm.division} 
                      onValueChange={(value) => setAssetForm({...assetForm, division: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {bangladeshDivisions.map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    Status
                  </label>
                  <Input
                    value={assetForm.status}
                    disabled
                    className="bg-gray-50 text-gray-600"
                    placeholder="Available (Default)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    New assets are created with "Available" status by default
                  </p>
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
                    Seller *
                  </label>
                  <Select 
                    value={assetForm.seller_id} 
                    onValueChange={(value) => {
                      const selectedSeller = sellers.find(seller => seller.id === value);
                      setAssetForm({
                        ...assetForm, 
                        seller_id: value,
                        seller_name: selectedSeller ? selectedSeller.company_name || selectedSeller.name : ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select seller" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{seller.company_name || seller.name}</span>
                            <span className="text-xs text-gray-500">{seller.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sellers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No sellers found. Please ensure there are users with 'seller' role.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Images
                  </label>
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    <p className="text-xs text-gray-500">
                      Upload multiple images. First image will be used as main display image.
                    </p>
                    
                    {/* Image Preview Section */}
                    {assetForm.photos.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                          Uploaded Images ({assetForm.photos.length}):
                        </label>
                        
                        {/* Single image or first image display */}
                        {assetForm.photos.length === 1 ? (
                          <div className="relative">
                            <img 
                              src={assetForm.photos[0]} 
                              alt="Asset preview"
                              className="w-full h-32 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(0)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              Main Image
                            </div>
                          </div>
                        ) : (
                          /* Multiple images carousel */
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {assetForm.photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                  <img 
                                    src={photo} 
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border hover:opacity-75 transition-opacity"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                  {index === 0 && (
                                    <div className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-1 rounded-tr">
                                      Main
                                    </div>
                                  )}
                                  <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-bl">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600">
                              Hover over images to remove. First image is used as main display.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                disabled={!assetForm.name || !assetForm.address || !assetForm.district || !assetForm.division || !assetForm.pricing.weekly_rate || !assetForm.seller_id}
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
                    <Select 
                      value={assetForm.district} 
                      onValueChange={(value) => setAssetForm({...assetForm, district: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {bangladeshDistricts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Select 
                      value={assetForm.division} 
                      onValueChange={(value) => setAssetForm({...assetForm, division: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {bangladeshDivisions.map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    Status *
                  </label>
                  <Select 
                    value={assetForm.status} 
                    onValueChange={(value) => setAssetForm({...assetForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Pending Offer">Pending Offer</SelectItem>
                      <SelectItem value="Negotiating">Negotiating</SelectItem>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Work in Progress">Work in Progress</SelectItem>
                      <SelectItem value="Live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Update asset status based on current workflow stage
                  </p>
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
                    Seller *
                  </label>
                  <Select 
                    value={assetForm.seller_id} 
                    onValueChange={(value) => {
                      const selectedSeller = sellers.find(seller => seller.id === value);
                      setAssetForm({
                        ...assetForm, 
                        seller_id: value,
                        seller_name: selectedSeller ? selectedSeller.company_name || selectedSeller.name : ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select seller" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{seller.company_name || seller.name}</span>
                            <span className="text-xs text-gray-500">{seller.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sellers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No sellers found. Please ensure there are users with 'seller' role.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset Images
                  </label>
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                    <p className="text-xs text-gray-500">
                      Upload multiple images. First image will be used as main display image.
                    </p>
                    
                    {/* Image Preview Section */}
                    {assetForm.photos.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">
                          Uploaded Images ({assetForm.photos.length}):
                        </label>
                        
                        {/* Single image or first image display */}
                        {assetForm.photos.length === 1 ? (
                          <div className="relative">
                            <img 
                              src={assetForm.photos[0]} 
                              alt="Asset preview"
                              className="w-full h-32 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(0)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                            >
                              ×
                            </button>
                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              Main Image
                            </div>
                          </div>
                        ) : (
                          /* Multiple images carousel */
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                              {assetForm.photos.map((photo, index) => (
                                <div key={index} className="relative group">
                                  <img 
                                    src={photo} 
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-20 object-cover rounded border hover:opacity-75 transition-opacity"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ×
                                  </button>
                                  {index === 0 && (
                                    <div className="absolute bottom-0 left-0 bg-green-500 text-white text-xs px-1 rounded-tr">
                                      Main
                                    </div>
                                  )}
                                  <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-bl">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-600">
                              Hover over images to remove. First image is used as main display.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
                disabled={!assetForm.name || !assetForm.address || !assetForm.district || !assetForm.division || !assetForm.pricing.weekly_rate || !assetForm.seller_id}
              >
                Update Asset
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Price Quotation Dialog */}
        <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Provide Price Quotation</span>
              </DialogTitle>
            </DialogHeader>
            
            {selectedOfferRequest && (
              <div className="space-y-6">
                {/* Offer Request Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Request Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Asset:</span>
                      <p className="text-gray-900">{selectedOfferRequest.asset_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Buyer:</span>
                      <p className="text-gray-900">{selectedOfferRequest.buyer_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Campaign:</span>
                      <p className="text-gray-900">{selectedOfferRequest.campaign_name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Duration:</span>
                      <p className="text-gray-900">{selectedOfferRequest.contract_duration?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {/* Quote Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quoted Price (৳) *
                    </label>
                    <Input
                      type="number"
                      value={quoteForm.quotedPrice}
                      onChange={(e) => setQuoteForm({...quoteForm, quotedPrice: e.target.value})}
                      placeholder="Enter your price quote"
                      className="border-2 border-blue-200 focus:border-blue-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be the final price offered to the buyer
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <Textarea
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({...quoteForm, notes: e.target.value})}
                      placeholder="Add any notes or terms for this quote..."
                      rows={3}
                      className="border-2 border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quote Valid Until
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal border-2 border-blue-200"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {quoteForm.validUntil ? quoteForm.validUntil.toLocaleDateString() : "Select expiry date (optional)"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={quoteForm.validUntil}
                          onSelect={(date) => setQuoteForm({...quoteForm, validUntil: date})}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Set when this quote expires unclaimed
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowQuoteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={submitQuote}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!quoteForm.quotedPrice}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Submit Quote
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;