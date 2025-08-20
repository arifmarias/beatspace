#!/usr/bin/env python3
"""
Monitoring Service Creation Fix Testing
Testing the fixed monitoring service creation functionality after resolving User attribute issue
"""

import requests
import json
import sys
from datetime import datetime

class MonitoringServiceFixTester:
    def __init__(self, base_url="https://14fadd12-5d6c-411c-9b85-5761bf6e539f.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        self.buyer_user_id = None

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
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")

            # Store test result
            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_data': response.json() if response.text and success else {},
                'error_response': response.text if not success else None
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
        """Test buyer login with provided credentials"""
        # Try the specific buyer credentials from the review request
        buyer_credentials = [
            ("buy@demo.com", "buyer123"),
            ("marketing@grameenphone.com", "buyer123"),
            ("testbuyer@performance.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            login_data = {"email": email, "password": password}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                self.buyer_user_id = response.get('user', {}).get('id')
                print(f"   ✅ Buyer authenticated: {email}")
                print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
                print(f"   User ID: {self.buyer_user_id}")
                return True, response
        
        print("   ❌ All buyer login attempts failed")
        return False, {}

    def create_test_buyer_if_needed(self):
        """Create a test buyer user if authentication fails"""
        if not self.admin_token:
            admin_success, _ = self.test_admin_login()
            if not admin_success:
                return False, {}
        
        print("🔧 CREATING TEST BUYER USER FOR MONITORING SERVICE TESTING")
        
        # Create buyer user with proper contact_name field
        buyer_data = {
            "email": "testbuyer@performance.com",
            "password": "buyer123",
            "company_name": "Performance Test Company",
            "contact_name": "Test Buyer Manager",  # This is the key field that was causing the issue
            "phone": "+8801700000001",
            "role": "buyer",
            "address": "Test Address, Dhaka",
            "website": "https://testcompany.com"
        }
        
        success, response = self.run_test(
            "Create Test Buyer User", 
            "POST", 
            "admin/users", 
            200, 
            data=buyer_data,
            token=self.admin_token
        )
        
        if success:
            buyer_id = response.get('id')
            print(f"   ✅ Test buyer created: {response.get('email')}")
            
            # Approve the buyer user
            approval_data = {
                "status": "approved",
                "reason": "Auto-approved for monitoring service fix testing"
            }
            
            approve_success, approve_response = self.run_test(
                "Approve Test Buyer User", 
                "PATCH", 
                f"admin/users/{buyer_id}/status", 
                200, 
                data=approval_data,
                token=self.admin_token
            )
            
            if approve_success:
                print(f"   ✅ Test buyer approved")
                return True, response
            else:
                print(f"   ⚠️  Test buyer created but approval failed")
                return True, response
        else:
            print(f"   ❌ Test buyer creation failed")
            return False, {}

    def test_monitoring_service_creation_fix(self):
        """Test the fixed monitoring service creation functionality"""
        if not self.buyer_token:
            print("⚠️  Skipping monitoring service creation test - no buyer token")
            return False, {}
        
        print("🎯 TESTING FIXED MONITORING SERVICE CREATION")
        print("   Testing that User attribute error (contact_name vs name) is resolved")
        
        # Use the exact test data structure from the review request
        test_data = {
            "asset_ids": ["test_asset_id"], 
            "frequency": "monthly",
            "service_level": "basic",
            "campaign_id": "Individual",
            "start_date": "2025-01-01T00:00:00Z",
            "end_date": "2025-04-01T00:00:00Z",
            "notification_preferences": {
                "email": True,
                "in_app": True,
                "sms": False
            }
        }
        
        print(f"   Test data: {json.dumps(test_data, indent=2)}")
        
        success, response = self.run_test(
            "Create Monitoring Service - Fixed User Attribute Issue",
            "POST",
            "monitoring/services",
            200,  # Should succeed now that the fix is applied
            data=test_data,
            token=self.buyer_token
        )
        
        if success:
            print("🎉 MONITORING SERVICE CREATION FIX VERIFIED!")
            print("   ✅ User attribute error (contact_name vs name) has been resolved")
            print("   ✅ Monitoring service created successfully")
            
            # Check if offer_request was created
            if 'offer_request_id' in response or 'id' in response:
                print("   ✅ Offer request created successfully")
                print(f"   Service/Request ID: {response.get('id', response.get('offer_request_id'))}")
            
            # Verify buyer information is properly stored
            if 'buyer_name' in response or 'contact_name' in response:
                buyer_info = response.get('buyer_name') or response.get('contact_name')
                print(f"   ✅ Buyer information stored correctly: {buyer_info}")
            
            return True, response
        else:
            print("❌ MONITORING SERVICE CREATION STILL FAILING")
            error_response = self.test_results.get("Create Monitoring Service - Fixed User Attribute Issue", {}).get('error_response', '')
            
            # Check if it's still the User attribute error
            if 'User object has no attribute' in error_response:
                print("   ❌ User attribute error still present - fix not working")
                print(f"   Error details: {error_response[:200]}...")
            else:
                print("   ℹ️  Different error encountered (not the User attribute issue)")
                print(f"   Error details: {error_response[:200]}...")
            
            return False, {}

    def test_monitoring_service_with_different_campaign_ids(self):
        """Test monitoring service creation with different campaign ID scenarios"""
        if not self.buyer_token:
            print("⚠️  Skipping campaign ID tests - no buyer token")
            return False, {}
        
        print("🎯 TESTING MONITORING SERVICE WITH DIFFERENT CAMPAIGN IDS")
        
        # Test different campaign_id scenarios as mentioned in the review
        campaign_scenarios = [
            ("Individual", "Individual asset monitoring"),
            ("Existing", "Existing campaign monitoring"),
            ("Private", "Private campaign monitoring")
        ]
        
        results = []
        
        for campaign_id, description in campaign_scenarios:
            print(f"   Testing campaign_id: '{campaign_id}' ({description})")
            
            test_data = {
                "asset_ids": [f"test_asset_{campaign_id.lower()}"], 
                "frequency": "weekly",
                "service_level": "standard",
                "campaign_id": campaign_id,
                "start_date": "2025-01-15T00:00:00Z",
                "end_date": "2025-03-15T00:00:00Z",
                "notification_preferences": {
                    "email": True,
                    "in_app": True,
                    "sms": False
                }
            }
            
            success, response = self.run_test(
                f"Monitoring Service - Campaign ID '{campaign_id}'",
                "POST",
                "monitoring/services",
                200,
                data=test_data,
                token=self.buyer_token
            )
            
            results.append((campaign_id, success, response))
            
            if success:
                print(f"   ✅ Campaign ID '{campaign_id}' works correctly")
            else:
                print(f"   ❌ Campaign ID '{campaign_id}' failed")
        
        passed_scenarios = sum(1 for _, success, _ in results if success)
        total_scenarios = len(results)
        
        print(f"   📊 Campaign ID scenarios: {passed_scenarios}/{total_scenarios} passed")
        
        return passed_scenarios > 0, {"passed": passed_scenarios, "total": total_scenarios, "results": results}

    def test_offer_request_integration(self):
        """Test that monitoring service appears as offer_request with proper data"""
        if not self.admin_token:
            print("⚠️  Skipping offer request integration test - no admin token")
            return False, {}
        
        print("🎯 TESTING OFFER REQUEST INTEGRATION")
        
        # Get offer requests to see if monitoring services appear
        success, response = self.run_test(
            "Get Offer Requests - Check Monitoring Services",
            "GET",
            "admin/offer-requests",
            200,
            token=self.admin_token
        )
        
        if success:
            offer_requests = response if isinstance(response, list) else []
            monitoring_requests = []
            
            for request in offer_requests:
                # Check if this is a monitoring service request
                if (request.get('request_type') == 'monitoring_service' or 
                    request.get('monitoring_service_level') or
                    'monitoring' in request.get('service_bundles', {})):
                    monitoring_requests.append(request)
            
            print(f"   ✅ Found {len(monitoring_requests)} monitoring service requests in offer requests")
            
            if monitoring_requests:
                print("   📊 MONITORING SERVICE OFFER REQUESTS:")
                for i, req in enumerate(monitoring_requests[:3]):  # Show first 3
                    print(f"   Request {i+1}:")
                    print(f"     - ID: {req.get('id')}")
                    print(f"     - Buyer: {req.get('buyer_name')}")
                    print(f"     - Asset: {req.get('asset_name')}")
                    print(f"     - Status: {req.get('status')}")
                    print(f"     - Service Level: {req.get('monitoring_service_level', 'N/A')}")
                
                # Verify required fields are present
                sample_request = monitoring_requests[0]
                required_fields = ['id', 'buyer_name', 'asset_name', 'status']
                missing_fields = [field for field in required_fields if not sample_request.get(field)]
                
                if not missing_fields:
                    print("   ✅ All required fields present in monitoring service requests")
                    return True, {"monitoring_requests": len(monitoring_requests)}
                else:
                    print(f"   ⚠️  Missing fields in monitoring requests: {missing_fields}")
                    return False, {"missing_fields": missing_fields}
            else:
                print("   ℹ️  No monitoring service requests found (may need to create some first)")
                return True, {"monitoring_requests": 0}
        else:
            print("   ❌ Failed to get offer requests")
            return False, {}

    def run_monitoring_service_fix_test_suite(self):
        """Run the complete monitoring service fix test suite"""
        print("\n" + "="*80)
        print("🚀 MONITORING SERVICE CREATION FIX TEST SUITE")
        print("="*80)
        print("   Testing the fixed monitoring service creation functionality")
        print("   Focus: Resolving User attribute error (contact_name vs name)")
        print("   Expected: Monitoring service creation should work without User attribute errors")
        print()
        
        # Authentication setup
        print("🔐 AUTHENTICATION SETUP")
        admin_success, _ = self.test_admin_login()
        buyer_success, _ = self.test_buyer_login()
        
        # Create test buyer if needed
        if not buyer_success and admin_success:
            print("\n🔧 CREATING TEST BUYER")
            self.create_test_buyer_if_needed()
            buyer_success, _ = self.test_buyer_login()
        
        if not buyer_success:
            print("❌ Cannot proceed without buyer authentication")
            return False
        
        # Run the fix tests
        print("\n🎯 MONITORING SERVICE FIX TESTS")
        
        tests = [
            ("Fixed Monitoring Service Creation", self.test_monitoring_service_creation_fix),
            ("Campaign ID Assignment Testing", self.test_monitoring_service_with_different_campaign_ids),
            ("Offer Request Integration", self.test_offer_request_integration)
        ]
        
        test_results = []
        
        for test_name, test_func in tests:
            print(f"\n📋 Running: {test_name}")
            try:
                success, result = test_func()
                test_results.append((test_name, success, result))
                
                if success:
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
                test_results.append((test_name, False, {"error": str(e)}))
        
        # Summary
        print("\n" + "="*80)
        print("📊 MONITORING SERVICE FIX TEST RESULTS")
        print("="*80)
        
        passed_tests = sum(1 for _, success, _ in test_results if success)
        total_tests = len(test_results)
        
        print(f"Overall Results: {passed_tests}/{total_tests} tests passed ({(passed_tests/total_tests)*100:.1f}%)")
        print()
        
        for test_name, success, result in test_results:
            status = "✅ PASSED" if success else "❌ FAILED"
            print(f"{status}: {test_name}")
            if not success and isinstance(result, dict) and 'error' in result:
                print(f"   Error: {result['error']}")
        
        print()
        
        if passed_tests == total_tests:
            print("🎉 ALL MONITORING SERVICE FIX TESTS PASSED!")
            print("   ✅ User attribute error (contact_name vs name) has been resolved")
            print("   ✅ Monitoring service creation is working correctly")
            print("   ✅ Offer request integration is functional")
        elif passed_tests > 0:
            print("⚠️  PARTIAL SUCCESS - Some tests passed")
            print("   Some monitoring service functionality is working")
            print("   Review failed tests for remaining issues")
        else:
            print("❌ ALL TESTS FAILED")
            print("   Monitoring service creation fix may not be working")
            print("   User attribute error may still be present")
        
        print(f"\nTotal API calls made: {self.tests_run}")
        print(f"Successful API calls: {self.tests_passed}")
        
        return passed_tests == total_tests

def main():
    """Main test execution"""
    print("🚀 Starting Monitoring Service Creation Fix Testing...")
    
    tester = MonitoringServiceFixTester()
    success = tester.run_monitoring_service_fix_test_suite()
    
    if success:
        print("\n✅ Monitoring Service Fix Testing completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Monitoring Service Fix Testing completed with failures!")
        sys.exit(1)

if __name__ == "__main__":
    main()