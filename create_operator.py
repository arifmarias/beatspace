#!/usr/bin/env python3
"""
Create a test monitoring operator user
"""
import requests
import json

API_BASE = "https://asset-flow-1.preview.emergentagent.com/api"

def create_test_operator():
    print("🚀 Creating Test Monitoring Operator User")
    print("="*50)
    
    # Step 1: Login as admin
    print("\n1. Login as admin...")
    login_data = {"email": "admin@beatspace.com", "password": "admin123"}
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Admin login failed: {response.text}")
            return
            
        token = response.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        print("✅ Admin login successful")
        
        # Step 2: Create monitoring operator user
        print("\n2. Creating monitoring operator user...")
        operator_data = {
            "company_name": "BeatSpace Field Operations",
            "contact_name": "John Operator",
            "email": "operator@beatspace.com",
            "phone": "+880123456789",
            "website": "",
            "address": "Dhaka, Bangladesh",
            "role": "monitoring_operator",
            "password": "operator123"
        }
        
        create_response = requests.post(f"{API_BASE}/admin/users", json=operator_data, headers=headers)
        print(f"   Create user status: {create_response.status_code}")
        
        if create_response.status_code == 200:
            user_data = create_response.json()
            print(f"   ✅ Monitoring operator created successfully!")
            print(f"   User ID: {user_data.get('id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Role: {user_data.get('role')}")
            
            # Step 3: Approve the user
            print("\n3. Approving the operator user...")
            user_id = user_data.get('id')
            approve_response = requests.patch(
                f"{API_BASE}/admin/users/{user_id}/status",
                json={"status": "approved"},
                headers=headers
            )
            print(f"   Approval status: {approve_response.status_code}")
            if approve_response.status_code == 200:
                print("   ✅ User approved successfully!")
                
                # Step 4: Test login as operator
                print("\n4. Testing operator login...")
                operator_login = {
                    "email": "operator@beatspace.com",
                    "password": "operator123"
                }
                
                operator_response = requests.post(f"{API_BASE}/auth/login", json=operator_login)
                print(f"   Operator login status: {operator_response.status_code}")
                
                if operator_response.status_code == 200:
                    operator_auth = operator_response.json()
                    operator_token = operator_auth['access_token']
                    operator_user = operator_auth.get('user', {})
                    
                    print(f"   ✅ Operator login successful!")
                    print(f"   Operator role: {operator_user.get('role')}")
                    
                    # Step 5: Test operator accessing monitoring tasks
                    print("\n5. Testing operator access to monitoring tasks...")
                    operator_headers = {'Authorization': f'Bearer {operator_token}'}
                    
                    tasks_response = requests.get(f"{API_BASE}/monitoring/tasks", headers=operator_headers)
                    print(f"   Tasks access status: {tasks_response.status_code}")
                    
                    if tasks_response.status_code == 200:
                        tasks = tasks_response.json().get('tasks', [])
                        print(f"   ✅ Operator can access {len(tasks)} tasks!")
                        
                        print(f"\n🎉 SUCCESS: Complete operator workflow is functional!")
                        print(f"   - Operator user created and approved")
                        print(f"   - Operator login working")  
                        print(f"   - Operator can access monitoring tasks")
                        print(f"\n   📱 Ready to test OperatorDashboard with:")
                        print(f"   Email: operator@beatspace.com")
                        print(f"   Password: operator123")
                        
                    else:
                        print(f"   ❌ Tasks access failed: {tasks_response.text}")
                else:
                    print(f"   ❌ Operator login failed: {operator_response.text}")
            else:
                print(f"   ❌ User approval failed: {approve_response.text}")
        else:
            print(f"   ❌ User creation failed: {create_response.text}")
            print("   Note: User might already exist")
            
            # Try login anyway
            print("\n   Trying to login with existing operator...")
            operator_login = {"email": "operator@beatspace.com", "password": "operator123"}
            
            operator_response = requests.post(f"{API_BASE}/auth/login", json=operator_login)
            if operator_response.status_code == 200:
                print("   ✅ Existing operator login successful!")
                print(f"\n   📱 Ready to test OperatorDashboard with:")
                print(f"   Email: operator@beatspace.com")  
                print(f"   Password: operator123")
            else:
                print(f"   ❌ Existing operator login failed: {operator_response.text}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    create_test_operator()