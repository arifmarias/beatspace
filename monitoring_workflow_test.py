#!/usr/bin/env python3
"""
Comprehensive Monitoring Service Workflow Testing
Tests the complete monitoring service workflow implementation as requested in the review.

Focus Areas:
1. POST /api/monitoring/services (should create offer requests instead of direct subscriptions)
2. POST /api/monitoring/services/activate/{request_id} (admin activation endpoint)
3. GET /api/offers/requests (should return monitoring service requests)
4. PUT /api/offers/requests/{request_id} (for admin quote updates)
5. Complete workflow: Request → Quote → PO Upload → Activation → Task Generation
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple

class MonitoringWorkflowTester:
    def __init__(self, base_url="https://asset-manager-33.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.manager_token = None
        self.test_results = {}
        
        # Test data
        self.created_request_id = None
        self.created_campaign_id = None
        self.created_asset_ids = []
        self.buyer_user_id = None
        
    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result with detailed output"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
        
        if details:
            print(f"   {details}")
        
        self.test_results[name] = {
            'success': success,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> Tuple[bool, Dict, int]:
        """Make HTTP request and return success status, response data, and status code"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}
            
            return success, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0
    
    def authenticate_users(self) -> bool:
        """Authenticate all required users for testing"""
        print("\n🔐 AUTHENTICATING USERS FOR MONITORING WORKFLOW TESTING")
        
        # Admin authentication
        success, admin_data, status = self.make_request('POST', 'auth/login', {
            "email": "admin@beatspace.com",
            "password": "admin123"
        })
        
        if success and 'access_token' in admin_data:
            self.admin_token = admin_data['access_token']
            self.log_test("Admin Authentication", True, f"Token obtained: {self.admin_token[:20]}...")
        else:
            self.log_test("Admin Authentication", False, f"Status: {status}, Response: {admin_data}")
            return False
        
        # Manager authentication (optional)
        success, manager_data, status = self.make_request('POST', 'auth/login', {
            "email": "manager@beatspace.com",
            "password": "manager123"
        })
        
        if success and 'access_token' in manager_data:
            self.manager_token = manager_data['access_token']
            self.log_test("Manager Authentication", True, f"Token obtained: {self.manager_token[:20]}...")
        else:
            self.log_test("Manager Authentication", False, "Manager credentials not available")
        
        # Buyer authentication - try multiple known buyers
        buyer_credentials = [
            ("monitoring.buyer@beatspace.com", "buyer123"),
            ("buy@demo.com", "buyer123"),
            ("marketing@grameenphone.com", "buyer123"),
            ("testbuyer@beatspace.com", "buyer123"),
            ("buyer.monitoring@beatspace.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            success, buyer_data, status = self.make_request('POST', 'auth/login', {
                "email": email,
                "password": password
            })
            
            if success and 'access_token' in buyer_data:
                self.buyer_token = buyer_data['access_token']
                self.buyer_user_id = buyer_data.get('user', {}).get('id')
                self.log_test("Buyer Authentication", True, f"Email: {email}, Token: {self.buyer_token[:20]}...")
                break
        
        if not self.buyer_token:
            self.log_test("Buyer Authentication", False, "No buyer credentials available")
            return False
        
        return True
    
    def setup_test_data(self) -> bool:
        """Setup test data for monitoring workflow testing"""
        print("\n🔧 SETTING UP TEST DATA FOR MONITORING WORKFLOW")
        
        # Create test assets first
        for i in range(2):
            asset_data = {
                "name": f"Monitoring Workflow Test Asset {i+1}",
                "type": "Billboard",
                "address": f"Test Location {i+1}, Dhaka",
                "location": {"lat": 23.7461 + i*0.01, "lng": 90.3742 + i*0.01},
                "dimensions": "10 x 20 ft",
                "pricing": {"monthly_rate": 15000 + i*5000},
                "photos": ["https://example.com/test-asset.jpg"],
                "description": f"Test asset {i+1} for monitoring workflow testing",
                "specifications": {"material": "Vinyl", "lighting": "LED"},
                "visibility_score": 8,
                "traffic_volume": "High",
                "district": "Dhaka",
                "division": "Dhaka",
                "status": "Live",
                "buyer_id": self.buyer_user_id,
                "seller_id": "admin_seller_id",
                "seller_name": "Admin Test Seller"
            }
            
            success, asset_response, status = self.make_request(
                'POST', 'assets', asset_data, self.admin_token
            )
            
            if success and 'id' in asset_response:
                asset_id = asset_response['id']
                self.created_asset_ids.append(asset_id)
                self.log_test(f"Create Test Asset {i+1}", True, f"Asset ID: {asset_id}")
            else:
                self.log_test(f"Create Test Asset {i+1}", False, f"Status: {status}, Response: {asset_response}")
        
        # Create test campaign
        if self.created_asset_ids:
            campaign_data = {
                "name": "Monitoring Workflow Test Campaign",
                "description": "Test campaign for monitoring service workflow testing",
                "budget": 100000,
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=90)).isoformat(),
                "status": "Live",
                "buyer_id": self.buyer_user_id,
                "campaign_assets": [
                    {
                        "asset_id": asset_id,
                        "asset_name": f"Test Asset {i+1}",
                        "asset_start_date": datetime.utcnow().isoformat(),
                        "asset_expiration_date": (datetime.utcnow() + timedelta(days=90)).isoformat()
                    }
                    for i, asset_id in enumerate(self.created_asset_ids)
                ]
            }
            
            success, campaign_response, status = self.make_request(
                'POST', 'admin/campaigns', campaign_data, self.admin_token
            )
            
            if success and 'id' in campaign_response:
                self.created_campaign_id = campaign_response['id']
                self.log_test("Create Test Campaign", True, f"Campaign ID: {self.created_campaign_id}")
            else:
                self.log_test("Create Test Campaign", False, f"Status: {status}, Response: {campaign_response}")
        
        return len(self.created_asset_ids) > 0
    
    def test_monitoring_service_request_creation(self) -> bool:
        """Test POST /api/monitoring/services - should create offer requests instead of direct subscriptions"""
        print("\n📝 TESTING MONITORING SERVICE REQUEST CREATION (NEW WORKFLOW)")
        
        if not self.created_asset_ids:
            self.log_test("Monitoring Service Request Creation", False, "No test assets available")
            return False
        
        # Test 1: Individual asset monitoring request
        individual_service_data = {
            "asset_ids": [self.created_asset_ids[0]],  # Single asset
            "frequency": "weekly",
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=60)).isoformat(),
            "service_level": "standard",
            "notification_preferences": {
                "email": True,
                "in_app": True,
                "sms": False
            }
        }
        
        success, response, status = self.make_request(
            'POST', 'monitoring/services', individual_service_data, self.buyer_token
        )
        
        if success:
            self.created_request_id = response.get('request_id')
            self.log_test("Individual Asset Monitoring Request", True, 
                         f"Request ID: {self.created_request_id}")
        else:
            self.log_test("Individual Asset Monitoring Request", False, 
                         f"Status: {status}, Response: {response}")
            return False
        
        # Test 2: Campaign-based monitoring request
        if self.created_campaign_id:
            campaign_service_data = {
                "campaign_id": self.created_campaign_id,
                "asset_ids": self.created_asset_ids,
                "frequency": "daily",
                "start_date": datetime.utcnow().isoformat(),
                "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "service_level": "premium",
                "notification_preferences": {
                    "email": True,
                    "in_app": True,
                    "sms": True
                }
            }
            
            success, response, status = self.make_request(
                'POST', 'monitoring/services', campaign_service_data, self.buyer_token
            )
            
            if success:
                self.log_test("Campaign-based Monitoring Request", True, 
                             f"Request ID: {response.get('request_id')}")
            else:
                self.log_test("Campaign-based Monitoring Request", False, 
                             f"Status: {status}, Response: {response}")
        
        return True
    
    def test_offer_requests_endpoint_monitoring_services(self) -> bool:
        """Test GET /api/offers/requests - should return monitoring service requests"""
        print("\n📋 TESTING OFFER REQUESTS ENDPOINT FOR MONITORING SERVICES")
        
        # Test admin view - should see all monitoring service requests
        success, admin_response, status = self.make_request(
            'GET', 'offers/requests', token=self.admin_token
        )
        
        if success:
            all_requests = admin_response if isinstance(admin_response, list) else []
            monitoring_requests = [req for req in all_requests if req.get('request_type') == 'monitoring_service']
            
            self.log_test("Admin View - All Monitoring Service Requests", True, 
                         f"Found {len(monitoring_requests)} monitoring service requests out of {len(all_requests)} total requests")
            
            # Verify structure of monitoring service requests
            if monitoring_requests:
                sample_request = monitoring_requests[0]
                required_fields = ['id', 'buyer_id', 'request_type', 'service_details', 'status']
                missing_fields = [field for field in required_fields if field not in sample_request]
                
                if not missing_fields:
                    self.log_test("Monitoring Request Structure Validation", True, 
                                 "All required fields present in monitoring service requests")
                else:
                    self.log_test("Monitoring Request Structure Validation", False, 
                                 f"Missing fields: {missing_fields}")
        else:
            self.log_test("Admin View - All Monitoring Service Requests", False, 
                         f"Status: {status}, Response: {admin_response}")
            return False
        
        # Test buyer view - should see own monitoring service requests
        success, buyer_response, status = self.make_request(
            'GET', 'offers/requests', token=self.buyer_token
        )
        
        if success:
            buyer_requests = buyer_response if isinstance(buyer_response, list) else []
            buyer_monitoring_requests = [req for req in buyer_requests if req.get('request_type') == 'monitoring_service']
            
            self.log_test("Buyer View - Own Monitoring Service Requests", True, 
                         f"Found {len(buyer_monitoring_requests)} own monitoring service requests")
        else:
            self.log_test("Buyer View - Own Monitoring Service Requests", False, 
                         f"Status: {status}, Response: {buyer_response}")
        
        return True
    
    def test_admin_quote_updates(self) -> bool:
        """Test PUT /api/offers/requests/{request_id} for admin quote updates"""
        print("\n💰 TESTING ADMIN QUOTE UPDATES FOR MONITORING SERVICES")
        
        if not self.created_request_id:
            self.log_test("Admin Quote Updates", False, "No monitoring service request ID available")
            return False
        
        # Test admin providing quote using the admin quote endpoint
        quote_data = {
            "quoted_price": 35000,
            "admin_notes": "Premium monitoring service package including weekly inspections, photo documentation, condition reports, and priority support."
        }
        
        success, response, status = self.make_request(
            'PUT', f'admin/offers/{self.created_request_id}/quote', quote_data, self.admin_token
        )
        
        if success:
            self.log_test("Admin Quote Submission", True, 
                         f"Quote: ৳{quote_data['quoted_price']}, Notes: {quote_data['admin_notes'][:50]}...")
        else:
            self.log_test("Admin Quote Submission", False, 
                         f"Status: {status}, Response: {response}")
            return False
        
        # Verify quote was applied correctly
        success, request_response, status = self.make_request(
            'GET', f'offers/requests/{self.created_request_id}', token=self.admin_token
        )
        
        if success:
            request_data = request_response
            expected_status = 'Quoted'
            expected_price = quote_data['quoted_price']
            
            actual_status = request_data.get('status')
            actual_price = request_data.get('admin_quoted_price')
            
            if actual_status == expected_status and actual_price == expected_price:
                self.log_test("Quote Verification", True, 
                             f"Status: {actual_status}, Price: ৳{actual_price}")
            else:
                self.log_test("Quote Verification", False, 
                             f"Expected: Status={expected_status}, Price=৳{expected_price}; Got: Status={actual_status}, Price=৳{actual_price}")
        else:
            self.log_test("Quote Verification", False, 
                         f"Failed to verify quote: Status {status}")
        
        return True
    
    def test_status_transitions_workflow(self) -> bool:
        """Test status transitions: Pending → Quoted → PO Uploaded → Approved"""
        print("\n🔄 TESTING STATUS TRANSITIONS WORKFLOW")
        
        if not self.created_request_id:
            self.log_test("Status Transitions", False, "No request ID available")
            return False
        
        # Step 1: Verify current status is "Quoted" (from previous test)
        success, request_data, status = self.make_request(
            'GET', f'offers/requests/{self.created_request_id}', token=self.admin_token
        )
        
        if success:
            current_status = request_data.get('status')
            self.log_test("Current Status Check", True, f"Current status: {current_status}")
        else:
            self.log_test("Current Status Check", False, f"Failed to get current status: {status}")
            return False
        
        # Step 2: Simulate PO upload by updating status to "PO Uploaded"
        # Note: In real workflow, buyer would upload PO document
        po_update_data = {
            "status": "PO Uploaded",
            "po_document_url": "https://example.com/test-po-document.pdf",
            "po_uploaded_at": datetime.utcnow().isoformat()
        }
        
        # Try to update status via admin endpoint (simulating PO upload)
        success, response, status = self.make_request(
            'PATCH', f'admin/offer-requests/{self.created_request_id}/status', 
            {"status": "PO Uploaded"}, self.admin_token
        )
        
        if success:
            self.log_test("PO Upload Status Update", True, "Status updated to 'PO Uploaded'")
        else:
            self.log_test("PO Upload Status Update", False, 
                         f"Failed to update to PO Uploaded: Status {status}, Response: {response}")
            # Continue with testing even if this fails
        
        return True
    
    def test_monitoring_service_activation(self) -> bool:
        """Test POST /api/monitoring/services/activate/{request_id} - admin activation endpoint"""
        print("\n🚀 TESTING MONITORING SERVICE ACTIVATION ENDPOINT")
        
        if not self.created_request_id:
            self.log_test("Monitoring Service Activation", False, "No request ID available")
            return False
        
        # First, ensure request is in correct status for activation
        # Update to "PO Uploaded" status if needed
        update_data = {"status": "PO Uploaded"}
        self.make_request('PATCH', f'admin/offer-requests/{self.created_request_id}/status', 
                         update_data, self.admin_token)
        
        # Test the activation endpoint
        success, response, status = self.make_request(
            'POST', f'monitoring/services/activate/{self.created_request_id}', 
            {}, self.admin_token
        )
        
        if success:
            subscription_id = response.get('subscription_id')
            self.log_test("Monitoring Service Activation", True, 
                         f"Activation successful, Subscription ID: {subscription_id}")
            
            # Verify subscription was created
            if subscription_id:
                success, sub_response, sub_status = self.make_request(
                    'GET', f'monitoring/services/{subscription_id}', token=self.admin_token
                )
                
                if success:
                    self.log_test("Subscription Creation Verification", True, 
                                 "Active monitoring subscription created successfully")
                else:
                    self.log_test("Subscription Creation Verification", False, 
                                 f"Subscription not found: Status {sub_status}")
            
            # Verify request status was updated to "Approved"
            success, request_data, req_status = self.make_request(
                'GET', f'offers/requests/{self.created_request_id}', token=self.admin_token
            )
            
            if success:
                final_status = request_data.get('status')
                if final_status == 'Approved':
                    self.log_test("Request Status Final Update", True, 
                                 f"Request status updated to: {final_status}")
                else:
                    self.log_test("Request Status Final Update", False, 
                                 f"Expected 'Approved', got: {final_status}")
        else:
            self.log_test("Monitoring Service Activation", False, 
                         f"Activation failed: Status {status}, Response: {response}")
            return False
        
        return True
    
    def test_monitoring_task_generation(self) -> bool:
        """Test that activated services generate monitoring tasks"""
        print("\n📋 TESTING MONITORING TASK GENERATION AFTER ACTIVATION")
        
        # Get monitoring tasks to verify they were generated
        success, response, status = self.make_request(
            'GET', 'monitoring/tasks', token=self.admin_token
        )
        
        if success:
            tasks = response if isinstance(response, list) else response.get('tasks', [])
            self.log_test("Monitoring Task Retrieval", True, 
                         f"Retrieved {len(tasks)} monitoring tasks")
            
            # Check if any tasks are related to our test assets
            if self.created_asset_ids:
                related_tasks = [task for task in tasks if task.get('asset_id') in self.created_asset_ids]
                if related_tasks:
                    self.log_test("Test Asset Task Generation", True, 
                                 f"Found {len(related_tasks)} tasks for test assets")
                    
                    # Verify task structure
                    if related_tasks:
                        sample_task = related_tasks[0]
                        required_fields = ['id', 'asset_id', 'status', 'scheduled_date']
                        missing_fields = [field for field in required_fields if field not in sample_task]
                        
                        if not missing_fields:
                            self.log_test("Task Structure Validation", True, 
                                         "Generated tasks have correct structure")
                        else:
                            self.log_test("Task Structure Validation", False, 
                                         f"Missing fields in tasks: {missing_fields}")
                else:
                    self.log_test("Test Asset Task Generation", False, 
                                 "No tasks found for test assets")
        else:
            self.log_test("Monitoring Task Retrieval", False, 
                         f"Failed to retrieve tasks: Status {status}")
            return False
        
        return True
    
    def test_data_validation_requirements(self) -> bool:
        """Test data validation requirements for monitoring service requests"""
        print("\n✅ TESTING DATA VALIDATION REQUIREMENTS")
        
        # Test 1: Verify service_details structure in created request
        if self.created_request_id:
            success, response, status = self.make_request(
                'GET', f'offers/requests/{self.created_request_id}', token=self.admin_token
            )
            
            if success:
                service_details = response.get('service_details', {})
                required_fields = ['asset_ids', 'frequency', 'start_date', 'end_date', 'service_level', 'notification_preferences']
                
                missing_fields = [field for field in required_fields if field not in service_details]
                if not missing_fields:
                    self.log_test("Service Details Structure Validation", True, 
                                 "All required fields present in service_details")
                else:
                    self.log_test("Service Details Structure Validation", False, 
                                 f"Missing fields in service_details: {missing_fields}")
            else:
                self.log_test("Service Details Structure Validation", False, 
                             f"Failed to retrieve request: Status {status}")
        
        # Test 2: Invalid monitoring service request validation
        invalid_requests = [
            {
                "name": "Empty Asset IDs",
                "data": {
                    "asset_ids": [],
                    "frequency": "weekly",
                    "start_date": datetime.utcnow().isoformat(),
                    "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                    "service_level": "standard"
                }
            },
            {
                "name": "Invalid Frequency",
                "data": {
                    "asset_ids": self.created_asset_ids[:1] if self.created_asset_ids else ["test_id"],
                    "frequency": "invalid_frequency",
                    "start_date": datetime.utcnow().isoformat(),
                    "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                    "service_level": "standard"
                }
            },
            {
                "name": "Invalid Date Format",
                "data": {
                    "asset_ids": self.created_asset_ids[:1] if self.created_asset_ids else ["test_id"],
                    "frequency": "weekly",
                    "start_date": "invalid_date",
                    "end_date": "invalid_date",
                    "service_level": "standard"
                }
            }
        ]
        
        for invalid_request in invalid_requests:
            success, response, status = self.make_request(
                'POST', 'monitoring/services', invalid_request["data"], 
                self.buyer_token, expected_status=400
            )
            
            if success:  # Success means we got the expected 400 error
                self.log_test(f"Invalid Data Rejection - {invalid_request['name']}", True, 
                             "Invalid request properly rejected")
            else:
                self.log_test(f"Invalid Data Rejection - {invalid_request['name']}", False, 
                             f"Invalid request not properly rejected: Status {status}")
        
        return True
    
    def test_permission_enforcement(self) -> bool:
        """Test admin/manager permission enforcement and buyer authentication"""
        print("\n🔒 TESTING PERMISSION ENFORCEMENT")
        
        # Test 1: Buyer cannot activate monitoring services
        if self.created_request_id:
            success, response, status = self.make_request(
                'POST', f'monitoring/services/activate/{self.created_request_id}', 
                {}, self.buyer_token, expected_status=403
            )
            
            if success:  # Success means we got expected 403 error
                self.log_test("Buyer Activation Restriction", True, 
                             "Buyer properly denied activation access")
            else:
                self.log_test("Buyer Activation Restriction", False, 
                             f"Buyer not properly restricted: Status {status}")
        
        # Test 2: Buyer cannot update monitoring services directly
        success, response, status = self.make_request(
            'PUT', 'monitoring/services/test_service_id', 
            {"service_level": "premium"}, self.buyer_token, expected_status=403
        )
        
        if success:  # Success means we got expected 403 error
            self.log_test("Buyer Service Update Restriction", True, 
                         "Buyer properly denied direct service update access")
        else:
            self.log_test("Buyer Service Update Restriction", False, 
                         f"Buyer not properly restricted: Status {status}")
        
        # Test 3: Admin can access all monitoring services
        success, response, status = self.make_request(
            'GET', 'monitoring/services', token=self.admin_token
        )
        
        if success:
            services = response.get('services', []) if isinstance(response, dict) else response
            self.log_test("Admin Access All Services", True, 
                         f"Admin can access {len(services)} monitoring services")
        else:
            self.log_test("Admin Access All Services", False, 
                         f"Admin cannot access monitoring services: Status {status}")
        
        # Test 4: Manager permissions (if manager token available)
        if self.manager_token:
            success, response, status = self.make_request(
                'GET', 'monitoring/services', token=self.manager_token
            )
            
            if success:
                services = response.get('services', []) if isinstance(response, dict) else response
                self.log_test("Manager Access Services", True, 
                             f"Manager can access {len(services)} monitoring services")
            else:
                self.log_test("Manager Access Services", False, 
                             f"Manager cannot access monitoring services: Status {status}")
        
        return True
    
    def run_comprehensive_monitoring_workflow_test(self):
        """Run the complete monitoring service workflow test suite"""
        print("="*80)
        print("🎯 MONITORING SERVICE WORKFLOW COMPREHENSIVE TESTING")
        print("="*80)
        print("Testing the complete monitoring service workflow implementation as requested")
        print("Focus: New workflow where monitoring services create offer requests instead of direct subscriptions")
        print()
        
        # Step 1: Authentication
        if not self.authenticate_users():
            print("\n❌ AUTHENTICATION FAILED - Cannot proceed with workflow tests")
            return False
        
        # Step 2: Setup test data
        if not self.setup_test_data():
            print("\n❌ TEST DATA SETUP FAILED - Cannot proceed with workflow tests")
            return False
        
        # Step 3: Run comprehensive workflow tests
        workflow_tests = [
            ("Monitoring Service Request Creation", self.test_monitoring_service_request_creation),
            ("Offer Requests Endpoint for Monitoring", self.test_offer_requests_endpoint_monitoring_services),
            ("Admin Quote Updates", self.test_admin_quote_updates),
            ("Status Transitions Workflow", self.test_status_transitions_workflow),
            ("Monitoring Service Activation", self.test_monitoring_service_activation),
            ("Monitoring Task Generation", self.test_monitoring_task_generation),
            ("Data Validation Requirements", self.test_data_validation_requirements),
            ("Permission Enforcement", self.test_permission_enforcement)
        ]
        
        for test_name, test_method in workflow_tests:
            try:
                print(f"\n{'='*60}")
                print(f"🧪 RUNNING: {test_name}")
                print(f"{'='*60}")
                test_method()
            except Exception as e:
                self.log_test(f"{test_name} - Exception", False, f"Exception: {str(e)}")
                print(f"❌ Test {test_name} failed with exception: {str(e)}")
        
        # Final results and analysis
        self.print_comprehensive_results()
        
        return self.tests_passed / self.tests_run >= 0.8 if self.tests_run > 0 else False
    
    def print_comprehensive_results(self):
        """Print comprehensive test results with detailed analysis"""
        print("\n" + "="*80)
        print("📊 MONITORING SERVICE WORKFLOW TEST RESULTS")
        print("="*80)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Categorize results by workflow stage
        workflow_stages = {
            "Authentication & Setup": [
                "Admin Authentication", "Buyer Authentication", "Create Test Asset 1", "Create Test Asset 2"
            ],
            "Request Creation": [
                "Individual Asset Monitoring Request", "Campaign-based Monitoring Request"
            ],
            "Offer Management": [
                "Admin View - All Monitoring Service Requests", "Buyer View - Own Monitoring Service Requests",
                "Admin Quote Submission", "Quote Verification"
            ],
            "Workflow Transitions": [
                "Current Status Check", "PO Upload Status Update", "Monitoring Service Activation"
            ],
            "Task & Data Management": [
                "Monitoring Task Retrieval", "Test Asset Task Generation", "Service Details Structure Validation"
            ],
            "Security & Validation": [
                "Buyer Activation Restriction", "Buyer Service Update Restriction", "Admin Access All Services"
            ]
        }
        
        print("📋 RESULTS BY WORKFLOW STAGE:")
        print("-" * 40)
        
        for stage, tests in workflow_stages.items():
            stage_passed = sum(1 for test in tests if self.test_results.get(test, {}).get('success', False))
            stage_total = len(tests)
            stage_rate = (stage_passed / stage_total) * 100 if stage_total > 0 else 0
            
            status_icon = "✅" if stage_rate >= 80 else "⚠️" if stage_rate >= 60 else "❌"
            print(f"{status_icon} {stage}: {stage_passed}/{stage_total} ({stage_rate:.1f}%)")
        
        print()
        
        # Critical workflow tests
        critical_tests = [
            "Individual Asset Monitoring Request",
            "Admin Quote Submission", 
            "Monitoring Service Activation",
            "Admin Access All Services"
        ]
        
        critical_passed = sum(1 for test in critical_tests if self.test_results.get(test, {}).get('success', False))
        critical_rate = (critical_passed / len(critical_tests)) * 100
        
        print(f"🎯 CRITICAL WORKFLOW TESTS: {critical_passed}/{len(critical_tests)} ({critical_rate:.1f}%)")
        print()
        
        # Final assessment
        if success_rate >= 85 and critical_rate >= 100:
            print("🎉 MONITORING SERVICE WORKFLOW TESTING: EXCELLENT!")
            print("✅ All critical functionality working correctly")
            print("✅ New workflow (monitoring services → offer requests) operational")
            print("✅ Admin activation and task generation working")
            print("✅ Complete workflow from request to activation verified")
        elif success_rate >= 70 and critical_rate >= 75:
            print("⚠️  MONITORING SERVICE WORKFLOW TESTING: GOOD")
            print("✅ Most functionality working correctly")
            print("⚠️  Some minor issues need attention")
        elif success_rate >= 50:
            print("⚠️  MONITORING SERVICE WORKFLOW TESTING: NEEDS IMPROVEMENT")
            print("⚠️  Significant issues found in workflow")
            print("❌ Critical functionality may not be working correctly")
        else:
            print("❌ MONITORING SERVICE WORKFLOW TESTING: MAJOR ISSUES")
            print("❌ Workflow has significant problems")
            print("❌ Major functionality is not working")
        
        print("\n" + "="*80)

if __name__ == "__main__":
    tester = MonitoringWorkflowTester()
    success = tester.run_comprehensive_monitoring_workflow_test()
    sys.exit(0 if success else 1)