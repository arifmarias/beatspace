#!/usr/bin/env python3
"""
Monitoring Service Bundle Testing Suite
Focused testing for enhanced monitoring service bundle functionality as requested in review
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class MonitoringBundleTester:
    def __init__(self):
        self.base_url = "https://14fadd12-5d6c-411c-9b85-5761bf6e539f.preview.emergentagent.com/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        self.created_asset_id = None
        self.created_offer_request_id = None
        self.created_monitoring_subscription_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
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
            'details': details
        }

    def make_request(self, method, endpoint, token=None, data=None, params=None):
        """Make HTTP request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            try:
                response_data = response.json()
            except:
                response_data = {}

            return response.status_code == 200, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_admin_authentication(self):
        """Test admin authentication"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        
        success, response, status = self.make_request("POST", "auth/login", data=login_data)
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log_test("Admin Authentication", True, f"Token obtained, Role: {response.get('user', {}).get('role')}")
            return True
        else:
            self.log_test("Admin Authentication", False, f"Status: {status}, Response: {response}")
            return False

    def test_buyer_authentication(self):
        """Test buyer authentication"""
        print("\n🔐 Testing Buyer Authentication...")
        
        login_data = {
            "email": "buyer@beatspace.com",
            "password": "buyer123"
        }
        
        success, response, status = self.make_request("POST", "auth/login", data=login_data)
        
        if success and 'access_token' in response:
            self.buyer_token = response['access_token']
            self.log_test("Buyer Authentication", True, f"Token obtained, Role: {response.get('user', {}).get('role')}")
            return True
        else:
            self.log_test("Buyer Authentication", False, f"Status: {status}, Response: {response}")
            return False

    def create_test_asset(self):
        """Create a test asset for monitoring service testing"""
        print("\n🏗️ Creating Test Asset for Monitoring...")
        
        if not self.admin_token:
            self.log_test("Create Test Asset", False, "No admin token available")
            return False

        asset_data = {
            "name": f"Monitoring Bundle Test Asset {datetime.now().strftime('%H%M%S')}",
            "type": "Billboard",
            "category": "Public",
            "address": "Test Location for Monitoring Bundle, Dhaka",
            "location": {"lat": 23.7461, "lng": 90.3742},
            "dimensions": "15ft x 10ft",
            "pricing": {"3_months": 50000, "6_months": 90000, "12_months": 160000},
            "photos": ["https://example.com/monitoring_bundle_test.jpg"],
            "description": "Test asset for monitoring service bundle functionality",
            "specifications": {"material": "Vinyl", "lighting": "LED"},
            "visibility_score": 8,
            "traffic_volume": "High",
            "district": "Dhaka",
            "division": "Dhaka",
            "seller_name": "Test Monitoring Bundle Seller"
        }

        success, response, status = self.make_request("POST", "assets", token=self.admin_token, data=asset_data)

        if success and 'id' in response:
            self.created_asset_id = response['id']
            self.log_test("Create Test Asset", True, f"Asset ID: {self.created_asset_id}")
            return True
        else:
            self.log_test("Create Test Asset", False, f"Status: {status}, Response: {response}")
            return False

    def test_create_offer_request_with_monitoring_bundle(self):
        """Test creating offer request with monitoring service bundle enabled"""
        print("\n📝 Testing Offer Request with Monitoring Service Bundle...")
        
        if not self.buyer_token or not self.created_asset_id:
            self.log_test("Create Offer Request with Monitoring Bundle", False, "Missing buyer token or asset ID")
            return False

        offer_request_data = {
            "asset_id": self.created_asset_id,
            "campaign_name": "Monitoring Bundle Test Campaign",
            "campaign_type": "new",
            "contract_duration": "3_months",
            "estimated_budget": 75000,
            "service_bundles": {
                "printing": True,
                "setup": True,
                "monitoring": True  # KEY: Monitoring service bundle enabled
            },
            "monitoring_service_level": "premium",  # Test monitoring service level
            "timeline": "Need monitoring service for asset tracking",
            "special_requirements": "Premium monitoring with weekly reports",
            "notes": "Testing monitoring service bundle functionality",
            "asset_start_date": "2025-02-01T00:00:00Z",
            "asset_expiration_date": "2025-05-01T00:00:00Z"
        }

        success, response, status = self.make_request("POST", "offers/request", token=self.buyer_token, data=offer_request_data)

        if success and 'id' in response:
            self.created_offer_request_id = response['id']
            service_bundles = response.get('service_bundles', {})
            monitoring_enabled = service_bundles.get('monitoring', False)
            
            details = f"Offer ID: {self.created_offer_request_id}, Monitoring: {monitoring_enabled}, Service Level: {response.get('monitoring_service_level')}"
            self.log_test("Create Offer Request with Monitoring Bundle", monitoring_enabled, details)
            return monitoring_enabled
        else:
            self.log_test("Create Offer Request with Monitoring Bundle", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_offer_requests_service_bundle_tracking(self):
        """Test retrieving offer requests and verify monitoring service bundle tracking"""
        print("\n📋 Testing Offer Request Service Bundle Tracking...")
        
        if not self.buyer_token:
            self.log_test("Offer Request Service Bundle Tracking", False, "No buyer token available")
            return False

        success, response, status = self.make_request("GET", "offers/requests", token=self.buyer_token)

        if success and isinstance(response, list):
            monitoring_offers = []
            for offer in response:
                service_bundles = offer.get('service_bundles', {})
                if service_bundles.get('monitoring') == True:
                    monitoring_offers.append(offer)
            
            details = f"Found {len(monitoring_offers)} offers with monitoring service bundles out of {len(response)} total offers"
            self.log_test("Offer Request Service Bundle Tracking", len(monitoring_offers) > 0, details)
            return len(monitoring_offers) > 0
        else:
            self.log_test("Offer Request Service Bundle Tracking", False, f"Status: {status}, Response: {response}")
            return False

    def test_admin_quote_offer_with_monitoring(self):
        """Test admin quoting an offer that has monitoring service bundle"""
        print("\n💰 Testing Admin Quote Offer with Monitoring Service...")
        
        if not self.admin_token or not self.created_offer_request_id:
            self.log_test("Admin Quote Offer with Monitoring", False, "Missing admin token or offer request ID")
            return False

        quote_data = {
            "admin_quoted_price": 85000,
            "admin_notes": "Quote includes premium monitoring service as requested",
            "final_offer": 85000
        }

        success, response, status = self.make_request("PATCH", f"admin/offer-requests/{self.created_offer_request_id}/quote", token=self.admin_token, data=quote_data)

        if success:
            details = f"Quoted Price: {response.get('admin_quoted_price')}, Status: {response.get('status')}"
            self.log_test("Admin Quote Offer with Monitoring", True, details)
            return True
        else:
            self.log_test("Admin Quote Offer with Monitoring", False, f"Status: {status}, Response: {response}")
            return False

    def test_enhanced_make_offer_live_endpoint(self):
        """Test the enhanced make_offer_live endpoint that creates monitoring subscriptions"""
        print("\n🚀 Testing Enhanced Make Offer Live Endpoint...")
        
        if not self.admin_token or not self.created_offer_request_id:
            self.log_test("Enhanced Make Offer Live Endpoint", False, "Missing admin token or offer request ID")
            return False

        success, response, status = self.make_request("POST", f"offers/{self.created_offer_request_id}/make-live", token=self.admin_token)

        if success:
            details = f"Response: {response.get('message', 'Offer made live successfully')}"
            self.log_test("Enhanced Make Offer Live Endpoint", True, details)
            return True
        else:
            self.log_test("Enhanced Make Offer Live Endpoint", False, f"Status: {status}, Response: {response}")
            return False

    def test_monitoring_subscription_creation(self):
        """Test that monitoring subscriptions are created when offers go live"""
        print("\n🔍 Testing Monitoring Subscription Creation...")
        
        if not self.admin_token:
            self.log_test("Monitoring Subscription Creation", False, "No admin token available")
            return False

        success, response, status = self.make_request("GET", "monitoring/services", token=self.admin_token)

        if success:
            # Handle different response formats
            if isinstance(response, dict) and 'services' in response:
                services = response['services']
            elif isinstance(response, list):
                services = response
            else:
                services = []
            
            # Look for monitoring services created from offer requests
            offer_linked_services = []
            for service in services:
                if service.get('offer_request_id') == self.created_offer_request_id:
                    offer_linked_services.append(service)
                    self.created_monitoring_subscription_id = service.get('id')
            
            details = f"Found {len(services)} total monitoring services, {len(offer_linked_services)} linked to our offer request"
            self.log_test("Monitoring Subscription Creation", len(offer_linked_services) > 0, details)
            return len(offer_linked_services) > 0
        else:
            self.log_test("Monitoring Subscription Creation", False, f"Status: {status}, Response: {response}")
            return False

    def test_monitoring_subscription_data_structure(self):
        """Test monitoring subscription data structure validation"""
        print("\n📊 Testing Monitoring Subscription Data Structure...")
        
        if not self.admin_token or not self.created_monitoring_subscription_id:
            self.log_test("Monitoring Subscription Data Structure", False, "Missing admin token or subscription ID")
            return False

        success, response, status = self.make_request("GET", f"monitoring/services/{self.created_monitoring_subscription_id}", token=self.admin_token)

        if success:
            # Verify required fields
            required_fields = ['id', 'buyer_id', 'asset_ids', 'frequency', 'service_level', 'start_date', 'end_date', 'status']
            present_fields = [field for field in required_fields if field in response]
            
            # Check for offer_request_id link
            has_offer_link = 'offer_request_id' in response and response.get('offer_request_id') == self.created_offer_request_id
            
            # Verify asset_ids structure
            asset_ids = response.get('asset_ids', [])
            has_correct_asset = isinstance(asset_ids, list) and self.created_asset_id in asset_ids
            
            success_criteria = len(present_fields) >= 6 and has_offer_link and has_correct_asset
            
            details = f"Fields present: {len(present_fields)}/{len(required_fields)}, Offer link: {has_offer_link}, Asset link: {has_correct_asset}"
            self.log_test("Monitoring Subscription Data Structure", success_criteria, details)
            return success_criteria
        else:
            self.log_test("Monitoring Subscription Data Structure", False, f"Status: {status}, Response: {response}")
            return False

    def test_monitoring_tasks_generation(self):
        """Test that monitoring tasks are generated automatically"""
        print("\n⚙️ Testing Monitoring Tasks Generation...")
        
        if not self.admin_token:
            self.log_test("Monitoring Tasks Generation", False, "No admin token available")
            return False

        success, response, status = self.make_request("GET", "monitoring/tasks", token=self.admin_token)

        if success and isinstance(response, list):
            # Look for tasks related to our subscription
            related_tasks = []
            if self.created_monitoring_subscription_id:
                for task in response:
                    if task.get('subscription_id') == self.created_monitoring_subscription_id:
                        related_tasks.append(task)
            
            details = f"Found {len(response)} total tasks, {len(related_tasks)} related to our subscription"
            self.log_test("Monitoring Tasks Generation", len(related_tasks) > 0, details)
            return len(related_tasks) > 0
        else:
            self.log_test("Monitoring Tasks Generation", False, f"Status: {status}, Response: {response}")
            return False

    def run_comprehensive_test_suite(self):
        """Run comprehensive monitoring service bundle test suite"""
        print("="*80)
        print("🚀 MONITORING SERVICE BUNDLE COMPREHENSIVE TEST SUITE")
        print("="*80)
        print("Testing enhanced monitoring service bundle functionality")
        print("Focus: make_offer_live endpoint and monitoring subscription creation")
        print("="*80)

        # Test sequence
        test_sequence = [
            ("Admin Authentication", self.test_admin_authentication),
            ("Buyer Authentication", self.test_buyer_authentication),
            ("Create Test Asset", self.create_test_asset),
            ("Create Offer Request with Monitoring Bundle", self.test_create_offer_request_with_monitoring_bundle),
            ("Offer Request Service Bundle Tracking", self.test_get_offer_requests_service_bundle_tracking),
            ("Admin Quote Offer with Monitoring", self.test_admin_quote_offer_with_monitoring),
            ("Enhanced Make Offer Live Endpoint", self.test_enhanced_make_offer_live_endpoint),
            ("Monitoring Subscription Creation", self.test_monitoring_subscription_creation),
            ("Monitoring Subscription Data Structure", self.test_monitoring_subscription_data_structure),
            ("Monitoring Tasks Generation", self.test_monitoring_tasks_generation)
        ]

        # Run all tests
        failed_tests = []
        
        for test_name, test_method in test_sequence:
            try:
                success = test_method()
                if not success:
                    failed_tests.append(test_name)
            except Exception as e:
                failed_tests.append(test_name)
                print(f"❌ {test_name} - ERROR: {str(e)}")

        # Final Results
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0

        print("\n" + "="*80)
        print("📊 MONITORING SERVICE BUNDLE TEST RESULTS")
        print("="*80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(failed_tests)}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"   - {test}")
        
        print(f"\n🎯 KEY FINDINGS:")
        print(f"   - Enhanced make_offer_live endpoint: {'✅ Working' if 'Enhanced Make Offer Live Endpoint' not in failed_tests else '❌ Failed'}")
        print(f"   - Monitoring service bundle tracking: {'✅ Working' if 'Offer Request Service Bundle Tracking' not in failed_tests else '❌ Failed'}")
        print(f"   - Monitoring subscription creation: {'✅ Working' if 'Monitoring Subscription Creation' not in failed_tests else '❌ Failed'}")
        print(f"   - Data structure validation: {'✅ Working' if 'Monitoring Subscription Data Structure' not in failed_tests else '❌ Failed'}")
        
        return success_rate >= 70

def main():
    """Main function to run monitoring service bundle tests"""
    print("🚀 Starting Monitoring Service Bundle Testing...")
    
    tester = MonitoringBundleTester()
    success = tester.run_comprehensive_test_suite()
    
    if success:
        print(f"\n🎉 MONITORING SERVICE BUNDLE TESTING COMPLETED SUCCESSFULLY!")
        sys.exit(0)
    else:
        print(f"\n⚠️  MONITORING SERVICE BUNDLE TESTING COMPLETED WITH ISSUES")
        sys.exit(1)

if __name__ == "__main__":
    main()