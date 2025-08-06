#!/usr/bin/env python3
"""
My Assets Tab Debug Test - Investigating "No Booked Assets Yet" Issue

This test specifically investigates the data flow for the My Assets tab functionality:
1. CREATE/VERIFY DUMMY DATA via POST /api/admin/create-dummy-data
2. DATA FLOW VERIFICATION - Live campaigns with campaign_assets structure  
3. API ENDPOINT TESTING - GET /api/campaigns and GET /api/assets/public
4. ROOT CAUSE ANALYSIS - Find where fetchLiveAssets chain fails

Expected: 3 Booked assets linked to Live campaigns for marketing@grameenphone.com
"""

import requests
import json
import sys
from datetime import datetime

class MyAssetsDebugTester:
    def __init__(self, base_url="https://e65537d7-a6e3-4bc8-98bb-a7eeddde2060.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        
    def log(self, message, level="INFO"):
        """Enhanced logging with timestamps"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
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
            response_data = {}
            
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}
                
            return success, response.status_code, response_data
            
        except Exception as e:
            self.log(f"Request failed: {str(e)}", "ERROR")
            return False, 0, {"error": str(e)}
    
    def authenticate_users(self):
        """Step 0: Authenticate admin and buyer users"""
        self.log("=== STEP 0: AUTHENTICATION ===")
        
        # Admin login
        admin_data = {"email": "admin@beatspace.com", "password": "admin123"}
        success, status, response = self.make_request("POST", "auth/login", admin_data)
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.log(f"✅ Admin authenticated successfully")
            self.log(f"   Admin role: {response.get('user', {}).get('role', 'N/A')}")
        else:
            self.log(f"❌ Admin authentication failed: {status} - {response}", "ERROR")
            return False
            
        # Buyer login  
        buyer_data = {"email": "marketing@grameenphone.com", "password": "buyer123"}
        success, status, response = self.make_request("POST", "auth/login", buyer_data)
        
        if success and 'access_token' in response:
            self.buyer_token = response['access_token']
            self.log(f"✅ Buyer authenticated successfully")
            self.log(f"   Buyer role: {response.get('user', {}).get('role', 'N/A')}")
            self.log(f"   Buyer company: {response.get('user', {}).get('company_name', 'N/A')}")
        else:
            self.log(f"❌ Buyer authentication failed: {status} - {response}", "ERROR")
            return False
            
        return True
    
    def create_dummy_data(self):
        """Step 1: CREATE/VERIFY DUMMY DATA via POST /api/admin/create-dummy-data"""
        self.log("=== STEP 1: CREATE/VERIFY DUMMY DATA ===")
        
        if not self.admin_token:
            self.log("❌ No admin token available", "ERROR")
            return False
            
        self.log("🎯 Testing POST /api/admin/create-dummy-data endpoint...")
        
        success, status, response = self.make_request(
            "POST", 
            "admin/create-dummy-data", 
            token=self.admin_token
        )
        
        if success:
            self.log("✅ Dummy data creation endpoint successful")
            self.log(f"   Response: {response.get('message', 'No message')}")
            
            # Verify expected data was created
            self.log("🔍 Verifying expected dummy data structure...")
            
            # Expected: 4 assets (3 Booked, 1 Available)
            expected_booked_assets = [
                "Gulshan Avenue Digital Billboard",
                "Dhanmondi Metro Station Banner", 
                "Uttara Shopping Mall Display"
            ]
            
            # Expected: 2 Live campaigns
            expected_live_campaigns = [
                "Grameenphone 5G Launch Campaign",
                "Weekend Data Pack Promotion"
            ]
            
            self.log(f"   Expected Booked Assets: {len(expected_booked_assets)}")
            for asset in expected_booked_assets:
                self.log(f"     - {asset}")
                
            self.log(f"   Expected Live Campaigns: {len(expected_live_campaigns)}")
            for campaign in expected_live_campaigns:
                self.log(f"     - {campaign}")
                
            return True
        else:
            self.log(f"❌ Dummy data creation failed: {status} - {response}", "ERROR")
            return False
    
    def verify_assets_data(self):
        """Step 2: Verify assets exist with proper Booked status"""
        self.log("=== STEP 2: VERIFY ASSETS DATA ===")
        
        self.log("🔍 Testing GET /api/assets/public endpoint...")
        
        success, status, response = self.make_request("GET", "assets/public")
        
        if not success:
            self.log(f"❌ Failed to get public assets: {status} - {response}", "ERROR")
            return False
            
        assets = response if isinstance(response, list) else []
        self.log(f"✅ Found {len(assets)} total assets")
        
        # Filter for expected Booked assets
        expected_names = [
            "Gulshan Avenue Digital Billboard",
            "Dhanmondi Metro Station Banner", 
            "Uttara Shopping Mall Display"
        ]
        
        booked_assets = []
        available_assets = []
        
        for asset in assets:
            asset_name = asset.get('name', '')
            asset_status = asset.get('status', '')
            asset_id = asset.get('id', '')
            
            if asset_name in expected_names:
                self.log(f"   Found expected asset: {asset_name}")
                self.log(f"     ID: {asset_id}")
                self.log(f"     Status: {asset_status}")
                self.log(f"     Address: {asset.get('address', 'N/A')}")
                
                if asset_status == "Booked":
                    booked_assets.append(asset)
                    self.log(f"     ✅ Status is 'Booked' as expected")
                else:
                    self.log(f"     ❌ Status is '{asset_status}', expected 'Booked'")
            
            if asset_status == "Available":
                available_assets.append(asset)
        
        self.log(f"📊 Asset Status Summary:")
        self.log(f"   Total Assets: {len(assets)}")
        self.log(f"   Booked Assets: {len(booked_assets)}")
        self.log(f"   Available Assets: {len(available_assets)}")
        
        # Store for later analysis
        self.test_results['assets'] = {
            'total': len(assets),
            'booked': booked_assets,
            'available': available_assets,
            'expected_booked_found': len(booked_assets)
        }
        
        if len(booked_assets) >= 3:
            self.log("✅ Found expected number of Booked assets")
            return True
        else:
            self.log(f"❌ Expected 3 Booked assets, found {len(booked_assets)}", "ERROR")
            return False
    
    def verify_campaigns_data(self):
        """Step 3: Verify Live campaigns with proper campaign_assets structure"""
        self.log("=== STEP 3: VERIFY CAMPAIGNS DATA ===")
        
        if not self.buyer_token:
            self.log("❌ No buyer token available", "ERROR")
            return False
            
        self.log("🔍 Testing GET /api/campaigns endpoint (buyer perspective)...")
        
        success, status, response = self.make_request(
            "GET", 
            "campaigns", 
            token=self.buyer_token
        )
        
        if not success:
            self.log(f"❌ Failed to get campaigns: {status} - {response}", "ERROR")
            return False
            
        campaigns = response if isinstance(response, list) else []
        self.log(f"✅ Found {len(campaigns)} total campaigns for buyer")
        
        # Filter for Live campaigns
        live_campaigns = []
        draft_campaigns = []
        
        expected_live_names = [
            "Grameenphone 5G Launch Campaign",
            "Weekend Data Pack Promotion"
        ]
        
        for campaign in campaigns:
            campaign_name = campaign.get('name', '')
            campaign_status = campaign.get('status', '')
            campaign_id = campaign.get('id', '')
            campaign_assets = campaign.get('campaign_assets', [])
            
            self.log(f"   Campaign: {campaign_name}")
            self.log(f"     ID: {campaign_id}")
            self.log(f"     Status: {campaign_status}")
            self.log(f"     Campaign Assets: {len(campaign_assets)} assets")
            
            if campaign_status == "Live":
                live_campaigns.append(campaign)
                self.log(f"     ✅ Status is 'Live'")
                
                # Check campaign_assets structure
                if campaign_assets:
                    self.log(f"     ✅ Has campaign_assets structure")
                    for i, asset in enumerate(campaign_assets[:2]):  # Show first 2
                        asset_id = asset.get('asset_id', '')
                        asset_name = asset.get('asset_name', '')
                        self.log(f"       Asset {i+1}: {asset_name} (ID: {asset_id})")
                        self.log(f"         Start: {asset.get('asset_start_date', 'N/A')}")
                        self.log(f"         Expiration: {asset.get('asset_expiration_date', 'N/A')}")
                else:
                    self.log(f"     ❌ Missing campaign_assets structure")
                    
            elif campaign_status == "Draft":
                draft_campaigns.append(campaign)
                self.log(f"     ℹ️  Status is 'Draft'")
            else:
                self.log(f"     ℹ️  Status is '{campaign_status}'")
        
        self.log(f"📊 Campaign Status Summary:")
        self.log(f"   Total Campaigns: {len(campaigns)}")
        self.log(f"   Live Campaigns: {len(live_campaigns)}")
        self.log(f"   Draft Campaigns: {len(draft_campaigns)}")
        
        # Store for later analysis
        self.test_results['campaigns'] = {
            'total': len(campaigns),
            'live': live_campaigns,
            'draft': draft_campaigns,
            'live_count': len(live_campaigns)
        }
        
        if len(live_campaigns) >= 2:
            self.log("✅ Found expected number of Live campaigns")
            return True
        else:
            self.log(f"❌ Expected 2 Live campaigns, found {len(live_campaigns)}", "ERROR")
            return False
    
    def analyze_asset_campaign_relationships(self):
        """Step 4: Analyze asset-campaign relationships (ROOT CAUSE ANALYSIS)"""
        self.log("=== STEP 4: ROOT CAUSE ANALYSIS - ASSET-CAMPAIGN RELATIONSHIPS ===")
        
        if 'assets' not in self.test_results or 'campaigns' not in self.test_results:
            self.log("❌ Missing assets or campaigns data for analysis", "ERROR")
            return False
            
        booked_assets = self.test_results['assets']['booked']
        live_campaigns = self.test_results['campaigns']['live']
        
        self.log("🔍 Analyzing fetchLiveAssets data flow...")
        self.log("   Frontend fetchLiveAssets logic:")
        self.log("   1. Fetch buyer campaigns and filter for status='Live'")
        self.log("   2. For each Live campaign, loop through campaign_assets")
        self.log("   3. Find assets by ID and check if asset.status === 'Booked'")
        self.log("   4. Only include assets with 'Booked' status in final results")
        
        # Simulate fetchLiveAssets logic
        found_booked_assets = []
        
        self.log(f"\n🔄 Simulating fetchLiveAssets logic:")
        self.log(f"   Step 1: Found {len(live_campaigns)} Live campaigns")
        
        for campaign in live_campaigns:
            campaign_name = campaign.get('name', '')
            campaign_assets = campaign.get('campaign_assets', [])
            
            self.log(f"   Step 2: Processing campaign '{campaign_name}'")
            self.log(f"           Campaign has {len(campaign_assets)} campaign_assets")
            
            for campaign_asset in campaign_assets:
                asset_id = campaign_asset.get('asset_id', '')
                asset_name = campaign_asset.get('asset_name', '')
                
                self.log(f"   Step 3: Looking for asset ID '{asset_id}' ({asset_name})")
                
                # Find the actual asset by ID
                actual_asset = None
                for asset in booked_assets:
                    if asset.get('id') == asset_id:
                        actual_asset = asset
                        break
                
                if actual_asset:
                    actual_status = actual_asset.get('status', '')
                    self.log(f"           Found asset with status: '{actual_status}'")
                    
                    if actual_status == "Booked":
                        found_booked_assets.append(actual_asset)
                        self.log(f"   Step 4: ✅ Asset '{asset_name}' included (status='Booked')")
                    else:
                        self.log(f"   Step 4: ❌ Asset '{asset_name}' excluded (status='{actual_status}')")
                else:
                    self.log(f"           ❌ Asset not found in booked assets list")
                    
                    # Check if asset exists in all assets
                    all_assets = self.test_results['assets'].get('all_assets', [])
                    found_in_all = False
                    for asset in all_assets if all_assets else []:
                        if asset.get('id') == asset_id:
                            found_in_all = True
                            self.log(f"           ℹ️  Asset found in all assets with status: '{asset.get('status')}'")
                            break
                    
                    if not found_in_all:
                        self.log(f"           ❌ Asset ID '{asset_id}' does not exist in system")
        
        self.log(f"\n📊 fetchLiveAssets Simulation Results:")
        self.log(f"   Live Campaigns Processed: {len(live_campaigns)}")
        self.log(f"   Booked Assets Found: {len(found_booked_assets)}")
        
        if found_booked_assets:
            self.log(f"   ✅ Assets that would appear in My Assets tab:")
            for asset in found_booked_assets:
                self.log(f"     - {asset.get('name')} (ID: {asset.get('id')})")
        else:
            self.log(f"   ❌ NO ASSETS would appear in My Assets tab")
            self.log(f"   🚨 This explains the 'No Booked Assets Yet' message!")
        
        # Store final results
        self.test_results['fetchLiveAssets_simulation'] = {
            'found_assets': found_booked_assets,
            'count': len(found_booked_assets)
        }
        
        return len(found_booked_assets) > 0
    
    def identify_root_cause(self):
        """Step 5: Identify the specific root cause of the issue"""
        self.log("=== STEP 5: ROOT CAUSE IDENTIFICATION ===")
        
        booked_assets = self.test_results['assets']['booked']
        live_campaigns = self.test_results['campaigns']['live']
        found_assets = self.test_results['fetchLiveAssets_simulation']['found_assets']
        
        self.log("🔍 Analyzing potential failure points...")
        
        # Check each step of the data flow
        issues_found = []
        
        # Issue 1: No Live campaigns
        if len(live_campaigns) == 0:
            issues_found.append("❌ ISSUE 1: No Live campaigns found for buyer")
            self.log("   Root Cause: Buyer has no campaigns with status='Live'")
        else:
            self.log(f"✅ STEP 1 OK: Found {len(live_campaigns)} Live campaigns")
        
        # Issue 2: Live campaigns missing campaign_assets
        campaigns_without_assets = 0
        for campaign in live_campaigns:
            if not campaign.get('campaign_assets'):
                campaigns_without_assets += 1
        
        if campaigns_without_assets > 0:
            issues_found.append(f"❌ ISSUE 2: {campaigns_without_assets} Live campaigns missing campaign_assets structure")
            self.log("   Root Cause: campaign_assets field is empty or missing")
        else:
            self.log(f"✅ STEP 2 OK: All Live campaigns have campaign_assets structure")
        
        # Issue 3: Asset IDs in campaign_assets don't match actual assets
        asset_id_mismatches = 0
        for campaign in live_campaigns:
            for campaign_asset in campaign.get('campaign_assets', []):
                asset_id = campaign_asset.get('asset_id')
                found_match = False
                for asset in booked_assets:
                    if asset.get('id') == asset_id:
                        found_match = True
                        break
                if not found_match:
                    asset_id_mismatches += 1
        
        if asset_id_mismatches > 0:
            issues_found.append(f"❌ ISSUE 3: {asset_id_mismatches} asset IDs in campaign_assets don't match actual assets")
            self.log("   Root Cause: campaign_assets.asset_id values don't correspond to existing assets")
        else:
            self.log(f"✅ STEP 3 OK: All campaign asset IDs match actual assets")
        
        # Issue 4: Assets exist but don't have 'Booked' status
        non_booked_assets = 0
        for campaign in live_campaigns:
            for campaign_asset in campaign.get('campaign_assets', []):
                asset_id = campaign_asset.get('asset_id')
                for asset in booked_assets:
                    if asset.get('id') == asset_id and asset.get('status') != 'Booked':
                        non_booked_assets += 1
        
        if non_booked_assets > 0:
            issues_found.append(f"❌ ISSUE 4: {non_booked_assets} assets linked to Live campaigns don't have 'Booked' status")
            self.log("   Root Cause: Assets in Live campaigns have status other than 'Booked'")
        else:
            self.log(f"✅ STEP 4 OK: All assets linked to Live campaigns have 'Booked' status")
        
        # Summary
        self.log(f"\n🎯 ROOT CAUSE ANALYSIS SUMMARY:")
        if issues_found:
            self.log(f"   Found {len(issues_found)} issues:")
            for issue in issues_found:
                self.log(f"   {issue}")
        else:
            self.log(f"   ✅ No issues found - data flow should work correctly")
            self.log(f"   🤔 If My Assets tab still shows 'No Booked Assets Yet', the issue may be:")
            self.log(f"      - Frontend JavaScript error")
            self.log(f"      - Authentication/session issue")
            self.log(f"      - Browser caching issue")
            self.log(f"      - API endpoint not being called correctly")
        
        return len(issues_found) == 0
    
    def run_comprehensive_debug(self):
        """Run the complete debug investigation"""
        self.log("🚀 STARTING MY ASSETS TAB DEBUG INVESTIGATION")
        self.log("=" * 60)
        
        # Step 0: Authentication
        if not self.authenticate_users():
            self.log("❌ Authentication failed - cannot proceed", "ERROR")
            return False
        
        # Step 1: Create dummy data
        if not self.create_dummy_data():
            self.log("❌ Dummy data creation failed", "ERROR")
            return False
        
        # Step 2: Verify assets
        if not self.verify_assets_data():
            self.log("❌ Assets verification failed", "ERROR")
            return False
        
        # Step 3: Verify campaigns  
        if not self.verify_campaigns_data():
            self.log("❌ Campaigns verification failed", "ERROR")
            return False
        
        # Step 4: Analyze relationships
        relationships_ok = self.analyze_asset_campaign_relationships()
        
        # Step 5: Identify root cause
        data_flow_ok = self.identify_root_cause()
        
        # Final summary
        self.log("=" * 60)
        self.log("🎯 FINAL INVESTIGATION SUMMARY")
        self.log("=" * 60)
        
        if relationships_ok and data_flow_ok:
            self.log("✅ DATA FLOW ANALYSIS: All backend data is correct")
            self.log("✅ EXPECTED RESULT: My Assets tab should show 3 Booked assets")
            self.log("🤔 IF ISSUE PERSISTS: Problem is likely in frontend JavaScript")
        else:
            self.log("❌ DATA FLOW ANALYSIS: Backend data issues found")
            self.log("🔧 REQUIRED FIXES: Address the identified issues above")
        
        return relationships_ok and data_flow_ok

if __name__ == "__main__":
    tester = MyAssetsDebugTester()
    success = tester.run_comprehensive_debug()
    
    if success:
        print("\n✅ Debug investigation completed successfully")
        sys.exit(0)
    else:
        print("\n❌ Debug investigation found issues")
        sys.exit(1)