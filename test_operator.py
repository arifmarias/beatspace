#!/usr/bin/env python3
"""
Test script for Operator Dashboard backend endpoints
"""
import requests
import json

API_BASE = "https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/api"

def test_operator_endpoints():
    print("🚀 Operator Dashboard Backend Endpoints Test")
    print("="*50)
    
    # Step 1: Login as admin (to test operator functionality)
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
            
            # Step 2: Test monitoring tasks endpoint (for operator assigned tasks)
            print("\n2. Testing /monitoring/tasks endpoint (operator tasks)...")
            tasks_response = requests.get(f"{API_BASE}/monitoring/tasks", headers=headers)
            print(f"   Status: {tasks_response.status_code}")
            
            if tasks_response.status_code == 200:
                tasks_data = tasks_response.json()
                tasks = tasks_data.get('tasks', [])
                print(f"   ✅ Found {len(tasks)} monitoring tasks")
                
                if len(tasks) > 0:
                    print(f"   Sample task: {tasks[0].get('id', 'N/A')[:8]}...")
                    print(f"   Task status: {tasks[0].get('status', 'N/A')}")
                    
                    # Step 3: Test task update endpoint
                    print("\n3. Testing task status update...")
                    task_id = tasks[0].get('id')
                    if task_id:
                        update_response = requests.put(
                            f"{API_BASE}/monitoring/tasks/{task_id}",
                            json={"status": "in_progress"},
                            headers=headers
                        )
                        print(f"   Task update status: {update_response.status_code}")
                        if update_response.status_code == 200:
                            print(f"   ✅ Task status updated successfully")
                        else:
                            print(f"   Response: {update_response.text[:200]}...")
            else:
                print(f"   Response: {tasks_response.text[:200]}...")
            
            # Step 4: Test photo upload endpoint
            print("\n4. Testing /monitoring/upload-photo endpoint structure...")
            # We can't test actual file upload easily, but we can test the endpoint exists
            upload_response = requests.post(f"{API_BASE}/monitoring/upload-photo", 
                                          data={}, headers=headers)
            print(f"   Upload endpoint status: {upload_response.status_code}")
            
            if upload_response.status_code == 422:  # FastAPI validation error expected
                print(f"   ✅ Upload endpoint exists (validation error expected without file)")
            else:
                print(f"   Response: {upload_response.text[:200]}...")
            
            # Step 5: Test report submission endpoint
            print("\n5. Testing task report submission structure...")
            if len(tasks) > 0:
                task_id = tasks[0].get('id')
                report_data = {
                    "overall_condition": 8,
                    "notes": "Test report submission",
                    "weather_condition": "clear",
                    "lighting_condition": "good",
                    "visibility_rating": 8,
                    "photos": [],
                    "gps_location": {"lat": 23.8103, "lng": 90.4125}
                }
                
                report_response = requests.post(
                    f"{API_BASE}/monitoring/tasks/{task_id}/report",
                    json=report_data,
                    headers=headers
                )
                print(f"   Report submission status: {report_response.status_code}")
                print(f"   Response: {report_response.text[:200]}...")
            
        else:
            print(f"   ❌ Login failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Test failed with exception: {str(e)}")
    
    print("\n" + "="*50)
    print("Operator Dashboard endpoints test complete")

if __name__ == "__main__":
    test_operator_endpoints()