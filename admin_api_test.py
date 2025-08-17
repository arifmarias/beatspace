#!/usr/bin/env python3
"""
Admin API Endpoints Testing Script
Focus: Test admin API endpoints to identify why AdminDashboard.js is failing to load data
"""

import requests
import json
import sys
from datetime import datetime
import os

class AdminAPITester:
    def __init__(self):
        # Get backend URL from environment
        self.base_url = os.getenv('REACT_APP_BACKEND_URL', 'https://asset-flow-1.preview.emergentagent.com')
        if not self.base_url.endswith('/api'):
            self.base_url += '/api'
        
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = {}
        
        print(f"🔧 Admin API Tester initialized")
        print(f"   Backend URL: {self.base_url}")
        print(f"   Testing admin endpoints for AdminDashboard.js compatibility")
        print()

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, token=None):
        """Run a single API test with detailed logging"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"🔍 Test {self.tests_run}: {name}")
        print(f"   Method: {method}")
        print(f"   URL: {url}")
        print(f"   Headers: {list(headers.keys())}")
        
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
            
            print(f"   Status: {response.status_code} (expected: {expected_status})")
            
            # Try to parse response
            response_data = {}
            try:
                response_data = response.json()
                if isinstance(response_data, list):
                    print(f"   Response: Array with {len(response_data)} items")
                    if response_data:
                        print(f"   Sample item keys: {list(response_data[0].keys()) if isinstance(response_data[0], dict) else 'Not a dict'}")
                elif isinstance(response_data, dict):
                    print(f"   Response keys: {list(response_data.keys())}")
                    if 'message' in response_data:
                        print(f"   Message: {response_data['message']}")
                else:
                    print(f"   Response type: {type(response_data)}")
            except Exception as parse_error:
                print(f"   Response parsing error: {parse_error}")
                print(f"   Raw response: {response.text[:200]}...")

            if success:
                self.tests_passed += 1
                print(f"   ✅ PASSED")
            else:
                print(f"   ❌ FAILED")
                print(f"   Error details: {response.text[:300]}...")

            # Store test result
            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_data': response_data,
                'url': url,
                'method': method
            }

            print()
            return success, response_data

        except Exception as e:
            print(f"   ❌ FAILED - Exception: {str(e)}")
            self.test_results[name] = {
                'success': False,
                'error': str(e),
                'url': url,
                'method': method
            }
            print()
            return False, {}

    def test_admin_login(self):
        """Test admin authentication"""
        print("🔐 ADMIN AUTHENTICATION TEST")
        
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login", 
            "POST", 
            "auth/login", 
            200, 
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            user_info = response.get('user', {})
            print(f"✅ Admin authenticated successfully")
            print(f"   Token length: {len(self.admin_token)} characters")
            print(f"   User role: {user_info.get('role')}")
            print(f"   User email: {user_info.get('email')}")
            print(f"   User status: {user_info.get('status')}")
            return True
        else:
            print(f"❌ Admin authentication failed")
            return False

    def test_admin_offer_requests_endpoint(self):
        """Test GET /api/admin/offer-requests endpoint"""
        print("📋 ADMIN OFFER REQUESTS ENDPOINT TEST")
        print("   This is the endpoint AdminDashboard.js fetchOfferRequests() calls")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        success, response = self.run_test(
            "Admin Offer Requests", 
            "GET", 
            "admin/offer-requests", 
            200, 
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Admin offer requests endpoint working")
            if isinstance(response, list):
                print(f"   Found {len(response)} offer requests")
                if response:
                    sample_request = response[0]
                    print(f"   Sample request fields: {list(sample_request.keys())}")
                    print(f"   Sample request status: {sample_request.get('status')}")
                    print(f"   Sample buyer: {sample_request.get('buyer_name')}")
                else:
                    print("   ⚠️  No offer requests found - this may cause 'Failed to load offer requests' error")
            return True
        else:
            print(f"❌ Admin offer requests endpoint failed")
            print(f"   This explains 'Failed to load offer requests' error in AdminDashboard")
            return False

    def test_admin_assets_endpoint(self):
        """Test GET /api/admin/assets endpoint"""
        print("🏢 ADMIN ASSETS ENDPOINT TEST")
        print("   This is the endpoint AdminDashboard.js fetchBookedAssets() calls")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        success, response = self.run_test(
            "Admin Assets", 
            "GET", 
            "admin/assets", 
            200, 
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Admin assets endpoint working")
            if isinstance(response, list):
                print(f"   Found {len(response)} assets")
                if response:
                    sample_asset = response[0]
                    print(f"   Sample asset fields: {list(sample_asset.keys())}")
                    print(f"   Sample asset status: {sample_asset.get('status')}")
                    print(f"   Sample asset name: {sample_asset.get('name')}")
                else:
                    print("   ⚠️  No assets found - this may cause 'Failed to load live assets' error")
            return True
        else:
            print(f"❌ Admin assets endpoint failed")
            print(f"   This explains 'Failed to load live assets' error in AdminDashboard")
            return False

    def test_general_offers_requests_endpoint(self):
        """Test GET /api/offers/requests with admin token"""
        print("📝 GENERAL OFFERS REQUESTS ENDPOINT TEST")
        print("   Testing if admin can access general offers endpoint")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        success, response = self.run_test(
            "General Offers Requests (Admin)", 
            "GET", 
            "offers/requests", 
            200, 
            token=self.admin_token
        )
        
        if success:
            print(f"✅ General offers requests endpoint accessible by admin")
            if isinstance(response, list):
                print(f"   Found {len(response)} offer requests")
                if response:
                    sample_request = response[0]
                    print(f"   Sample request status: {sample_request.get('status')}")
            return True
        else:
            print(f"❌ General offers requests endpoint failed for admin")
            return False

    def test_monitoring_services_endpoint(self):
        """Test GET /api/monitoring/services endpoint"""
        print("📊 MONITORING SERVICES ENDPOINT TEST")
        print("   Testing monitoring services endpoint accessibility")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        success, response = self.run_test(
            "Monitoring Services", 
            "GET", 
            "monitoring/services", 
            200, 
            token=self.admin_token
        )
        
        if success:
            print(f"✅ Monitoring services endpoint accessible")
            if isinstance(response, dict) and 'services' in response:
                services = response['services']
                print(f"   Found {len(services)} monitoring services")
                if services:
                    sample_service = services[0]
                    print(f"   Sample service fields: {list(sample_service.keys())}")
            elif isinstance(response, list):
                print(f"   Found {len(response)} monitoring services (direct array)")
            return True
        else:
            print(f"❌ Monitoring services endpoint failed")
            return False

    def test_authentication_requirements(self):
        """Test authentication requirements for admin endpoints"""
        print("🔒 AUTHENTICATION REQUIREMENTS TEST")
        print("   Testing that admin endpoints properly require authentication")
        
        # Test admin/offer-requests without token
        success1, _ = self.run_test(
            "Admin Offer Requests (No Auth)", 
            "GET", 
            "admin/offer-requests", 
            401  # Should return 401 Unauthorized
        )
        
        # Test admin/assets without token
        success2, _ = self.run_test(
            "Admin Assets (No Auth)", 
            "GET", 
            "admin/assets", 
            401  # Should return 401 Unauthorized
        )
        
        if success1 and success2:
            print(f"✅ Authentication requirements working correctly")
            return True
        else:
            print(f"❌ Authentication requirements not working properly")
            return False

    def test_admin_permissions(self):
        """Test that admin user has proper permissions"""
        print("👑 ADMIN PERMISSIONS TEST")
        print("   Testing admin user permissions for various endpoints")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        # Test multiple admin endpoints to verify permissions
        endpoints_to_test = [
            ("admin/users", "Admin Users"),
            ("admin/campaigns", "Admin Campaigns"),
            ("assets", "Assets (General)"),
            ("users", "Users (General)")
        ]
        
        permissions_working = 0
        total_tests = len(endpoints_to_test)
        
        for endpoint, name in endpoints_to_test:
            success, response = self.run_test(
                f"{name} Permission Test", 
                "GET", 
                endpoint, 
                200, 
                token=self.admin_token
            )
            if success:
                permissions_working += 1
        
        print(f"   Admin permissions: {permissions_working}/{total_tests} endpoints accessible")
        
        if permissions_working >= total_tests * 0.75:  # At least 75% should work
            print(f"✅ Admin permissions working correctly")
            return True
        else:
            print(f"❌ Admin permissions issues detected")
            return False

    def test_error_scenarios(self):
        """Test error scenarios and edge cases"""
        print("⚠️  ERROR SCENARIOS TEST")
        print("   Testing error handling for various scenarios")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        # Test non-existent endpoint
        success1, response1 = self.run_test(
            "Non-existent Endpoint", 
            "GET", 
            "admin/non-existent-endpoint", 
            404  # Should return 404 Not Found
        )
        
        # Test malformed request
        success2, response2 = self.run_test(
            "Malformed Request", 
            "POST", 
            "admin/offer-requests", 
            400,  # Should return 400 Bad Request or similar
            data={"invalid": "data"},
            token=self.admin_token
        )
        
        # Test with invalid token
        success3, response3 = self.run_test(
            "Invalid Token", 
            "GET", 
            "admin/offer-requests", 
            401,  # Should return 401 Unauthorized
            token="invalid_token_12345"
        )
        
        error_tests_passed = sum([success1, success2, success3])
        
        print(f"   Error handling: {error_tests_passed}/3 scenarios handled correctly")
        
        if error_tests_passed >= 2:  # At least 2/3 should work
            print(f"✅ Error handling working correctly")
            return True
        else:
            print(f"❌ Error handling issues detected")
            return False

    def test_data_format_compatibility(self):
        """Test data format compatibility with AdminDashboard.js expectations"""
        print("📊 DATA FORMAT COMPATIBILITY TEST")
        print("   Testing if API responses match AdminDashboard.js expectations")
        
        if not self.admin_token:
            print("❌ Cannot test - no admin token")
            return False
        
        compatibility_issues = []
        
        # Test offer requests format
        success, offer_requests = self.run_test(
            "Offer Requests Format Check", 
            "GET", 
            "admin/offer-requests", 
            200, 
            token=self.admin_token
        )
        
        if success and isinstance(offer_requests, list):
            if offer_requests:
                sample_request = offer_requests[0]
                required_fields = ['id', 'buyer_name', 'asset_name', 'status', 'created_at']
                missing_fields = [field for field in required_fields if field not in sample_request]
                if missing_fields:
                    compatibility_issues.append(f"Offer requests missing fields: {missing_fields}")
                else:
                    print(f"   ✅ Offer requests format compatible")
            else:
                print(f"   ⚠️  No offer requests to check format")
        else:
            compatibility_issues.append("Offer requests endpoint not returning array")
        
        # Test assets format
        success, assets = self.run_test(
            "Assets Format Check", 
            "GET", 
            "admin/assets", 
            200, 
            token=self.admin_token
        )
        
        if success and isinstance(assets, list):
            if assets:
                sample_asset = assets[0]
                required_fields = ['id', 'name', 'status', 'type', 'address']
                missing_fields = [field for field in required_fields if field not in sample_asset]
                if missing_fields:
                    compatibility_issues.append(f"Assets missing fields: {missing_fields}")
                else:
                    print(f"   ✅ Assets format compatible")
            else:
                print(f"   ⚠️  No assets to check format")
        else:
            compatibility_issues.append("Assets endpoint not returning array")
        
        if not compatibility_issues:
            print(f"✅ Data format compatibility verified")
            return True
        else:
            print(f"❌ Data format compatibility issues:")
            for issue in compatibility_issues:
                print(f"   - {issue}")
            return False

    def run_comprehensive_admin_api_test(self):
        """Run comprehensive admin API test suite"""
        print("="*80)
        print("🚀 ADMIN API ENDPOINTS COMPREHENSIVE TEST SUITE")
        print("="*80)
        print("Focus: Identify why AdminDashboard.js shows 'Failed to load' errors")
        print("Testing endpoints: /admin/offer-requests, /admin/assets, /offers/requests, /monitoring/services")
        print()
        
        # Test sequence
        tests = [
            ("Admin Authentication", self.test_admin_login),
            ("Admin Offer Requests Endpoint", self.test_admin_offer_requests_endpoint),
            ("Admin Assets Endpoint", self.test_admin_assets_endpoint),
            ("General Offers Requests Endpoint", self.test_general_offers_requests_endpoint),
            ("Monitoring Services Endpoint", self.test_monitoring_services_endpoint),
            ("Authentication Requirements", self.test_authentication_requirements),
            ("Admin Permissions", self.test_admin_permissions),
            ("Error Scenarios", self.test_error_scenarios),
            ("Data Format Compatibility", self.test_data_format_compatibility)
        ]
        
        print("📋 TEST EXECUTION SEQUENCE:")
        for i, (name, _) in enumerate(tests, 1):
            print(f"   {i}. {name}")
        print()
        
        # Execute tests
        results = {}
        for test_name, test_func in tests:
            print(f"{'='*60}")
            print(f"🧪 EXECUTING: {test_name}")
            print(f"{'='*60}")
            
            try:
                result = test_func()
                results[test_name] = result
                print(f"Result: {'✅ PASSED' if result else '❌ FAILED'}")
            except Exception as e:
                print(f"❌ EXCEPTION: {str(e)}")
                results[test_name] = False
            
            print()
        
        # Summary
        print("="*80)
        print("📊 ADMIN API TEST RESULTS SUMMARY")
        print("="*80)
        
        passed_tests = sum(1 for result in results.values() if result)
        total_tests = len(results)
        success_rate = (passed_tests / total_tests) * 100
        
        print(f"Overall Success Rate: {success_rate:.1f}% ({passed_tests}/{total_tests})")
        print()
        
        print("Individual Test Results:")
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {status} - {test_name}")
        
        print()
        print("="*80)
        print("🔍 DIAGNOSIS FOR ADMINDASHBOARD.JS ISSUES")
        print("="*80)
        
        # Specific diagnosis for AdminDashboard issues
        offer_requests_working = results.get("Admin Offer Requests Endpoint", False)
        assets_working = results.get("Admin Assets Endpoint", False)
        auth_working = results.get("Admin Authentication", False)
        
        if not auth_working:
            print("❌ CRITICAL: Admin authentication is failing")
            print("   - AdminDashboard.js cannot get valid admin token")
            print("   - This will cause all subsequent API calls to fail")
            print("   - Fix: Check admin credentials (admin@beatspace.com/admin123)")
        
        if not offer_requests_working:
            print("❌ CRITICAL: Admin offer requests endpoint is failing")
            print("   - This explains 'Failed to load offer requests' error")
            print("   - AdminDashboard.js fetchOfferRequests() cannot get data")
            print("   - Fix: Check /api/admin/offer-requests endpoint implementation")
        
        if not assets_working:
            print("❌ CRITICAL: Admin assets endpoint is failing")
            print("   - This explains 'Failed to load live assets' error")
            print("   - AdminDashboard.js fetchBookedAssets() cannot get data")
            print("   - Fix: Check /api/admin/assets endpoint implementation")
        
        if auth_working and offer_requests_working and assets_working:
            print("✅ All critical endpoints working")
            print("   - AdminDashboard.js should be able to load data successfully")
            print("   - If still seeing errors, check frontend error handling")
        
        print()
        print("="*80)
        print("🎯 RECOMMENDATIONS")
        print("="*80)
        
        if not auth_working:
            print("1. Fix admin authentication first - all other tests depend on it")
        
        if not offer_requests_working:
            print("2. Implement or fix GET /api/admin/offer-requests endpoint")
            print("   - Should return array of offer request objects")
            print("   - Required fields: id, buyer_name, asset_name, status, created_at")
        
        if not assets_working:
            print("3. Implement or fix GET /api/admin/assets endpoint")
            print("   - Should return array of asset objects")
            print("   - Required fields: id, name, status, type, address")
        
        if success_rate < 70:
            print("4. Overall API stability issues detected")
            print("   - Review error handling and authentication middleware")
            print("   - Check database connectivity and data availability")
        
        print()
        return success_rate >= 70

def main():
    """Main test execution"""
    print("🚀 Starting Admin API Endpoints Testing")
    print("="*80)
    
    tester = AdminAPITester()
    
    try:
        success = tester.run_comprehensive_admin_api_test()
        
        if success:
            print("🎉 Admin API testing completed successfully!")
            sys.exit(0)
        else:
            print("❌ Admin API testing completed with issues!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Testing failed with exception: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()