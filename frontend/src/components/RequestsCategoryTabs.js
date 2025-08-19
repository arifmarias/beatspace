import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Activity, 
  Search, 
  Building2, 
  Calendar,
  DollarSign,
  Upload,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format } from 'date-fns';

const RequestsCategoryTabs = ({
  requestedOffers,
  requestedOffersLoading,
  fetchRequestedOffers,
  navigate,
  onApproveOffer,
  onRejectOffer,
  onReviseOffer,
  onCancelRequest,
  onEditOffer,
  onPOUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');

  // Handle PO file upload
  const handlePOFileUpload = (offerId, event) => {
    const file = event.target.files[0];
    if (file && onPOUpload) {
      onPOUpload(offerId, file);
    }
  };

  // Categorize requests
  const categorizedRequests = useMemo(() => {
    const filtered = (requestedOffers || []).filter(offer => 
      offer.status !== 'Approved' && offer.status !== 'Accepted'
    );

    return {
      all: filtered,
      asset_booking: filtered.filter(offer => 
        !offer.request_type || offer.request_type === 'asset_booking'
      ),
      monitoring_service: filtered.filter(offer => 
        offer.request_type === 'monitoring_service'
      ),
      additional_service: filtered.filter(offer => 
        offer.request_type === 'additional_service'
      )
    };
  }, [requestedOffers]);

  // Filter requests based on search and status
  const getFilteredRequests = (category) => {
    let requests = categorizedRequests[category] || [];
    
    if (searchTerm) {
      requests = requests.filter(request => 
        (request.asset_name && request.asset_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.campaign?.name && request.campaign.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.service_details?.frequency && request.service_details.frequency.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.status && request.status.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      requests = requests.filter(request => request.status === statusFilter);
    }

    return requests;
  };

  const getStatusBadgeProps = (status, requestType) => {
    if (requestType === 'monitoring_service') {
      switch (status) {
        case 'Pending':
          return { variant: 'secondary', className: 'bg-orange-100 text-orange-800 border-orange-300' };
        case 'Quoted':
          return { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-300' };
        case 'PO Required':
        case 'PO Uploaded':
          return { variant: 'default', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
        case 'Approved':
          return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
        default:
          return { variant: 'secondary', className: '' };
      }
    }
    
    // Default for asset booking
    switch (status) {
      case 'Pending':
        return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'Quoted':
        return { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'PO Required':
        return { variant: 'default', className: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'Revise Request':
        return { variant: 'default', className: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'Accepted':
        return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
      case 'Rejected':
        return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' };
      default:
        return { variant: 'secondary', className: '' };
    }
  };

  const renderAssetBookingCard = (request) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{request.asset_name}</span>
            </h3>
            <p className="text-sm text-gray-500">Campaign: {request.campaign_name || request.campaign?.name || 'N/A'}</p>
          </div>
          <Badge {...getStatusBadgeProps(request.status)}>
            {request.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-sm">
              {request.admin_quoted_price ? 
                `৳${request.admin_quoted_price.toLocaleString()}` : 
                'Pending Quote'
              }
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">{request.contract_duration?.replace('_', ' ') || request.duration || '3 months'}</span>
          </div>
          
          {/* Additional Services Display */}
          {request.service_bundles && (
            <div className="mt-2 space-y-1">
              {Object.entries(request.service_bundles).some(([_, selected]) => selected) && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Services: </span>
                  {Object.entries(request.service_bundles)
                    .filter(([_, selected]) => selected)
                    .map(([service, _]) => {
                      if (service === 'monitoring' && request.monitoring_service_level) {
                        const level = request.monitoring_service_level;
                        
                        let frequency = '';
                        if (level === 'basic') {
                          frequency = 'Basic - Monthly';
                        } else if (level === 'standard') {
                          frequency = 'Standard - Weekly';
                        } else if (level === 'premium') {
                          frequency = 'Premium - Daily';
                        } else {
                          frequency = level.charAt(0).toUpperCase() + level.slice(1);
                        }
                        
                        return `Monitoring (${frequency})`;
                      }
                      return service.charAt(0).toUpperCase() + service.slice(1);
                    })
                    .join(', ')
                  }
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Submitted: {format(new Date(request.created_at), 'MMM dd, yyyy')}
          </span>
          <div className="flex items-center space-x-2">
            {/* Actions based on status */}
            {request.status === 'Pending' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-blue-600 border-blue-300"
                  onClick={() => onEditOffer && onEditOffer(request)}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-300"
                  onClick={() => onCancelRequest && onCancelRequest(request)}
                >
                  Delete
                </Button>
              </>
            )}
            {request.status === 'Quoted' && request.admin_quoted_price && (
              <>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onApproveOffer && onApproveOffer(request)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-orange-600 border-orange-300"
                  onClick={() => onReviseOffer && onReviseOffer(request)}
                >
                  Revise Offer
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-red-600 border-red-300"
                  onClick={() => onCancelRequest && onCancelRequest(request)}
                >
                  Cancel
                </Button>
              </>
            )}
            {request.status === 'PO Required' && (
              <div className="relative">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handlePOFileUpload(request.id, e)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id={`po-upload-${request.id}`}
                />
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload PO
                </Button>
              </div>
            )}
            {request.status === 'Revise Request' && (
              <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" disabled>
                <Clock className="w-4 h-4 mr-1" />
                Revision Requested
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMonitoringServiceCard = (request) => {
    const serviceDetails = request.service_details || {};
    
    const getMonitoringStatus = (status) => {
      switch (status) {
        case 'Pending': return 'Waiting for Quote';
        case 'Quoted': return 'Quote Received';
        case 'PO Required': return 'PO Required';
        case 'PO Uploaded': return 'Awaiting Activation';
        case 'Approved': return 'Service Activated';
        default: return status;
      }
    };

    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg flex items-center space-x-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <span>Monitoring Service</span>
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  {serviceDetails.service_level || 'Standard'}
                </Badge>
              </h3>
              <p className="text-sm text-gray-500">
                {serviceDetails.asset_ids?.length || 0} assets • {serviceDetails.frequency || 'Monthly'} monitoring
              </p>
            </div>
            <Badge {...getStatusBadgeProps(request.status, 'monitoring_service')}>
              {getMonitoringStatus(request.status)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">
                {request.quoted_price ? 
                  `৳${request.quoted_price.toLocaleString()}` : 
                  'Pending Quote'
                }
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="text-sm capitalize">{serviceDetails.frequency || 'Monthly'}</span>
            </div>
          </div>

          {serviceDetails.start_date && serviceDetails.end_date && (
            <div className="text-xs text-gray-500 mb-3">
              Duration: {format(new Date(serviceDetails.start_date), 'MMM dd')} - {format(new Date(serviceDetails.end_date), 'MMM dd, yyyy')}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Submitted: {format(new Date(request.created_at), 'MMM dd, yyyy')}
            </span>
            <div className="flex items-center space-x-2">
              {request.status === 'Quoted' && (
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Upload className="w-4 h-4 mr-1" />
                  Upload PO
                </Button>
              )}
              {request.status === 'PO Uploaded' && (
                <Button size="sm" variant="outline" className="text-orange-600 border-orange-300" disabled>
                  <Clock className="w-4 h-4 mr-1" />
                  Pending Activation
                </Button>
              )}
              {request.status === 'Approved' && (
                <Button size="sm" variant="outline" className="text-green-600 border-green-300" disabled>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Active
                </Button>
              )}
              <Button size="sm" variant="ghost">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAdditionalServiceCard = (request) => (
    <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg flex items-center space-x-2">
              <Settings className="w-5 h-5 text-orange-600" />
              <span>Additional Service</span>
            </h3>
            <p className="text-sm text-gray-500">Related to: {request.campaign?.name}</p>
          </div>
          <Badge {...getStatusBadgeProps(request.status)}>
            {request.status}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Submitted: {format(new Date(request.created_at), 'MMM dd, yyyy')}
          </span>
          <Button size="sm" variant="ghost">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderRequestCard = (request) => {
    switch (request.request_type) {
      case 'monitoring_service':
        return renderMonitoringServiceCard(request);
      case 'additional_service':
        return renderAdditionalServiceCard(request);
      default:
        return renderAssetBookingCard(request);
    }
  };

  const currentRequests = getFilteredRequests(activeCategory);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Requested Offers</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchRequestedOffers}
            disabled={requestedOffersLoading}
            className="flex items-center space-x-1"
          >
            <Activity className="w-4 h-4" />
            <span>{requestedOffersLoading ? 'Loading...' : 'Refresh'}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {Object.values(categorizedRequests).every(arr => arr.length === 0) ? (
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Offer Requests Yet</h3>
            <p className="text-gray-500 mb-4">
              You haven't submitted any requests yet.
            </p>
            <Button onClick={() => navigate('/marketplace')} className="bg-orange-600 hover:bg-orange-700">
              Explore Marketplace
            </Button>
          </div>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <span>All Requests</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categorizedRequests.all.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="asset_booking" className="flex items-center space-x-2">
                <span>Asset Requests</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {categorizedRequests.asset_booking.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="monitoring_service" className="flex items-center space-x-2">
                <span>Monitoring</span>
                <Badge variant="secondary" className="ml-1 text-xs bg-purple-100 text-purple-800">
                  {categorizedRequests.monitoring_service.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="additional_service" className="flex items-center space-x-2">
                <span>Additional</span>
                <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-800">
                  {categorizedRequests.additional_service.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Quoted">Quoted</option>
                <option value="PO Required">PO Required</option>
                <option value="PO Uploaded">PO Uploaded</option>
                <option value="Approved">Approved</option>
              </select>
              <span className="text-sm text-gray-500">
                {currentRequests.length} request{currentRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Content for each category */}
            <TabsContent value="all" className="space-y-4">
              <div className="grid gap-4">
                {currentRequests.map(renderRequestCard)}
              </div>
            </TabsContent>

            <TabsContent value="asset_booking" className="space-y-4">
              <div className="grid gap-4">
                {currentRequests.map(renderRequestCard)}
              </div>
            </TabsContent>

            <TabsContent value="monitoring_service" className="space-y-4">
              <div className="grid gap-4">
                {currentRequests.map(renderRequestCard)}
              </div>
            </TabsContent>

            <TabsContent value="additional_service" className="space-y-4">
              <div className="grid gap-4">
                {currentRequests.map(renderRequestCard)}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestsCategoryTabs;