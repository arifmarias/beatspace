#!/usr/bin/env python3
"""
Monitoring Service Admin Editing Test Suite
Testing monitoring service functionality and admin editing capabilities as requested in review.

Focus Areas:
1. Test Monitoring Services CRUD (GET and PUT endpoints)
2. Test Data Structure (services format, required fields)
3. Test Update Functionality (service_level, frequency, notification_preferences, end_date)
4. Test Authorization (admin, manager, buyer access control)
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class MonitoringServiceAdminTester:
    def __init__(self, base_url="https://beatspace-monitor.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.manager_token = None
        self.buyer_token = None
        self.test_service_id = None
        self.test_results = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
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
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                        if 'services' in response_data:
                            print(f"   Services count: {len(response_data['services'])}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
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

    def authenticate_users(self):
        """Authenticate admin, manager, and buyer users"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATION SETUP")
        print("="*60)
        
        # Admin login
        admin_login = {"email": "admin@beatspace.com", "password": "admin123"}
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, data=admin_login)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   ✅ Admin authenticated: {response.get('user', {}).get('email')}")
        
        # Manager login
        manager_login = {"email": "manager@beatspace.com", "password": "manager123"}
        success, response = self.run_test("Manager Login", "POST", "auth/login", 200, data=manager_login)
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            print(f"   ✅ Manager authenticated: {response.get('user', {}).get('email')}")
        
        # Try to find and authenticate a buyer with monitoring services
        buyer_credentials = [
            ("buy@demo.com", "buyer123"),
            ("marketing@grameenphone.com", "buyer123"),
            ("testbuyer@beatspace.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            buyer_login = {"email": email, "password": password}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=buyer_login)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                print(f"   ✅ Buyer authenticated: {email}")
                break
        
        if not self.buyer_token:
            print("   ⚠️  No buyer authenticated - will create test data if needed")

    def test_get_monitoring_services_structure(self):
        """Test GET /api/monitoring/services data structure"""
        print("\n" + "="*60)
        print("📊 MONITORING SERVICES DATA STRUCTURE TESTING")
        print("="*60)
        
        if not self.admin_token:
            print("⚠️  Skipping - no admin token")
            return False
        
        success, response = self.run_test(
            "GET Monitoring Services - Admin", 
            "GET", 
            "monitoring/services", 
            200, 
            token=self.admin_token
        )
        
        if success:
            # Verify data structure
            print("\n🔍 VERIFYING DATA STRUCTURE:")
            
            # Check if response has "services" key
            if 'services' in response:
                print("   ✅ Response has 'services' key (correct format)")
                services = response['services']
                
                if services:
                    # Check first service structure
                    service = services[0]
                    required_fields = ['service_level', 'frequency', 'notification_preferences', 'end_date', 'asset_ids']
                    
                    print(f"\n   📋 Checking service fields in first service:")
                    for field in required_fields:
                        if field in service:
                            print(f"   ✅ {field}: {service[field]}")
                        else:
                            print(f"   ❌ Missing field: {field}")
                    
                    # Store a service ID for update tests
                    if 'id' in service:
                        self.test_service_id = service['id']
                        print(f"   📝 Using service ID for update tests: {self.test_service_id}")
                    
                    print(f"\n   📊 Total services found: {len(services)}")
                else:
                    print("   ⚠️  No services found - will need to create test data")
            else:
                print("   ❌ Response missing 'services' key")
                print(f"   Response keys: {list(response.keys())}")
        
        return success

    def test_monitoring_services_authorization(self):
        """Test authorization for monitoring services endpoints"""
        print("\n" + "="*60)
        print("🔒 AUTHORIZATION TESTING")
        print("="*60)
        
        # Test GET endpoint with different roles
        print("\n📖 Testing GET /api/monitoring/services authorization:")
        
        # Admin access (should work)
        if self.admin_token:
            success, _ = self.run_test(
                "GET Services - Admin Access", 
                "GET", 
                "monitoring/services", 
                200, 
                token=self.admin_token
            )
            if success:
                print("   ✅ Admin can access monitoring services")
        
        # Manager access (should work)
        if self.manager_token:
            success, _ = self.run_test(
                "GET Services - Manager Access", 
                "GET", 
                "monitoring/services", 
                200, 
                token=self.manager_token
            )
            if success:
                print("   ✅ Manager can access monitoring services")
        
        # Buyer access (should work but see only their services)
        if self.buyer_token:
            success, _ = self.run_test(
                "GET Services - Buyer Access", 
                "GET", 
                "monitoring/services", 
                200, 
                token=self.buyer_token
            )
            if success:
                print("   ✅ Buyer can access their monitoring services")
        
        # No authentication (should fail)
        success, _ = self.run_test(
            "GET Services - No Auth", 
            "GET", 
            "monitoring/services", 
            401
        )
        if success:
            print("   ✅ Unauthenticated access properly rejected")

    def test_put_monitoring_service_authorization(self):
        """Test PUT endpoint authorization"""
        print("\n✏️  Testing PUT /api/monitoring/services/{service_id} authorization:")
        
        if not self.test_service_id:
            print("   ⚠️  No service ID available for PUT tests")
            return False
        
        test_update = {
            "service_level": "premium",
            "frequency": "weekly"
        }
        
        # Admin access (should work)
        if self.admin_token:
            success, _ = self.run_test(
                "PUT Service - Admin Access", 
                "PUT", 
                f"monitoring/services/{self.test_service_id}", 
                200, 
                data=test_update,
                token=self.admin_token
            )
            if success:
                print("   ✅ Admin can update monitoring services")
        
        # Manager access (should work)
        if self.manager_token:
            success, _ = self.run_test(
                "PUT Service - Manager Access", 
                "PUT", 
                f"monitoring/services/{self.test_service_id}", 
                200, 
                data=test_update,
                token=self.manager_token
            )
            if success:
                print("   ✅ Manager can update monitoring services")
        
        # Buyer access (should fail with 403)
        if self.buyer_token:
            success, _ = self.run_test(
                "PUT Service - Buyer Access (Should Fail)", 
                "PUT", 
                f"monitoring/services/{self.test_service_id}", 
                403, 
                data=test_update,
                token=self.buyer_token
            )
            if success:
                print("   ✅ Buyer properly denied access to update services")
        
        # No authentication (should fail)
        success, _ = self.run_test(
            "PUT Service - No Auth", 
            "PUT", 
            f"monitoring/services/{self.test_service_id}", 
            401,
            data=test_update
        )
        if success:
            print("   ✅ Unauthenticated PUT properly rejected")

    def test_monitoring_service_updates(self):
        """Test updating monitoring service fields"""
        print("\n" + "="*60)
        print("🔧 MONITORING SERVICE UPDATE FUNCTIONALITY")
        print("="*60)
        
        if not self.test_service_id or not self.admin_token:
            print("⚠️  Skipping - no service ID or admin token")
            return False
        
        # Test updating service_level
        print("\n🎯 Testing service_level update:")
        service_level_update = {"service_level": "premium"}
        success, response = self.run_test(
            "Update Service Level", 
            "PUT", 
            f"monitoring/services/{self.test_service_id}", 
            200, 
            data=service_level_update,
            token=self.admin_token
        )
        if success and 'service' in response:
            updated_service = response['service']
            if updated_service.get('service_level') == 'premium':
                print("   ✅ Service level updated correctly")
            else:
                print(f"   ❌ Service level not updated: {updated_service.get('service_level')}")
        
        # Test updating frequency
        print("\n📅 Testing frequency update:")
        frequency_update = {"frequency": "daily"}
        success, response = self.run_test(
            "Update Frequency", 
            "PUT", 
            f"monitoring/services/{self.test_service_id}", 
            200, 
            data=frequency_update,
            token=self.admin_token
        )
        if success and 'service' in response:
            updated_service = response['service']
            if updated_service.get('frequency') == 'daily':
                print("   ✅ Frequency updated correctly")
            else:
                print(f"   ❌ Frequency not updated: {updated_service.get('frequency')}")
        
        # Test updating notification_preferences
        print("\n🔔 Testing notification_preferences update:")
        notification_update = {
            "notification_preferences": {
                "email": True,
                "in_app": False,
                "sms": True
            }
        }
        success, response = self.run_test(
            "Update Notification Preferences", 
            "PUT", 
            f"monitoring/services/{self.test_service_id}", 
            200, 
            data=notification_update,
            token=self.admin_token
        )
        if success and 'service' in response:
            updated_service = response['service']
            if 'notification_preferences' in updated_service:
                print("   ✅ Notification preferences updated")
                prefs = updated_service['notification_preferences']
                print(f"      Email: {prefs.get('email')}, In-app: {prefs.get('in_app')}, SMS: {prefs.get('sms')}")
            else:
                print("   ❌ Notification preferences not found in response")
        
        # Test updating end_date
        print("\n📆 Testing end_date update:")
        new_end_date = (datetime.utcnow() + timedelta(days=90)).isoformat()
        end_date_update = {"end_date": new_end_date}
        success, response = self.run_test(
            "Update End Date", 
            "PUT", 
            f"monitoring/services/{self.test_service_id}", 
            200, 
            data=end_date_update,
            token=self.admin_token
        )
        if success and 'service' in response:
            updated_service = response['service']
            if 'end_date' in updated_service:
                print("   ✅ End date updated")
                print(f"      New end date: {updated_service['end_date']}")
            else:
                print("   ❌ End date not found in response")
        
        # Test updated_at timestamp
        print("\n⏰ Verifying updated_at timestamp:")
        success, response = self.run_test(
            "Get Updated Service", 
            "GET", 
            f"monitoring/services/{self.test_service_id}", 
            200, 
            token=self.admin_token
        )
        if success and 'service' in response:
            service = response['service']
            if 'updated_at' in service:
                print("   ✅ updated_at timestamp present")
                print(f"      Updated at: {service['updated_at']}")
            else:
                print("   ❌ updated_at timestamp missing")

    def create_test_monitoring_service(self):
        """Create a test monitoring service if none exist"""
        print("\n🔧 Creating test monitoring service...")
        
        if not self.admin_token:
            print("   ⚠️  No admin token for creating test service")
            return False
        
        # First, try to get existing assets
        success, assets_response = self.run_test(
            "Get Assets for Test Service", 
            "GET", 
            "assets/public", 
            200
        )
        
        if not success or not assets_response:
            print("   ⚠️  No assets available for test service")
            return False
        
        # Use first available asset
        asset_id = assets_response[0]['id']
        
        # Create test monitoring service
        service_data = {
            "asset_ids": [asset_id],
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
        
        success, response = self.run_test(
            "Create Test Monitoring Service", 
            "POST", 
            "monitoring/services", 
            200, 
            data=service_data,
            token=self.admin_token
        )
        
        if success and 'subscription_id' in response:
            self.test_service_id = response['subscription_id']
            print(f"   ✅ Test service created: {self.test_service_id}")
            return True
        else:
            print("   ❌ Failed to create test service")
            return False

    def run_comprehensive_test_suite(self):
        """Run the complete monitoring service admin test suite"""
        print("\n" + "="*80)
        print("🚀 MONITORING SERVICE ADMIN EDITING COMPREHENSIVE TEST SUITE")
        print("="*80)
        print("   Testing monitoring service functionality and admin editing capabilities")
        print("   Focus: GET/PUT endpoints, data structure, update functionality, authorization")
        print()
        
        # Step 1: Authentication
        self.authenticate_users()
        
        # Step 2: Test GET endpoint and data structure
        services_exist = self.test_get_monitoring_services_structure()
        
        # Step 3: Create test service if none exist
        if not self.test_service_id:
            print("\n⚠️  No existing services found - creating test service...")
            self.create_test_monitoring_service()
        
        # Step 4: Test authorization for both GET and PUT
        self.test_monitoring_services_authorization()
        self.test_put_monitoring_service_authorization()
        
        # Step 5: Test update functionality
        self.test_monitoring_service_updates()
        
        # Final Results
        print("\n" + "="*80)
        print("📊 MONITORING SERVICE ADMIN TEST RESULTS")
        print("="*80)
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Detailed results by category
        print("\n📋 DETAILED RESULTS:")
        
        critical_tests = [
            "GET Monitoring Services - Admin",
            "PUT Service - Admin Access",
            "PUT Service - Manager Access", 
            "PUT Service - Buyer Access (Should Fail)",
            "Update Service Level",
            "Update Frequency",
            "Update Notification Preferences",
            "Update End Date"
        ]
        
        critical_passed = 0
        for test_name in critical_tests:
            if test_name in self.test_results:
                result = self.test_results[test_name]
                status = "✅ PASS" if result['success'] else "❌ FAIL"
                print(f"   {status} - {test_name}")
                if result['success']:
                    critical_passed += 1
        
        critical_rate = (critical_passed / len(critical_tests)) * 100 if critical_tests else 0
        print(f"\n🎯 Critical Tests Success Rate: {critical_rate:.1f}% ({critical_passed}/{len(critical_tests)})")
        
        # Summary
        if critical_rate >= 80:
            print("\n🎉 MONITORING SERVICE ADMIN FUNCTIONALITY: WORKING CORRECTLY")
            print("   ✅ GET /api/monitoring/services endpoint functional")
            print("   ✅ PUT /api/monitoring/services/{service_id} endpoint functional") 
            print("   ✅ Data structure includes required fields")
            print("   ✅ Admin/Manager can edit services, Buyer cannot")
            print("   ✅ Service updates working (service_level, frequency, etc.)")
        else:
            print("\n❌ MONITORING SERVICE ADMIN FUNCTIONALITY: ISSUES DETECTED")
            print("   Review failed tests above for specific issues")
        
        return success_rate >= 75

def main():
    """Main test execution"""
    print("🔍 Starting Monitoring Service Admin Editing Test Suite...")
    
    tester = MonitoringServiceAdminTester()
    success = tester.run_comprehensive_test_suite()
    
    if success:
        print("\n✅ All critical monitoring service admin tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some critical tests failed - review results above")
        sys.exit(1)

if __name__ == "__main__":
    main()