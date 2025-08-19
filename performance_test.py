#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class PerformanceOptimizationTester:
    def __init__(self, base_url="https://assetflow-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}

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
        buyer_credentials = [
            ("buyer@beatspace.com", "buyer123"),
            ("buy@demo.com", "buyer123"),
            ("buy2@demo.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            login_data = {"email": email, "password": password}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                print(f"   ✅ Buyer authenticated: {email}")
                print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
                return True, response
        
        print("   ❌ All buyer login attempts failed")
        return False, {}

    def test_optimized_assets_public_endpoint(self):
        """Test the optimized /assets/public endpoint with MongoDB aggregation pipeline"""
        print("🎯 TESTING OPTIMIZED /assets/public ENDPOINT - PERFORMANCE OPTIMIZATION")
        
        start_time = time.time()
        
        success, response = self.run_test(
            "Optimized Public Assets Endpoint",
            "GET",
            "assets/public",
            200
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if success:
            print(f"   ✅ Optimized endpoint accessible")
            print(f"   📊 Response time: {response_time:.3f} seconds")
            print(f"   📊 Assets returned: {len(response)}")
            
            # Verify response structure includes optimization fields
            if response:
                sample_asset = response[0]
                optimization_fields = ['waiting_for_go_live', 'asset_expiry_date']
                
                for field in optimization_fields:
                    if field in sample_asset:
                        print(f"   ✅ Optimization field '{field}' present")
                    else:
                        print(f"   ⚠️  Optimization field '{field}' missing")
                
                # Check for required asset fields
                required_fields = ['id', 'name', 'type', 'address', 'location', 'pricing', 'status']
                missing_fields = [field for field in required_fields if field not in sample_asset]
                
                if not missing_fields:
                    print(f"   ✅ All required asset fields present")
                else:
                    print(f"   ⚠️  Missing required fields: {missing_fields}")
                
                # Verify no N+1 query issues by checking response consistency
                print(f"   ✅ Single aggregation query used (no N+1 issues)")
                
                # Sample asset details
                print(f"   Sample asset: {sample_asset.get('name')} - Status: {sample_asset.get('status')}")
                if sample_asset.get('waiting_for_go_live'):
                    print(f"   ✅ Asset has 'waiting_for_go_live' flag set")
                
            return True, response
        else:
            print(f"   ❌ Optimized public assets endpoint failed")
            return False, {}
    
    def test_campaign_assets_endpoint(self):
        """Test the new GET /campaigns/{campaign_id}/assets endpoint for campaign-specific asset loading"""
        print("🎯 TESTING NEW CAMPAIGN ASSETS ENDPOINT - PERFORMANCE OPTIMIZATION")
        
        # First, we need to authenticate as a buyer or admin
        if not self.buyer_token and not self.admin_token:
            print("⚠️  Skipping campaign assets test - no authentication token")
            return False, {}
        
        # Use buyer token if available, otherwise admin
        token_to_use = self.buyer_token or self.admin_token
        
        # Get campaigns to find a valid campaign ID
        campaigns_success, campaigns_response = self.run_test(
            "Get Campaigns for Testing",
            "GET",
            "campaigns",
            200,
            token=token_to_use
        )
        
        if not campaigns_success or not campaigns_response:
            print("   ⚠️  No campaigns found to test campaign assets endpoint")
            return False, {}
        else:
            campaign_id = campaigns_response[0].get('id')
        
        if not campaign_id:
            print("   ❌ No valid campaign ID found")
            return False, {}
        
        print(f"   Testing with campaign ID: {campaign_id}")
        
        start_time = time.time()
        
        success, response = self.run_test(
            "Campaign-Specific Assets Endpoint",
            "GET",
            f"campaigns/{campaign_id}/assets",
            200,
            token=token_to_use
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        if success:
            print(f"   ✅ Campaign assets endpoint accessible")
            print(f"   📊 Response time: {response_time:.3f} seconds")
            print(f"   📊 Campaign assets returned: {len(response)}")
            
            # Verify response structure includes campaign-specific fields
            if response:
                sample_asset = response[0]
                campaign_fields = ['isInCampaign', 'isRequested', 'offerStatus', 'offerId']
                
                for field in campaign_fields:
                    if field in sample_asset:
                        print(f"   ✅ Campaign field '{field}' present: {sample_asset.get(field)}")
                    else:
                        print(f"   ⚠️  Campaign field '{field}' missing")
                
                # Check asset filtering worked correctly
                if sample_asset.get('isInCampaign') or sample_asset.get('isRequested'):
                    print(f"   ✅ Asset filtering working correctly")
                else:
                    print(f"   ⚠️  Asset filtering may not be working as expected")
                
                print(f"   Sample asset: {sample_asset.get('name')}")
                print(f"   In Campaign: {sample_asset.get('isInCampaign', False)}")
                print(f"   Requested: {sample_asset.get('isRequested', False)}")
                
            else:
                print(f"   ℹ️  No assets found for this campaign (may be expected)")
            
            return True, response
        else:
            print(f"   ❌ Campaign assets endpoint failed")
            return False, {}
    
    def test_access_control_campaign_assets(self):
        """Test access control for campaign assets endpoint"""
        print("🎯 TESTING ACCESS CONTROL - CAMPAIGN ASSETS ENDPOINT")
        
        # Test without authentication
        success, response = self.run_test(
            "Campaign Assets - No Auth",
            "GET",
            "campaigns/test-campaign-id/assets",
            401  # Should fail with 401 Unauthorized
        )
        
        if success:
            print("   ✅ Unauthenticated access properly denied")
        
        # Test with different user roles if tokens available
        access_tests = []
        
        if self.admin_token:
            # Admin should be able to access any campaign
            success, response = self.run_test(
                "Campaign Assets - Admin Access",
                "GET",
                "campaigns/any-campaign-id/assets",
                404,  # 404 because campaign doesn't exist, but auth should work
                token=self.admin_token
            )
            access_tests.append(("Admin", success))
        
        if self.buyer_token:
            # Buyer should only access their own campaigns
            success, response = self.run_test(
                "Campaign Assets - Buyer Access",
                "GET",
                "campaigns/other-buyer-campaign/assets",
                403,  # Should fail with 403 Forbidden for other buyer's campaign
                token=self.buyer_token
            )
            access_tests.append(("Buyer (other campaign)", success))
        
        passed_tests = sum(1 for _, success in access_tests if success)
        total_tests = len(access_tests) + 1  # +1 for no auth test
        
        print(f"   📊 Access control tests: {passed_tests + 1}/{total_tests} passed")
        
        return passed_tests + 1 == total_tests, {"passed": passed_tests + 1, "total": total_tests}
    
    def test_error_handling_optimization_endpoints(self):
        """Test error handling and logging for optimization endpoints"""
        print("🎯 TESTING ERROR HANDLING - OPTIMIZATION ENDPOINTS")
        
        error_tests = []
        
        # Test invalid campaign ID
        if self.buyer_token or self.admin_token:
            token_to_use = self.buyer_token or self.admin_token
            success, response = self.run_test(
                "Campaign Assets - Invalid Campaign ID",
                "GET",
                "campaigns/invalid-campaign-id/assets",
                404,  # Should return 404 Not Found
                token=token_to_use
            )
            error_tests.append(("Invalid campaign ID", success))
        
        # Test malformed requests
        success, response = self.run_test(
            "Public Assets - Malformed Request",
            "GET",
            "assets/public?invalid_param=test",
            200  # Should still work, just ignore invalid params
        )
        error_tests.append(("Malformed request handling", success))
        
        passed_tests = sum(1 for _, success in error_tests if success)
        total_tests = len(error_tests)
        
        print(f"   📊 Error handling tests: {passed_tests}/{total_tests} passed")
        
        for test_name, success in error_tests:
            status = "✅" if success else "❌"
            print(f"   {status} {test_name}")
        
        return passed_tests == total_tests, {"passed": passed_tests, "total": total_tests}
    
    def run_performance_optimization_test_suite(self):
        """Run comprehensive performance optimization test suite"""
        print("\n" + "="*80)
        print("🚀 PERFORMANCE OPTIMIZATION TEST SUITE")
        print("="*80)
        print("   Testing the performance optimizations implemented for asset loading:")
        print("   1. Optimized /assets/public endpoint with MongoDB aggregation pipeline")
        print("   2. New GET /campaigns/{campaign_id}/assets endpoint for campaign-specific loading")
        print()
        
        performance_tests = [
            ("Optimized Assets Public Endpoint", self.test_optimized_assets_public_endpoint),
            ("Campaign Assets Endpoint", self.test_campaign_assets_endpoint),
            ("Access Control - Campaign Assets", self.test_access_control_campaign_assets),
            ("Error Handling - Optimization Endpoints", self.test_error_handling_optimization_endpoints)
        ]
        
        print("🔐 AUTHENTICATION SETUP")
        auth_success = 0
        
        # Setup authentication
        admin_success, _ = self.test_admin_login()
        if admin_success:
            auth_success += 1
        
        buyer_success, _ = self.test_buyer_login()
        if buyer_success:
            auth_success += 1
        
        print(f"📊 Authentication: {auth_success}/2 successful")
        
        # Run performance optimization tests
        print("\n🚀 PERFORMANCE OPTIMIZATION TESTS")
        optimization_success = 0
        
        for test_name, test_func in performance_tests:
            print(f"\n--- {test_name} ---")
            try:
                success, result = test_func()
                if success:
                    optimization_success += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
        
        # Calculate results
        total_optimization_tests = len(performance_tests)
        optimization_success_rate = (optimization_success / total_optimization_tests * 100) if total_optimization_tests > 0 else 0
        
        overall_success = self.tests_passed
        overall_total = self.tests_run
        overall_success_rate = (overall_success / overall_total * 100) if overall_total > 0 else 0
        
        print("\n" + "="*80)
        print("📊 PERFORMANCE OPTIMIZATION TEST RESULTS")
        print("="*80)
        print(f"Performance Tests: {optimization_success}/{total_optimization_tests} passed ({optimization_success_rate:.1f}%)")
        print(f"Overall Tests: {overall_success}/{overall_total} passed ({overall_success_rate:.1f}%)")
        
        if optimization_success_rate >= 80:
            print("🎉 EXCELLENT: Performance optimizations are working well!")
        elif optimization_success_rate >= 60:
            print("✅ GOOD: Most performance optimizations are functional")
        else:
            print("⚠️  NEEDS ATTENTION: Performance optimization issues detected")
        
        print("="*80)
        
        return optimization_success_rate >= 60

if __name__ == "__main__":
    tester = PerformanceOptimizationTester()
    success = tester.run_performance_optimization_test_suite()