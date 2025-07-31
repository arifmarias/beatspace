import requests
import sys
import json
from datetime import datetime

class BeatSpaceAPITester:
    def __init__(self, base_url="https://b7ef55cf-d563-4507-9ed2-f248f4771dee.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_campaign_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

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

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

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

def main():
    print("🚀 Starting BeatSpace API Testing...")
    print("=" * 50)
    
    tester = BeatSpaceAPITester()
    
    # Test basic endpoints
    tester.test_root_endpoint()
    
    # Test assets endpoints
    success, assets = tester.test_get_assets()
    if success and len(assets) > 0:
        # Test getting a specific asset
        first_asset_id = assets[0]['id']
        tester.test_get_single_asset(first_asset_id)
    
    # Test asset filtering
    tester.test_get_assets_with_filters()
    
    # Test non-existent asset
    tester.test_get_nonexistent_asset()
    
    # Test stats endpoint
    tester.test_get_stats()
    
    # Test campaign creation and management
    tester.test_create_campaign()
    tester.test_get_campaigns()
    tester.test_request_best_offer()
    
    # Test asset creation
    tester.test_create_asset()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())