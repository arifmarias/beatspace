#!/usr/bin/env python3
"""
Simple monitoring service API test script
"""
import requests
import json
from datetime import datetime

API_BASE = "https://beatspace-monitor.preview.emergentagent.com/api"

def test_monitoring_api():
    print("🚀 BeatSpace Monitoring Service API Test")
    print("="*50)
    
    # Step 1: Login as admin (fallback for testing)
    print("\n1. Testing admin login...")
    login_data = {
        "email": "admin@beatspace.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data['access_token']
            user_info = auth_data.get('user', {})
            print(f"   ✅ Login successful")
            print(f"   User: {user_info.get('email', 'N/A')}")
            print(f"   Role: {user_info.get('role', 'N/A')}")
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Step 2: Get buyer campaigns
            print("\n2. Testing buyer campaigns...")
            campaigns_response = requests.get(f"{API_BASE}/campaigns", headers=headers)
            print(f"   Status: {campaigns_response.status_code}")
            
            if campaigns_response.status_code == 200:
                campaigns = campaigns_response.json()
                print(f"   ✅ Found {len(campaigns)} campaigns")
                
                if campaigns:
                    # For admin testing, let's get campaigns but note the ownership issue
                    campaign = campaigns[0]
                    campaign_id = campaign.get('id')
                    print(f"   Using campaign: {campaign.get('name')} (ID: {campaign_id})")
                    print(f"   Campaign owner: {campaign.get('buyer_id', 'N/A')}")
                    
                    # Check if admin can access buyer campaigns
                    print("\n2.5. Testing admin access to campaigns...")
                    admin_campaigns_response = requests.get(f"{API_BASE}/admin/campaigns", headers=headers)
                    print(f"   Admin campaigns status: {admin_campaigns_response.status_code}")
                    if admin_campaigns_response.status_code == 200:
                        admin_campaigns = admin_campaigns_response.json()
                        print(f"   ✅ Admin found {len(admin_campaigns)} campaigns via admin endpoint")
                        if admin_campaigns:
                            # Use a campaign from admin endpoint
                            campaign = admin_campaigns[0]
                            campaign_id = campaign.get('id')
                            print(f"   Using admin campaign: {campaign.get('name')} (ID: {campaign_id})")
                    
                    # Step 3: Test monitoring service authentication
                    print("\n3. Testing monitoring service authentication...")
                    
                    # Test without auth
                    unauth_response = requests.post(f"{API_BASE}/monitoring/services", json={
                        "campaign_id": campaign_id,
                        "asset_ids": ["test_asset"],
                        "frequency": "weekly",
                        "start_date": "2025-01-15T00:00:00Z",
                        "end_date": "2025-02-15T00:00:00Z",
                        "service_level": "standard"
                    })
                    print(f"   Unauthenticated request status: {unauth_response.status_code}")
                    if unauth_response.status_code in [401, 403]:
                        print(f"   ✅ Properly requires authentication")
                    
                    # Step 4: Test monitoring service creation
                    print("\n4. Testing monitoring service creation...")
                    monitoring_data = {
                        "campaign_id": campaign_id,
                        "asset_ids": ["test_asset_1", "test_asset_2"],
                        "frequency": "weekly",
                        "start_date": "2025-01-15T00:00:00Z",
                        "end_date": "2025-02-15T00:00:00Z",
                        "service_level": "standard",
                        "notification_preferences": {
                            "email": True,
                            "in_app": True,
                            "sms": False
                        }
                    }
                    
                    create_response = requests.post(
                        f"{API_BASE}/monitoring/services", 
                        json=monitoring_data, 
                        headers=headers
                    )
                    print(f"   Status: {create_response.status_code}")
                    print(f"   Response: {create_response.text[:200]}...")
                    
                    if create_response.status_code == 200:
                        print(f"   ✅ Monitoring service created successfully")
                        
                        # Step 5: Test fetching monitoring services
                        print("\n5. Testing monitoring service retrieval...")
                        get_response = requests.get(f"{API_BASE}/monitoring/services", headers=headers)
                        print(f"   Status: {get_response.status_code}")
                        
                        if get_response.status_code == 200:
                            services = get_response.json()
                            print(f"   ✅ Found {len(services)} monitoring services")
                        else:
                            print(f"   ❌ Failed to get monitoring services: {get_response.text}")
                            
                    else:
                        print(f"   ❌ Failed to create monitoring service: {create_response.text}")
                        
                    # Step 2.7: Create a campaign as admin for testing
                    print("\n2.7. Creating test campaign as admin...")
                    test_campaign_data = {
                        "name": "Test Monitoring Campaign",
                        "description": "Test campaign for monitoring service",
                        "budget": 50000,
                        "start_date": "2025-01-15T00:00:00Z",
                        "end_date": "2025-03-15T00:00:00Z",
                        "status": "Live",
                        "buyer_id": user_info.get('id', 'admin_user'),  # Use admin user ID
                        "buyer_name": "Admin Test User"
                    }
                    
                    create_campaign_response = requests.post(
                        f"{API_BASE}/admin/campaigns", 
                        json=test_campaign_data, 
                        headers=headers
                    )
                    print(f"   Create campaign status: {create_campaign_response.status_code}")
                    
                    if create_campaign_response.status_code == 200:
                        test_campaign = create_campaign_response.json()
                        campaign_id = test_campaign.get('id')
                        print(f"   ✅ Created test campaign: {test_campaign.get('name')} (ID: {campaign_id})")
                        print(f"   Campaign owner: {test_campaign.get('buyer_id', 'N/A')}")
                    else:
                        print(f"   ❌ Failed to create test campaign: {create_campaign_response.text}")
                        # Fallback to existing campaign
                        campaign_id = campaigns[0].get('id')
                        
                else:
                    print(f"   ⚠️  No campaigns found")
                    campaign_id = None
            else:
                print(f"   ❌ Failed to get campaigns: {campaigns_response.text}")
                
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
    
    print("\n" + "="*50)
    print("Test complete")

if __name__ == "__main__":
    test_monitoring_api()