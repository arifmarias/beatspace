import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MessageSquare, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  Send,
  Calendar,
  Building,
  User,
  MapPin,
  FileText,
  Mail,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { getAuthHeaders } from '../utils/auth';
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OfferMediationPanel = () => {
  const [offerRequests, setOfferRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediationForm, setMediationForm] = useState({
    finalPricing: {},
    terms: '',
    timeline: '',
    services: [],
    notes: '',
    totalAmount: 0
  });

  useEffect(() => {
    fetchOfferRequests();
  }, []);

  const fetchOfferRequests = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const response = await axios.get(`${API}/admin/offer-requests`, { headers });
      const requests = response.data;
      
      // Fetch related campaign and asset data for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          try {
            const [campaignRes, assetsRes] = await Promise.all([
              axios.get(`${API}/campaigns/${request.campaign_id}`, { headers }),
              axios.get(`${API}/assets/batch`, { 
                headers,
                params: { ids: Object.keys(request.asset_requirements).join(',') }
              })
            ]);
            
            return {
              ...request,
              campaign: campaignRes.data,
              assets: assetsRes.data
            };
          } catch (error) {
            console.error('Error enriching request:', error);
            return request;
          }
        })
      );
      
      setOfferRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching offer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedTotal = (request) => {
    if (!request.assets) return 0;
    
    return request.assets.reduce((total, asset) => {
      const requirements = request.asset_requirements[asset.id];
      const duration = requirements?.duration || '3_months';
      const price = asset.pricing[duration] || Object.values(asset.pricing)[0] || 0;
      return total + price;
    }, 0);
  };

  const handleStartNegotiation = (request) => {
    setSelectedRequest(request);
    
    // Initialize form with estimated pricing
    const initialPricing = {};
    request.assets?.forEach(asset => {
      const requirements = request.asset_requirements[asset.id];
      const duration = requirements?.duration || '3_months';
      const price = asset.pricing[duration] || Object.values(asset.pricing)[0] || 0;
      initialPricing[asset.id] = price;
    });
    
    setMediationForm({
      finalPricing: initialPricing,
      terms: 'Standard terms and conditions apply. Payment due within 30 days of campaign approval.',
      timeline: 'Campaign setup: 5-7 business days. Go-live: Within 14 days of payment confirmation.',
      services: ['Professional installation', 'Monthly monitoring', 'Maintenance support'],
      notes: '',
      totalAmount: Object.values(initialPricing).reduce((sum, price) => sum + price, 0)
    });
  };

  const handleQuoteMonitoringService = async (request) => {
    const price = prompt('Enter quote price for monitoring service:');
    if (!price || isNaN(price)) return;
    
    try {
      const headers = getAuthHeaders();
      await axios.put(`${API}/offers/requests/${request.id}`, {
        status: 'Quoted',
        quoted_price: parseFloat(price)
      }, { headers });
      
      alert('Quote submitted successfully!');
      fetchOfferRequests();
    } catch (error) {
      console.error('Error quoting monitoring service:', error);
      alert('Failed to submit quote. Please try again.');
    }
  };

  const handleActivateMonitoringService = async (request) => {
    try {
      const headers = getAuthHeaders();
      await axios.post(`${API}/monitoring/services/activate/${request.id}`, {}, { headers });
      
      alert('Monitoring service activated successfully!');
      fetchOfferRequests();
    } catch (error) {
      console.error('Error activating monitoring service:', error);
      alert('Failed to activate monitoring service. Please try again.');
    }
  };

  const updateAssetPricing = (assetId, newPrice) => {
    const updatedPricing = {
      ...mediationForm.finalPricing,
      [assetId]: parseFloat(newPrice) || 0
    };
    
    const totalAmount = Object.values(updatedPricing).reduce((sum, price) => sum + price, 0);
    
    setMediationForm({
      ...mediationForm,
      finalPricing: updatedPricing,
      totalAmount
    });
  };

  const submitFinalOffer = async () => {
    try {
      const headers = getAuthHeaders();
      
      const offerData = {
        request_id: selectedRequest.id,
        campaign_id: selectedRequest.campaign_id,
        final_pricing: mediationForm.finalPricing,
        terms: mediationForm.terms,
        timeline: mediationForm.timeline,
        included_services: mediationForm.services,
        total_amount: mediationForm.totalAmount,
        admin_notes: mediationForm.notes,
        status: 'Offer Ready'
      };
      
      await axios.post(`${API}/admin/submit-final-offer`, offerData, { headers });
      
      // Send notification email to buyer
      await axios.post(`${API}/admin/notify-buyer`, {
        campaign_id: selectedRequest.campaign_id,
        type: 'offer_ready'
      }, { headers });
      
      alert('Final offer submitted successfully! Buyer has been notified.');
      setSelectedRequest(null);
      fetchOfferRequests();
      
    } catch (error) {
      console.error('Error submitting final offer:', error);
      alert('Failed to submit offer. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      'Offer Ready': 'bg-green-100 text-green-800',
      'Negotiating': 'bg-purple-100 text-purple-800',
      'Approved': 'bg-emerald-100 text-emerald-800',
      'Rejected': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading offer requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Offer Mediation</h2>
          <p className="text-gray-600">Process "Request Best Offer" submissions and negotiate with sellers</p>
        </div>
        <div className="flex space-x-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>{offerRequests.filter(r => r.status === 'Pending').length} Pending</span>
          </div>
          <div className="flex items-center">
            <MessageSquare className="w-4 h-4 mr-1" />
            <span>{offerRequests.filter(r => r.status === 'In Progress').length} In Progress</span>
          </div>
        </div>
      </div>

      {/* Offer Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5" />
            <span>Best Offer Requests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {offerRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>Estimated Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offerRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div>
                        {request.request_type === 'monitoring_service' ? (
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              MONITORING
                            </Badge>
                            <div className="font-medium">Monitoring Service</div>
                          </div>
                        ) : (
                          <div className="font-medium">{request.campaign?.name || 'Campaign'}</div>
                        )}
                        <div className="text-sm text-gray-500">
                          {request.request_type === 'monitoring_service' ? 
                            `${request.service_details?.frequency || 'Monthly'} ${request.service_details?.service_level || 'Standard'}` :
                            `Budget: ৳${request.campaign?.budget?.toLocaleString() || 'N/A'}`
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{request.campaign?.buyer_name || 'Buyer'}</div>
                        <div className="text-sm text-gray-500">
                          {request.request_type === 'monitoring_service' ?
                            `${request.service_details?.asset_ids?.length || 0} assets to monitor` :
                            `${Object.keys(request.asset_requirements || {}).length} assets selected`
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.request_type === 'monitoring_service' ? (
                        <div className="flex flex-col space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {request.service_details?.service_level || 'Standard'} Service
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {request.service_details?.frequency || 'Monthly'} Frequency
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {request.assets?.slice(0, 2).map(asset => (
                            <Badge key={asset.id} variant="outline" className="text-xs">
                              {asset.type}
                            </Badge>
                          ))}
                          {request.assets?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{request.assets.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {request.request_type === 'monitoring_service' ? 
                          (request.quoted_price ? `৳${request.quoted_price.toLocaleString()}` : 'Pending Quote') :
                          `৳${calculateEstimatedTotal(request).toLocaleString()}`
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Request Details</DialogTitle>
                            </DialogHeader>
                            {request.request_type === 'monitoring_service' ? (
                              <MonitoringServiceRequestModal request={request} onRefresh={fetchOfferRequests} />
                            ) : (
                              <RequestDetailsModal request={request} />
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {request.status === 'Pending' && request.request_type === 'monitoring_service' && (
                          <Button
                            size="sm"
                            onClick={() => handleQuoteMonitoringService(request)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Quote Service
                          </Button>
                        )}
                        
                        {request.status === 'PO Uploaded' && request.request_type === 'monitoring_service' && (
                          <Button
                            size="sm"
                            onClick={() => handleActivateMonitoringService(request)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Activate Service
                          </Button>
                        )}
                        
                        {request.status === 'Pending' && request.request_type !== 'monitoring_service' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartNegotiation(request)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Start Negotiation
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No offer requests</h3>
              <p>New "Request Best Offer" submissions will appear here for processing.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Negotiation Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Negotiate Final Offer</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Request Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Campaign Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div><strong>Campaign:</strong> {selectedRequest.campaign?.name}</div>
                    <div><strong>Buyer:</strong> {selectedRequest.campaign?.buyer_name}</div>
                    <div><strong>Budget:</strong> ৳{selectedRequest.campaign?.budget?.toLocaleString()}</div>
                    <div><strong>Description:</strong> {selectedRequest.campaign?.description}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Selected Assets</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedRequest.assets?.map(asset => {
                      const requirements = selectedRequest.asset_requirements[asset.id];
                      return (
                        <div key={asset.id} className="border rounded-lg p-3">
                          <div className="flex items-start space-x-3">
                            {asset.photos?.[0] && (
                              <img 
                                src={asset.photos[0]} 
                                alt={asset.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{asset.name}</h4>
                              <p className="text-sm text-gray-500">{asset.address}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline">{asset.type}</Badge>
                                <span className="text-sm">Duration: {requirements?.duration?.replace('_', ' ')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedRequest.special_requirements && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Special Requirements</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm">{selectedRequest.special_requirements}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Negotiation Form */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Final Offer Pricing</h3>
                  <div className="space-y-3">
                    {selectedRequest.assets?.map(asset => (
                      <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-gray-500">{asset.dimensions}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">৳</span>
                          <Input
                            type="number"
                            value={mediationForm.finalPricing[asset.id] || ''}
                            onChange={(e) => updateAssetPricing(asset.id, e.target.value)}
                            className="w-24 text-right"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span>৳{mediationForm.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Terms & Conditions</label>
                  <Textarea
                    value={mediationForm.terms}
                    onChange={(e) => setMediationForm({...mediationForm, terms: e.target.value})}
                    rows={3}
                    placeholder="Enter terms and conditions..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Timeline</label>
                  <Textarea
                    value={mediationForm.timeline}
                    onChange={(e) => setMediationForm({...mediationForm, timeline: e.target.value})}
                    rows={2}
                    placeholder="Project timeline and milestones..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Admin Notes (Internal)</label>
                  <Textarea
                    value={mediationForm.notes}
                    onChange={(e) => setMediationForm({...mediationForm, notes: e.target.value})}
                    rows={2}
                    placeholder="Internal notes for this negotiation..."
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t">
                  <Button
                    onClick={submitFinalOffer}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Final Offer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Request Details Modal Component
const RequestDetailsModal = ({ request }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Campaign Information</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Name:</strong> {request.campaign?.name}</p>
            <p><strong>Buyer:</strong> {request.campaign?.buyer_name}</p>
            <p><strong>Budget:</strong> ৳{request.campaign?.budget?.toLocaleString()}</p>
            <p><strong>Description:</strong> {request.campaign?.description}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Request Details</h4>
          <div className="space-y-1 text-sm">
            <p><strong>Submitted:</strong> {format(new Date(request.created_at), 'MMM dd, yyyy HH:mm')}</p>
            <p><strong>Status:</strong> <Badge className="ml-1">{request.status}</Badge></p>
            <p><strong>Timeline:</strong> {request.timeline || 'Standard'}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Asset Requirements</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {request.assets?.map(asset => {
            const requirements = request.asset_requirements[asset.id];
            return (
              <div key={asset.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                {asset.photos?.[0] && (
                  <img 
                    src={asset.photos[0]} 
                    alt={asset.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <div className="font-medium">{asset.name}</div>
                  <div className="text-sm text-gray-500">{asset.address}</div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{requirements?.duration?.replace('_', ' ')}</Badge>
                    <span className="text-sm">৳{asset.pricing[requirements?.duration]?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {request.special_requirements && (
        <div>
          <h4 className="font-semibold mb-2">Special Requirements</h4>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm">{request.special_requirements}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferMediationPanel;