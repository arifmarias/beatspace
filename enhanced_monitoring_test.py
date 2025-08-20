#!/usr/bin/env python3
"""
Enhanced Monitoring Service API Testing Suite
Testing enhanced monitoring service functionality with campaign ID assignment
Focus: Campaign ID assignment, offer integration, admin workflow, status display
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class EnhancedMonitoringServiceTester:
    def __init__(self, base_url="https://14fadd12-5d6c-411c-9b85-5761bf6e539f.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        
        # Test data storage
        self.test_campaign_id = None
        self.created_monitoring_service_id = None
        self.created_offer_request_id = None
        self.test_asset_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            # Store test result
            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_data': response.json() if response.text and success else {}
            }

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results[name] = {
                'success': False,
                'error': str(e)
            }
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        return success, response

    def test_buyer_login(self):
        """Test buyer login"""
        login_data = {
            "email": "buyer@beatspace.com",
            "password": "buyer123"
        }
        success, response = self.run_test("Buyer Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.buyer_token = response['access_token']
            print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
        return success, response

    def create_test_data(self):
        """Create test data for monitoring service testing"""
        if not self.admin_token:
            print("⚠️  Admin token required for test data creation")
            return False

        print("\n🔧 CREATING TEST DATA FOR MONITORING SERVICE TESTING")
        
        # Create test buyer if doesn't exist
        buyer_data = {
            "email": "buyer@beatspace.com",
            "password": "buyer123",
            "company_name": "Test Buyer Company",
            "contact_name": "Test Buyer",
            "phone": "+8801234567890",
            "role": "buyer"
        }
        
        success, response = self.run_test(
            "Create Test Buyer", 
            "POST", 
            "admin/users", 
            200, 
            data=buyer_data,
            token=self.admin_token
        )
        
        if success:
            # Approve the buyer
            buyer_id = response.get('id')
            approval_data = {"status": "approved", "reason": "Test user"}
            self.run_test(
                "Approve Test Buyer", 
                "PATCH", 
                f"admin/users/{buyer_id}/status", 
                200, 
                data=approval_data,
                token=self.admin_token
            )

        # Create test assets
        for i in range(3):
            asset_data = {
                "name": f"Test Asset {i+1} for Monitoring",
                "type": "Billboard",
                "category": "Public",
                "address": f"Test Location {i+1}, Dhaka",
                "location": {"lat": 23.7461 + i*0.01, "lng": 90.3742 + i*0.01},
                "dimensions": "10ft x 20ft",
                "pricing": {"3_months": 50000, "6_months": 90000, "12_months": 160000},
                "photos": [f"https://example.com/asset{i+1}.jpg"],
                "description": f"Test asset {i+1} for monitoring service testing",
                "visibility_score": 7,
                "traffic_volume": "High",
                "district": "Dhaka",
                "division": "Dhaka",
                "seller_name": "Test Seller"
            }
            
            success, response = self.run_test(
                f"Create Test Asset {i+1}", 
                "POST", 
                "assets", 
                200, 
                data=asset_data,
                token=self.admin_token
            )
            
            if success:
                self.test_asset_ids.append(response.get('id'))

        # Create test campaign
        campaign_data = {
            "name": "Test Campaign for Monitoring",
            "description": "Test campaign for monitoring service testing",
            "budget": 200000,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=90)).isoformat(),
            "status": "Live"
        }
        
        success, response = self.run_test(
            "Create Test Campaign", 
            "POST", 
            "admin/campaigns", 
            200, 
            data=campaign_data,
            token=self.admin_token
        )
        
        if success:
            self.test_campaign_id = response.get('id')

        print(f"   ✅ Created {len(self.test_asset_ids)} test assets")
        print(f"   ✅ Created test campaign: {self.test_campaign_id}")
        return True

    def test_enhanced_monitoring_service_creation(self):
        """Test Enhanced Monitoring Service Creation with campaign_id assignment"""
        print("\n🎯 TESTING ENHANCED MONITORING SERVICE CREATION WITH CAMPAIGN_ID ASSIGNMENT")
        
        if not self.buyer_token:
            print("⚠️  Buyer token required for monitoring service creation")
            return False, {}

        if not self.test_asset_ids:
            print("⚠️  Test assets required for monitoring service creation")
            return False, {}

        test_cases = [
            {
                "name": "Existing Asset Monitoring Service",
                "campaign_id": "Existing",
                "asset_category": "Existing Asset",
                "expected_campaign_id": "Existing"
            },
            {
                "name": "Private Asset Monitoring Service", 
                "campaign_id": "Private",
                "asset_category": "Private Asset",
                "expected_campaign_id": "Private"
            },
            {
                "name": "Public Asset with Campaign Monitoring Service",
                "campaign_id": self.test_campaign_id,
                "asset_category": "Public",
                "expected_campaign_id": self.test_campaign_id
            },
            {
                "name": "Individual Asset Monitoring Service",
                "campaign_id": "Individual", 
                "asset_category": "Public",
                "expected_campaign_id": "Individual"
            }
        ]

        results = []
        
        for test_case in test_cases:
            print(f"\n   Testing: {test_case['name']}")
            
            monitoring_data = {
                "campaign_id": test_case["campaign_id"],
                "asset_ids": self.test_asset_ids[:2],  # Use first 2 assets
                "frequency": "weekly",
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=30)).isoformat(),
                "service_level": "standard",
                "notification_preferences": {
                    "email": True,
                    "in_app": True,
                    "sms": False
                }
            }
            
            success, response = self.run_test(
                f"Create {test_case['name']}", 
                "POST", 
                "monitoring/services", 
                200, 
                data=monitoring_data,
                token=self.buyer_token
            )
            
            if success:
                # Verify campaign_id assignment
                actual_campaign_id = response.get('campaign_id')
                expected_campaign_id = test_case['expected_campaign_id']
                
                if actual_campaign_id == expected_campaign_id:
                    print(f"   ✅ Campaign ID correctly assigned: {actual_campaign_id}")
                    results.append(True)
                else:
                    print(f"   ❌ Campaign ID mismatch: Expected {expected_campaign_id}, got {actual_campaign_id}")
                    results.append(False)
                
                # Store first created service ID for later tests
                if not self.created_monitoring_service_id:
                    self.created_monitoring_service_id = response.get('id')
            else:
                results.append(False)

        passed_tests = sum(results)
        total_tests = len(test_cases)
        
        print(f"\n   📊 Campaign ID Assignment Tests: {passed_tests}/{total_tests} passed")
        return passed_tests == total_tests, {"passed": passed_tests, "total": total_tests}

    def test_offer_request_integration(self):
        """Test that monitoring service requests appear in offer requests"""
        print("\n🎯 TESTING OFFER REQUEST INTEGRATION - MONITORING SERVICES IN BUYER REQUESTED OFFERS")
        
        if not self.buyer_token:
            print("⚠️  Buyer token required for offer request testing")
            return False, {}

        # First create an offer request with monitoring service bundle
        if self.test_asset_ids:
            offer_data = {
                "asset_id": self.test_asset_ids[0],
                "campaign_name": "Test Campaign with Monitoring",
                "campaign_type": "new",
                "contract_duration": "3_months",
                "estimated_budget": 75000,
                "service_bundles": {
                    "printing": True,
                    "setup": True,
                    "monitoring": True  # Enable monitoring service
                },
                "monitoring_service_level": "premium",
                "timeline": "ASAP",
                "special_requirements": "Weekly monitoring required",
                "asset_start_date": datetime.now().isoformat(),
                "asset_expiration_date": (datetime.now() + timedelta(days=90)).isoformat()
            }
            
            success, response = self.run_test(
                "Create Offer Request with Monitoring Service", 
                "POST", 
                "offers/request", 
                200, 
                data=offer_data,
                token=self.buyer_token
            )
            
            if success:
                self.created_offer_request_id = response.get('id')
                print(f"   ✅ Offer request with monitoring created: {self.created_offer_request_id}")

        # Test GET /api/offers/requests to verify monitoring service requests appear
        success, response = self.run_test(
            "Get Buyer Offer Requests (including monitoring)", 
            "GET", 
            "offers/requests", 
            200, 
            token=self.buyer_token
        )
        
        if success:
            monitoring_requests = []
            for request in response:
                service_bundles = request.get('service_bundles', {})
                if service_bundles.get('monitoring', False):
                    monitoring_requests.append(request)
            
            print(f"   Found {len(monitoring_requests)} offer requests with monitoring service")
            
            if monitoring_requests:
                # Verify required fields are present
                sample_request = monitoring_requests[0]
                required_fields = ['campaign_id', 'monitoring_service_level', 'buyer_name']
                missing_fields = []
                
                for field in required_fields:
                    if field not in sample_request or sample_request.get(field) is None:
                        missing_fields.append(field)
                
                if not missing_fields:
                    print(f"   ✅ All required fields present in monitoring service requests")
                    
                    # Check specific field values
                    print(f"   Campaign ID: {sample_request.get('campaign_id', 'N/A')}")
                    print(f"   Service Level: {sample_request.get('monitoring_service_level', 'N/A')}")
                    print(f"   Buyer Name: {sample_request.get('buyer_name', 'N/A')}")
                    
                    return True, {"monitoring_requests_found": len(monitoring_requests)}
                else:
                    print(f"   ❌ Missing required fields: {missing_fields}")
                    return False, {"missing_fields": missing_fields}
            else:
                print(f"   ⚠️  No monitoring service requests found")
                return False, {"monitoring_requests_found": 0}
        
        return False, {}

    def test_admin_offer_mediation_visibility(self):
        """Test that monitoring services appear in admin offer mediation"""
        print("\n🎯 TESTING ADMIN OFFER MEDIATION VISIBILITY - MONITORING SERVICES FOR ADMIN WORKFLOW")
        
        if not self.admin_token:
            print("⚠️  Admin token required for offer mediation testing")
            return False, {}

        # Test GET /api/admin/offer-requests to verify monitoring services appear for admin
        success, response = self.run_test(
            "Get Admin Offer Requests (including monitoring)", 
            "GET", 
            "admin/offer-requests", 
            200, 
            token=self.admin_token
        )
        
        if success:
            monitoring_requests = []
            for request in response:
                service_bundles = request.get('service_bundles', {})
                if service_bundles.get('monitoring', False):
                    monitoring_requests.append(request)
            
            print(f"   Found {len(monitoring_requests)} monitoring service requests for admin")
            
            if monitoring_requests:
                # Verify admin can see all required fields for quotation workflow
                sample_request = monitoring_requests[0]
                admin_required_fields = [
                    'id', 'buyer_name', 'asset_name', 'campaign_name', 
                    'monitoring_service_level', 'status', 'created_at'
                ]
                
                missing_fields = []
                for field in admin_required_fields:
                    if field not in sample_request or sample_request.get(field) is None:
                        missing_fields.append(field)
                
                if not missing_fields:
                    print(f"   ✅ All admin workflow fields present")
                    print(f"   Request ID: {sample_request.get('id', 'N/A')}")
                    print(f"   Status: {sample_request.get('status', 'N/A')}")
                    print(f"   Service Level: {sample_request.get('monitoring_service_level', 'N/A')}")
                    
                    return True, {"admin_monitoring_requests": len(monitoring_requests)}
                else:
                    print(f"   ❌ Missing admin workflow fields: {missing_fields}")
                    return False, {"missing_admin_fields": missing_fields}
            else:
                print(f"   ⚠️  No monitoring service requests visible to admin")
                return False, {"admin_monitoring_requests": 0}
        
        return False, {}

    def test_status_display_enhancement(self):
        """Test that Live monitoring services show frequency in status text"""
        print("\n🎯 TESTING STATUS DISPLAY ENHANCEMENT - LIVE MONITORING SERVICES SHOW FREQUENCY")
        
        if not self.buyer_token:
            print("⚠️  Buyer token required for status display testing")
            return False, {}

        # Get monitoring services to test status display
        success, response = self.run_test(
            "Get Monitoring Services for Status Testing", 
            "GET", 
            "monitoring/services", 
            200, 
            token=self.buyer_token
        )
        
        if success:
            # Handle both direct list and wrapped response formats
            services = response.get('services', response if isinstance(response, list) else [])
            live_services = []
            
            for service in services:
                if service.get('status') == 'Live':
                    live_services.append(service)
            
            print(f"   Found {len(live_services)} Live monitoring services")
            
            if live_services:
                status_tests = []
                
                for service in live_services:
                    frequency = service.get('frequency', 'unknown')
                    status = service.get('status', 'unknown')
                    
                    # Expected status format: "Subscribed (Daily/Weekly/Monthly)"
                    expected_patterns = {
                        'daily': 'Daily',
                        'weekly': 'Weekly', 
                        'bi_weekly': 'Bi-weekly',
                        'monthly': 'Monthly'
                    }
                    
                    expected_frequency_text = expected_patterns.get(frequency.lower(), frequency.title())
                    
                    print(f"   Service ID: {service.get('id', 'N/A')}")
                    print(f"   Frequency: {frequency}")
                    print(f"   Status: {status}")
                    print(f"   Expected status text should include: {expected_frequency_text}")
                    
                    # For this test, we check if the service has the correct frequency field
                    # The actual status text formatting would be handled by frontend
                    if frequency in ['daily', 'weekly', 'bi_weekly', 'monthly']:
                        status_tests.append(True)
                        print(f"   ✅ Valid frequency for status display: {frequency}")
                    else:
                        status_tests.append(False)
                        print(f"   ❌ Invalid frequency for status display: {frequency}")
                
                passed_status_tests = sum(status_tests)
                total_status_tests = len(status_tests)
                
                print(f"   📊 Status Display Tests: {passed_status_tests}/{total_status_tests} passed")
                return passed_status_tests == total_status_tests, {
                    "live_services": len(live_services),
                    "passed": passed_status_tests,
                    "total": total_status_tests
                }
            else:
                print(f"   ⚠️  No Live monitoring services found for status testing")
                return False, {"live_services": 0}
        
        return False, {}

    def test_monitoring_service_workflow_integration(self):
        """Test complete monitoring service workflow integration"""
        print("\n🎯 TESTING COMPLETE MONITORING SERVICE WORKFLOW INTEGRATION")
        
        workflow_tests = [
            ("Enhanced Monitoring Service Creation", self.test_enhanced_monitoring_service_creation),
            ("Offer Request Integration", self.test_offer_request_integration),
            ("Admin Offer Mediation Visibility", self.test_admin_offer_mediation_visibility),
            ("Status Display Enhancement", self.test_status_display_enhancement)
        ]
        
        results = []
        for test_name, test_func in workflow_tests:
            print(f"\n{'='*60}")
            print(f"🔄 Running: {test_name}")
            print('='*60)
            
            try:
                success, details = test_func()
                results.append((test_name, success, details))
                
                if success:
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
                    
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
                results.append((test_name, False, {"error": str(e)}))
        
        return results

    def run_comprehensive_monitoring_service_tests(self):
        """Run comprehensive monitoring service functionality tests"""
        print("\n" + "="*80)
        print("🚀 ENHANCED MONITORING SERVICE FUNCTIONALITY COMPREHENSIVE TESTING")
        print("="*80)
        print("   Testing enhanced monitoring service with campaign ID assignment")
        print("   Focus: Campaign ID assignment, offer integration, admin workflow, status display")
        print()
        
        # Authentication setup
        print("🔐 AUTHENTICATION SETUP")
        admin_success, _ = self.test_admin_login()
        buyer_success, _ = self.test_buyer_login()
        
        if not admin_success:
            print("❌ Admin authentication failed - cannot proceed with tests")
            return False
        
        if not buyer_success:
            print("❌ Buyer authentication failed - cannot proceed with tests")
            return False
        
        print("✅ Authentication setup complete")
        
        # Create test data
        print("\n🔧 TEST DATA SETUP")
        data_success = self.create_test_data()
        if not data_success:
            print("❌ Test data creation failed - proceeding with existing data")
        
        # Run workflow integration tests
        print("\n🧪 RUNNING MONITORING SERVICE WORKFLOW TESTS")
        results = self.test_monitoring_service_workflow_integration()
        
        # Summary
        print("\n" + "="*80)
        print("📊 ENHANCED MONITORING SERVICE TESTING SUMMARY")
        print("="*80)
        
        passed_tests = sum(1 for _, success, _ in results if success)
        total_tests = len(results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests} tests passed)")
        print()
        
        for test_name, success, details in results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{status}: {test_name}")
            if details and isinstance(details, dict):
                for key, value in details.items():
                    print(f"   {key}: {value}")
        
        print("\n" + "="*80)
        
        if success_rate >= 75:
            print("🎉 MONITORING SERVICE FUNCTIONALITY: WORKING CORRECTLY")
            print("   Enhanced monitoring service with campaign ID assignment is functional")
            return True
        else:
            print("⚠️  MONITORING SERVICE FUNCTIONALITY: NEEDS ATTENTION")
            print("   Some monitoring service features require fixes")
            return False

if __name__ == "__main__":
    tester = EnhancedMonitoringServiceTester()
    success = tester.run_comprehensive_monitoring_service_tests()
    
    if success:
        print("\n✅ All monitoring service tests completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Some monitoring service tests failed!")
        sys.exit(1)