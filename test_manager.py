#!/usr/bin/env python3
"""
Test script for Manager Dashboard backend endpoints
"""
import requests
import json

API_BASE = "https://beatspace-monitor-1.preview.emergentagent.com/api"

def test_manager_endpoints():
    print("🚀 Manager Dashboard Backend Endpoints Test")
    print("="*50)
    
    # Step 1: Login as admin (to test manager functionality)
    print("\n1. Testing admin login...")
    login_data = {
        "email": "admin@beatspace.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        print(f"   Login status: {response.status_code}")
        
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data['access_token']
            user_info = auth_data.get('user', {})
            print(f"   ✅ Login successful")
            print(f"   User: {user_info.get('email', 'N/A')}")
            print(f"   Role: {user_info.get('role', 'N/A')}")
            
            headers = {'Authorization': f'Bearer {token}'}
            
            # Step 2: Test users endpoint with role filtering
            print("\n2. Testing /users endpoint with role filtering...")
            users_response = requests.get(f"{API_BASE}/users?role=monitoring_operator", headers=headers)
            print(f"   Status: {users_response.status_code}")
            
            if users_response.status_code == 200:
                users = users_response.json()
                print(f"   ✅ Found {len(users)} monitoring operators")
            else:
                print(f"   Response: {users_response.text[:200]}...")
            
            # Step 3: Test monitoring tasks endpoint
            print("\n3. Testing /monitoring/tasks endpoint...")
            tasks_response = requests.get(f"{API_BASE}/monitoring/tasks", headers=headers)
            print(f"   Status: {tasks_response.status_code}")
            
            if tasks_response.status_code == 200:
                tasks_data = tasks_response.json()
                tasks = tasks_data.get('tasks', []) if isinstance(tasks_data, dict) else tasks_data
                print(f"   ✅ Found {len(tasks)} monitoring tasks")
            else:
                print(f"   Response: {tasks_response.text[:200]}...")
            
            # Step 4: Test monitoring services endpoint  
            print("\n4. Testing /monitoring/services endpoint...")
            services_response = requests.get(f"{API_BASE}/monitoring/services", headers=headers)
            print(f"   Status: {services_response.status_code}")
            
            if services_response.status_code == 200:
                services = services_response.json()
                print(f"   ✅ Found {len(services)} monitoring services")
            else:
                print(f"   Response: {services_response.text[:200]}...")
            
            # Step 5: Test monitoring performance endpoint
            print("\n5. Testing /monitoring/performance endpoint...")
            performance_response = requests.get(f"{API_BASE}/monitoring/performance", headers=headers)
            print(f"   Status: {performance_response.status_code}")
            
            if performance_response.status_code == 200:
                performance = performance_response.json()
                print(f"   ✅ Performance data retrieved")
            else:
                print(f"   Response: {performance_response.text[:200]}...")
            
            # Step 6: Test generate tasks endpoint
            print("\n6. Testing /monitoring/generate-tasks endpoint...")
            today = "2025-01-15"
            generate_response = requests.post(f"{API_BASE}/monitoring/generate-tasks", 
                                            json={"date": today}, headers=headers)
            print(f"   Status: {generate_response.status_code}")
            print(f"   Response: {generate_response.text[:200]}...")
            
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
    
    print("\n" + "="*50)
    print("Manager Dashboard endpoints test complete")

if __name__ == "__main__":
    test_manager_endpoints()