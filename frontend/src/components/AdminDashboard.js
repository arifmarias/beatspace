import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  AlertCircle,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreHorizontal,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Mail,
  Phone,
  Globe,
  Calendar,
  Camera,
  MessageSquare,
  TrendingUp,
  DollarSign,
  HelpCircle,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Calendar as CalendarComponent } from './ui/calendar';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders, logout, getUser } from '../utils/auth';
import { useWebSocket, getWebSocketUserId, WEBSOCKET_EVENTS } from '../utils/websocket';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './ui/notification-bell';
import { useNotification } from './ui/notification';
import { useNotifications } from '../contexts/NotificationContext';
import OfferMediationPanel from './OfferMediationPanel';
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Monitoring states
  const [bookedAssets, setBookedAssets] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [collapsedCampaigns, setCollapsedCampaigns] = useState({});
  const [collapsedBuyers, setCollapsedBuyers] = useState({}); // Collapsible state for buyers in Offer Mediation
  
  // Notification system  
  const { notifications, addNotification, markAsRead, clearAll } = useNotifications();
  const { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning } = useNotifications();
  
  // WebSocket connection for real-time updates with enhanced notifications
  const handleWebSocketMessage = (message) => {
    console.log('🔔 Admin Dashboard: Received real-time update:', message);
    console.log('🔔 Message type:', message.type);
    console.log('🔔 Available WEBSOCKET_EVENTS:', WEBSOCKET_EVENTS);
    
    // Only handle messages if WebSocket connection is stable
    if (!isConnected) {
      console.warn('⚠️ Ignoring WebSocket message - connection not stable');
      return;
    }
    
    // Add notification to bell based on message type
    switch (message.type) {
      case WEBSOCKET_EVENTS.OFFER_APPROVED:
        console.log('🎯 Processing OFFER_APPROVED event');
        addNotification(
          'success',
          'Offer Approved! 🎉',
          `${message.buyer_name || 'A buyer'} approved offer for ${message.asset_name}`,
          { offerId: message.offer_id, assetName: message.asset_name }
        );
        notifySuccess(
          'Offer Approved! 🎉', 
          `${message.buyer_name || 'A buyer'} approved offer for ${message.asset_name}`
        );
        scheduleRefresh();
        break;
        
      case WEBSOCKET_EVENTS.OFFER_REJECTED:
        console.log('🎯 Processing OFFER_REJECTED event');
        addNotification(
          'warning',
          'Offer Rejected',
          `${message.buyer_name || 'A buyer'} rejected offer for ${message.asset_name}`,
          { offerId: message.offer_id, assetName: message.asset_name }
        );
        notifyInfo(
          'Offer Rejected', 
          `${message.buyer_name || 'A buyer'} rejected offer for ${message.asset_name}`
        );
        scheduleRefresh();
        break;
        
      case WEBSOCKET_EVENTS.REVISION_REQUESTED:
        console.log('🎯 Processing REVISION_REQUESTED event');
        addNotification(
          'info',
          'Revision Requested 🔄',
          `${message.buyer_name || 'A buyer'} requested revision for ${message.asset_name}`,
          { offerId: message.offer_id, assetName: message.asset_name, notes: message.notes }
        );
        notifyWarning(
          'Revision Requested ✏️', 
          `${message.buyer_name || 'A buyer'} requested revision for ${message.asset_name}`
        );
        scheduleRefresh();
        break;

      case WEBSOCKET_EVENTS.NEW_OFFER_REQUEST:
        console.log('🎯 Processing NEW_OFFER_REQUEST event');
        console.log('🎯 About to call notifySuccess for new offer request');
        addNotification(
          'info',
          'New Offer Request 📝',
          `New offer request received for ${message.asset_name}`,
          { campaignId: message.campaign_id, assetName: message.asset_name }
        );
        notifySuccess(
          'New Offer Request! 📝', 
          `New offer request received for ${message.asset_name}`
        );
        console.log('🎯 notifySuccess called successfully');
        scheduleRefresh();
        break;

      case 'new_offer_request':
        console.log('🎯 Processing NEW_OFFER_REQUEST event');
        addNotification(
          'info',
          'New Offer Request 📝',
          `New offer request from ${message.buyer_name || 'a buyer'}`,
          { campaignId: message.campaign_id, buyerName: message.buyer_name }
        );
        notifyInfo(
          'New Offer Request 📝', 
          `New offer request from ${message.buyer_name || 'a buyer'}`
        );
        scheduleRefresh();
        break;
        
      case WEBSOCKET_EVENTS.CONNECTION_STATUS:
        console.log(`📊 WebSocket Status: ${message.message} (${message.active_connections} active)`);
        // Don't add notification for connection status, just log it
        break;
        
      case 'connection_status':
        console.log('🎯 Processing CONNECTION_STATUS event');
        // Don't add notification for connection status, just log it
        break;
        
      case 'pong':
        // Don't add notification for pong messages
        break;
        
      default:
        console.log('📥 Unknown message type:', message.type);
        console.log('📥 Expected types:', Object.values(WEBSOCKET_EVENTS));
        addNotification(
          'info',
          'New Update',
          `Received: ${message.type}`,
          { messageType: message.type, data: message }
        );
    }
    
    // Debounce refresh calls using setTimeout to prevent rapid successive calls
    const scheduleRefresh = () => {
      setTimeout(() => {
        console.log('🔄 Scheduled refresh triggered after WebSocket event');
        if (typeof fetchOfferRequests === 'function') {
          fetchOfferRequests();
        }
      }, 2000); // Increased to 2 second delay for more stability
    };
  };

  const currentUser = getUser() || { email: 'admin@beatspace.com', role: 'admin' }; // Fallback for admin
  const websocketUserId = currentUser.id || currentUser.email || 'admin'; // Use actual user ID for WebSocket connection
  const { isConnected, connectionCount, sendMessage, userInfo, error } = useWebSocket(websocketUserId, handleWebSocketMessage);
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
  const [expandedOffers, setExpandedOffers] = useState(new Set()); // Track which offers are expanded
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showGroupQuoteDialog, setShowGroupQuoteDialog] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    offerId: '',
    quotedPrice: '',
    notes: '',
    validUntil: null
  });
  const [groupQuoteForm, setGroupQuoteForm] = useState({
    buyerEmail: '',
    offers: [],
    groupPrice: '',
    individualPrices: {},
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
  const [buyerStatusFilter, setBuyerStatusFilter] = useState('all'); // Filter for buyer status
  const [offerMediationLoading, setOfferMediationLoading] = useState(false); // Loading state for offer mediation refresh
  
  // Controlled tab state for auto refresh functionality
  const [activeTab, setActiveTab] = useState('users');

  // Bangladesh location data structure (Division -> District -> Area)
  const [locationData] = useState({
    "Dhaka": {
      "Dhaka": ["Demra", "Dhaka Cantt.", "Dhamrai", "Dhanmondi", "Gulshan", "Jatrabari", "Joypara", "Keraniganj", "Khilgaon", "Khilkhet", "Lalbag", "Mirpur", "Mohammadpur", "Motijheel", "Nawabganj", "New market", "Palton", "Ramna", "Sabujbag", "Savar", "Sutrapur", "Tejgaon", "Tejgaon Industrial Area", "Uttara"],
      "Faridpur": ["Alfadanga", "Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madukhali", "Nagarkanda", "Sadarpur", "Shriangan"],
      "Gazipur": ["Gazipur Sadar", "Kaliakaar", "Kaliganj", "Kapashia", "Monnunagar", "Sreepur", "Sripur"],
      "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Maksudpur", "Tungipara"],
      "Jamalpur": ["Dewangonj", "Islampur", "Jamalpur", "Malandah", "Mathargonj", "Shorishabari"],
      "Kishoreganj": ["Bajitpur", "Bhairob", "Hossenpur", "Itna", "Karimganj", "Katiadi", "Kishoreganj Sadar", "Kuliarchar", "Mithamoin", "Nikli", "Ostagram", "Pakundia", "Tarial"],
      "Madaripur": ["Barhamganj", "kalkini", "Madaripur Sadar", "Rajoir"],
      "Manikganj": ["Doulatpur", "Gheor", "Lechhraganj", "Manikganj Sadar", "Saturia", "Shibloya", "Singari"],
      "Munshiganj": ["Gajaria", "Lohajong", "Munshiganj Sadar", "Sirajdikhan", "Srinagar", "Tangibari"],
      "Mymensingh": ["Bhaluka", "Fulbaria", "Gaforgaon", "Gouripur", "Haluaghat", "Isshwargonj", "Muktagachha", "Mymensingh Sadar", "Nandail", "Phulpur", "Trishal"],
      "Narayanganj": ["Araihazar", "Baidder Bazar", "Bandar", "Fatullah", "Narayanganj Sadar", "Rupganj", "Siddirganj"],
      "Narshingdi": ["Belabo", "Monohordi", "Narshingdi Sadar", "Palash", "Raypura", "Shibpur"],
      "Netrakona": ["Susung Durgapur", "Atpara", "Barhatta", "Dharmapasha", "Dhobaura", "Kalmakanda", "Kendua", "Khaliajuri", "Madan", "Moddhynagar", "Mohanganj", "Netrakona Sadar", "Purbadhola"],
      "Rajbari": ["Baliakandi", "Pangsha", "Rajbari Sadar"],
      "Shariatpur": ["Bhedorganj", "Damudhya", "Gosairhat", "Jajira", "Naria", "Shariatpur Sadar"],
      "Sherpur": ["Bakshigonj", "Jhinaigati", "Nakla", "Nalitabari", "Sherpur Shadar", "Shribardi"],
      "Tangail": ["Basail", "Bhuapur", "Delduar", "Ghatail", "Gopalpur", "Kalihati", "Kashkaolia", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"]
    },
    "Chittagong": {
      "Bandarban": ["Alikadam", "Bandarban Sadar", "Naikhong", "Roanchhari", "Ruma", "Thanchi"],
      "Brahmanbaria": ["Akhaura", "Banchharampur", "Brahamanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail"],
      "Chandpur": ["Chandpur Sadar", "Faridganj", "Hajiganj", "Hayemchar", "Kachua", "Matlobganj", "Shahrasti"],
      "Chittagong": ["Anawara", "Boalkhali", "Chittagong Sadar", "East Joara", "Fatikchhari", "Hathazari", "Jaldi", "Lohagara", "Mirsharai", "Patiya", "Rangunia", "Rouzan", "Sandwip", "Satkania", "Sitakunda"],
      "Comilla": ["Barura", "Brahmanpara", "Burichang", "Chandina", "Chouddagram", "Comilla Sadar", "Daudkandi", "Davidhar", "Homna", "Laksam", "Langalkot", "Muradnagar"],
      "Cox's Bazar": ["Chiringga", "Coxs Bazar Sadar", "Gorakghat", "Kutubdia", "Ramu", "Teknaf", "Ukhia"],
      "Feni": ["Chhagalnaia", "Dagonbhuia", "Feni Sadar", "Pashurampur", "Sonagazi"],
      "Khagrachari": ["Diginala", "Khagrachari Sadar", "Laxmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramghar Head Office"],
      "Lakshmipur": ["Char Alexgander", "Lakshimpur Sadar", "Ramganj", "Raypur"],
      "Noakhali": ["Basurhat", "Begumganj", "Chatkhil", "Hatiya", "Noakhali Sadar", "Senbag"],
      "Rangamati": ["Barakal", "Bilaichhari", "Jarachhari", "Kalampati", "kaptai", "Longachh", "Marishya", "Naniachhar", "Rajsthali", "Rangamati Sadar"]
    },
    "Barishal": {
      "Barguna": ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata"],
      "Barishal": ["Agailzhara", "Babuganj", "Barajalia", "Barishal Sadar", "Gouranadi", "Mahendiganj", "Muladi", "Sahebganj", "Uzirpur"],
      "Bhola": ["Bhola Sadar", "Borhanuddin UPO", "Charfashion", "Doulatkhan", "Hajirhat", "Hatshoshiganj", "Lalmohan UPO"],
      "Jhalokathi": ["Jhalokathi Sadar", "Kathalia", "Nalchhiti", "Rajapur"],
      "Patuakhali": ["Bauphal", "Dashmina", "Galachipa", "Khepupara", "Patuakhali Sadar", "Subidkhali"],
      "Pirojpur": ["Banaripara", "Bhandaria", "kaukhali", "Mathbaria", "Nazirpur", "Pirojpur Sadar", "Swarupkathi"]
    },
    "Khulna": {
      "Bagherhat": ["Bagerhat Sadar", "Chalna Ankorage", "Chitalmari", "Fakirhat", "Kachua UPO", "Mollahat", "Morelganj", "Rampal", "Rayenda"],
      "Chuadanga": ["Alamdanga", "Chuadanga Sadar", "Damurhuda", "Doulatganj"],
      "Jessore": ["Bagharpara", "Chaugachha", "Jessore Sadar", "Jhikargachha", "Keshabpur", "Monirampur", "Noapara", "Sarsa"],
      "Jinaidaha": ["Harinakundu", "Jinaidaha Sadar", "Kotchandpur", "Maheshpur", "Naldanga", "Shailakupa"],
      "Khulna": ["Alaipur", "Batiaghat", "Chalna Bazar", "Digalia", "Khulna Sadar", "Madinabad", "Paikgachha", "Phultala", "Sajiara", "Terakhada", "Bheramara", "Janipur", "Kumarkhali", "Kustia Sadar", "Mirpur", "Rafayetpur"],
      "Magura": ["Arpara", "Magura Sadar", "Mohammadpur", "Shripur"],
      "Meherpur": ["Gangni", "Meherpur Sadar"],
      "Narail": ["Kalia", "Laxmipasha", "Mohajan", "Narail Sadar"],
      "Satkhira": ["Ashashuni", "Debbhata", "kalaroa", "Kaliganj UPO", "Nakipur", "Satkhira Sadar", "Taala"]
    },
    "Rajshahi": {
      "Bogra": ["Alamdighi", "Bogra Sadar", "Dhunat", "Dupchachia", "Gabtoli", "Kahalu", "Nandigram", "Sariakandi", "Sherpur", "Shibganj", "Sonatola"],
      "Chapinawabganj": ["Bholahat", "Chapinawabganj Sadar", "Nachol", "Rohanpur", "Shibganj U.P.O"],
      "Joypurhat": ["Akkelpur", "Joypurhat Sadar", "kalai", "Khetlal", "panchbibi"],
      "Naogaon": ["Ahsanganj", "Badalgachhi", "Dhamuirhat", "Mahadebpur", "Naogaon Sadar", "Niamatpur", "Nitpur", "Patnitala", "Prasadpur", "Raninagar", "Sapahar"],
      "Natore": ["Gopalpur UPO", "Harua", "Hatgurudaspur", "Laxman", "Natore Sadar", "Singra"],
      "Pabna": ["Banwarinagar", "Bera", "Bhangura", "Chatmohar", "Debottar", "Ishwardi", "Pabna Sadar", "Sathia", "Sujanagar"],
      "Rajshahi": ["Bagha", "Bhabaniganj", "Charghat", "Durgapur", "Godagari", "Khod Mohanpur", "Lalitganj", "Putia", "Rajshahi Sadar", "Tanor"],
      "Sirajganj": ["Baiddya Jam Toil", "Belkuchi", "Dhangora", "Kazipur", "Shahjadpur", "Sirajganj Sadar", "Tarash", "Ullapara"]
    },
    "Rangpur": {
      "Dinajpur": ["Bangla Hili", "Biral", "Birampur", "Birganj", "Chrirbandar", "Dinajpur Sadar", "Khansama", "Maharajganj", "Nababganj", "Osmanpur", "Parbatipur", "Phulbari", "Setabganj"],
      "Gaibandha": ["Bonarpara", "Gaibandha Sadar", "Gobindaganj", "Palashbari", "Phulchhari", "Saadullapur", "Sundarganj"],
      "Kurigram": ["Bhurungamari", "Chilmari", "Kurigram Sadar", "Nageshwar", "Rajarhat", "Rajibpur", "Roumari", "Ulipur"],
      "Lalmonirhat": ["Aditmari", "Hatibandha", "Lalmonirhat Sadar", "Patgram", "Tushbhandar"],
      "Nilphamari": ["Dimla", "Domar", "Jaldhaka", "Kishoriganj", "Nilphamari Sadar", "Syedpur"],
      "Panchagarh": ["Boda", "Chotto Dab", "Dabiganj", "Panchagra Sadar", "Tetulia"],
      "Rangpur": ["Badarganj", "Gangachara", "Kaunia", "Mithapukur", "Pirgachha", "Rangpur Sadar", "Taraganj"],
      "Thakurgaon": ["Baliadangi", "Jibanpur", "Pirganj", "Rani Sankail", "Thakurgaon Sadar"]
    },
    "Sylhet": {
      "Hobiganj": ["Azmireeganj", "Bahubal", "Baniachang", "Chunarughat", "Hobiganj Sadar", "Kalauk", "Madhabpur", "Nabiganj"],
      "Moulvibazar": ["Baralekha", "Kamalganj", "Kulaura", "Moulvibazar Sadar", "Rajnagar", "Srimangal"],
      "Sunamganj": ["Bishamsarpur", "Chhatak", "Dhirai Chandpur", "Duara bazar", "Ghungiar", "Jagnnathpur", "Sachna", "Sunamganj Sadar", "Tahirpur"],
      "Sylhet": ["Balaganj", "Bianibazar", "Bishwanath", "Fenchuganj", "Goainhat", "Gopalganj", "Jaintapur", "Jakiganj", "Kanaighat", "Kompanyganj", "Sylhet Sadar"]
    }
  });

  // Helper functions for location data
  const getDivisions = () => Object.keys(locationData);
  const getDistricts = (division) => division ? Object.keys(locationData[division] || {}) : [];
  const getAreas = (division, district) => (division && district) ? (locationData[division]?.[district] || []) : [];

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
    status: 'pending', // Default status for new users
    password: ''
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
    google_map_link: '', // NEW: Google Maps link field
    address: '',
    location: { lat: '', lng: '' }, // NEW: Location coordinates
    division: '',
    district: '',
    area: '',
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
    fetchBookedAssets(); // Add this to fetch live assets for monitoring
  }, []);

  // Tab refresh functionality - auto refresh when switching to offer mediation tab
  useEffect(() => {
    if (activeTab === 'offers') {
      const timeoutId = setTimeout(() => {
        fetchOfferRequests(); // Subtle refresh for offer mediation
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab]);

  // Tab refresh functionality - auto refresh when switching to monitoring tab
  useEffect(() => {
    if (activeTab === 'monitoring') {
      const timeoutId = setTimeout(() => {
        fetchMonitoringData(); // Subtle refresh for monitoring
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch all data in parallel
      const [usersRes, assetsRes, campaignsRes, offersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/assets`, { headers }),
        axios.get(`${API}/campaigns`, { headers }),
        axios.get(`${API}/offers/requests`, { headers }),
        axios.get(`${API}/stats/public`)
      ]);

      const allUsers = usersRes.data || [];
      const allCampaigns = campaignsRes.data || [];
      const allOffers = offersRes.data || [];
      
      // Enrich campaigns with asset counts from offer requests
      const enrichedCampaigns = allCampaigns.map(campaign => {
        const campaignOffers = allOffers.filter(offer => 
          offer.campaign_name === campaign.name && offer.buyer_id === campaign.buyer_id
        );
        return {
          ...campaign,
          campaign_assets: campaignOffers,
          asset_count: campaignOffers.length
        };
      });

      setUsers(allUsers);
      setAssets(assetsRes.data);
      setCampaigns(enrichedCampaigns);
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
              const assetData = assetResponse.data;
              
              // Always try to get monthly rate first for display consistency
              let assetPrice = 0;
              const duration = offer.contract_duration;
              if (assetData.pricing) {
                // Always try to get monthly rate first for display consistency
                if (assetData.pricing.monthly_rate) {
                  assetPrice = assetData.pricing.monthly_rate;
                } else if (assetData.pricing.weekly_rate) {
                  assetPrice = assetData.pricing.weekly_rate * 4; // Convert weekly to monthly
                } else if (assetData.pricing.yearly_rate) {
                  assetPrice = assetData.pricing.yearly_rate / 12; // Convert yearly to monthly
                }
              }

              return {
                ...offer,
                asset_price: assetPrice,
                asset_seller_name: assetData.seller_name || 'N/A',
                asset_pricing_full: assetData.pricing || {},
                quote_count: offer.quote_count || 0 // Track how many times admin has quoted
              };
            } catch (error) {
              console.error(`Error fetching asset price for ${offer.asset_id}:`, error);
              return {
                ...offer,
                asset_price: 0,
                asset_seller_name: 'N/A',
                asset_pricing_full: {},
                quote_count: 0
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
                const assetData = assetResponse.data;
                
                // Always try to get monthly rate first for display consistency
                let assetPrice = 0;
                const duration = offer.contract_duration;
                if (assetData.pricing) {
                  // Always try to get monthly rate first for display consistency
                  if (assetData.pricing.monthly_rate) {
                    assetPrice = assetData.pricing.monthly_rate;
                  } else if (assetData.pricing.weekly_rate) {
                    assetPrice = assetData.pricing.weekly_rate * 4; // Convert weekly to monthly
                  } else if (assetData.pricing.yearly_rate) {
                    assetPrice = assetData.pricing.yearly_rate / 12; // Convert yearly to monthly
                  }
                }

                return {
                  ...offer,
                  asset_price: assetPrice,
                  asset_seller_name: assetData.seller_name || 'N/A',
                  asset_pricing_full: assetData.pricing || {},
                  quote_count: offer.quote_count || 0
                };
              } catch (error) {
                console.error(`Error fetching asset price for ${offer.asset_id}:`, error);
                return {
                  ...offer,
                  asset_price: 0,
                  asset_seller_name: 'N/A',
                  asset_pricing_full: {},
                  quote_count: 0
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
      const matchesSearch = (
        offer.asset_name?.toLowerCase().includes(searchLower) ||
        offer.buyer_name?.toLowerCase().includes(searchLower) ||
        offer.campaign_name?.toLowerCase().includes(searchLower) ||
        offer.status?.toLowerCase().includes(searchLower)
      );
      
      // Buyer status filter
      let matchesBuyerStatus = true;
      if (buyerStatusFilter !== 'all') {
        const buyerStatus = getBuyerStatus(offer);
        matchesBuyerStatus = buyerStatus === buyerStatusFilter;
      }
      
      return matchesSearch && matchesBuyerStatus;
    });
  };

  // Get offers that need admin action (not yet approved) grouped by buyer with pagination
  const getActiveOffersByBuyer = () => {
    console.log('🔍 DEBUG: All offer requests:', offerRequests);
    
    // Show ALL offers except fully Approved/Rejected/Accepted - this ensures quoted offers stay visible
    const activeOffers = getFilteredOfferRequests().filter(offer => {
      const isActive = offer.status !== 'Approved' && offer.status !== 'Rejected' && offer.status !== 'Accepted';
      console.log(`🔍 Offer ${offer.id} - Status: ${offer.status}, Active: ${isActive}`);
      return isActive;
    });
    
    console.log('🔍 DEBUG: Active offers after filtering:', activeOffers);
    
    // Apply pagination to individual offers
    const startIndex = (offerCurrentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOffers = activeOffers.slice(startIndex, endIndex);
    
    // Group the paginated offers by buyer
    const buyerGroups = paginatedOffers.reduce((groups, offer) => {
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
    
    const result = Object.values(buyerGroups);
    console.log('🔍 DEBUG: Final buyer groups:', result);
    return result;
  };

  // Get total pages for offers
  const getOfferTotalPages = () => {
    const activeOffers = getFilteredOfferRequests().filter(offer => {
      return offer.status !== 'Approved' && offer.status !== 'Rejected' && offer.status !== 'Accepted';
    });
    return Math.ceil(activeOffers.length / itemsPerPage);
  };

  // Get total count of active offers for display
  const getActiveOffersCount = () => {
    return getFilteredOfferRequests().filter(offer => {
      return offer.status !== 'Approved' && offer.status !== 'Rejected' && offer.status !== 'Accepted';
    }).length;
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

  // Helper function to get asset status breakdown for a campaign
  const getCampaignAssetBreakdown = (campaign) => {
    const campaignOffers = campaign.campaign_assets || [];
    
    if (campaignOffers.length === 0) {
      return "0 assets";
    }
    
    // Count live/approved assets (approved, accepted, booked)
    const liveAssets = campaignOffers.filter(offer => 
      offer.status === 'Approved' || 
      offer.status === 'Accepted' ||
      offer.status === 'Booked' ||
      offer.status === 'approved' ||
      offer.status === 'accepted' ||
      offer.status === 'booked'
    );
    
    // Count quoted assets (quoted, pending, revision requested)
    const quotedAssets = campaignOffers.filter(offer => 
      offer.status === 'Quoted' || 
      offer.status === 'Pending' ||
      offer.status === 'Revision Requested' ||
      offer.status === 'quoted' ||
      offer.status === 'pending' ||
      offer.status === 'revision requested'
    );
    
    // Count rejected assets
    const rejectedAssets = campaignOffers.filter(offer => 
      offer.status === 'Rejected' || 
      offer.status === 'rejected'
    );
    
    // Create breakdown string - only show categories that have assets
    const parts = [];
    if (liveAssets.length > 0) {
      parts.push(`${liveAssets.length} live`);
    }
    if (quotedAssets.length > 0) {
      parts.push(`${quotedAssets.length} quoted`);
    }
    if (rejectedAssets.length > 0) {
      parts.push(`${rejectedAssets.length} rejected`);
    }
    
    return parts.length > 0 ? parts.join(', ') : `${campaignOffers.length} assets`;
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      // Cleanup any ongoing operations
    };
  }, []);

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
      
      notify.success(`Offer request status updated to ${newStatus}`);
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating offer request status:', error);
      notify.error('Failed to update offer request status: ' + (error.response?.data?.detail || error.message));
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

  // Helper functions for offer status management
  const getBuyerStatus = (offer) => {
    // Check if offer has been cancelled by buyer
    if (offer.status === 'Cancelled' || offer.cancelled_by_buyer || offer.status === 'Rejected') {
      return 'Offer Rejected';
    }
    
    // Check if buyer approved the offer (accepted status from backend)
    if (offer.status === 'Approved' || offer.status === 'Accepted') {
      return 'Buyer Approved';
    }
    
    // Check if buyer requested revision
    if (offer.revision_requested || offer.status === 'Revision Requested') {
      return 'Request for Revised';
    }
    
    // Check if admin has quoted a price (then it becomes "Price Quoted")
    if (offer.admin_quoted_price && offer.admin_quoted_price > 0) {
      return 'Price Quoted';
    }
    
    // First time request (default)
    return 'New Request';
  };

  const getAdminStatus = (offer) => {
    // Debug logging for quote count tracking
    console.log(`🔍 DEBUG - Offer ${offer.id}: admin_quoted_price=${offer.admin_quoted_price}, quote_count=${offer.quote_count}, type=${typeof offer.quote_count}`);
    
    // Check if admin has already quoted a price
    if (offer.admin_quoted_price && offer.admin_quoted_price > 0) {
      let quoteCount = offer.quote_count;
      
      // Handle different data types and ensure we have a valid number
      if (typeof quoteCount === 'string') {
        quoteCount = parseInt(quoteCount) || 1;
      } else if (typeof quoteCount !== 'number' || quoteCount < 1) {
        quoteCount = 1; // Default to 1 if already quoted but count not tracked properly
      }
      
      const status = `Quoted #${quoteCount}`;
      console.log(`🔍 DEBUG - Returning admin status: ${status}`);
      return status;
    } else {
      return 'Need to quote';
    }
  };

  const toggleOfferExpansion = (offerId) => {
    const newExpanded = new Set(expandedOffers);
    if (newExpanded.has(offerId)) {
      newExpanded.delete(offerId);
    } else {
      newExpanded.add(offerId);
    }
    setExpandedOffers(newExpanded);
  };



  // User CRUD Functions
  const handleCreateUser = async () => {
    try {
      const headers = getAuthHeaders();
      
      const userData = {
        ...userForm
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
      status: user.status || 'pending',
      password: '' // Empty password field for security
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

      // Only include password if it's not empty (optional password change)
      if (!userForm.password) {
        delete updateData.password;
      }

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
      status: 'pending',
      password: ''
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
        location: assetForm.location && assetForm.location.lat && assetForm.location.lng 
          ? { 
              lat: parseFloat(assetForm.location.lat), 
              lng: parseFloat(assetForm.location.lng) 
            }
          : { lat: 23.8103, lng: 90.4125 }, // Fallback to Dhaka coordinates only if no location provided
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
      google_map_link: asset.google_map_link || '', // Include google_map_link field
      address: asset.address || '',
      location: asset.location || { lat: '', lng: '' }, // Include location coordinates
      division: asset.division || '',
      district: asset.district || '',
      area: asset.area || '',
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
        location: assetForm.location && assetForm.location.lat && assetForm.location.lng 
          ? { 
              lat: parseFloat(assetForm.location.lat), 
              lng: parseFloat(assetForm.location.lng) 
            }
          : (editingAsset.location || { lat: 23.8103, lng: 90.4125 }), // Use form location first, then existing, then default
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
  
  // Fetch live assets grouped by campaigns
  const fetchBookedAssets = async () => {
    try {
      setMonitoringLoading(true);
      const [assetsResponse, offersResponse] = await Promise.all([
        axios.get(`${API}/assets`, { headers: getAuthHeaders() }),
        axios.get(`${API}/offers/requests`, { headers: getAuthHeaders() })
      ]);
      
      const allAssets = assetsResponse.data;
      const allOffers = offersResponse.data;
      
      // Filter only live assets and add campaign names from offer requests
      const live = allAssets
        .filter(asset => asset.status === 'Live')
        .map(asset => {
          // Find the corresponding offer request to get campaign name
          const offer = allOffers.find(o => o.asset_id === asset.id);
          return {
            ...asset,
            campaign_name: offer?.campaign_name || asset.buyer_name || 'Unknown Campaign'
          };
        });
      
      setBookedAssets(live);
    } catch (error) {
      console.error('Error fetching live assets:', error);
      notify.error('Failed to load live assets');
    } finally {
      setMonitoringLoading(false);
    }
  };
  
  // Update monitoring data for an asset
  const updateMonitoringData = async (assetId, monitoringData) => {
    try {
      await axios.post(`${API}/assets/${assetId}/monitoring`, monitoringData, { headers: getAuthHeaders() });
      notify.success('Monitoring data updated successfully!');
      // Refresh the asset data
      fetchBookedAssets();
    } catch (error) {
      console.error('Error updating monitoring data:', error);
      notify.error('Failed to update monitoring data');
    }
  };
  
  // Fetch offer requests for mediation (similar to fetchBookedAssets but for offers only)
  const fetchOfferRequests = async () => {
    try {
      setOfferMediationLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch only offer requests data
      const offerRequestsResponse = await axios.get(`${API}/admin/offer-requests`, { headers });
      const offerRequestsData = offerRequestsResponse.data || [];
      
      // Fetch asset prices for each offer request (same logic as in fetchDashboardData)
      const enrichedOfferRequests = await Promise.all(
        offerRequestsData.map(async (offer) => {
          try {
            const assetResponse = await axios.get(`${API}/assets/${offer.asset_id}`, { headers });
            return {
              ...offer,
              asset_pricing: assetResponse.data.pricing || {}
            };
          } catch (error) {
            console.warn(`Could not fetch pricing for asset ${offer.asset_id}`);
            return {
              ...offer,
              asset_pricing: {}
            };
          }
        })
      );
      
      setOfferRequests(enrichedOfferRequests);
    } catch (error) {
      console.error('Error fetching offer requests:', error);
      notify.error('Failed to load offer requests');
    } finally {
      setOfferMediationLoading(false);
    }
  };
  
  // Toggle campaign collapse
  const toggleCampaignCollapse = (campaignName) => {
    setCollapsedCampaigns(prev => ({
      ...prev,
      [campaignName]: !prev[campaignName]
    }));
  };
  
  // Toggle buyer collapse in Offer Mediation
  const toggleBuyerCollapse = (buyerEmail) => {
    setCollapsedBuyers(prev => ({
      ...prev,
      [buyerEmail]: !prev[buyerEmail]
    }));
  };
  
  // Group live assets by campaign name
  const getGroupedBookedAssets = () => {
    const filtered = bookedAssets.filter(asset =>
      asset.name.toLowerCase().includes(monitoringSearch.toLowerCase()) ||
      asset.buyer_name?.toLowerCase().includes(monitoringSearch.toLowerCase()) ||
      asset.district?.toLowerCase().includes(monitoringSearch.toLowerCase())
    );
    
    const grouped = filtered.reduce((acc, asset) => {
      const campaignName = asset.buyer_name || 'Unknown Campaign';
      if (!acc[campaignName]) {
        acc[campaignName] = [];
      }
      acc[campaignName].push(asset);
      return acc;
    }, {});
    
    return grouped;
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

  // Google Maps geocoding function
  const handleGoogleMapLink = async (link) => {
    if (!link || !link.trim()) return;

    try {
      // Extract place ID or coordinates from Google Maps link
      let placeId = null;
      let coords = null;

      // Check for place ID in various Google Maps URL formats
      const placeIdMatch = link.match(/place_id=([^&]+)/);
      if (placeIdMatch) {
        placeId = placeIdMatch[1];
      }

      // Check for coordinates
      const coordsMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordsMatch) {
        coords = {
          lat: parseFloat(coordsMatch[1]),
          lng: parseFloat(coordsMatch[2])
        };
      }

      // Use Geocoding API (you can use Google's or any other service)
      let response;
      if (placeId) {
        // Using place ID (requires Google Places API)
        const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (GOOGLE_API_KEY) {
          response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_components&key=${GOOGLE_API_KEY}`
          );
        } else {
          throw new Error('Google Maps API key not configured');
        }
      } else if (coords) {
        // Using reverse geocoding
        const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        if (GOOGLE_API_KEY) {
          response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_API_KEY}`
          );
        } else {
          throw new Error('Google Maps API key not configured');
        }
      } else {
        // Fallback: try to extract address from URL
        const addressMatch = link.match(/\/([^\/,@]+)(?:,|\/@)/);
        if (addressMatch) {
          const addressFromUrl = decodeURIComponent(addressMatch[1].replace(/\+/g, ' '));
          
          // Simple parsing for Bangladesh addresses using new location data structure
          const parts = addressFromUrl.split(',').map(part => part.trim());
          
          // Try to identify division, district, and area from address parts
          let extractedDivision = '';
          let extractedDistrict = '';
          let extractedArea = '';
          
          const divisions = getDivisions();
          
          // Look for division, district, and area in the address parts
          for (let part of parts) {
            // Check for division
            if (!extractedDivision) {
              const foundDivision = divisions.find(div => 
                part.toLowerCase().includes(div.toLowerCase())
              );
              if (foundDivision) {
                extractedDivision = foundDivision;
              }
            }
            
            // Check for district if we have a division
            if (extractedDivision && !extractedDistrict) {
              const districts = getDistricts(extractedDivision);
              const foundDistrict = districts.find(dist => 
                part.toLowerCase().includes(dist.toLowerCase()) ||
                dist.toLowerCase().includes(part.toLowerCase())
              );
              if (foundDistrict) {
                extractedDistrict = foundDistrict;
              }
            }
            
            // Check for area if we have both division and district
            if (extractedDivision && extractedDistrict && !extractedArea) {
              const areas = getAreas(extractedDivision, extractedDistrict);
              const foundArea = areas.find(ar => 
                part.toLowerCase().includes(ar.toLowerCase()) ||
                ar.toLowerCase().includes(part.toLowerCase())
              );
              if (foundArea) {
                extractedArea = foundArea;
              }
            }
          }
          
          setAssetForm(prev => ({
            ...prev,
            address: addressFromUrl,
            division: extractedDivision,
            district: extractedDistrict,
            area: extractedArea,
            location: coords ? coords : prev.location // Use extracted coords if available
          }));
          
          console.log('URL parsing success:', {
            address: addressFromUrl,
            division: extractedDivision,
            district: extractedDistrict,
            area: extractedArea,
            coordinates: coords || 'Not found'
          });
          
          const locationInfo = [extractedDivision, extractedDistrict, extractedArea].filter(Boolean).join(' → ');
          notify.success(`Address extracted from URL. ${locationInfo ? `Location: ${locationInfo}` : 'Please verify location details.'}`);
          return;
        } else {
          throw new Error('Could not extract location information from the link');
        }
      }

      const data = await response.json();
      
      if (data.status === 'OK') {
        let result;
        if (data.result) {
          result = data.result; // Place details response
        } else if (data.results && data.results.length > 0) {
          result = data.results[0]; // Geocoding response
        } else {
          throw new Error('No location data found');
        }

        const addressComponents = result.address_components || [];
        const formattedAddress = result.formatted_address || '';
        
        // Extract coordinates
        const geometry = result.geometry;
        let latitude = null;
        let longitude = null;
        
        if (geometry && geometry.location) {
          latitude = geometry.location.lat;
          longitude = geometry.location.lng;
        } else if (coords) {
          // Use extracted coords from URL if API doesn't provide geometry
          latitude = coords.lat;
          longitude = coords.lng;
        }
        
        // Extract district, division, and area for Bangladesh using new location data
        let division = '';
        let district = '';
        let area = '';
        
        console.log('Address components for debugging:', addressComponents);
        
        // First, try to extract from Google's address components
        let administrativeArea1 = '';
        let administrativeArea2 = '';
        let locality = '';
        let sublocality = '';
        
        for (const component of addressComponents) {
          const types = component.types;
          console.log('Component:', component.long_name, 'Types:', types);
          
          if (types.includes('administrative_area_level_1')) {
            administrativeArea1 = component.long_name.replace(' Division', '');
          } else if (types.includes('administrative_area_level_2')) {
            administrativeArea2 = component.long_name;
          } else if (types.includes('locality')) {
            locality = component.long_name;
          } else if (types.includes('sublocality_level_1')) {
            sublocality = component.long_name;
          }
        }
        
        // Match against our location data structure
        const divisions = getDivisions();
        
        // Find division
        division = divisions.find(div => 
          div.toLowerCase() === administrativeArea1.toLowerCase()
        ) || '';
        
        if (division) {
          const districts = getDistricts(division);
          
          // Try to find district from various address components
          const districtCandidates = [administrativeArea2, locality, sublocality].filter(Boolean);
          
          for (const candidate of districtCandidates) {
            const foundDistrict = districts.find(dist => 
              dist.toLowerCase().includes(candidate.toLowerCase()) ||
              candidate.toLowerCase().includes(dist.toLowerCase())
            );
            if (foundDistrict) {
              district = foundDistrict;
              break;
            }
          }
          
          // If district found, try to find area
          if (district) {
            const areas = getAreas(division, district);
            
            // Try to find area from various address components
            const areaCandidates = [sublocality, locality, administrativeArea2].filter(Boolean);
            
            for (const candidate of areaCandidates) {
              const foundArea = areas.find(ar => 
                ar.toLowerCase().includes(candidate.toLowerCase()) ||
                candidate.toLowerCase().includes(ar.toLowerCase())
              );
              if (foundArea) {
                area = foundArea;
                break;
              }
            }
          }
        }
        
        // Fallback: try to extract from formatted address using known patterns
        if (!division || !district) {
          const addressParts = formattedAddress.split(',').map(part => part.trim());
          
          // Try to match any part of the address against our location data
          for (const part of addressParts) {
            if (!division) {
              const foundDivision = divisions.find(div => 
                part.toLowerCase().includes(div.toLowerCase())
              );
              if (foundDivision) {
                division = foundDivision;
              }
            }
            
            if (division && !district) {
              const districts = getDistricts(division);
              const foundDistrict = districts.find(dist => 
                part.toLowerCase().includes(dist.toLowerCase()) ||
                dist.toLowerCase().includes(part.toLowerCase())
              );
              if (foundDistrict) {
                district = foundDistrict;
              }
            }
            
            if (division && district && !area) {
              const areas = getAreas(division, district);
              const foundArea = areas.find(ar => 
                part.toLowerCase().includes(ar.toLowerCase()) ||
                ar.toLowerCase().includes(part.toLowerCase())
              );
              if (foundArea) {
                area = foundArea;
              }
            }
          }
        }
        
        console.log('Final extracted values:', {
          division: division,
          district: district,
          area: area
        });

        // Update form with all extracted data
        setAssetForm(prev => ({
          ...prev,
          address: formattedAddress,
          division: division,
          district: district,
          area: area,
          location: latitude && longitude ? {
            lat: latitude,
            lng: longitude
          } : prev.location // Keep existing location if coords not found
        }));

        console.log('Geocoding success:', {
          address: formattedAddress,
          division,
          district,
          area,
          coordinates: latitude && longitude ? {lat: latitude, lng: longitude} : 'Not found'
        });

        const locationInfo = [division, district, area].filter(Boolean).join(' → ');
        notify.success(`Address populated successfully! ${locationInfo ? `Location: ${locationInfo}` : 'Please verify location details.'}`);
      } else {
        throw new Error(data.error_message || 'Geocoding failed');
      }
    } catch (error) {
      console.error('Error processing Google Maps link:', error);
      notify.error('Could not extract address from the link. Please fill in manually.');
    }
  };

  const resetAssetForm = () => {
    setAssetForm({
      name: '',
      description: '',
      google_map_link: '', // Reset the new field
      address: '',
      location: { lat: '', lng: '' }, // Reset location coordinates
      division: '',
      district: '',
      area: '',
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

  const submitQuote = async (e) => {
    e.preventDefault();
    
    try {
      const headers = getAuthHeaders();
      console.log('🚀 Submitting quote for offer:', quoteForm.offerId);
      console.log('🚀 Quote data:', {
        quoted_price: quoteForm.quotedPrice,
        admin_notes: quoteForm.notes,
        valid_until: quoteForm.validUntil ? quoteForm.validUntil.toISOString() : null
      });
      
      const response = await axios.put(`${API}/admin/offers/${quoteForm.offerId}/quote`, {
        quoted_price: parseFloat(quoteForm.quotedPrice),
        admin_notes: quoteForm.notes,
        valid_until: quoteForm.validUntil ? quoteForm.validUntil.toISOString() : null
      }, { headers });
      
      console.log('✅ Quote submission response:', response.data);
      
      notify.success('Quote submitted successfully!');
      setShowQuoteDialog(false);
      
      // Reset form
      setQuoteForm({
        offerId: '',
        quotedPrice: '',
        notes: '',
        validUntil: null
      });
      
      console.log('🔄 Refreshing offer requests data...');
      // Use sectional refresh instead of full dashboard refresh to maintain tab state
      await fetchOfferRequests();
      console.log('✅ Offer requests refreshed after quote update');
      
    } catch (error) {
      console.error('❌ Error submitting quote:', error);
      notify.error('Error submitting quote: ' + (error.response?.data?.detail || error.message));
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

  const handleApproveOffer = async (offer) => {
    try {
      const headers = getAuthHeaders();
      
      // Approve the offer by updating its status to 'Approved'
      await axios.patch(`${API}/admin/offer-requests/${offer.id}/status`, 
        { status: 'Approved' },
        { headers }
      );
      
      notify.success(`Asset "${offer.asset_name}" approved successfully!`);
      
      // Refresh only the offer requests list to maintain tab state
      fetchOfferRequests();
      
    } catch (error) {
      console.error('Error approving offer:', error);
      notify.error('Error approving offer: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleGroupQuote = (buyerGroup) => {
    setGroupQuoteForm({
      buyerEmail: buyerGroup.buyer.email,
      offers: buyerGroup.offers,
      groupPrice: '',
      individualPrices: buyerGroup.offers.reduce((acc, offer) => {
        acc[offer.id] = '';
        return acc;
      }, {}),
      notes: '',
      validUntil: null
    });
    setShowGroupQuoteDialog(true);
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
              {/* Notification Bell */}
              <NotificationBell
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onClearAll={clearAll}
                className="relative"
              />
              
              {/* Removed WebSocket Connection Status for cleaner UI */}
              
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
                      <TableRow 
                        key={asset.id} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedAsset(asset)}
                      >
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
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editAsset(asset);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Asset
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteAsset(asset);
                                }}
                                className="text-red-600"
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
                        <TableRow 
                          key={campaign.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedCampaign(campaign)}
                        >
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
                            {getCampaignAssetBreakdown(campaign)}
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
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {/* Quick Make Live Button */}
                                {campaign.status === 'Draft' && (
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateCampaignStatus(campaign.id, 'Live');
                                    }}
                                    className="flex items-center cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Make Live
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    editCampaign(campaign);
                                  }}
                                  className="flex items-center cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Campaign
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCampaign(campaign);
                                  }}
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

          {/* Offer Mediation Tab - Enhanced UX with Buyer Grouping */}
          <TabsContent value="offers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <span>Active Offers by Buyer</span>
                    <Badge variant="secondary" className="ml-2">
                      {getFilteredOfferRequests().filter(offer => offer.status !== 'Approved' && offer.status !== 'Rejected' && offer.status !== 'Accepted').length} Active
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={buyerStatusFilter} onValueChange={setBuyerStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="New Request">New Request</SelectItem>
                        <SelectItem value="Price Quoted">Price Quoted</SelectItem>
                        <SelectItem value="Request for Revised">Request for Revised</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Search buyer or asset..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setOfferCurrentPage(1); // Reset to page 1 when searching
                      }}
                      className="w-64"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchOfferRequests}
                      disabled={offerMediationLoading}
                      className="flex items-center space-x-1"
                    >
                      <Activity className="w-4 h-4" />
                      <span>{offerMediationLoading ? 'Loading...' : 'Refresh'}</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const buyerGroups = getActiveOffersByBuyer();
                  
                  if (buyerGroups.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Pending Offers</h3>
                        <p className="text-gray-500">All offer requests have been processed or none exist.</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-6">
                      {buyerGroups.map((group, groupIndex) => {
                        // Use a unique identifier combining buyer email and name for better uniqueness
                        const buyerKey = `${group.buyer.email}-${group.buyer.name}`;
                        // Default to collapsed (true). If explicitly set to false, then expand
                        const isBuyerCollapsed = collapsedBuyers[buyerKey] === undefined ? true : collapsedBuyers[buyerKey];
                        
                        return (
                        <Card key={`buyer-${groupIndex}`} className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-white">
                          <CardHeader className="pb-3">
                            <div 
                              className="flex justify-between items-start cursor-pointer hover:bg-orange-50 -m-6 p-6 rounded-t-lg transition-colors"
                              onClick={() => toggleBuyerCollapse(`${group.buyer.email}-${group.buyer.name}`)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="bg-orange-100 p-2 rounded-full">
                                  <Users className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg text-gray-900">{group.buyer.name}</h3>
                                  <p className="text-sm text-gray-600">{group.buyer.email}</p>
                                  <Badge variant="outline" className="mt-1 border-orange-300 text-orange-600">
                                    {group.offers.length} Pending {group.offers.length === 1 ? 'Request' : 'Requests'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent collapse toggle when clicking Group Quote
                                    handleGroupQuote(group);
                                  }}
                                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Group Quote ({group.offers.length})
                                </Button>
                                <div className="flex items-center">
                                  {isBuyerCollapsed ? (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          {!isBuyerCollapsed && (
                          <CardContent className="pt-0">
                            <div className="space-y-4">
                              {group.offers.map((offer) => {
                                const assetPrice = offer.asset_price || 0;
                                const offeredPrice = offer.estimated_budget || 0;
                                const difference = offeredPrice - assetPrice;
                                const percentageDiff = assetPrice > 0 ? ((difference / assetPrice) * 100).toFixed(1) : 0;
                                
                                return (
                                  <div key={offer.id}>
                                    <Card className="border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer mb-4"
                                          onClick={() => toggleOfferExpansion(offer.id)}>
                                      <CardContent className="p-6">
                                        {/* Header Section */}
                                        <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center space-x-3">
                                            {expandedOffers.has(offer.id) ? (
                                              <ChevronDown className="w-5 h-5 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-5 h-5 text-gray-500" />
                                            )}
                                            <div>
                                              <h3 className="text-lg font-semibold text-gray-900">{offer.asset_name}</h3>
                                              <p className="text-sm text-gray-600">{offer.campaign_name}</p>
                                            </div>
                                          </div>
                                          <Badge variant="secondary" className="text-sm px-3 py-1">
                                            {offer.contract_duration?.replace('_', ' ') || '1 month'}
                                          </Badge>
                                        </div>

                                        {/* Main Info Section */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                          {/* Left Column - Basic Info */}
                                          <div className="space-y-3">
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requested Dates</label>
                                              <div className="mt-1 text-sm text-gray-900">
                                                <div>Start: {offer.asset_start_date ? new Date(offer.asset_start_date).toLocaleDateString() : 'N/A'}</div>
                                                <div>End: {offer.asset_expiration_date ? new Date(offer.asset_expiration_date).toLocaleDateString() : 'N/A'}</div>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seller</label>
                                              <p className="mt-1 text-sm font-medium text-gray-900">{offer.asset_seller_name}</p>
                                            </div>
                                          </div>

                                          {/* Middle Column - Status */}
                                          <div className="space-y-3">
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Buyer Status</label>
                                              <div className="mt-2">
                                                <Badge className="px-4 py-2 text-sm font-semibold bg-blue-100 text-blue-800 border-blue-300 rounded-lg">
                                                  {getBuyerStatus(offer)}
                                                </Badge>
                                              </div>
                                            </div>
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</label>
                                              <p className="mt-1 text-sm text-gray-900">{new Date(offer.created_at).toLocaleDateString()}</p>
                                            </div>
                                          </div>

                                          {/* Right Column - Quote & Actions */}
                                          <div className="space-y-4">
                                            <div>
                                              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Admin Quote</label>
                                              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-4">
                                                <div className="text-xl font-bold text-green-700">
                                                  {offer.admin_quoted_price ? `৳${offer.admin_quoted_price.toLocaleString()}` : 'Not quoted'}
                                                </div>
                                                {offer.admin_quoted_price && (
                                                  <div className="text-xs text-gray-500 mt-1">
                                                    Last updated: {offer.quoted_at ? new Date(offer.quoted_at).toLocaleDateString() : 'N/A'}
                                                  </div>
                                                )}
                                              </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col space-y-2" onClick={(e) => e.stopPropagation()}>
                                              {offer.status === 'Pending' ? (
                                                <Button
                                                  size="default"
                                                  onClick={() => handleQuoteOffer(offer)}
                                                  className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2"
                                                >
                                                  <DollarSign className="w-4 h-4 mr-2" />
                                                  Quote Price
                                                </Button>
                                              ) : offer.status === 'Quoted' || offer.status === 'In Process' || offer.status === 'Revision Requested' ? (
                                                <>
                                                  <Button
                                                    size="default"
                                                    onClick={() => handleQuoteOffer(offer)}
                                                    variant="outline"
                                                    className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full py-2"
                                                  >
                                                    <DollarSign className="w-4 h-4 mr-2" />
                                                    Update Price
                                                  </Button>
                                                  <Button
                                                    size="default"
                                                    onClick={() => handleApproveOffer(offer)}
                                                    className="bg-green-600 hover:bg-green-700 text-white w-full py-2"
                                                  >
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve Asset
                                                  </Button>
                                                </>
                                              ) : (
                                                <Badge className="bg-gray-100 text-gray-800 py-2 text-center">
                                                  {offer.status}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    {/* Expandable Details Section - Default Closed */}
                                    {expandedOffers.has(offer.id) && (
                                      <Card className="ml-4 mt-2 border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                                              <Eye className="w-4 h-4 mr-2 text-blue-600" />
                                              Detailed Offer Information
                                            </h4>
                                            <div className="grid grid-cols-2 gap-6 text-sm">
                                              <div>
                                                <span className="font-semibold text-gray-700">Seller Name:</span>
                                                <p className="mt-1 text-gray-900">{offer.asset_seller_name}</p>
                                              </div>
                                              <div>
                                                <span className="font-semibold text-gray-700">Admin Status:</span>
                                                <p className="mt-1">
                                                  <Badge className="bg-green-100 text-green-800 border-green-300">
                                                    {getAdminStatus(offer)}
                                                  </Badge>
                                                </p>
                                              </div>
                                              <div>
                                                <span className="font-semibold text-gray-700">Asset Market Price:</span>
                                                <div className="mt-1">
                                                  <div className="text-gray-900">Monthly: ৳{offer.asset_pricing_full?.monthly_rate?.toLocaleString() || 'N/A'}</div>
                                                  <div className="text-gray-900">Yearly: ৳{offer.asset_pricing_full?.yearly_rate?.toLocaleString() || 'N/A'}</div>
                                                </div>
                                              </div>
                                              <div className="col-span-2">
                                                <span className="font-semibold text-gray-700">Special Requirements:</span>
                                                <p className="mt-1 text-gray-900 bg-white p-2 rounded border">
                                                  {offer.special_requirements || 'None specified'}
                                                </p>
                                              </div>
                                              {/* Additional Services Section */}
                                              {(offer.service_bundles || offer.additional_services) && (
                                                <div className="col-span-2">
                                                  <span className="font-semibold text-gray-700">Additional Services:</span>
                                                  <div className="mt-1 bg-white p-2 rounded border">
                                                    {offer.service_bundles && (
                                                      <div className="mb-2">
                                                        <div className="flex flex-wrap gap-2">
                                                          {Object.entries(offer.service_bundles).map(([service, enabled]) => (
                                                            enabled && (
                                                              <span key={service} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                {service.replace('_', ' ').charAt(0).toUpperCase() + service.replace('_', ' ').slice(1)}
                                                              </span>
                                                            )
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}
                                                    {offer.additional_services && (
                                                      <div className="text-gray-900">
                                                        <span className="text-xs text-gray-600 font-medium">Additional Details:</span>
                                                        <p className="mt-1">{offer.additional_services}</p>
                                                      </div>
                                                    )}
                                                    {!offer.service_bundles && !offer.additional_services && (
                                                      <p className="text-gray-900">None requested</p>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              <div className="col-span-2">
                                                <span className="font-semibold text-gray-700">Notes & Instructions:</span>
                                                <p className="mt-1 text-gray-900 bg-white p-2 rounded border">
                                                  {offer.notes || offer.admin_notes || 'No notes available'}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                          )}
                        </Card>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Offer Mediation Pagination Controls */}
                {getOfferTotalPages() > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {((offerCurrentPage - 1) * itemsPerPage) + 1} to {Math.min(offerCurrentPage * itemsPerPage, getActiveOffersCount())} of {getActiveOffersCount()} offers
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOfferCurrentPage(Math.max(1, offerCurrentPage - 1))}
                        disabled={offerCurrentPage === 1}
                        className="flex items-center space-x-1"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: getOfferTotalPages() }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={page === offerCurrentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setOfferCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOfferCurrentPage(Math.min(getOfferTotalPages(), offerCurrentPage + 1))}
                        disabled={offerCurrentPage === getOfferTotalPages()}
                        className="flex items-center space-x-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span>Asset Monitoring</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      View all live assets organized by campaigns
                    </p>
                  </div>
                  <Button 
                    onClick={fetchBookedAssets}
                    variant="outline" 
                    size="sm"
                    disabled={monitoringLoading}
                  >
                    {monitoringLoading ? 'Loading...' : 'Refresh'}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Search Bar */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by asset name, buyer, or location..."
                      value={monitoringSearch}
                      onChange={(e) => setMonitoringSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    {bookedAssets.length} live assets
                  </div>
                </div>

                {monitoringLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading live assets...</p>
                    </div>
                  </div>
                ) : bookedAssets.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Live Assets</h3>
                    <p className="text-gray-500">
                      No assets are currently live for monitoring.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(getGroupedBookedAssets()).map(([campaignName, assets]) => {
                      const isCollapsed = collapsedCampaigns[campaignName] !== false; // Default to collapsed
                      
                      return (
                        <div key={campaignName} className="border rounded-lg overflow-hidden">
                          {/* Campaign Header */}
                          <div 
                            className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors border-b"
                            onClick={() => toggleCampaignCollapse(campaignName)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  )}
                                  <Building className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900">{campaignName}</h3>
                                  <p className="text-sm text-gray-500">{assets.length} Live Asset{assets.length > 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <Badge className="bg-blue-100 text-blue-800">
                                {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                              </Badge>
                            </div>
                          </div>

                          {/* Campaign Assets */}
                          {!isCollapsed && (
                            <div className="p-4 space-y-4">
                              {assets.map((asset) => (
                                <MonitoringAssetCard 
                                  key={asset.id} 
                                  asset={asset} 
                                  onUpdate={updateMonitoringData}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
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
                  Password *
                </label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  placeholder="Enter password"
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
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="monitoring_operator">Monitoring Operator</SelectItem>
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
                disabled={!userForm.company_name || !userForm.contact_name || !userForm.email || !userForm.password}
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
                  Password
                </label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  placeholder="Leave empty to keep current password"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only enter a password if you want to change it
                </p>
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
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="monitoring_operator">Monitoring Operator</SelectItem>
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

        {/* Campaign Details Dialog */}
        <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
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
                      {selectedCampaign.campaign_assets.map((offer, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-sm">{offer.asset_name || `Asset ${index + 1}`}</span>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                className={`text-xs ${
                                  offer.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                  offer.status === 'Accepted' ? 'bg-blue-100 text-blue-800' :
                                  offer.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {offer.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500">
                            Asset ID: {offer.asset_id}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                            <div>
                              <strong>Request Date:</strong> {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'Not set'}
                            </div>
                            <div>
                              <strong>Duration:</strong> {offer.duration_months ? `${offer.duration_months} months` : 'Not set'}
                            </div>
                          </div>
                          {offer.admin_quoted_price && (
                            <div className="text-xs">
                              <strong>Quoted Price:</strong> <span className="text-green-600 font-medium">৳{offer.admin_quoted_price.toLocaleString()}</span>
                            </div>
                          )}
                          {offer.buyer_budget && (
                            <div className="text-xs">
                              <strong>Buyer Budget:</strong> ৳{offer.buyer_budget.toLocaleString()}
                            </div>
                          )}
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
                  <div className="flex items-center space-x-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Google Map Link
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paste the full Google Maps link to automatically populate address, district, and division</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    value={assetForm.google_map_link}
                    onChange={(e) => setAssetForm({...assetForm, google_map_link: e.target.value})}
                    onBlur={(e) => handleGoogleMapLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
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

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Select 
                      value={assetForm.division} 
                      onValueChange={(value) => {
                        setAssetForm({
                          ...assetForm, 
                          division: value,
                          district: '', // Reset district when division changes
                          area: '' // Reset area when division changes
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDivisions().map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <Select 
                      value={assetForm.district} 
                      onValueChange={(value) => {
                        setAssetForm({
                          ...assetForm, 
                          district: value,
                          area: '' // Reset area when district changes
                        });
                      }}
                      disabled={!assetForm.division}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={assetForm.division ? "Select district" : "Select division first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {assetForm.division && getDistricts(assetForm.division).map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area *
                    </label>
                    <Select 
                      value={assetForm.area} 
                      onValueChange={(value) => setAssetForm({...assetForm, area: value})}
                      disabled={!assetForm.district}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={assetForm.district ? "Select area" : "Select district first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {assetForm.division && assetForm.district && getAreas(assetForm.division, assetForm.district).map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
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

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Pricing (৳) *
                  </label>
                  
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
                disabled={!assetForm.name || !assetForm.address || !assetForm.district || !assetForm.division || !assetForm.pricing.monthly_rate || !assetForm.seller_id}
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
                  <div className="flex items-center space-x-2 mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Google Map Link
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="w-4 h-4 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Paste the full Google Maps link to automatically populate address, district, and division</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    value={assetForm.google_map_link}
                    onChange={(e) => setAssetForm({...assetForm, google_map_link: e.target.value})}
                    onBlur={(e) => handleGoogleMapLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
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

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Division *
                    </label>
                    <Select 
                      value={assetForm.division} 
                      onValueChange={(value) => {
                        setAssetForm({
                          ...assetForm, 
                          division: value,
                          district: '', // Reset district when division changes
                          area: '' // Reset area when division changes
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDivisions().map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      District *
                    </label>
                    <Select 
                      value={assetForm.district} 
                      onValueChange={(value) => {
                        setAssetForm({
                          ...assetForm, 
                          district: value,
                          area: '' // Reset area when district changes
                        });
                      }}
                      disabled={!assetForm.division}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={assetForm.division ? "Select district" : "Select division first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {assetForm.division && getDistricts(assetForm.division).map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area *
                    </label>
                    <Select 
                      value={assetForm.area} 
                      onValueChange={(value) => setAssetForm({...assetForm, area: value})}
                      disabled={!assetForm.district}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={assetForm.district ? "Select area" : "Select district first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-48 overflow-y-auto">
                        {assetForm.division && assetForm.district && getAreas(assetForm.division, assetForm.district).map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
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
                disabled={!assetForm.name || !assetForm.address || !assetForm.district || !assetForm.division || !assetForm.pricing.monthly_rate || !assetForm.seller_id}
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

        {/* Group Quote Dialog */}
        <Dialog open={showGroupQuoteDialog} onOpenChange={setShowGroupQuoteDialog}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Group Quote - {groupQuoteForm.buyerEmail}</span>
              </DialogTitle>
            </DialogHeader>
            
            {groupQuoteForm.offers.length > 0 && (
              <div className="space-y-6">
                {/* Group Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Quoting {groupQuoteForm.offers.length} Assets for Bundle Discount
                  </h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Individual Total:</span>
                      <div className="text-lg font-bold text-blue-900">
                        ৳{Object.values(groupQuoteForm.individualPrices)
                          .reduce((sum, price) => sum + (parseFloat(price) || 0), 0)
                          .toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Group Price:</span>
                      <div className="text-lg font-bold text-green-900">
                        ৳{(parseFloat(groupQuoteForm.groupPrice) || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-orange-700 font-medium">Bundle Savings:</span>
                      <div className="text-lg font-bold text-orange-900">
                        ৳{Math.max(0, Object.values(groupQuoteForm.individualPrices)
                          .reduce((sum, price) => sum + (parseFloat(price) || 0), 0) - 
                          (parseFloat(groupQuoteForm.groupPrice) || 0)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Asset Pricing */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Individual Asset Pricing</h3>
                  <div className="space-y-3">
                    {groupQuoteForm.offers.map((offer, index) => (
                      <div key={offer.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{offer.asset_name}</div>
                          <div className="text-sm text-gray-600">{offer.campaign_name}</div>
                        </div>
                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="Individual price"
                            value={groupQuoteForm.individualPrices[offer.id] || ''}
                            onChange={(e) => setGroupQuoteForm({
                              ...groupQuoteForm,
                              individualPrices: {
                                ...groupQuoteForm.individualPrices,
                                [offer.id]: e.target.value
                              }
                            })}
                            className="text-right"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Group Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Group Price (Discounted Total) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                    <Input
                      type="number"
                      placeholder="Enter group bundle price"
                      value={groupQuoteForm.groupPrice}
                      onChange={(e) => setGroupQuoteForm({...groupQuoteForm, groupPrice: e.target.value})}
                      className="pl-8 text-right font-medium text-lg border-2 border-green-200 focus:border-green-400"
                      required
                    />
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Recommended: Offer 10-20% discount from individual total for bulk purchase
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Group Quote Notes
                  </label>
                  <Textarea
                    value={groupQuoteForm.notes}
                    onChange={(e) => setGroupQuoteForm({...groupQuoteForm, notes: e.target.value})}
                    placeholder="Add notes about the group discount, bundle terms, or special conditions..."
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGroupQuoteDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      // Submit group quote logic here
                      notify.success('Group quote feature will be implemented!');
                      setShowGroupQuoteDialog(false);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!groupQuoteForm.groupPrice}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Submit Group Quote
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Asset Details Dialog */}
        <Dialog open={!!selectedAsset} onOpenChange={() => {
          setSelectedAsset(null);
          setSelectedImageIndex(0);
          setShowImageModal(false);
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${selectedAsset?.status === 'Available' ? 'bg-green-500' : selectedAsset?.status === 'Booked' ? 'bg-orange-500' : 'bg-gray-500'}`} />
                <span>{selectedAsset?.name}</span>
                <Badge variant="secondary">{selectedAsset?.type}</Badge>
              </DialogTitle>
            </DialogHeader>
            
            {selectedAsset && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Images and Basic Info */}
                <div className="space-y-4">
                  {/* Image Gallery */}
                  {selectedAsset.photos && selectedAsset.photos.length > 0 && (
                    <div>
                      {/* Main selected image */}
                      <div 
                        className="mb-3 cursor-pointer relative"
                        onClick={() => setShowImageModal(true)}
                      >
                        <img 
                          src={selectedAsset.photos[selectedImageIndex || 0]} 
                          alt={`${selectedAsset.name} - Image ${(selectedImageIndex || 0) + 1}`}
                          className="w-full h-64 object-cover rounded-lg shadow-sm"
                        />
                      </div>
                      
                      {/* Dot navigation if more than one image */}
                      {selectedAsset.photos.length > 1 && (
                        <div className="flex justify-center space-x-3 mt-3">
                          {selectedAsset.photos.map((_, index) => (
                            <button
                              key={index}
                              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                                index === (selectedImageIndex || 0)
                                  ? 'bg-orange-500 transform scale-125' 
                                  : 'bg-gray-400 hover:bg-gray-600'
                              }`}
                              onClick={() => setSelectedImageIndex(index)}
                              aria-label={`View image ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* Image counter */}
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        {selectedAsset.photos.length > 1 
                          ? `Image ${(selectedImageIndex || 0) + 1} of ${selectedAsset.photos.length} • Click to view larger`
                          : 'Click to view larger'
                        }
                      </p>
                    </div>
                  )}

                  {/* Asset Basic Information */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Building className="w-4 h-4 mr-2" />
                      Asset Information
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <div className="font-medium">{selectedAsset.type}</div>
                      </div>
                      
                      {selectedAsset.dimensions && (
                        <div>
                          <span className="text-gray-500">Dimensions:</span>
                          <div className="font-medium">{selectedAsset.dimensions}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                      <MapPin className="w-4 h-4 mr-2" />
                      Location
                    </h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start">
                        <span className="font-medium text-gray-700">{selectedAsset.address}</span>
                      </div>
                      
                      {selectedAsset.district && selectedAsset.division && (
                        <div className="text-gray-600">
                          {selectedAsset.district}, {selectedAsset.division}
                        </div>
                      )}
                      
                      {/* Coordinates Display */}
                      {selectedAsset.location && selectedAsset.location.lat && selectedAsset.location.lng && (
                        <div className="text-xs text-gray-500">
                          📍 {selectedAsset.location.lat}, {selectedAsset.location.lng}
                        </div>
                      )}
                    </div>
                    
                    {/* Google Map Embed */}
                    {selectedAsset.location && selectedAsset.location.lat && selectedAsset.location.lng && (
                      <div className="mt-3 h-48 rounded overflow-hidden">
                        <iframe
                          src={`https://www.google.com/maps/embed/v1/place?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&q=${selectedAsset.location.lat},${selectedAsset.location.lng}&zoom=16`}
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen=""
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title={`Map of ${selectedAsset.name}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Pricing and Details */}
                <div className="space-y-4">
                  {/* Pricing Information */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Pricing Information
                    </h4>
                    
                    <div className="space-y-3">
                      {selectedAsset.pricing?.monthly_rate && selectedAsset.pricing.monthly_rate > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Monthly Rate:</span>
                          <span className="font-bold text-green-600">৳{selectedAsset.pricing.monthly_rate.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {selectedAsset.pricing?.yearly_rate && selectedAsset.pricing.yearly_rate > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Yearly Rate:</span>
                          <span className="font-bold text-green-600">৳{selectedAsset.pricing.yearly_rate.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Status</h4>
                    <div className="flex items-center space-x-2 mb-3">
                      <Badge 
                        variant={selectedAsset.status === 'Available' ? 'success' : selectedAsset.status === 'Booked' ? 'secondary' : 'default'}
                        className={
                          selectedAsset.status === 'Available' ? 'bg-green-100 text-green-800' :
                          selectedAsset.status === 'Booked' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }
                      >
                        {selectedAsset.status}
                      </Badge>
                    </div>
                    
                    {selectedAsset.next_available_date && (
                      <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Next available: {new Date(selectedAsset.next_available_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Seller Information */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center mb-3">
                      <Users className="w-4 h-4 mr-2" />
                      Seller Information
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="font-medium">{selectedAsset.seller_name}</div>
                    </div>
                  </div>

                  {/* Technical Specifications */}
                  {selectedAsset.specifications && Object.keys(selectedAsset.specifications).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Technical Details</h4>
                      <div className="space-y-2 text-sm">
                        {Object.entries(selectedAsset.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-500 capitalize">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedAsset.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {selectedAsset.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Image Modal for larger view */}
        {showImageModal && selectedAsset?.photos && (
          <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
            <DialogContent className="max-w-4xl max-h-[95vh] p-2">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-center">
                  {selectedAsset.name} - Image {(selectedImageIndex || 0) + 1} of {selectedAsset.photos.length}
                </DialogTitle>
              </DialogHeader>
              
              <div className="relative">
                {/* Large image display */}
                <img 
                  src={selectedAsset.photos[selectedImageIndex || 0]} 
                  alt={`${selectedAsset.name} - Image ${(selectedImageIndex || 0) + 1}`}
                  className="w-full max-h-[70vh] object-contain mx-auto"
                />
                
                {/* Navigation arrows */}
                {selectedAsset.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex((prev) => 
                        (prev || 0) === 0 ? selectedAsset.photos.length - 1 : (prev || 0) - 1
                      )}
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                    >
                      <ChevronDown className="w-6 h-6 transform rotate-90" />
                    </button>
                    
                    <button
                      onClick={() => setSelectedImageIndex((prev) => 
                        (prev || 0) === selectedAsset.photos.length - 1 ? 0 : (prev || 0) + 1
                      )}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2"
                    >
                      <ChevronDown className="w-6 h-6 transform -rotate-90" />
                    </button>
                  </>
                )}
                
                {/* Thumbnail navigation at bottom */}
                {selectedAsset.photos.length > 1 && (
                  <div className="flex justify-center space-x-2 mt-4 overflow-x-auto">
                    {selectedAsset.photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`flex-shrink-0 cursor-pointer border-2 rounded overflow-hidden ${
                          index === (selectedImageIndex || 0)
                            ? 'border-orange-500' 
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <img 
                          src={photo} 
                          alt={`Thumbnail ${index + 1}`}
                          className="w-12 h-12 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

// Monitoring Asset Card Component
const MonitoringAssetCard = ({ asset, onUpdate }) => {
  const [monitoringForm, setMonitoringForm] = useState({
    condition_status: 'Excellent',
    maintenance_status: 'Up to date',
    active_issues: '',
    inspection_notes: '',
    photos: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Fetch existing monitoring data when component mounts
  useEffect(() => {
    fetchMonitoringData();
  }, [asset.id]);

  const fetchMonitoringData = async () => {
    try {
      const response = await axios.get(`${API}/assets/${asset.id}/monitoring`, {
        headers: getAuthHeaders()
      });
      setMonitoringForm({
        condition_status: response.data.condition_status || 'Excellent',
        maintenance_status: response.data.maintenance_status || 'Up to date', 
        active_issues: response.data.active_issues || '',
        inspection_notes: response.data.inspection_notes || '',
        photos: asset.photos || [] // Use asset photos as current photos
      });
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      // Use defaults if no monitoring data exists
      setMonitoringForm({
        condition_status: 'Excellent',
        maintenance_status: 'Up to date',
        active_issues: '',
        inspection_notes: '',
        photos: asset.photos || []
      });
    }
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setPhotoUploading(true);
    try {
      // Use the same backend upload approach as other components
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file); // Changed from 'images' to 'files'
      });
      
      const response = await axios.post(`${API}/upload/images`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Add uploaded image URLs to form
      const uploadedUrls = response.data.images.map(img => img.url);
      setMonitoringForm(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
      
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos: ' + (error.response?.data?.detail || error.message));
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = (indexToRemove) => {
    setMonitoringForm(prev => ({
      ...prev,
      photos: prev.photos.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onUpdate(asset.id, monitoringForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchMonitoringData(); // Reset form to original data
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          {/* Asset Image */}
          {asset.photos && asset.photos[0] && (
            <img 
              src={asset.photos[0]} 
              alt={asset.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}
          
          {/* Asset Info */}
          <div>
            <h4 className="font-semibold text-gray-900">{asset.name}</h4>
            <p className="text-sm text-blue-600 font-medium">{asset.campaign_name || 'Unknown Campaign'}</p>
            <p className="text-sm text-gray-600">{asset.address}</p>
            <p className="text-xs text-gray-500">{asset.district}, {asset.division}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className="bg-green-100 text-green-800 text-xs">
                {asset.status}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <div>
          {!isEditing ? (
            <Button 
              onClick={() => setIsEditing(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit Monitoring
            </Button>
          ) : (
            <div className="flex space-x-2">
              <Button 
                onClick={handleSave}
                size="sm"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button 
                onClick={handleCancel}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Monitoring Form */}
      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Condition Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Overall Condition *
            </label>
            <Select 
              value={monitoringForm.condition_status}
              onValueChange={(value) => setMonitoringForm({...monitoringForm, condition_status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excellent">Excellent</SelectItem>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Needs Attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Maintenance Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maintenance Status *
            </label>
            <Select 
              value={monitoringForm.maintenance_status}
              onValueChange={(value) => setMonitoringForm({...monitoringForm, maintenance_status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Up to date">Up to date</SelectItem>
                <SelectItem value="Due soon">Due soon</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Issues */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Active Issues
            </label>
            <Textarea
              placeholder="Describe any current issues with the asset (leave empty if none)..."
              value={monitoringForm.active_issues}
              onChange={(e) => setMonitoringForm({...monitoringForm, active_issues: e.target.value})}
              rows={2}
            />
          </div>

          {/* Inspection Notes */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inspection Notes
            </label>
            <Textarea
              placeholder="Add detailed inspection notes, observations, or maintenance recommendations..."
              value={monitoringForm.inspection_notes}
              onChange={(e) => setMonitoringForm({...monitoringForm, inspection_notes: e.target.value})}
              rows={3}
            />
          </div>

          {/* Photo Management */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Photos ({monitoringForm.photos.length} photos)
            </label>
            
            {/* Current Photos */}
            {monitoringForm.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-3">
                {monitoringForm.photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Asset photo ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Photo Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="flex items-center justify-center">
                  <label className="cursor-pointer">
                    <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      {photoUploading ? 'Uploading...' : 'Upload new photos'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={photoUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click to add monitoring photos (JPG, PNG)
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Display Current Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CONDITION</label>
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
              monitoringForm.condition_status === 'Excellent' ? 'bg-green-100 text-green-800' :
              monitoringForm.condition_status === 'Good' ? 'bg-yellow-100 text-yellow-800' :
              monitoringForm.condition_status === 'Fair' ? 'bg-orange-100 text-orange-800' :
              'bg-red-100 text-red-800'
            }`}>
              <CheckCircle className="w-3 h-3 mr-1" />
              {monitoringForm.condition_status}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">MAINTENANCE</label>
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
              monitoringForm.maintenance_status === 'Up to date' ? 'bg-green-100 text-green-800' :
              monitoringForm.maintenance_status === 'Due soon' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              <Clock className="w-3 h-3 mr-1" />
              {monitoringForm.maintenance_status}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ISSUES</label>
            <div className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
              monitoringForm.active_issues ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              <AlertCircle className="w-3 h-3 mr-1" />
              {monitoringForm.active_issues ? 'Issues reported' : 'None reported'}
            </div>
          </div>

          {/* Notes Preview */}
          {monitoringForm.inspection_notes && (
            <div className="md:col-span-3 mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">LATEST NOTES</label>
              <p className="text-sm text-gray-700 bg-white p-2 rounded border-l-4 border-blue-500">
                "{monitoringForm.inspection_notes.slice(0, 100)}{monitoringForm.inspection_notes.length > 100 ? '...' : ''}"
              </p>
            </div>
          )}

          {/* Photos Preview */}
          {monitoringForm.photos.length > 0 && (
            <div className="md:col-span-3 mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-2">CURRENT PHOTOS ({monitoringForm.photos.length})</label>
              <div className="flex space-x-2 overflow-x-auto">
                {monitoringForm.photos.slice(0, 4).map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Asset photo ${index + 1}`}
                    className="w-16 h-16 object-cover rounded border flex-shrink-0 cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => window.open(photo, '_blank')}
                  />
                ))}
                {monitoringForm.photos.length > 4 && (
                  <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                    <span className="text-xs text-gray-500">+{monitoringForm.photos.length - 4}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;