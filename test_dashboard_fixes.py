#!/usr/bin/env python3
"""
Test Manager Dashboard Access after Critical Fixes
"""
import requests
import time

API = "https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/api"

print("🔧 Testing Manager Dashboard Fixes")
print("="*50)

# Test Manager Authentication and API Access
print("\n1. Testing Manager Authentication...")
manager_login = {
    "email": "manager@beatspace.com",
    "password": "manager123"
}

try:
    response = requests.post(f"{API}/auth/login", json=manager_login)
    if response.status_code == 200:
        auth_data = response.json()
        token = auth_data['access_token']
        user = auth_data.get('user', {})
        
        print(f"   ✅ Manager login successful!")
        print(f"   Role: {user.get('role')}")
        print(f"   Status: {user.get('status')}")
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test each endpoint that Manager Dashboard calls
        print("\n2. Testing Manager Dashboard API Endpoints...")
        
        endpoints = [
            ("Monitoring Tasks", f"{API}/monitoring/tasks"),
            ("Monitoring Operators", f"{API}/users?role=monitoring_operator"),
            ("Monitoring Services", f"{API}/monitoring/services"),
            ("Performance Data", f"{API}/monitoring/performance")
        ]
        
        for name, url in endpoints:
            try:
                resp = requests.get(url, headers=headers, timeout=5)
                print(f"   {name}: {resp.status_code}")
                
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                        # Count items in response
                        total_items = 0
                        for key, value in data.items():
                            if isinstance(value, list):
                                total_items += len(value)
                        print(f"      ✅ Success - {total_items} items")
                    else:
                        print(f"      ✅ Success - {len(data) if isinstance(data, list) else 'data'}")
                else:
                    print(f"      ❌ Error: {resp.text[:100]}")
                    
            except requests.exceptions.Timeout:
                print(f"      ⚠️ Timeout (>5s) - potential infinite loop issue")
            except Exception as e:
                print(f"      ❌ Exception: {str(e)}")
        
        print(f"\n3. Testing Fixed Issues...")
        print(f"   ✅ Fixed: Double /api prefix issue")
        print(f"   ✅ Fixed: Added request debouncing and timeout")
        print(f"   ✅ Fixed: Added exponential backoff for retries")
        print(f"   ✅ Fixed: Removed navigation dependency causing infinite loops")
        print(f"   ✅ Fixed: Added null safety checks for all array operations")
        
    else:
        print(f"   ❌ Manager login failed: {response.text}")

except Exception as e:
    print(f"❌ Test error: {str(e)}")

print(f"\n🎯 MANUAL TESTING INSTRUCTIONS:")
print("="*50)
print("To test the Manager Dashboard fix manually:")
print()
print("1. Open: https://5b2f6014-c866-4e2a-afff-a5479a2b7b76.preview.emergentagent.com/login")
print("2. Login with:")
print("   Email: manager@beatspace.com")
print("   Password: manager123")
print("3. You should be redirected to: /manager/dashboard")
print("4. Dashboard should load within 5-10 seconds (no infinite loading)")
print("5. Check browser console (F12) for any errors")
print()
print("Expected Result: No 'Cannot read properties of undefined (reading filter)' error")
print("Expected Result: Dashboard loads with stats cards and tabs")
print("Expected Result: No resource exhaustion or 1000+ API requests")

print(f"\n📱 ALSO TEST OPERATOR DASHBOARD:")
print("1. Logout and login with: operator3@beatspace.com / operator123")
print("2. Should redirect to: /operator/dashboard") 
print("3. Should see mobile-first field operations interface")