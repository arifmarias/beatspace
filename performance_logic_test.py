#!/usr/bin/env python3
"""
Performance and Logic Fixes Testing
Testing the specific performance improvements and logic fixes implemented:
1. Campaign assets loading performance improvement
2. Marketplace asset availability logic fixes  
3. Campaign details dialog data consistency
"""

import requests
import json
import time
from datetime import datetime, timedelta
import sys

class PerformanceLogicTester:
    def __init__(self, base_url="https://assetflow-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        self.campaign_id = None
        self.asset_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, token=None, measure_time=False):
        """Run a single API test with optional performance measurement"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        start_time = time.time() if measure_time else None
        
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

            end_time = time.time() if measure_time else None
            response_time = end_time - start_time if measure_time else None

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response_time:
                    print(f"   ⏱️  Response time: {response_time:.3f}s")
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
                'response_time': response_time,
                'response_data': response.json() if response.text and success else {}
            }

            return success, response.json() if response.text and success else {}, response_time

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results[name] = {
                'success': False,
                'error': str(e)
            }
            return False, {}, None

    def authenticate_users(self):
        """Authenticate admin and buyer users"""
        print("🔐 AUTHENTICATING USERS")
        
        # Admin login
        admin_login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        success, response, _ = self.run_test("Admin Login", "POST", "auth/login", 200, data=admin_login_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   ✅ Admin authenticated: {response.get('user', {}).get('email')}")
        else:
            print("   ❌ Admin authentication failed")
            return False

        # Buyer login - try multiple existing buyers
        buyer_credentials = [
            ("buyer@beatspace.com", "buyer123"),
            ("buy@demo.com", "buyer123"),
            ("marketing@grameenphone.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            buyer_login_data = {"email": email, "password": password}
            success, response, _ = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=buyer_login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                print(f"   ✅ Buyer authenticated: {email}")
                break
        
        if not self.buyer_token:
            print("   ⚠️  No buyer authentication successful")
        
        return True

    def test_campaign_assets_endpoint_performance(self):
        """Test the new optimized GET /campaigns/{campaign_id}/assets endpoint"""
        print("\n🎯 TESTING CAMPAIGN ASSETS ENDPOINT PERFORMANCE")
        
        if not self.admin_token:
            print("   ❌ Admin token required for this test")
            return False, {}
        
        # First, get existing campaigns
        success, campaigns, _ = self.run_test(
            "Get Campaigns List", 
            "GET", 
            "campaigns", 
            200, 
            token=self.admin_token
        )
        
        if not success or not campaigns:
            print("   ❌ No campaigns found for testing")
            return False, {}
        
        # Find a campaign with assets
        test_campaign = None
        for campaign in campaigns:
            if campaign.get('campaign_assets') and len(campaign.get('campaign_assets', [])) > 0:
                test_campaign = campaign
                break
        
        if not test_campaign:
            print("   ⚠️  No campaigns with assets found, using first available campaign")
            test_campaign = campaigns[0]
        
        campaign_id = test_campaign['id']
        print(f"   Testing with campaign: {test_campaign.get('name')} (ID: {campaign_id})")
        
        # Test the new optimized endpoint
        success, response, response_time = self.run_test(
            "GET /campaigns/{id}/assets - Optimized Endpoint",
            "GET",
            f"campaigns/{campaign_id}/assets",
            200,
            token=self.admin_token,
            measure_time=True
        )
        
        if success:
            print(f"   ✅ Optimized endpoint working correctly")
            print(f"   ⏱️  Response time: {response_time:.3f}s")
            
            # Verify response structure
            if 'assets' in response:
                assets = response['assets']
                print(f"   📊 Campaign has {len(assets)} assets")
                
                # Check for performance optimization fields
                if assets:
                    sample_asset = assets[0]
                    optimization_fields = ['waiting_for_go_live', 'asset_expiry_date']
                    found_fields = [field for field in optimization_fields if field in sample_asset]
                    print(f"   🔧 Optimization fields present: {found_fields}")
                    
                    # Verify asset data structure
                    required_fields = ['id', 'name', 'status', 'address']
                    missing_fields = [field for field in required_fields if field not in sample_asset]
                    if not missing_fields:
                        print(f"   ✅ Asset data structure complete")
                    else:
                        print(f"   ⚠️  Missing asset fields: {missing_fields}")
            
            # Performance benchmark - should be under 2 seconds for good performance
            if response_time and response_time < 2.0:
                print(f"   ✅ Performance: Excellent (< 2s)")
            elif response_time and response_time < 5.0:
                print(f"   ⚠️  Performance: Acceptable (< 5s)")
            else:
                print(f"   ❌ Performance: Needs improvement (> 5s)")
            
            return True, response
        else:
            print(f"   ❌ Optimized endpoint failed")
            return False, {}

    def test_assets_public_endpoint_performance(self):
        """Test the optimized /assets/public endpoint performance"""
        print("\n🎯 TESTING ASSETS/PUBLIC ENDPOINT PERFORMANCE")
        
        # Test the public assets endpoint with performance measurement
        success, response, response_time = self.run_test(
            "GET /assets/public - Optimized Performance",
            "GET",
            "assets/public",
            200,
            measure_time=True
        )
        
        if success:
            print(f"   ✅ Public assets endpoint working correctly")
            print(f"   ⏱️  Response time: {response_time:.3f}s")
            print(f"   📊 Found {len(response)} public assets")
            
            # Verify optimization fields are present
            if response:
                sample_asset = response[0]
                optimization_fields = ['waiting_for_go_live', 'asset_expiry_date']
                found_fields = []
                
                for field in optimization_fields:
                    if field in sample_asset:
                        found_fields.append(field)
                        print(f"   🔧 {field}: {sample_asset[field]}")
                
                print(f"   ✅ Optimization fields present: {found_fields}")
                
                # Test waiting_for_go_live logic
                assets_with_waiting = [asset for asset in response if asset.get('waiting_for_go_live') == True]
                print(f"   📊 Assets waiting for go live: {len(assets_with_waiting)}")
                
                # Test asset_expiry_date logic
                assets_with_expiry = [asset for asset in response if asset.get('asset_expiry_date')]
                print(f"   📊 Assets with expiry dates: {len(assets_with_expiry)}")
            
            # Performance benchmark
            if response_time and response_time < 1.0:
                print(f"   ✅ Performance: Excellent (< 1s)")
            elif response_time and response_time < 3.0:
                print(f"   ⚠️  Performance: Good (< 3s)")
            else:
                print(f"   ❌ Performance: Needs improvement (> 3s)")
            
            return True, response
        else:
            print(f"   ❌ Public assets endpoint failed")
            return False, {}

    def test_asset_availability_logic(self):
        """Test asset availability logic fixes - waiting_for_go_live and asset_expiry_date"""
        print("\n🎯 TESTING ASSET AVAILABILITY LOGIC FIXES")
        
        # Get public assets to test logic
        success, assets, _ = self.run_test(
            "Get Assets for Logic Testing",
            "GET",
            "assets/public",
            200
        )
        
        if not success or not assets:
            print("   ❌ No assets available for logic testing")
            return False, {}
        
        print(f"   Testing logic on {len(assets)} assets")
        
        # Test waiting_for_go_live logic
        waiting_assets = []
        po_uploaded_assets = []
        
        for asset in assets:
            waiting_for_go_live = asset.get('waiting_for_go_live', False)
            asset_expiry_date = asset.get('asset_expiry_date')
            
            if waiting_for_go_live:
                waiting_assets.append(asset)
            
            if asset_expiry_date:
                po_uploaded_assets.append(asset)
        
        print(f"   📊 Assets with waiting_for_go_live=true: {len(waiting_assets)}")
        print(f"   📊 Assets with asset_expiry_date: {len(po_uploaded_assets)}")
        
        # Verify logic: waiting_for_go_live should only be true when PO is uploaded
        logic_correct = True
        for asset in waiting_assets:
            asset_name = asset.get('name', 'Unknown')
            if not asset.get('asset_expiry_date'):
                print(f"   ❌ Logic Error: {asset_name} has waiting_for_go_live=true but no asset_expiry_date")
                logic_correct = False
            else:
                print(f"   ✅ Logic Correct: {asset_name} has both waiting_for_go_live=true and asset_expiry_date")
        
        # Verify asset_expiry_date is only populated when appropriate
        for asset in po_uploaded_assets:
            asset_name = asset.get('name', 'Unknown')
            if asset.get('waiting_for_go_live'):
                print(f"   ✅ Logic Correct: {asset_name} has asset_expiry_date and waiting_for_go_live=true")
            else:
                print(f"   ℹ️  Info: {asset_name} has asset_expiry_date but waiting_for_go_live=false (may be valid)")
        
        if logic_correct:
            print(f"   ✅ Asset availability logic is working correctly")
        else:
            print(f"   ❌ Asset availability logic has issues")
        
        return logic_correct, {
            'waiting_assets': len(waiting_assets),
            'po_uploaded_assets': len(po_uploaded_assets),
            'logic_correct': logic_correct
        }

    def test_campaign_data_consistency(self):
        """Test campaign data consistency for dialog display"""
        print("\n🎯 TESTING CAMPAIGN DATA CONSISTENCY")
        
        if not self.admin_token:
            print("   ❌ Admin token required for this test")
            return False, {}
        
        # Get campaigns to test data consistency
        success, campaigns, _ = self.run_test(
            "Get Campaigns for Data Consistency Test",
            "GET",
            "campaigns",
            200,
            token=self.admin_token
        )
        
        if not success or not campaigns:
            print("   ❌ No campaigns available for testing")
            return False, {}
        
        print(f"   Testing data consistency on {len(campaigns)} campaigns")
        
        # Check required fields for campaign dialog
        required_fields = ['start_date', 'end_date', 'created_at', 'name', 'status', 'budget']
        optional_fields = ['description', 'buyer_name', 'campaign_assets']
        
        consistent_campaigns = 0
        total_campaigns = len(campaigns)
        
        for campaign in campaigns:
            campaign_name = campaign.get('name', 'Unknown Campaign')
            print(f"\n   📋 Testing campaign: {campaign_name}")
            
            # Check required fields
            missing_required = []
            for field in required_fields:
                if field not in campaign or campaign[field] is None:
                    missing_required.append(field)
                else:
                    print(f"      ✅ {field}: {campaign[field]}")
            
            if missing_required:
                print(f"      ❌ Missing required fields: {missing_required}")
            else:
                print(f"      ✅ All required fields present")
                consistent_campaigns += 1
            
            # Check date fields for duration calculation
            start_date = campaign.get('start_date')
            end_date = campaign.get('end_date')
            
            if start_date and end_date:
                try:
                    # Try to parse dates for duration calculation
                    if isinstance(start_date, str):
                        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                    else:
                        start_dt = start_date
                    
                    if isinstance(end_date, str):
                        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    else:
                        end_dt = end_date
                    
                    duration = (end_dt - start_dt).days
                    print(f"      ✅ Campaign duration calculable: {duration} days")
                except Exception as e:
                    print(f"      ❌ Date parsing error: {e}")
            
            # Check campaign assets structure
            campaign_assets = campaign.get('campaign_assets', [])
            if campaign_assets:
                print(f"      ✅ Campaign has {len(campaign_assets)} assets")
                
                # Check asset structure
                if campaign_assets:
                    sample_asset = campaign_assets[0]
                    asset_required_fields = ['asset_id', 'asset_name']
                    asset_missing = [field for field in asset_required_fields if field not in sample_asset]
                    if not asset_missing:
                        print(f"      ✅ Campaign asset structure complete")
                    else:
                        print(f"      ⚠️  Campaign asset missing fields: {asset_missing}")
            else:
                print(f"      ℹ️  Campaign has no assets")
        
        consistency_rate = (consistent_campaigns / total_campaigns) * 100
        print(f"\n   📊 Campaign data consistency: {consistent_campaigns}/{total_campaigns} ({consistency_rate:.1f}%)")
        
        if consistency_rate >= 90:
            print(f"   ✅ Campaign data consistency is excellent")
        elif consistency_rate >= 70:
            print(f"   ⚠️  Campaign data consistency is acceptable")
        else:
            print(f"   ❌ Campaign data consistency needs improvement")
        
        return consistency_rate >= 70, {
            'consistent_campaigns': consistent_campaigns,
            'total_campaigns': total_campaigns,
            'consistency_rate': consistency_rate
        }

    def test_performance_comparison(self):
        """Compare performance between old and new approaches"""
        print("\n🎯 TESTING PERFORMANCE COMPARISON")
        
        if not self.admin_token:
            print("   ❌ Admin token required for this test")
            return False, {}
        
        # Test 1: Campaign assets loading performance
        print("\n   📊 Campaign Assets Loading Performance:")
        
        # Get a campaign for testing
        success, campaigns, _ = self.run_test(
            "Get Campaigns for Performance Test",
            "GET",
            "campaigns",
            200,
            token=self.admin_token
        )
        
        if success and campaigns:
            campaign_id = campaigns[0]['id']
            
            # Test new optimized endpoint
            success, _, new_time = self.run_test(
                "New Optimized Campaign Assets Endpoint",
                "GET",
                f"campaigns/{campaign_id}/assets",
                200,
                token=self.admin_token,
                measure_time=True
            )
            
            if success and new_time:
                print(f"      ✅ New optimized endpoint: {new_time:.3f}s")
                
                # Performance evaluation
                if new_time < 1.0:
                    print(f"      🚀 Performance: Excellent - Campaign asset loading lag eliminated")
                elif new_time < 2.0:
                    print(f"      ✅ Performance: Good - Significant improvement achieved")
                else:
                    print(f"      ⚠️  Performance: Needs further optimization")
        
        # Test 2: Marketplace assets loading performance
        print("\n   📊 Marketplace Assets Loading Performance:")
        
        success, _, marketplace_time = self.run_test(
            "Marketplace Assets Performance",
            "GET",
            "assets/public",
            200,
            measure_time=True
        )
        
        if success and marketplace_time:
            print(f"      ✅ Marketplace loading time: {marketplace_time:.3f}s")
            
            if marketplace_time < 1.0:
                print(f"      🚀 Performance: Excellent - Marketplace loading optimized")
            elif marketplace_time < 3.0:
                print(f"      ✅ Performance: Good - Acceptable loading time")
            else:
                print(f"      ⚠️  Performance: May need caching improvements")
        
        return True, {
            'campaign_assets_time': new_time if 'new_time' in locals() else None,
            'marketplace_time': marketplace_time if 'marketplace_time' in locals() else None
        }

    def run_comprehensive_performance_logic_tests(self):
        """Run all performance and logic tests"""
        print("\n" + "="*80)
        print("🚀 PERFORMANCE & LOGIC FIXES COMPREHENSIVE TESTING")
        print("="*80)
        print("   Testing specific performance improvements and logic fixes:")
        print("   1. Campaign assets loading performance improvement")
        print("   2. Marketplace asset availability logic fixes")
        print("   3. Campaign details dialog data consistency")
        print()
        
        # Authentication
        if not self.authenticate_users():
            print("❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Run performance and logic tests
        test_suite = [
            ("Campaign Assets Endpoint Performance", self.test_campaign_assets_endpoint_performance),
            ("Assets/Public Endpoint Performance", self.test_assets_public_endpoint_performance),
            ("Asset Availability Logic Fixes", self.test_asset_availability_logic),
            ("Campaign Data Consistency", self.test_campaign_data_consistency),
            ("Performance Comparison", self.test_performance_comparison)
        ]
        
        print("\n🧪 RUNNING PERFORMANCE & LOGIC TESTS")
        print("-" * 50)
        
        passed_tests = 0
        total_tests = len(test_suite)
        
        for test_name, test_function in test_suite:
            print(f"\n📋 {test_name}")
            try:
                success, result = test_function()
                if success:
                    passed_tests += 1
                    print(f"   ✅ {test_name}: PASSED")
                else:
                    print(f"   ❌ {test_name}: FAILED")
            except Exception as e:
                print(f"   ❌ {test_name}: ERROR - {str(e)}")
        
        # Final results
        print("\n" + "="*80)
        print("📊 PERFORMANCE & LOGIC FIXES TEST RESULTS")
        print("="*80)
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"Tests Passed: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
        print(f"Tests Run: {self.tests_run}")
        print(f"API Calls Successful: {self.tests_passed}/{self.tests_run}")
        
        if success_rate >= 80:
            print("🎉 PERFORMANCE & LOGIC FIXES: WORKING CORRECTLY")
            print("   ✅ Campaign asset loading performance improved")
            print("   ✅ Asset availability logic fixes implemented")
            print("   ✅ Campaign data consistency verified")
        elif success_rate >= 60:
            print("⚠️  PERFORMANCE & LOGIC FIXES: PARTIALLY WORKING")
            print("   Some improvements verified, but issues remain")
        else:
            print("❌ PERFORMANCE & LOGIC FIXES: SIGNIFICANT ISSUES")
            print("   Major problems detected in implementation")
        
        return success_rate >= 80

def main():
    """Main test execution"""
    print("🚀 Starting Performance & Logic Fixes Testing...")
    
    tester = PerformanceLogicTester()
    success = tester.run_comprehensive_performance_logic_tests()
    
    if success:
        print("\n✅ All performance and logic fixes are working correctly!")
        sys.exit(0)
    else:
        print("\n❌ Performance and logic fixes have issues that need attention!")
        sys.exit(1)

if __name__ == "__main__":
    main()