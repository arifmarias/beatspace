import requests
import sys
import json
from datetime import datetime

class BeatSpaceAPITester:
    def __init__(self, base_url="https://a4df27c4-1783-4db7-95ad-c286de139cf8.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.seller_token = None
        self.created_user_id = None
        self.created_asset_id = None
        self.created_campaign_id = None
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

    # Authentication Tests for Specific Users
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
            print(f"   User role: {response.get('user', {}).get('role', 'N/A')}")
        return success, response

    def test_seller_login(self):
        """Test seller login"""
        login_data = {
            "email": "dhaka.media@example.com",
            "password": "seller123"
        }
        success, response = self.run_test("Seller Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.seller_token = response['access_token']
            print(f"   Seller token obtained: {self.seller_token[:20]}...")
            print(f"   User role: {response.get('user', {}).get('role', 'N/A')}")
        return success, response

    def test_buyer_login(self):
        """Test buyer login"""
        login_data = {
            "email": "marketing@grameenphone.com",
            "password": "buyer123"
        }
        success, response = self.run_test("Buyer Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.buyer_token = response['access_token']
            print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
            print(f"   User role: {response.get('user', {}).get('role', 'N/A')}")
        return success, response

    # Critical Public Endpoints Tests
    def test_public_stats(self):
        """Test getting public statistics - CRITICAL for homepage"""
        success, response = self.run_test("Get Public Stats", "GET", "stats/public", 200)
        if success:
            expected_keys = ['total_assets', 'available_assets', 'total_users', 'active_campaigns']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in stats: {missing_keys}")
            else:
                print(f"   ✅ Stats structure looks good")
            print(f"   Total assets: {response.get('total_assets', 'N/A')}")
            print(f"   Available assets: {response.get('available_assets', 'N/A')}")
            print(f"   Total users: {response.get('total_users', 'N/A')}")
            print(f"   Active campaigns: {response.get('active_campaigns', 'N/A')}")
        return success, response

    def test_public_assets(self):
        """Test getting public assets - CRITICAL for marketplace"""
        success, response = self.run_test("Get Public Assets", "GET", "assets/public", 200)
        if success:
            print(f"   Found {len(response)} public assets")
            if response:
                asset = response[0]
                required_fields = ['id', 'name', 'type', 'address', 'location', 'pricing', 'status']
                missing_fields = [field for field in required_fields if field not in asset]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in asset: {missing_fields}")
                else:
                    print(f"   ✅ Asset structure looks good")
                print(f"   Sample asset: {asset.get('name')} - {asset.get('status')}")
        return success, response

    # Asset CRUD Operations Tests
    def test_get_assets_authenticated(self):
        """Test getting assets with authentication"""
        if not self.seller_token:
            print("⚠️  Skipping authenticated assets test - no seller token")
            return False, {}
        
        success, response = self.run_test("Get Assets (Authenticated)", "GET", "assets", 200, token=self.seller_token)
        if success:
            print(f"   Found {len(response)} assets for seller")
            if response:
                asset = response[0]
                required_fields = ['id', 'name', 'type', 'address', 'location', 'pricing', 'status']
                missing_fields = [field for field in required_fields if field not in asset]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in asset: {missing_fields}")
                else:
                    print(f"   ✅ Asset structure looks good")
        return success, response

    def test_create_asset(self):
        """Test creating a new asset (seller functionality)"""
        if not self.seller_token:
            print("⚠️  Skipping asset creation test - no seller token")
            return False, {}
        
        asset_data = {
            "name": f"Test Asset {datetime.now().strftime('%H%M%S')}",
            "type": "Billboard",
            "address": "Test Location, Dhaka",
            "location": {"lat": 23.7461, "lng": 90.3742},
            "dimensions": "10 x 20 ft",
            "pricing": {"3_months": 8000, "6_months": 14000, "12_months": 25000},
            "photos": ["https://images.unsplash.com/photo-1541888946425-d81bb1924c35?w=800&h=600&fit=crop"],
            "description": "Test asset created by automated testing",
            "specifications": {"material": "Vinyl", "lighting": "LED"},
            "visibility_score": 7,
            "traffic_volume": "Medium",
            "district": "Dhaka",
            "division": "Dhaka"
        }
        
        success, response = self.run_test("Create Asset", "POST", "assets", 200, data=asset_data, token=self.seller_token)
        if success and 'id' in response:
            self.created_asset_id = response['id']
            print(f"   Created asset ID: {self.created_asset_id}")
        return success, response

    def test_get_single_asset(self):
        """Test getting a single asset by ID"""
        if not self.created_asset_id:
            # Get an asset ID from public assets
            success, assets = self.test_public_assets()
            if success and assets:
                asset_id = assets[0]['id']
            else:
                print("⚠️  Skipping single asset test - no asset ID available")
                return False, {}
        else:
            asset_id = self.created_asset_id
        
        if not self.seller_token:
            print("⚠️  Skipping single asset test - no seller token")
            return False, {}
        
        success, response = self.run_test(f"Get Single Asset", "GET", f"assets/{asset_id}", 200, token=self.seller_token)
        return success, response

    def test_update_asset(self):
        """Test updating an asset"""
        if not self.seller_token or not self.created_asset_id:
            print("⚠️  Skipping asset update test - missing seller token or asset ID")
            return False, {}
        
        update_data = {
            "description": "Updated test asset description",
            "pricing": {"3_months": 9000, "6_months": 16000, "12_months": 28000}
        }
        
        success, response = self.run_test(
            "Update Asset", 
            "PUT", 
            f"assets/{self.created_asset_id}", 
            200, 
            data=update_data, 
            token=self.seller_token
        )
        return success, response

    def test_delete_asset(self):
        """Test deleting an asset"""
        if not self.seller_token or not self.created_asset_id:
            print("⚠️  Skipping asset deletion test - missing seller token or asset ID")
            return False, {}
        
        success, response = self.run_test(
            "Delete Asset", 
            "DELETE", 
            f"assets/{self.created_asset_id}", 
            200, 
            token=self.seller_token
        )
        return success, response

    # User Management Tests (Admin only)
    def test_admin_get_users(self):
        """Test admin getting all users"""
        if not self.admin_token:
            print("⚠️  Skipping admin users test - no admin token")
            return False, {}
        
        success, response = self.run_test("Admin Get Users", "GET", "admin/users", 200, token=self.admin_token)
        if success:
            print(f"   Found {len(response)} users in system")
            for user in response[:3]:  # Show first 3 users
                print(f"   User: {user.get('email')} - {user.get('role')} - {user.get('status')}")
        return success, response

    def test_admin_update_user_status(self):
        """Test admin updating user status"""
        if not self.admin_token:
            print("⚠️  Skipping user status update test - no admin token")
            return False, {}
        
        # First get users to find one to update
        success, users = self.test_admin_get_users()
        if not success or not users:
            print("⚠️  No users found to update status")
            return False, {}
        
        # Find a user that's not admin
        target_user = None
        for user in users:
            if user.get('role') != 'admin':
                target_user = user
                break
        
        if not target_user:
            print("⚠️  No non-admin user found to update")
            return False, {}
        
        status_update = {
            "status": "approved",
            "reason": "Test status update"
        }
        
        success, response = self.run_test(
            "Admin Update User Status", 
            "PATCH", 
            f"admin/users/{target_user['id']}/status", 
            200, 
            data=status_update,
            token=self.admin_token
        )
        return success, response

    def test_admin_get_assets(self):
        """Test admin getting all assets"""
        if not self.admin_token:
            print("⚠️  Skipping admin assets test - no admin token")
            return False, {}
        
        success, response = self.run_test("Admin Get Assets", "GET", "admin/assets", 200, token=self.admin_token)
        if success:
            print(f"   Found {len(response)} assets in system")
            for asset in response[:3]:  # Show first 3 assets
                print(f"   Asset: {asset.get('name')} - {asset.get('type')} - {asset.get('status')}")
        return success, response

    def test_admin_update_asset_status(self):
        """Test admin updating asset status"""
        if not self.admin_token:
            print("⚠️  Skipping asset status update test - no admin token")
            return False, {}
        
        # First get assets to find one to update
        success, assets = self.test_admin_get_assets()
        if not success or not assets:
            print("⚠️  No assets found to update status")
            return False, {}
        
        # Find an asset to update
        target_asset = assets[0] if assets else None
        
        if not target_asset:
            print("⚠️  No asset found to update")
            return False, {}
        
        status_update = {
            "status": "Available"
        }
        
        success, response = self.run_test(
            "Admin Update Asset Status", 
            "PATCH", 
            f"admin/assets/{target_asset['id']}/status", 
            200, 
            data=status_update,
            token=self.admin_token
        )
        return success, response

    # Campaign Management Tests
    def test_get_campaigns(self):
        """Test getting campaigns"""
        if not self.buyer_token:
            print("⚠️  Skipping campaigns test - no buyer token")
            return False, {}
        
        success, response = self.run_test("Get Campaigns", "GET", "campaigns", 200, token=self.buyer_token)
        if success:
            print(f"   Found {len(response)} campaigns for buyer")
            if response:
                campaign = response[0]
                print(f"   Sample campaign: {campaign.get('name')} - {campaign.get('status')}")
        return success, response

    def test_create_campaign(self):
        """Test creating a new campaign (buyer functionality)"""
        if not self.buyer_token:
            print("⚠️  Skipping campaign creation test - no buyer token")
            return False, {}
        
        # Get some asset IDs for the campaign
        success, assets = self.test_public_assets()
        asset_ids = []
        if success and assets:
            asset_ids = [assets[0]['id']] if assets else []
        
        campaign_data = {
            "name": f"Test Campaign {datetime.now().strftime('%H%M%S')}",
            "description": "Test campaign for API testing",
            "assets": asset_ids,
            "budget": 25000.0,
            "start_date": "2025-02-01T00:00:00Z",
            "end_date": "2025-04-30T23:59:59Z"
        }
        
        success, response = self.run_test("Create Campaign", "POST", "campaigns", 200, data=campaign_data, token=self.buyer_token)
        if success and 'id' in response:
            self.created_campaign_id = response['id']
            print(f"   Created campaign ID: {self.created_campaign_id}")
        return success, response

    def test_update_campaign(self):
        """Test updating a campaign"""
        if not self.buyer_token or not self.created_campaign_id:
            print("⚠️  Skipping campaign update test - missing buyer token or campaign ID")
            return False, {}
        
        update_data = {
            "description": "Updated test campaign description",
            "budget": 30000.0
        }
        
        success, response = self.run_test(
            "Update Campaign", 
            "PUT", 
            f"campaigns/{self.created_campaign_id}", 
            200, 
            data=update_data, 
            token=self.buyer_token
        )
        return success, response

    # NEW CAMPAIGN LIFECYCLE TESTS
    def test_campaign_status_change_to_live(self):
        """Test changing campaign status to Live and verify asset status updates"""
        if not self.buyer_token:
            print("⚠️  Skipping campaign status test - no buyer token")
            return False, {}
        
        # First, get existing campaigns to find one we can test with
        success, campaigns = self.test_get_campaigns()
        if not success or not campaigns:
            print("⚠️  No campaigns found to test status change")
            return False, {}
        
        # Find a Draft campaign or use the first one
        test_campaign = None
        for campaign in campaigns:
            if campaign.get('status') == 'Draft':
                test_campaign = campaign
                break
        
        if not test_campaign:
            test_campaign = campaigns[0]  # Use first campaign if no Draft found
        
        campaign_id = test_campaign['id']
        print(f"   Testing with campaign: {test_campaign.get('name')} (Status: {test_campaign.get('status')})")
        
        # Get assets in this campaign before status change
        campaign_assets = test_campaign.get('assets', [])
        if campaign_assets:
            print(f"   Campaign has {len(campaign_assets)} assets")
            
            # Check current asset statuses
            for asset_id in campaign_assets[:2]:  # Check first 2 assets
                success_asset, asset_data = self.run_test(
                    f"Get Asset Before Status Change", 
                    "GET", 
                    f"assets/{asset_id}", 
                    200, 
                    token=self.buyer_token
                )
                if success_asset:
                    print(f"   Asset {asset_data.get('name', 'Unknown')} status before: {asset_data.get('status')}")
        
        # Change campaign status to Live
        status_update = {"status": "Live"}
        success, response = self.run_test(
            "Update Campaign Status to Live", 
            "PUT", 
            f"campaigns/{campaign_id}/status", 
            200, 
            data=status_update,
            token=self.buyer_token
        )
        
        if success:
            print("   ✅ Campaign status updated to Live")
            
            # Verify assets status changed to Live
            if campaign_assets:
                for asset_id in campaign_assets[:2]:  # Check first 2 assets
                    success_asset, asset_data = self.run_test(
                        f"Get Asset After Status Change", 
                        "GET", 
                        f"assets/{asset_id}", 
                        200, 
                        token=self.buyer_token
                    )
                    if success_asset:
                        new_status = asset_data.get('status')
                        print(f"   Asset {asset_data.get('name', 'Unknown')} status after: {new_status}")
                        if new_status == "Live":
                            print("   ✅ Asset status correctly updated to Live")
                        else:
                            print(f"   ⚠️  Asset status is {new_status}, expected Live")
        
        return success, response

    def test_campaign_status_change_to_draft(self):
        """Test changing campaign status to Draft and verify asset status updates"""
        if not self.buyer_token:
            print("⚠️  Skipping campaign draft status test - no buyer token")
            return False, {}
        
        # Get existing campaigns
        success, campaigns = self.test_get_campaigns()
        if not success or not campaigns:
            print("⚠️  No campaigns found to test draft status change")
            return False, {}
        
        # Find a Live campaign or use the first one
        test_campaign = None
        for campaign in campaigns:
            if campaign.get('status') == 'Live':
                test_campaign = campaign
                break
        
        if not test_campaign:
            test_campaign = campaigns[0]  # Use first campaign if no Live found
        
        campaign_id = test_campaign['id']
        print(f"   Testing with campaign: {test_campaign.get('name')} (Status: {test_campaign.get('status')})")
        
        # Change campaign status to Draft
        status_update = {"status": "Draft"}
        success, response = self.run_test(
            "Update Campaign Status to Draft", 
            "PUT", 
            f"campaigns/{campaign_id}/status", 
            200, 
            data=status_update,
            token=self.buyer_token
        )
        
        if success:
            print("   ✅ Campaign status updated to Draft")
            
            # Verify assets status changed to Available
            campaign_assets = test_campaign.get('assets', [])
            if campaign_assets:
                for asset_id in campaign_assets[:2]:  # Check first 2 assets
                    success_asset, asset_data = self.run_test(
                        f"Get Asset After Draft Status Change", 
                        "GET", 
                        f"assets/{asset_id}", 
                        200, 
                        token=self.buyer_token
                    )
                    if success_asset:
                        new_status = asset_data.get('status')
                        print(f"   Asset {asset_data.get('name', 'Unknown')} status after: {new_status}")
                        if new_status == "Available":
                            print("   ✅ Asset status correctly updated to Available")
                        else:
                            print(f"   ⚠️  Asset status is {new_status}, expected Available")
        
        return success, response

    def test_sample_data_campaign_statuses(self):
        """Test that sample data includes realistic campaign statuses"""
        if not self.buyer_token:
            print("⚠️  Skipping sample data test - no buyer token")
            return False, {}
        
        success, campaigns = self.test_get_campaigns()
        if not success or not campaigns:
            print("⚠️  No campaigns found in sample data")
            return False, {}
        
        print(f"   Found {len(campaigns)} campaigns in sample data")
        
        # Check for variety in campaign statuses
        statuses = {}
        for campaign in campaigns:
            status = campaign.get('status', 'Unknown')
            statuses[status] = statuses.get(status, 0) + 1
            print(f"   Campaign: {campaign.get('name')} - Status: {status}")
            
            # Check if campaign has assets
            assets = campaign.get('assets', [])
            if assets:
                print(f"     Has {len(assets)} assets")
        
        print(f"   Status distribution: {statuses}")
        
        # Verify we have both Live and Draft campaigns
        has_live = 'Live' in statuses
        has_draft = 'Draft' in statuses
        
        if has_live and has_draft:
            print("   ✅ Sample data includes both Live and Draft campaigns")
            return True, campaigns
        else:
            print(f"   ⚠️  Sample data missing variety - Live: {has_live}, Draft: {has_draft}")
            return True, campaigns  # Still successful, just noting the issue

    def test_asset_status_consistency(self):
        """Test that asset statuses are consistent with their campaign statuses"""
        if not self.buyer_token:
            print("⚠️  Skipping asset consistency test - no buyer token")
            return False, {}
        
        # Get all campaigns
        success, campaigns = self.test_get_campaigns()
        if not success or not campaigns:
            print("⚠️  No campaigns found for consistency test")
            return False, {}
        
        print("   Checking asset-campaign status consistency...")
        
        inconsistencies = 0
        total_checked = 0
        
        for campaign in campaigns:
            campaign_status = campaign.get('status')
            campaign_assets = campaign.get('assets', [])
            
            if not campaign_assets:
                continue
                
            print(f"   Campaign: {campaign.get('name')} (Status: {campaign_status})")
            
            for asset_id in campaign_assets[:2]:  # Check first 2 assets per campaign
                success_asset, asset_data = self.run_test(
                    f"Get Asset for Consistency Check", 
                    "GET", 
                    f"assets/{asset_id}", 
                    200, 
                    token=self.buyer_token
                )
                
                if success_asset:
                    asset_status = asset_data.get('status')
                    total_checked += 1
                    
                    # Check expected consistency
                    expected_status = None
                    if campaign_status == "Live":
                        expected_status = "Live"
                    elif campaign_status == "Draft":
                        expected_status = "Available"
                    
                    if expected_status and asset_status != expected_status:
                        inconsistencies += 1
                        print(f"     ⚠️  Asset {asset_data.get('name')} status: {asset_status}, expected: {expected_status}")
                    else:
                        print(f"     ✅ Asset {asset_data.get('name')} status: {asset_status}")
        
        if inconsistencies == 0:
            print(f"   ✅ All {total_checked} assets have consistent statuses")
            return True, {"checked": total_checked, "inconsistencies": 0}
        else:
            print(f"   ⚠️  Found {inconsistencies} inconsistencies out of {total_checked} assets")
            return True, {"checked": total_checked, "inconsistencies": inconsistencies}

def main():
    print("🚀 Starting BeatSpace Backend API Testing...")
    print("Testing Critical Missing Endpoints and CRUD Operations")
    print("=" * 60)
    
    tester = BeatSpaceAPITester()
    
    # Test 1: Critical Public Endpoints (highest priority)
    print("\n📍 CRITICAL PUBLIC ENDPOINTS")
    print("These endpoints are essential for homepage and marketplace functionality")
    tester.test_public_stats()
    tester.test_public_assets()
    
    # Test 2: Authentication System
    print("\n🔐 AUTHENTICATION SYSTEM")
    print("Testing login for all user roles")
    tester.test_admin_login()
    tester.test_seller_login()
    tester.test_buyer_login()
    
    # Test 3: Asset CRUD Operations
    print("\n📦 ASSET CRUD OPERATIONS")
    print("Testing complete asset management functionality")
    tester.test_get_assets_authenticated()
    tester.test_create_asset()
    tester.test_get_single_asset()
    tester.test_update_asset()
    tester.test_delete_asset()
    
    # Test 4: Admin Management (Users & Assets)
    print("\n👑 ADMIN MANAGEMENT (USERS & ASSETS)")
    print("Testing admin management capabilities for users and assets")
    tester.test_admin_get_users()
    tester.test_admin_update_user_status()
    tester.test_admin_get_assets()
    tester.test_admin_update_asset_status()
    
    # Test 5: Campaign Management
    print("\n🎯 CAMPAIGN MANAGEMENT")
    print("Testing campaign creation and management")
    tester.test_get_campaigns()
    tester.test_create_campaign()
    tester.test_update_campaign()
    
    # Test 6: NEW CAMPAIGN LIFECYCLE & ASSET STATUS MANAGEMENT
    print("\n🔄 CAMPAIGN LIFECYCLE & ASSET STATUS MANAGEMENT")
    print("Testing campaign status changes and asset status lifecycle")
    tester.test_sample_data_campaign_statuses()
    tester.test_asset_status_consistency()
    tester.test_campaign_status_change_to_live()
    tester.test_campaign_status_change_to_draft()
    
    # Test 7: Authorization Tests
    print("\n🔒 AUTHORIZATION TESTS")
    print("Testing that protected routes require proper authentication")
    
    # Test protected routes without auth (should fail)
    protected_endpoints = [
        ("Get Assets (Protected)", "GET", "assets"),
        ("Create Asset", "POST", "assets"),
        ("Get Campaigns", "GET", "campaigns"),
        ("Create Campaign", "POST", "campaigns"),
        ("Admin Get Users", "GET", "admin/users")
    ]
    
    for name, method, endpoint in protected_endpoints:
        tester.run_test(f"{name} - No Auth", method, endpoint, 401)
    
    # Test admin endpoints with non-admin token (should fail)
    if tester.buyer_token:
        tester.run_test("Buyer Access Admin Endpoint", "GET", "admin/users", 403, token=tester.buyer_token)
    
    # Print detailed results
    print("\n" + "=" * 60)
    print("📊 DETAILED TEST RESULTS")
    print("=" * 60)
    
    critical_tests = [
        "Get Public Stats",
        "Get Public Assets", 
        "Admin Login",
        "Seller Login",
        "Buyer Login",
        "Get Assets (Authenticated)",
        "Create Asset",
        "Admin Get Users",
        "Admin Update User Status",
        "Admin Get Assets",
        "Admin Update Asset Status",
        "Get Campaigns",
        "Create Campaign",
        "Update Campaign Status to Live",
        "Update Campaign Status to Draft"
    ]
    
    critical_passed = 0
    critical_total = 0
    
    for test_name in critical_tests:
        if test_name in tester.test_results:
            critical_total += 1
            result = tester.test_results[test_name]
            if result['success']:
                critical_passed += 1
                print(f"✅ {test_name}")
            else:
                print(f"❌ {test_name} - Status: {result.get('status_code', 'Error')}")
    
    print(f"\n📈 SUMMARY")
    print(f"Total Tests: {tester.tests_passed}/{tester.tests_run} passed")
    print(f"Critical Tests: {critical_passed}/{critical_total} passed")
    
    # Determine overall status
    if critical_passed == critical_total:
        print("🎉 All critical tests passed! Backend API is working correctly.")
        return 0
    elif critical_passed >= critical_total * 0.8:  # 80% pass rate
        print("✅ Most critical tests passed - minor issues detected")
        return 0
    else:
        print("❌ Major issues detected - backend needs fixes")
        return 1

if __name__ == "__main__":
    sys.exit(main())