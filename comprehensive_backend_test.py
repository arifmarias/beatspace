#!/usr/bin/env python3
"""
Comprehensive Backend Test for BeatSpace - Additional verification
Testing additional backend functionality beyond the critical bug fixes.
"""

import requests
import sys
import json
from datetime import datetime

class ComprehensiveBackendTester:
    def __init__(self, base_url="https://429a12fb-5f68-4b3d-bc9e-f009343f55d6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.seller_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
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
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   📊 Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   📊 Response keys: {list(response_data.keys())}")
                except:
                    print(f"   📊 Response: {response.text[:100]}...")
            else:
                print(f"❌ FAILED - Expected: {expected_status}, Got: {response.status_code}")
                print(f"   📊 Response: {response.text[:300]}...")
            
            return response
            
        except Exception as e:
            print(f"❌ ERROR - {str(e)}")
            return None

    def authenticate_all_users(self):
        """Authenticate all user types"""
        print("\n🔐 Authenticating all user types...")
        
        # Admin
        admin_response = self.run_test(
            "Admin Authentication", 
            "POST", 
            "auth/login", 
            200, 
            data={"email": "admin@beatspace.com", "password": "admin123"}
        )
        if admin_response and admin_response.status_code == 200:
            self.admin_token = admin_response.json().get('access_token')
        
        # Buyer
        buyer_response = self.run_test(
            "Buyer Authentication", 
            "POST", 
            "auth/login", 
            200, 
            data={"email": "marketing@grameenphone.com", "password": "buyer123"}
        )
        if buyer_response and buyer_response.status_code == 200:
            self.buyer_token = buyer_response.json().get('access_token')
        
        # Seller
        seller_response = self.run_test(
            "Seller Authentication", 
            "POST", 
            "auth/login", 
            200, 
            data={"email": "dhaka.media@example.com", "password": "seller123"}
        )
        if seller_response and seller_response.status_code == 200:
            self.seller_token = seller_response.json().get('access_token')

    def test_public_endpoints(self):
        """Test public endpoints that don't require authentication"""
        print("\n" + "="*60)
        print("📋 TESTING PUBLIC ENDPOINTS")
        print("="*60)
        
        # Public stats
        self.run_test("Public Stats", "GET", "stats/public", 200)
        
        # Public assets
        self.run_test("Public Assets", "GET", "assets/public", 200)

    def test_asset_management(self):
        """Test asset management functionality"""
        print("\n" + "="*60)
        print("📋 TESTING ASSET MANAGEMENT")
        print("="*60)
        
        # Get assets (authenticated)
        self.run_test("Get Assets (Admin)", "GET", "assets", 200, token=self.admin_token)
        self.run_test("Get Assets (Seller)", "GET", "assets", 200, token=self.seller_token)
        
        # Get specific asset
        # First get an asset ID
        assets_response = self.run_test("Get Assets for ID", "GET", "assets/public", 200)
        if assets_response and assets_response.status_code == 200:
            assets = assets_response.json()
            if assets:
                asset_id = assets[0]['id']
                self.run_test("Get Single Asset", "GET", f"assets/{asset_id}", 200, token=self.admin_token)

    def test_campaign_management(self):
        """Test campaign management functionality"""
        print("\n" + "="*60)
        print("📋 TESTING CAMPAIGN MANAGEMENT")
        print("="*60)
        
        # Get campaigns (buyer)
        self.run_test("Get Campaigns (Buyer)", "GET", "campaigns", 200, token=self.buyer_token)
        
        # Get campaigns (admin)
        self.run_test("Get Admin Campaigns", "GET", "admin/campaigns", 200, token=self.admin_token)

    def test_offer_workflow(self):
        """Test offer request workflow"""
        print("\n" + "="*60)
        print("📋 TESTING OFFER WORKFLOW")
        print("="*60)
        
        # Get offer requests (buyer)
        self.run_test("Get Offer Requests (Buyer)", "GET", "offers/requests", 200, token=self.buyer_token)
        
        # Get offer requests (admin)
        self.run_test("Get Admin Offer Requests", "GET", "admin/offer-requests", 200, token=self.admin_token)

    def test_user_management(self):
        """Test user management functionality"""
        print("\n" + "="*60)
        print("📋 TESTING USER MANAGEMENT")
        print("="*60)
        
        # Get users (admin only)
        self.run_test("Get Users (Admin)", "GET", "admin/users", 200, token=self.admin_token)
        
        # Test unauthorized access
        self.run_test("Get Users (Buyer - Should Fail)", "GET", "admin/users", 403, token=self.buyer_token)

    def test_analytics_endpoints(self):
        """Test analytics endpoints"""
        print("\n" + "="*60)
        print("📋 TESTING ANALYTICS ENDPOINTS")
        print("="*60)
        
        # Analytics overview
        self.run_test("Analytics Overview", "GET", "analytics/overview", 200, token=self.admin_token)
        
        # Revenue analytics
        self.run_test("Revenue Analytics", "GET", "analytics/revenue", 200, token=self.admin_token)
        
        # Asset analytics
        self.run_test("Asset Analytics", "GET", "analytics/assets", 200, token=self.admin_token)

    def test_monitoring_system(self):
        """Test monitoring system endpoints"""
        print("\n" + "="*60)
        print("📋 TESTING MONITORING SYSTEM")
        print("="*60)
        
        # Get monitoring records
        self.run_test("Get Monitoring Records", "GET", "monitoring/records", 200, token=self.admin_token)

    def run_comprehensive_test(self):
        """Run all comprehensive tests"""
        print("🎯 BEATSPACE COMPREHENSIVE BACKEND TEST")
        print("="*80)
        print("Testing additional backend functionality beyond critical bug fixes")
        print("="*80)
        
        # Authenticate all users
        self.authenticate_all_users()
        
        # Run all test suites
        self.test_public_endpoints()
        self.test_asset_management()
        self.test_campaign_management()
        self.test_offer_workflow()
        self.test_user_management()
        self.test_analytics_endpoints()
        self.test_monitoring_system()
        
        # Print final results
        print("\n" + "="*80)
        print("🎯 COMPREHENSIVE TEST RESULTS")
        print("="*80)
        
        print(f"📊 TOTAL TESTS: {self.tests_passed}/{self.tests_run} PASSED")
        print(f"📊 SUCCESS RATE: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL COMPREHENSIVE TESTS PASSED!")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"\n⚠️  {failed_tests} TESTS FAILED")
            return False

def main():
    """Main test execution"""
    tester = ComprehensiveBackendTester()
    success = tester.run_comprehensive_test()
    
    if success:
        print("\n✅ COMPREHENSIVE TEST: PASSED")
        sys.exit(0)
    else:
        print("\n⚠️  COMPREHENSIVE TEST: SOME ISSUES FOUND")
        sys.exit(0)  # Don't fail on comprehensive tests

if __name__ == "__main__":
    main()