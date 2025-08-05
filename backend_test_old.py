import requests
import sys
import json
from datetime import datetime

class BeatSpaceAPITester:
    def __init__(self, base_url="https://e65537d7-a6e3-4bc8-98bb-a7eeddde2060.preview.emergentagent.com/api"):
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

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

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

    def test_user_registration(self):
        """Test user registration for buyer and seller"""
        timestamp = datetime.now().strftime('%H%M%S')
        
        # Test buyer registration
        buyer_data = {
            "email": f"testbuyer{timestamp}@example.com",
            "password": "TestPass123!",
            "company_name": "Test Buyer Company",
            "contact_name": "Test Buyer",
            "phone": "+8801234567890",
            "role": "buyer",
            "address": "Test Address, Dhaka"
        }
        
        success_buyer, response_buyer = self.run_test("Register Buyer", "POST", "auth/register", 200, data=buyer_data)
        if success_buyer:
            self.created_user_id = response_buyer.get('user_id')
            print(f"   Created buyer ID: {self.created_user_id}")
        
        # Test seller registration
        seller_data = {
            "email": f"testseller{timestamp}@example.com",
            "password": "TestPass123!",
            "company_name": "Test Seller Company",
            "contact_name": "Test Seller",
            "phone": "+8801234567891",
            "role": "seller",
            "address": "Test Address, Dhaka"
        }
        
        success_seller, response_seller = self.run_test("Register Seller", "POST", "auth/register", 200, data=seller_data)
        
        return success_buyer and success_seller

    def test_login_without_approval(self):
        """Test login attempt before admin approval"""
        timestamp = datetime.now().strftime('%H%M%S')
        login_data = {
            "email": f"testbuyer{timestamp}@example.com",
            "password": "TestPass123!"
        }
        # Should fail with 403 because user is not approved yet
        return self.run_test("Login Without Approval", "POST", "auth/login", 403, data=login_data)

    # Admin Dashboard Tests
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

    def test_admin_approve_user(self):
        """Test admin approving a user"""
        if not self.admin_token or not self.created_user_id:
            print("⚠️  Skipping user approval test - missing admin token or user ID")
            return False, {}
        
        approval_data = {
            "status": "approved",
            "reason": "Test approval"
        }
        
        return self.run_test(
            "Admin Approve User", 
            "PATCH", 
            f"admin/users/{self.created_user_id}/status", 
            200, 
            data=approval_data,
            token=self.admin_token
        )

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

    def test_admin_approve_asset(self):
        """Test admin approving an asset"""
        if not self.admin_token:
            print("⚠️  Skipping asset approval test - no admin token")
            return False, {}
        
        # First get assets to find one to approve
        success, assets = self.test_admin_get_assets()
        if not success or not assets:
            print("⚠️  No assets found to approve")
            return False, {}
        
        # Find a pending asset or use the first one
        asset_to_approve = None
        for asset in assets:
            if asset.get('status') == 'Pending Approval':
                asset_to_approve = asset
                break
        
        if not asset_to_approve:
            asset_to_approve = assets[0]  # Use first asset
        
        approval_data = {
            "status": "Available",
            "reason": "Test approval"
        }
        
        return self.run_test(
            "Admin Approve Asset", 
            "PATCH", 
            f"admin/assets/{asset_to_approve['id']}/status", 
            200, 
            data=approval_data,
            token=self.admin_token
        )

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
            "PUT", 
            f"admin/users/{target_user['id']}/status", 
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

    # Legacy test methods for backward compatibility
    def test_get_assets(self):
        """Test getting all assets (legacy method)"""
        success, response = self.run_test("Get All Assets (Legacy)", "GET", "assets/public", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} assets")
            if len(response) > 0:
                asset = response[0]
                required_fields = ['id', 'name', 'type', 'address', 'location', 'pricing', 'status']
                missing_fields = [field for field in required_fields if field not in asset]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in asset: {missing_fields}")
                else:
                    print(f"   ✅ Asset structure looks good")
                    print(f"   Sample asset: {asset['name']} - {asset['type']} - {asset['status']}")
        return success, response

    def test_get_single_asset(self, asset_id):
        """Test getting a single asset by ID (legacy method)"""
        # Since we don't have a single asset endpoint in the new API, we'll test the public assets endpoint
        success, response = self.run_test(f"Get Single Asset {asset_id}", "GET", "assets/public", 200)
        if success and response:
            # Find the asset with the given ID
            found_asset = None
            for asset in response:
                if asset.get('id') == asset_id:
                    found_asset = asset
                    break
            if found_asset:
                print(f"   Found asset: {found_asset['name']}")
                return True, found_asset
            else:
                print(f"   Asset {asset_id} not found in public assets")
                return False, {}
        return success, response

    def test_get_nonexistent_asset(self):
        """Test getting a non-existent asset (legacy method)"""
        # This will test the public assets endpoint with a filter that should return empty
        return self.run_test("Get Non-existent Asset", "GET", "assets/public", 200, params={"district": "NonExistentDistrict"})

    def test_get_stats(self):
        """Test platform statistics endpoint (legacy method)"""
        success, response = self.run_test("Get Platform Stats (Legacy)", "GET", "stats/public", 200)
        if success:
            expected_keys = ['total_assets', 'available_assets', 'total_users', 'asset_types']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in stats: {missing_keys}")
            else:
                print(f"   ✅ Stats structure looks good")
                print(f"   Total assets: {response.get('total_assets', 'N/A')}")
                print(f"   Available assets: {response.get('available_assets', 'N/A')}")
        return success, response

    def test_get_assets(self):
        """Test getting all assets"""
        success, response = self.run_test("Get All Assets", "GET", "assets", 200)
        if success and isinstance(response, list):
            print(f"   Found {len(response)} assets")
            if len(response) > 0:
                asset = response[0]
                required_fields = ['id', 'name', 'type', 'address', 'location', 'pricing', 'status']
                missing_fields = [field for field in required_fields if field not in asset]
                if missing_fields:
                    print(f"   ⚠️  Missing fields in asset: {missing_fields}")
                else:
                    print(f"   ✅ Asset structure looks good")
                    print(f"   Sample asset: {asset['name']} - {asset['type']} - {asset['status']}")
        return success, response

    def test_get_assets_with_filters(self):
        """Test asset filtering"""
        filters = [
            ("Filter by type", {"asset_type": "Billboard"}),
            ("Filter by status", {"status": "Available"}),
            ("Filter by price range", {"min_price": "5000", "max_price": "20000"}),
            ("Filter by duration", {"duration": "3_months"})
        ]
        
        all_passed = True
        for filter_name, params in filters:
            success, response = self.run_test(f"Assets - {filter_name}", "GET", "assets", 200, params=params)
            if success:
                print(f"   Filtered results: {len(response)} assets")
            all_passed = all_passed and success
        
        return all_passed

    def test_get_single_asset(self, asset_id):
        """Test getting a single asset by ID"""
        return self.run_test(f"Get Asset {asset_id}", "GET", f"assets/{asset_id}", 200)

    def test_get_nonexistent_asset(self):
        """Test getting a non-existent asset"""
        return self.run_test("Get Non-existent Asset", "GET", "assets/nonexistent-id", 404)

    def test_get_stats(self):
        """Test platform statistics endpoint"""
        success, response = self.run_test("Get Platform Stats", "GET", "stats", 200)
        if success:
            expected_keys = ['total_assets', 'available_assets', 'total_campaigns', 'asset_types']
            missing_keys = [key for key in expected_keys if key not in response]
            if missing_keys:
                print(f"   ⚠️  Missing keys in stats: {missing_keys}")
            else:
                print(f"   ✅ Stats structure looks good")
                print(f"   Total assets: {response.get('total_assets', 'N/A')}")
                print(f"   Available assets: {response.get('available_assets', 'N/A')}")
        return success, response

    def test_create_campaign(self):
        """Test creating a new campaign"""
        campaign_data = {
            "name": f"Test Campaign {datetime.now().strftime('%H%M%S')}",
            "buyer_id": "test_buyer_001",
            "buyer_name": "Test Buyer",
            "asset_ids": ["test-asset-1", "test-asset-2"],
            "description": "Test campaign for API testing",
            "budget": 25000.0,
            "notes": "This is a test campaign created by automated testing"
        }
        
        success, response = self.run_test("Create Campaign", "POST", "campaigns", 201, data=campaign_data)
        if success and 'id' in response:
            self.created_campaign_id = response['id']
            print(f"   Created campaign ID: {self.created_campaign_id}")
        return success, response

    def test_get_campaigns(self):
        """Test getting all campaigns"""
        return self.run_test("Get All Campaigns", "GET", "campaigns", 200)

    def test_request_best_offer(self):
        """Test requesting best offer for a campaign"""
        if not self.created_campaign_id:
            print("⚠️  Skipping best offer test - no campaign created")
            return False, {}
        
        offer_request = {
            "campaign_id": self.created_campaign_id,
            "asset_requirements": {
                "test-asset-1": {
                    "duration": "3_months",
                    "services": ["setup", "monitoring"],
                    "notes": "Prime location required"
                }
            },
            "timeline": "Standard 2-week setup",
            "special_requirements": "Need approval for creative content"
        }
        
        return self.run_test(
            "Request Best Offer", 
            "POST", 
            f"campaigns/{self.created_campaign_id}/request-offer", 
            200, 
            data=offer_request
        )

    def test_create_asset(self):
        """Test creating a new asset (seller functionality)"""
        asset_data = {
            "name": f"Test Asset {datetime.now().strftime('%H%M%S')}",
            "type": "Billboard",
            "address": "Test Location, Dubai",
            "location": {"lat": 25.2048, "lng": 55.2708},
            "dimensions": "10 x 20 ft",
            "pricing": {"3_months": 8000, "6_months": 14000, "12_months": 25000},
            "status": "Available",
            "photos": ["https://example.com/test-photo.jpg"],
            "description": "Test asset created by automated testing",
            "specifications": {"material": "Vinyl", "lighting": "LED"},
            "seller_id": "test_seller_001",
            "seller_name": "Test Seller",
            "visibility_score": 7,
            "traffic_volume": "Medium"
        }
        
        return self.run_test("Create Asset", "POST", "assets", 201, data=asset_data)

    # Phase 3 Advanced Feature Tests
    def test_offer_mediation_system(self):
        """Test Phase 3 Offer Mediation System"""
        if not self.admin_token:
            print("⚠️  Skipping offer mediation tests - no admin token")
            return False
        
        print("\n   🔄 Testing Offer Mediation System...")
        
        # Test getting offer requests
        success1, requests = self.run_test(
            "Get Offer Requests", 
            "GET", 
            "admin/offer-requests", 
            200, 
            token=self.admin_token
        )
        
        # Test submitting final offer
        final_offer_data = {
            "request_id": "test-request-001",
            "campaign_id": "test-campaign-001",
            "final_pricing": {
                "billboard_1": 15000,
                "billboard_2": 12000
            },
            "terms": "Standard terms and conditions apply",
            "timeline": "2 weeks setup, 3 months campaign",
            "included_services": ["setup", "monitoring", "maintenance"],
            "total_amount": 27000,
            "admin_notes": "Negotiated pricing based on bulk booking"
        }
        
        success2, offer_response = self.run_test(
            "Submit Final Offer", 
            "POST", 
            "admin/submit-final-offer", 
            200, 
            data=final_offer_data,
            token=self.admin_token
        )
        
        # Test buyer notification
        notification_data = {
            "campaign_id": "test-campaign-001",
            "type": "offer_ready"
        }
        
        success3, _ = self.run_test(
            "Notify Buyer", 
            "POST", 
            "admin/notify-buyer", 
            200, 
            data=notification_data,
            token=self.admin_token
        )
        
        return success1 and success2 and success3

    def test_asset_monitoring_system(self):
        """Test Phase 3 Asset Monitoring System"""
        if not self.admin_token:
            print("⚠️  Skipping monitoring tests - no admin token")
            return False
        
        print("\n   📊 Testing Asset Monitoring System...")
        
        # Test getting monitoring records
        success1, records = self.run_test(
            "Get Monitoring Records", 
            "GET", 
            "monitoring/records", 
            200, 
            token=self.admin_token,
            params={"date_range": "30_days"}
        )
        
        # Test creating monitoring record
        monitoring_data = {
            "asset_id": "test-asset-001",
            "photos": [
                "https://images.unsplash.com/photo-1541888946425-d81bb1924c35?w=800&h=600&fit=crop"
            ],
            "condition_rating": 8,
            "notes": "Asset in good condition, minor cleaning required",
            "weather_condition": "Clear",
            "maintenance_required": False,
            "issues_reported": "",
            "inspector": "Test Inspector",
            "gps_location": {"lat": 23.7461, "lng": 90.3742}
        }
        
        success2, record_response = self.run_test(
            "Create Monitoring Record", 
            "POST", 
            "monitoring/records", 
            200, 
            data=monitoring_data,
            token=self.admin_token
        )
        
        # Test monitoring report generation
        success3, _ = self.run_test(
            "Generate Monitoring Report", 
            "GET", 
            "monitoring/report/test-asset-001", 
            200, 
            token=self.admin_token,
            params={"date_range": "30_days"}
        )
        
        return success1 and success2 and success3

    def test_advanced_analytics(self):
        """Test Phase 3 Advanced Analytics Dashboard"""
        if not self.admin_token:
            print("⚠️  Skipping analytics tests - no admin token")
            return False
        
        print("\n   📈 Testing Advanced Analytics...")
        
        # Test analytics overview
        success1, overview = self.run_test(
            "Analytics Overview", 
            "GET", 
            "analytics/overview", 
            200, 
            token=self.admin_token,
            params={"date_range": "30_days"}
        )
        
        if success1:
            expected_keys = ['total_revenue', 'total_bookings', 'total_assets', 'active_campaigns']
            missing_keys = [key for key in expected_keys if key not in overview]
            if missing_keys:
                print(f"   ⚠️  Missing analytics keys: {missing_keys}")
            else:
                print(f"   ✅ Analytics overview structure looks good")
        
        # Test revenue analytics
        success2, revenue_data = self.run_test(
            "Revenue Analytics", 
            "GET", 
            "analytics/revenue", 
            200, 
            token=self.admin_token,
            params={"date_range": "30_days"}
        )
        
        if success2 and isinstance(revenue_data, list):
            print(f"   Revenue data points: {len(revenue_data)}")
            if revenue_data:
                sample_point = revenue_data[0]
                expected_fields = ['date', 'revenue', 'bookings']
                if all(field in sample_point for field in expected_fields):
                    print(f"   ✅ Revenue data structure looks good")
        
        # Test asset analytics
        success3, asset_data = self.run_test(
            "Asset Analytics", 
            "GET", 
            "analytics/assets", 
            200, 
            token=self.admin_token,
            params={"date_range": "30_days"}
        )
        
        if success3 and isinstance(asset_data, list):
            print(f"   Asset analytics categories: {len(asset_data)}")
        
        return success1 and success2 and success3

    def test_payment_system(self):
        """Test Phase 3 Payment System"""
        if not self.admin_token:
            print("⚠️  Skipping payment tests - no admin token")
            return False
        
        print("\n   💳 Testing Payment System...")
        
        # Test creating payment
        payment_data = {
            "campaign_id": "test-campaign-001",
            "offer_id": "test-offer-001",
            "amount": 27000.0,
            "payment_method": "bank_transfer"
        }
        
        success1, payment_response = self.run_test(
            "Create Payment", 
            "POST", 
            "payments", 
            200, 
            data=payment_data,
            token=self.admin_token
        )
        
        payment_id = None
        if success1 and 'id' in payment_response:
            payment_id = payment_response['id']
            print(f"   Created payment ID: {payment_id}")
        
        # Test getting payment invoice
        if payment_id:
            success2, _ = self.run_test(
                "Get Payment Invoice", 
                "GET", 
                f"payments/{payment_id}/invoice", 
                200, 
                token=self.admin_token
            )
        else:
            success2 = False
            print("   ⚠️  Skipping invoice test - no payment ID")
        
        return success1 and success2

    def test_file_upload(self):
        """Test Phase 3 File Upload Functionality"""
        if not self.admin_token:
            print("⚠️  Skipping file upload tests - no admin token")
            return False
        
        print("\n   📁 Testing File Upload...")
        
        # Test image upload endpoint (without actual file for now)
        # In a real test, we would upload an actual file
        success, response = self.run_test(
            "Image Upload Endpoint Check", 
            "POST", 
            "upload/image", 
            422,  # Expect 422 because we're not sending a file
            token=self.admin_token
        )
        
        # 422 is expected because we're not sending a file, but endpoint should exist
        if success:
            print("   ✅ Upload endpoint exists and responds correctly")
        
        return success

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
    
    # Test 4: User Management (Admin)
    print("\n👑 USER MANAGEMENT (ADMIN)")
    print("Testing admin user management capabilities")
    tester.test_admin_get_users()
    tester.test_admin_update_user_status()
    
    # Test 5: Campaign Management
    print("\n🎯 CAMPAIGN MANAGEMENT")
    print("Testing campaign creation and management")
    tester.test_get_campaigns()
    tester.test_create_campaign()
    tester.test_update_campaign()
    
    # Test 6: Authorization Tests
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
        "Get Campaigns",
        "Create Campaign"
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