#!/usr/bin/env python3
"""
Test Manager and Operator Dashboard Access
"""
import requests

API = "https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/api"

print("🔍 Testing Manager and Operator Dashboard Access")
print("="*50)

# Test Manager Login
print("\n1. Testing Manager Login and Role...")
manager_login = {
    "email": "manager@beatspace.com",
    "password": "manager123"
}

try:
    response = requests.post(f"{API}/auth/login", json=manager_login)
    print(f"   Manager login status: {response.status_code}")
    
    if response.status_code == 200:
        auth_data = response.json()
        user = auth_data.get('user', {})
        print(f"   ✅ Manager login successful!")
        print(f"   Email: {user.get('email')}")
        print(f"   Role: {user.get('role')}")
        print(f"   Status: {user.get('status')}")
        print(f"   Should redirect to: /manager/dashboard")
    else:
        print(f"   ❌ Manager login failed: {response.text}")
        
        # Try creating manager if doesn't exist
        print("\n   Creating manager user...")
        admin_login = requests.post(f"{API}/auth/login", json={"email": "admin@beatspace.com", "password": "admin123"})
        
        if admin_login.status_code == 200:
            admin_token = admin_login.json()['access_token']
            headers = {'Authorization': f'Bearer {admin_token}'}
            
            manager_data = {
                "email": "manager@beatspace.com", 
                "password": "manager123",
                "company_name": "BeatSpace Operations",
                "contact_name": "Operations Manager",
                "phone": "+8801700000001",
                "role": "manager"
            }
            
            create_response = requests.post(f"{API}/admin/users", json=manager_data, headers=headers)
            if create_response.status_code == 200:
                user_id = create_response.json()['id']
                # Approve user
                requests.patch(f"{API}/admin/users/{user_id}/status", 
                             json={"status": "approved"}, headers=headers)
                print(f"   ✅ Manager user created and approved")
            
except Exception as e:
    print(f"   ❌ Error testing manager: {str(e)}")

# Test Operator Login  
print("\n2. Testing Operator Login and Role...")
operator_login = {
    "email": "operator3@beatspace.com",
    "password": "operator123"
}

try:
    response = requests.post(f"{API}/auth/login", json=operator_login)
    print(f"   Operator login status: {response.status_code}")
    
    if response.status_code == 200:
        auth_data = response.json()
        user = auth_data.get('user', {})
        print(f"   ✅ Operator login successful!")
        print(f"   Email: {user.get('email')}")
        print(f"   Role: {user.get('role')}")
        print(f"   Status: {user.get('status')}")
        print(f"   Should redirect to: /operator/dashboard")
    else:
        print(f"   ❌ Operator login failed: {response.text}")
        
except Exception as e:
    print(f"   ❌ Error testing operator: {str(e)}")

print("\n🎯 DASHBOARD ACCESS INSTRUCTIONS:")
print("="*50)
print("After the frontend fix is deployed:")
print()
print("📋 MANAGER DASHBOARD ACCESS:")
print("   1. Go to: https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/login")
print("   2. Login with: manager@beatspace.com / manager123")
print("   3. You should be automatically redirected to: /manager/dashboard")
print()
print("📱 OPERATOR DASHBOARD ACCESS:")
print("   1. Go to: https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/login")
print("   2. Login with: operator3@beatspace.com / operator123")
print("   3. You should be automatically redirected to: /operator/dashboard")
print()
print("🛠️ DIRECT ACCESS (If already logged in):")
print("   Manager: https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/manager/dashboard")
print("   Operator: https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/operator/dashboard")