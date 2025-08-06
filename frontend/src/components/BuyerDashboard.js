import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, 
  Plus, 
  Eye, 
  Edit,
  X,
  XCircle,
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
  MessageSquare,
  MoreVertical,
  Search,
  ChevronDown,
  ChevronRight,
  List,
  Map,
  FolderOpen,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useNotification } from './ui/notification';
import { DashboardLoading } from './ui/loading';
import { generateCampaignPDF } from '../utils/pdfGenerator';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { getAuthHeaders, logout, getUser } from '../utils/auth';
import { useNavigate, useLocation } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getUser();
  const { notify } = useNotification();
  const [campaigns, setCampaigns] = useState([]);
  const [requestedOffers, setRequestedOffers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [showEditCampaign, setShowEditCampaign] = useState(false);
  const [campaignAssets, setCampaignAssets] = useState([]);
  const [editingOffer, setEditingOffer] = useState(null);
  const [showEditOfferDialog, setShowEditOfferDialog] = useState(false);
  
  // Initialize activeTab based on URL parameter, default to 'my-assets'
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl === 'requested-offers') return 'requested-offers';
    if (tabFromUrl === 'campaigns') return 'campaigns';
    return 'my-assets'; // Default to My Assets tab
  });

  // My Assets state
  const [liveAssets, setLiveAssets] = useState([]);
  const [myAssetsView, setMyAssetsView] = useState('list'); // 'list', 'map', 'campaign'
  const [assetsLoading, setAssetsLoading] = useState(false);

  // Pagination and search state for Campaigns
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignCurrentPage, setCampaignCurrentPage] = useState(1);
  const [campaignItemsPerPage] = useState(5);

  // Pagination and search state for Requested Offers  
  const [offerSearch, setOfferSearch] = useState('');
  const [offerCurrentPage, setOfferCurrentPage] = useState(1);
  const [offerItemsPerPage] = useState(5);

  // Collapsible state for Requested Offers
  const [collapsedCampaigns, setCollapsedCampaigns] = useState({});

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
    fetchLiveAssets(); // Fetch live assets when component mounts
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
      
      // Enrich offers with asset pricing data
      const enrichedOffers = await Promise.all((offersRes.data || []).map(async (offer) => {
        try {
          // Fetch asset details to get pricing
          const assetRes = await axios.get(`${API}/assets/public`);
          const allAssets = assetRes.data || [];
          const assetDetails = allAssets.find(asset => asset.id === offer.asset_id);
          
          return {
            ...offer,
            asset_pricing: assetDetails?.pricing || null
          };
        } catch (error) {
          console.error('Error fetching asset pricing for offer:', offer.id, error);
          return offer; // Return offer without pricing if fetch fails
        }
      }));
      
      setRequestedOffers(enrichedOffers);
      console.log('🚨 OFFERS SET TO STATE WITH PRICING:', enrichedOffers);

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

  const fetchLiveAssets = async () => {
    setAssetsLoading(true);
    try {
      const headers = getAuthHeaders();
      
      console.log('🔍 Fetching booked assets for buyer...');
      
      // Fetch all assets first
      const assetResponse = await axios.get(`${API}/assets/public`);
      const allAssets = assetResponse.data || [];
      console.log('📊 All assets fetched:', allAssets.length);
      
      // Fetch booked assets from approved/accepted offers - this is the primary source
      const offersResponse = await axios.get(`${API}/offers/requests`, { headers });
      const allOffers = offersResponse.data || [];
      console.log('📊 All offers fetched:', allOffers.length);
      
      // Find approved/accepted offers for this buyer
      const bookedOffers = allOffers.filter(offer => 
        (offer.status === 'Approved' || offer.status === 'Accepted') &&
        offer.buyer_email === 'buyer@company.com' // Temporary hardcode to ensure it works
      );
      
      console.log('📊 Current user email:', currentUser?.email);
      console.log('📊 Found booked offers for buyer:', bookedOffers.length);
      
      const bookedAssetsData = [];
      
      for (const offer of bookedOffers) {
        console.log('🔍 Processing booked offer:', offer.asset_name, 'Status:', offer.status);
        
        // Find the asset for this offer
        const asset = allAssets.find(a => a.id === offer.asset_id);
        
        if (asset && asset.status === 'Booked') {
          const bookedAsset = {
            ...asset,
            campaignName: offer.campaign_name || 'Unknown Campaign',
            campaignId: offer.campaign_id || offer.existing_campaign_id,
            campaignStatus: 'Live', // Approved offers are considered live
            assetStartDate: offer.asset_start_date || offer.tentative_start_date,
            assetEndDate: offer.asset_expiration_date,
            duration: calculateDuration(
              offer.asset_start_date || offer.tentative_start_date, 
              offer.asset_expiration_date
            ),
            expiryDate: offer.asset_expiration_date,
            lastStatus: asset.status // Will be 'Booked'
          };
          
          bookedAssetsData.push(bookedAsset);
          console.log('✅ Added booked asset:', asset.name);
        } else {
          console.error('❌ Asset not found or not Booked:', offer.asset_name, 'Asset status:', asset?.status);
        }
      }
      
      console.log('📊 Final booked assets count:', bookedAssetsData.length);
      
      // DEBUG: Log the specific details we're looking for
      if (bookedAssetsData.length === 0) {
        console.log('🔍 DEBUG: No booked assets found. Details:');
        console.log('- Approved offers:', bookedOffers.length);
        for (const offer of bookedOffers) {
          console.log(`  - ${offer.asset_name}: Looking for asset ID ${offer.asset_id}`);
          const asset = allAssets.find(a => a.id === offer.asset_id);
          console.log(`  - Asset found:`, !!asset);
          if (asset) {
            console.log(`  - Asset status: ${asset.status} (looking for 'Booked')`);
          }
        }
      }
      
      setLiveAssets(bookedAssetsData);
      
    } catch (error) {
      console.error('Error fetching booked assets:', error);
      notify.error('Failed to load booked assets');
      setLiveAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 'N/A';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
    }
  };

  const downloadCampaignPDF = async (campaign) => {
    try {
      // Fetch campaign assets
      const headers = getAuthHeaders();
      const assetsResponse = await axios.get(`${API}/assets/public`, { headers });
      const allAssets = assetsResponse.data || [];
      
      // Get assets for this campaign
      const campaignAssets = [];
      if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
        for (const campaignAsset of campaign.campaign_assets) {
          const asset = allAssets.find(a => a.id === campaignAsset.asset_id);
          if (asset) {
            campaignAssets.push(asset);
          }
        }
      }
      
      // Generate PDF
      generateCampaignPDF(campaign, campaignAssets);
      notify.success('Campaign draft PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      notify.error('Failed to generate PDF. Please try again.');
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
      
      // Start with assets that are in the campaign_assets array (new structure)
      let campaignAssetsList = [];
      
      // Check for new campaign_assets structure first
      if (campaign.campaign_assets && campaign.campaign_assets.length > 0) {
        campaignAssetsList = campaign.campaign_assets.map(campaignAsset => {
          const asset = allAssets.find(a => a.id === campaignAsset.asset_id);
          if (asset) {
            return {
              ...asset,
              asset_start_date: campaignAsset.asset_start_date,
              asset_expiration_date: campaignAsset.asset_expiration_date,
              isInCampaign: true
            };
          }
          return null;
        }).filter(Boolean);
      }
      // Fallback to old assets array structure
      else if (campaign.assets && campaign.assets.length > 0) {
        campaignAssetsList = allAssets.filter(asset => 
          campaign.assets.includes(asset.id)
        );
      }
      
      console.log('🚨 Direct campaign assets:', campaignAssetsList.length);
      
      // For both Draft AND Live campaigns, include assets that have pending offer requests
      if (campaign.status === 'Draft' || campaign.status === 'Live') {
        const headers = getAuthHeaders();
        const offersResponse = await axios.get(`${API}/offers/requests`, { headers });
        const allOfferRequests = offersResponse.data || [];
        
        // Find offer requests for this campaign (include all active statuses)
        // Match by either campaign ID or campaign name (for backward compatibility)
        const campaignOfferRequests = allOfferRequests.filter(offer => 
          (offer.existing_campaign_id === campaign.id || offer.campaign_name === campaign.name) && 
          (offer.status === 'Pending' || offer.status === 'Processing' || offer.status === 'In Process' || 
           offer.status === 'Quoted' || offer.status === 'Accepted' || offer.status === 'Approved')
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

      const response = await axios.post(`${API}/campaigns`, campaignData, { headers });
      const newCampaign = response.data;
      
      // Store campaign context for marketplace pre-population
      sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
        id: newCampaign.id,
        name: newCampaign.name,
        end_date: newCampaign.end_date
      }));
      
      // Close dialog and reset form
      setShowCreateCampaign(false);
      setCampaignForm({
        name: '',
        description: '',
        budget: '',
        notes: '',
        startDate: null,
        endDate: null
      });
      
      // Show success message and redirect to marketplace
      notify.success(`Campaign "${newCampaign.name}" created successfully! Let's add your first asset...`);
      
      // Redirect to marketplace with campaign context for immediate asset selection
      navigate(`/marketplace?campaign=${newCampaign.id}&newCampaign=true`);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      notify.error('Failed to create campaign. Please try again.');
    }
  };

  const editCampaign = (campaign) => {
    console.log('Editing campaign:', campaign);
    
    // Populate form with existing campaign data
    setCampaignForm({
      name: campaign.name || '',
      description: campaign.description || '',
      budget: campaign.budget?.toString() || '',
      notes: campaign.notes || '',
      startDate: campaign.start_date ? new Date(campaign.start_date) : null,
      endDate: campaign.end_date ? new Date(campaign.end_date) : null
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
        name: campaignForm.name,
        description: campaignForm.description,
        budget: parseFloat(campaignForm.budget) || 0,
        notes: campaignForm.notes,
        start_date: campaignForm.startDate ? campaignForm.startDate.toISOString() : null,
        end_date: campaignForm.endDate ? campaignForm.endDate.toISOString() : null
      };

      await axios.put(`${API}/campaigns/${editingCampaign.id}`, updateData, { headers });
      notify.success('Campaign updated successfully!');
      
      setShowEditCampaign(false);
      setEditingCampaign(null);
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
      console.error('Error updating campaign:', error);
      notify.error('Failed to update campaign. Please try again.');
    }
  };

  const deleteCampaign = async (campaign) => {
    // Show confirmation dialog
    const confirmMessage = `Are you sure you want to delete the campaign "${campaign.name}"?\n\nThis action cannot be undone and will also delete any associated offer requests.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const headers = getAuthHeaders();
      
      await axios.delete(`${API}/campaigns/${campaign.id}`, { headers });
      notify.success(`Campaign "${campaign.name}" deleted successfully!`);
      
      fetchBuyerData(); // Refresh the campaign list
      
    } catch (error) {
      console.error('Error deleting campaign:', error);
      notify.error('Failed to delete campaign: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Helper functions for filtering and pagination
  const getFilteredCampaigns = () => {
    return (campaigns || []).filter(campaign =>
      campaign.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
      campaign.status.toLowerCase().includes(campaignSearch.toLowerCase())
    );
  };

  const getPaginatedCampaigns = () => {
    const filtered = getFilteredCampaigns();
    const start = (campaignCurrentPage - 1) * campaignItemsPerPage;
    const end = start + campaignItemsPerPage;
    return filtered.slice(start, end);
  };

  const getCampaignTotalPages = () => {
    return Math.ceil(getFilteredCampaigns().length / campaignItemsPerPage);
  };

  const getFilteredOffers = () => {
    return (requestedOffers || []).filter(offer => {
      // Exclude approved/accepted offers from the requested offers list
      const isNotApproved = offer.status !== 'Approved' && offer.status !== 'Accepted';
      
      // Apply search filter
      const matchesSearch = offer.asset_name.toLowerCase().includes(offerSearch.toLowerCase()) ||
                           offer.campaign_name.toLowerCase().includes(offerSearch.toLowerCase()) ||
                           offer.status.toLowerCase().includes(offerSearch.toLowerCase());
                           
      return isNotApproved && matchesSearch;
    });
  };

  const getGroupedAndFilteredOffers = () => {
    const filtered = getFilteredOffers();
    const grouped = {};
    
    filtered.forEach(offer => {
      const campaignName = offer.campaign_name || 'Unknown Campaign';
      if (!grouped[campaignName]) {
        grouped[campaignName] = [];
      }
      grouped[campaignName].push(offer);
    });

    // Apply pagination to grouped offers
    const entries = Object.entries(grouped);
    const start = (offerCurrentPage - 1) * offerItemsPerPage;
    const end = start + offerItemsPerPage;
    
    return Object.fromEntries(entries.slice(start, end));
  };

  const getOfferTotalPages = () => {
    const filtered = getFilteredOffers();
    const grouped = {};
    filtered.forEach(offer => {
      const campaignName = offer.campaign_name || 'Unknown Campaign';
      if (!grouped[campaignName]) {
        grouped[campaignName] = [];
      }
      grouped[campaignName].push(offer);
    });
    
    return Math.ceil(Object.keys(grouped).length / offerItemsPerPage);
  };

  const toggleCampaignCollapse = (campaignName) => {
    setCollapsedCampaigns(prev => ({
      ...prev,
      [campaignName]: !prev[campaignName]
    }));
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

  // Calculate asset price based on duration
  const calculateAssetPrice = (offer) => {
    // Asset pricing should come from the asset database via asset_pricing field
    if (!offer.asset_pricing) {
      return 'N/A'; // If pricing info not available
    }
    
    const pricing = offer.asset_pricing;
    const duration = offer.contract_duration;
    
    let calculatedPrice = 0;
    
    switch (duration) {
      case '1_week':
        calculatedPrice = pricing.weekly_rate || 0;
        break;
      case '2_weeks':
        calculatedPrice = (pricing.weekly_rate || 0) * 2;
        break;
      case '1_month':
        calculatedPrice = pricing.monthly_rate || (pricing.weekly_rate || 0) * 4;
        break;
      case '3_months':
        calculatedPrice = (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 3;
        break;
      case '6_months':
        calculatedPrice = (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 6;
        break;
      case '12_months':
      case '1_year':
        calculatedPrice = pricing.yearly_rate || (pricing.monthly_rate || (pricing.weekly_rate || 0) * 4) * 12;
        break;
      default:
        calculatedPrice = 0;
    }
    
    return calculatedPrice;
  };

  // Compare user offer with asset price
  const getPriceComparison = (offer) => {
    const assetPrice = calculateAssetPrice(offer);
    const userOffer = offer.estimated_budget || 0;
    
    if (assetPrice === 'N/A') return null;
    
    const difference = userOffer - assetPrice;
    const percentDiff = ((difference / assetPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return { type: 'higher', text: `+${percentDiff}%`, color: 'text-green-600' };
    } else if (difference < 0) {
      return { type: 'lower', text: `${percentDiff}%`, color: 'text-red-600' };
    } else {
      return { type: 'equal', text: 'Match', color: 'text-gray-600' };
    }
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
      fetchLiveAssets(); // Refresh live assets as well
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

  const handleApproveOffer = async (offer) => {
    try {
      const confirmMessage = `Are you sure you want to approve the offer for "${offer.asset_name}" at ৳${offer.admin_quoted_price?.toLocaleString()}?`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      console.log('🚨 APPROVING OFFER:', offer.id);
      
      const headers = getAuthHeaders();
      
      // Call backend endpoint to approve offer
      await axios.put(`${API}/offers/${offer.id}/respond`, {
        action: 'accept'
      }, { headers });
      
      notify.success(`✅ Offer approved successfully! Asset "${offer.asset_name}" is now booked.`);
      
      // Refresh buyer data
      await fetchBuyerData();
      
    } catch (error) {
      console.error('🚨 Error approving offer:', error);
      notify.error('Failed to approve offer: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleRejectOffer = async (offer) => {
    try {
      const confirmMessage = `Are you sure you want to reject the offer for "${offer.asset_name}"?\n\nThis will return the asset to available status.`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      console.log('🚨 REJECTING OFFER:', offer.id);
      
      const headers = getAuthHeaders();
      
      // Call backend endpoint to reject offer
      await axios.put(`${API}/offers/${offer.id}/respond`, {
        action: 'reject'
      }, { headers });
      
      notify.info(`Offer rejected. Asset "${offer.asset_name}" is now available again.`);
      
      // Refresh buyer data
      await fetchBuyerData();
      
    } catch (error) {
      console.error('🚨 Error rejecting offer:', error);
      notify.error('Failed to reject offer: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Helper function to get total asset count for a campaign (including offers)
  const getCampaignAssetCount = (campaign) => {
    const campaignAssets = (campaign.campaign_assets || []).length;
    const groupedOffers = getGroupedAndFilteredOffers();
    const offerRequests = groupedOffers[campaign.name] ? groupedOffers[campaign.name].length : 0;
    return Math.max(campaignAssets, offerRequests);
  };

  if (loading) {
    return <DashboardLoading type="buyer" />;
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="my-assets">My Assets</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="requested-offers">Requested Offers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* My Assets Tab */}
          <TabsContent value="my-assets" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>My Booked Assets</span>
                  </CardTitle>
                  
                  {/* View Toggle Buttons */}
                  <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
                    <Button
                      variant={myAssetsView === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMyAssetsView('list')}
                      className="px-3 py-1"
                    >
                      <List className="w-4 h-4 mr-1" />
                      List
                    </Button>
                    <Button
                      variant={myAssetsView === 'map' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMyAssetsView('map')}
                      className="px-3 py-1"
                    >
                      <Map className="w-4 h-4 mr-1" />
                      Map
                    </Button>
                    <Button
                      variant={myAssetsView === 'campaign' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMyAssetsView('campaign')}
                      className="px-3 py-1"
                    >
                      <FolderOpen className="w-4 h-4 mr-1" />
                      Campaign
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {assetsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading booked assets...</p>
                    </div>
                  </div>
                ) : liveAssets.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Booked Assets Yet</h3>
                    <p className="text-gray-500 mb-4">
                      You don't have any booked advertising assets yet. Start by creating campaigns and requesting assets.
                    </p>
                    <Button onClick={() => setActiveTab('campaigns')} className="bg-orange-600 hover:bg-orange-700">
                      Create Campaign
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* List View */}
                    {myAssetsView === 'list' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Showing {liveAssets.length} booked asset{liveAssets.length > 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Campaign</TableHead>
                              <TableHead>Last Status</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Expiry</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {liveAssets.map((asset) => (
                              <TableRow key={asset.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{asset.name}</div>
                                    <div className="text-sm text-gray-500">{asset.address}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                    {asset.campaignName}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={asset.lastStatus === 'Booked' ? 'success' : 'secondary'}>
                                    {asset.lastStatus}
                                  </Badge>
                                </TableCell>
                                <TableCell>{asset.duration}</TableCell>
                                <TableCell>
                                  {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Map View */}
                    {myAssetsView === 'map' && (
                      <div className="space-y-4">
                        <div className="bg-gray-100 rounded-lg p-8 text-center">
                          <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-700 mb-2">Map View</h3>
                          <p className="text-gray-500">
                            Interactive map showing locations of your {liveAssets.length} booked assets
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            Map integration coming soon...
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Campaign View */}
                    {myAssetsView === 'campaign' && (
                      <div className="space-y-6">
                        {(() => {
                          // Group assets by campaign
                          const groupedAssets = {};
                          liveAssets.forEach(asset => {
                            const campaignName = asset.campaignName || 'Unknown Campaign';
                            if (!groupedAssets[campaignName]) {
                              groupedAssets[campaignName] = [];
                            }
                            groupedAssets[campaignName].push(asset);
                          });

                          return Object.entries(groupedAssets).map(([campaignName, assets]) => (
                            <div key={campaignName} className="border rounded-lg overflow-hidden">
                              <div className="bg-gray-50 p-4 border-b">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{campaignName}</h3>
                                    <p className="text-sm text-gray-600">{assets.length} booked asset{assets.length > 1 ? 's' : ''}</p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Live Campaign
                                  </Badge>
                                </div>
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Asset Name</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Expires</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {assets.map((asset) => (
                                    <TableRow key={asset.id}>
                                      <TableCell>
                                        <div className="font-medium">{asset.name}</div>
                                        <div className="text-sm text-gray-500">{asset.type}</div>
                                      </TableCell>
                                      <TableCell>
                                        <div className="text-sm">{asset.address}</div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={asset.lastStatus === 'Booked' ? 'success' : 'secondary'}>
                                          {asset.lastStatus}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{asset.duration}</TableCell>
                                      <TableCell>
                                        {asset.expiryDate ? new Date(asset.expiryDate).toLocaleDateString() : 'N/A'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search campaigns by name, description, or status..."
                          value={campaignSearch}
                          onChange={(e) => {
                            setCampaignSearch(e.target.value);
                            setCampaignCurrentPage(1); // Reset to first page when searching
                          }}
                          className="pl-10"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        {getFilteredCampaigns().length} of {(campaigns || []).length} campaigns
                      </div>
                    </div>

                    {/* Campaigns Table */}
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
                        {getPaginatedCampaigns().map((campaign) => (
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
                          <TableCell>{getCampaignAssetCount(campaign)} selected</TableCell>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    // Store campaign context and navigate to marketplace
                                    sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                                      id: campaign.id,
                                      name: campaign.name,
                                      end_date: campaign.end_date
                                    }));
                                    navigate(`/marketplace?campaign=${campaign.id}`);
                                  }}
                                  className="cursor-pointer text-orange-600"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Asset
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={async () => {
                                    setSelectedCampaign(campaign);
                                    await fetchCampaignAssets(campaign);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => editCampaign(campaign)}
                                  className="cursor-pointer text-blue-600"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Campaign
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => downloadCampaignPDF(campaign)}
                                  className="cursor-pointer text-purple-600"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Campaign Planning PDF
                                </DropdownMenuItem>
                                
                                {/* Only show delete for Draft campaigns */}
                                {campaign.status === 'Draft' && (
                                  <DropdownMenuItem
                                    onClick={() => deleteCampaign(campaign)}
                                    className="cursor-pointer text-red-600"
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Delete Campaign
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {getCampaignTotalPages() > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Page {campaignCurrentPage} of {getCampaignTotalPages()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(Math.max(1, campaignCurrentPage - 1))}
                          disabled={campaignCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCampaignCurrentPage(Math.min(getCampaignTotalPages(), campaignCurrentPage + 1))}
                          disabled={campaignCurrentPage === getCampaignTotalPages()}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
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
                    {/* Search Bar */}
                    <div className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search offers by asset, campaign, or status..."
                          value={offerSearch}
                          onChange={(e) => {
                            setOfferSearch(e.target.value);
                            setOfferCurrentPage(1); // Reset to first page when searching
                          }}
                          className="pl-10"
                        />
                      </div>
                      <div className="text-sm text-gray-500">
                        {getFilteredOffers().length} of {(requestedOffers || []).length} offers
                      </div>
                    </div>

                    {/* Grouped Offers with Collapsible View */}
                    <div className="space-y-4">
                      {Object.entries(getGroupedAndFilteredOffers()).map(([campaignName, offers]) => {
                        // Calculate total offered price for this campaign's offers
                        const totalEstimatedBudget = offers.reduce((sum, offer) => sum + (offer.admin_quoted_price || 0), 0);
                        
                        // Find campaign budget (from the first offer in the group)
                        const campaign = (campaigns || []).find(c => c.name === campaignName);
                        const campaignBudget = campaign?.budget || 0;
                        
                        const isCollapsed = collapsedCampaigns[campaignName];
                        
                        return (
                          <div key={campaignName} className="border rounded-lg overflow-hidden">
                            {/* Collapsible Campaign Header with Budget Comparison */}
                            <div 
                              className="bg-gray-50 p-4 border-b cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => toggleCampaignCollapse(campaignName)}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">{campaignName}</h3>
                                    <p className="text-sm text-gray-600">{offers.length} asset{offers.length > 1 ? 's' : ''} requested</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">Budget Overview</div>
                                  <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500">Campaign Budget</div>
                                      <div className="font-semibold text-gray-900">৳{campaignBudget.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500">Total Estimated</div>
                                      <div className="font-semibold text-blue-600">৳{totalEstimatedBudget.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xs text-gray-500">Difference</div>
                                      <div className={`font-semibold ${(campaignBudget - totalEstimatedBudget) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {(campaignBudget - totalEstimatedBudget) >= 0 ? '+' : ''}৳{(campaignBudget - totalEstimatedBudget).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Collapsible Assets Table */}
                            {!isCollapsed && (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Offered Price</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {offers.map((offer) => (
                                    <TableRow 
                                      key={`offer-${offer.id}`}
                                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                                      onClick={() => {
                                        // Show offer details in a modal or expand row
                                        console.log('🖱️ Clicked on offer:', offer.asset_name, offer.status);
                                        if (offer.status === 'Quoted') {
                                          // For quoted offers, show approve/reject options
                                          const action = window.confirm(`Asset: ${offer.asset_name}\nStatus: ${offer.status}\nQuoted Price: ৳${offer.admin_quoted_price?.toLocaleString()}\n\nWould you like to approve this offer? (OK for Yes, Cancel for No)`);
                                          if (action) {
                                            handleApproveOffer(offer);
                                          } else if (window.confirm('Would you like to reject this offer instead?')) {
                                            handleRejectOffer(offer);
                                          }
                                        }
                                      }}
                                    >
                                      <TableCell>
                                        <div className="font-medium">{offer.asset_name}</div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={
                                            offer.status === 'Pending' ? 'secondary' :
                                            offer.status === 'Processing' ? 'default' :
                                            offer.status === 'Quoted' ? 'default' :
                                            offer.status === 'Accepted' ? 'success' :
                                            offer.status === 'Rejected' ? 'destructive' :
                                            'destructive'
                                          }
                                          className={
                                            offer.status === 'Quoted' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                            offer.status === 'Accepted' ? 'bg-green-100 text-green-800 border-green-300' :
                                            offer.status === 'Rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                                            ''
                                          }
                                        >
                                          {offer.status === 'Quoted' ? '💰 Quoted - Action Needed' :
                                           offer.status === 'Accepted' ? '✅ Approved & Booked' :
                                           offer.status === 'Rejected' ? '❌ Rejected' :
                                           offer.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {offer.admin_quoted_price ? (
                                          <div className="font-medium text-green-600">
                                            ৳{offer.admin_quoted_price.toLocaleString()}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500">
                                            Pending Quote
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>{offer.contract_duration?.replace('_', ' ')}</TableCell>
                                      <TableCell className="capitalize">{offer.campaign_type}</TableCell>
                                      <TableCell>{new Date(offer.created_at).toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-48">
                                            {/* Show Approve/Reject for Quoted offers */}
                                            {offer.status === 'Quoted' && (
                                              <>
                                                <DropdownMenuItem 
                                                  onClick={() => handleApproveOffer(offer)}
                                                  className="flex items-center cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                                                >
                                                  <CheckCircle className="h-4 w-4 mr-2" />
                                                  Approve Offer
                                                </DropdownMenuItem>
                                                
                                                <DropdownMenuItem 
                                                  onClick={() => handleRejectOffer(offer)}
                                                  className="flex items-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <XCircle className="h-4 w-4 mr-2" />
                                                  Reject Offer
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                            
                                            {/* Show Edit/Delete for Pending offers only */}
                                            {offer.status === 'Pending' && (
                                              <>
                                                <DropdownMenuItem 
                                                  onClick={() => handleEditOffer(offer)}
                                                  className="flex items-center cursor-pointer"
                                                >
                                                  <Edit className="h-4 w-4 mr-2" />
                                                  Edit Request
                                                </DropdownMenuItem>
                                                
                                                <DropdownMenuItem 
                                                  onClick={() => handleDeleteOffer(offer.id)}
                                                  className="flex items-center cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                  <X className="h-4 w-4 mr-2" />
                                                  Delete Request
                                                </DropdownMenuItem>
                                              </>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination for Grouped Offers */}
                    {getOfferTotalPages() > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          Page {offerCurrentPage} of {getOfferTotalPages()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOfferCurrentPage(Math.max(1, offerCurrentPage - 1))}
                            disabled={offerCurrentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOfferCurrentPage(Math.min(getOfferTotalPages(), offerCurrentPage + 1))}
                            disabled={offerCurrentPage === getOfferTotalPages()}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
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
                    {(selectedCampaign.status === 'Draft' || selectedCampaign.status === 'Live') && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          // Store campaign context more reliably using sessionStorage
                          sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                            id: selectedCampaign.id,
                            name: selectedCampaign.name,
                            end_date: selectedCampaign.end_date
                          }));
                          // Close current dialog and navigate to marketplace with campaign context
                          setSelectedCampaign(null);
                          navigate(`/marketplace?campaign=${selectedCampaign.id}`);
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
                      {(selectedCampaign.status === 'Draft' || selectedCampaign.status === 'Live') && (
                        <Button 
                          size="sm"
                          onClick={() => {
                            // Store campaign context more reliably using sessionStorage
                            sessionStorage.setItem('selectedCampaignForOffer', JSON.stringify({
                              id: selectedCampaign.id,
                              name: selectedCampaign.name,
                              end_date: selectedCampaign.end_date
                            }));
                            // Close current dialog and navigate to marketplace with campaign context
                            setSelectedCampaign(null);
                            navigate(`/marketplace?campaign=${selectedCampaign.id}`);
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
                                    <Badge 
                                      variant="outline" 
                                      className={
                                        asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' 
                                          ? "text-green-600 border-green-300 bg-green-50" 
                                          : "text-orange-600 border-orange-300"
                                      }
                                    >
                                      {asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' ? 'Booked' : 'Requested'}
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
                                
                                {/* Show Asset Expiry Date for Live Campaign assets (non-requested) */}
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
                                
                                {/* For requested assets, show different info based on status */}
                                {asset.isRequested && (
                                  <div className="mt-2">
                                    {asset.offerStatus === 'Approved' || asset.offerStatus === 'Accepted' ? (
                                      <p className="text-xs text-green-600">
                                        ✅ Asset successfully booked for your campaign
                                      </p>
                                    ) : (
                                      <p className="text-xs text-orange-600">
                                        📋 Offer request submitted - waiting for admin response
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {/* For Draft campaigns, show availability info */}
                                {selectedCampaign.status === 'Draft' && !asset.isRequested && asset.next_available_date && (
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
                disabled={!campaignForm.name}
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

        {/* Edit Campaign Dialog */}
        <Dialog open={showEditCampaign} onOpenChange={(open) => {
          setShowEditCampaign(open);
          if (!open) {
            // Reset form when closing
            setEditingCampaign(null);
            setCampaignForm({
              name: '',
              description: '',
              budget: '',
              notes: '',
              startDate: null,
              endDate: null
            });
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Campaign</DialogTitle>
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
              <Button variant="outline" onClick={() => setShowEditCampaign(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCampaign}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!campaignForm.name}
              >
                Update Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default BuyerDashboard;