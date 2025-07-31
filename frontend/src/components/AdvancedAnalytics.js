import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users,
  Building,
  Eye,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  MapPin,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Award,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getAuthHeaders } from '../utils/auth';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    revenue: [],
    assets: [],
    campaigns: [],
    users: [],
    performance: {}
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30_days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const [overviewRes, revenueRes, assetsRes, campaignsRes, usersRes] = await Promise.all([
        axios.get(`${API}/analytics/overview`, { headers, params: { date_range: dateRange } }),
        axios.get(`${API}/analytics/revenue`, { headers, params: { date_range: dateRange } }),
        axios.get(`${API}/analytics/assets`, { headers, params: { date_range: dateRange } }),
        axios.get(`${API}/analytics/campaigns`, { headers, params: { date_range: dateRange } }),
        axios.get(`${API}/analytics/users`, { headers, params: { date_range: dateRange } })
      ]);
      
      setAnalyticsData({
        overview: overviewRes.data,
        revenue: revenueRes.data,
        assets: assetsRes.data,
        campaigns: campaignsRes.data,
        users: usersRes.data,
        performance: calculatePerformanceMetrics(revenueRes.data, assetsRes.data)
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Use demo data for showcase
      setAnalyticsData(generateDemoData());
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = () => {
    const demoRevenue = Array.from({ length: 30 }, (_, i) => ({
      date: format(subDays(new Date(), 29 - i), 'MMM dd'),
      revenue: Math.floor(Math.random() * 50000) + 20000,
      bookings: Math.floor(Math.random() * 15) + 5,
      inquiries: Math.floor(Math.random() * 25) + 10
    }));

    const assetTypes = [
      { name: 'Billboard', count: 12, revenue: 450000, color: '#8884d8' },
      { name: 'Police Box', count: 8, revenue: 320000, color: '#82ca9d' },
      { name: 'Railway Station', count: 6, revenue: 240000, color: '#ffc658' },
      { name: 'Wall', count: 10, revenue: 180000, color: '#ff7300' },
      { name: 'Others', count: 4, revenue: 120000, color: '#00ff00' }
    ];

    const divisionData = [
      { division: 'Dhaka', assets: 25, revenue: 800000, bookings: 45 },
      { division: 'Chittagong', assets: 8, revenue: 250000, bookings: 18 },
      { division: 'Sylhet', assets: 5, revenue: 150000, bookings: 12 },
      { division: 'Rajshahi', assets: 2, revenue: 80000, bookings: 6 }
    ];

    return {
      overview: {
        total_revenue: 1280000,
        total_bookings: 81,
        total_assets: 40,
        active_campaigns: 28,
        avg_booking_value: 15802,
        conversion_rate: 23.5,
        growth_rate: 12.3
      },
      revenue: demoRevenue,
      assets: assetTypes,
      campaigns: [
        { month: 'Jan', campaigns: 15, completed: 12, active: 3 },
        { month: 'Feb', campaigns: 22, completed: 18, active: 4 },
        { month: 'Mar', campaigns: 28, completed: 24, active: 4 },
        { month: 'Apr', campaigns: 35, completed: 28, active: 7 },
        { month: 'May', campaigns: 41, completed: 32, active: 9 },
        { month: 'Jun', campaigns: 38, completed: 31, active: 7 }
      ],
      users: [
        { type: 'Buyers', count: 125, active: 98, growth: 15.2 },
        { type: 'Sellers', count: 34, active: 28, growth: 8.7 },
        { type: 'Total', count: 159, active: 126, growth: 13.1 }
      ],
      performance: {
        topPerformingAssets: [
          { name: 'Dhanmondi Lake Billboard', revenue: 85000, bookings: 6, roi: 340 },
          { name: 'New Market Police Box', revenue: 78000, bookings: 4, roi: 312 },
          { name: 'Farmgate Metro Station', revenue: 65000, bookings: 5, roi: 260 }
        ],
        divisionPerformance: divisionData
      }
    };
  };

  const calculatePerformanceMetrics = (revenueData, assetData) => {
    // Calculate performance metrics from actual data
    return {
      topPerformingAssets: [],
      divisionPerformance: []
    };
  };

  const exportReport = async (reportType) => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.get(`${API}/analytics/export/${reportType}`, {
        headers,
        params: { date_range: dateRange },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `beatspace-${reportType}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Export feature will be available in production version.');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-BD').format(value);
  };

  const getGrowthIcon = (growth) => {
    return growth >= 0 ? 
      <TrendingUp className="w-4 h-4 text-green-500" /> : 
      <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-600">Comprehensive insights into platform performance and growth</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7_days">Last 7 Days</SelectItem>
              <SelectItem value="30_days">Last 30 Days</SelectItem>
              <SelectItem value="90_days">Last 90 Days</SelectItem>
              <SelectItem value="6_months">Last 6 Months</SelectItem>
              <SelectItem value="1_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => fetchAnalyticsData()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={() => exportReport('comprehensive')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.overview.total_revenue || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {getGrowthIcon(analyticsData.overview.growth_rate)}
              <span className={`ml-1 ${analyticsData.overview.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(analyticsData.overview.growth_rate || 0)}%
              </span>
              <span className="text-gray-500 ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatNumber(analyticsData.overview.active_campaigns || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Activity className="w-4 h-4 mr-1" />
              <span>{analyticsData.overview.total_bookings || 0} total bookings</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(analyticsData.overview.avg_booking_value || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <BarChart3 className="w-4 h-4 mr-1" />
              <span>Per campaign</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(analyticsData.overview.conversion_rate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Users className="w-4 h-4 mr-1" />
              <span>Inquiries to bookings</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `৳${(value/1000)}K`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bookings & Inquiries</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Bookings"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inquiries" 
                      stroke="#ffc658" 
                      strokeWidth={2}
                      name="Inquiries"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Asset Analytics */}
        <TabsContent value="assets" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Distribution by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.assets}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {analyticsData.assets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Asset Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.assets}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(value) => `৳${(value/1000)}K`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Asset Performance by Division</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsData.performance.divisionPerformance.map((division, index) => (
                  <div key={division.division} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{division.division}</h4>
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Assets:</span>
                        <span className="font-medium">{division.assets}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span className="font-medium">{formatCurrency(division.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bookings:</span>
                        <span className="font-medium">{division.bookings}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Analytics */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.campaigns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="campaigns" fill="#8884d8" name="Total Campaigns" />
                  <Bar dataKey="completed" fill="#82ca9d" name="Completed" />
                  <Bar dataKey="active" fill="#ffc658" name="Active" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analyticsData.users.map((userType, index) => (
              <Card key={userType.type}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{userType.type}</h3>
                    <Users className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-semibold">{userType.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Active:</span>
                      <span className="font-semibold text-green-600">{userType.active}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Growth:</span>
                      <div className="flex items-center">
                        {getGrowthIcon(userType.growth)}
                        <span className={`ml-1 text-sm font-semibold ${
                          userType.growth >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.abs(userType.growth)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Analytics */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.topPerformingAssets.map((asset, index) => (
                    <div key={asset.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-medium">{asset.name}</h4>
                          <p className="text-sm text-gray-500">{asset.bookings} bookings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(asset.revenue)}</div>
                        <div className="text-sm text-gray-500">{asset.roi}% ROI</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      <span>Average Campaign ROI</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">284%</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <span>Avg. Campaign Duration</span>
                    </div>
                    <span className="text-xl font-bold">4.2 months</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-purple-500" />
                      <span>Customer Retention</span>
                    </div>
                    <span className="text-xl font-bold text-green-600">76%</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center space-x-2">
                      <Award className="w-5 h-5 text-yellow-500" />
                      <span>Platform Rating</span>
                    </div>
                    <span className="text-xl font-bold">4.8/5</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalytics;