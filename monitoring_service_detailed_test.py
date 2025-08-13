#!/usr/bin/env python3
"""
BeatSpace Monitoring Service Detailed API Testing
Focused testing with proper data formats and error handling
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class DetailedMonitoringTester:
    def __init__(self, base_url="https://beatspace-monitor.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.manager_token = None
        self.operator_token = None
        self.buyer_token = None
        
        # Test data
        self.test_task_id = None
        self.test_campaign_id = None
        self.test_asset_id = None

    def authenticate_users(self):
        """Authenticate all required users"""
        print("🔐 Authenticating Users...")
        
        # Admin
        admin_login = {"email": "admin@beatspace.com", "password": "admin123"}
        response = requests.post(f"{self.base_url}/auth/login", json=admin_login, timeout=30)
        if response.status_code == 200:
            self.admin_token = response.json()['access_token']
            print(f"✅ Admin authenticated")
        
        # Manager
        manager_login = {"email": "manager@beatspace.com", "password": "manager123"}
        response = requests.post(f"{self.base_url}/auth/login", json=manager_login, timeout=30)
        if response.status_code == 200:
            self.manager_token = response.json()['access_token']
            print(f"✅ Manager authenticated")
        
        # Operator
        operator_login = {"email": "operator3@beatspace.com", "password": "operator123"}
        response = requests.post(f"{self.base_url}/auth/login", json=operator_login, timeout=30)
        if response.status_code == 200:
            self.operator_token = response.json()['access_token']
            print(f"✅ Operator authenticated")

    def test_manager_generate_tasks_fixed(self):
        """Test task generation with correct data format"""
        print("\n⚡ Testing Manager - Generate Tasks (Fixed Format)...")
        
        if not self.manager_token:
            print("❌ No manager token")
            return False
        
        # Use correct format - single date field
        task_data = {
            "date": datetime.utcnow().isoformat()
        }
        
        headers = {
            'Authorization': f'Bearer {self.manager_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(f"{self.base_url}/monitoring/generate-tasks", 
                               json=task_data, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Task generation working")
            return True
        else:
            print("❌ Task generation failed")
            return False

    def test_operator_photo_upload_multipart(self):
        """Test photo upload with proper multipart form data"""
        print("\n📸 Testing Operator - Photo Upload (Multipart Form)...")
        
        if not self.operator_token:
            print("❌ No operator token")
            return False
        
        # Get a task ID first
        headers = {'Authorization': f'Bearer {self.operator_token}'}
        response = requests.get(f"{self.base_url}/monitoring/tasks", headers=headers, timeout=30)
        
        if response.status_code == 200:
            tasks_data = response.json()
            if isinstance(tasks_data, dict) and 'tasks' in tasks_data:
                tasks = tasks_data['tasks']
                if tasks:
                    self.test_task_id = tasks[0]['id']
                    print(f"Using task ID: {self.test_task_id}")
                else:
                    print("❌ No tasks available for photo upload test")
                    return False
            else:
                print("❌ Invalid tasks response format")
                return False
        else:
            print("❌ Could not get tasks for photo upload")
            return False
        
        # Create a dummy image file
        import io
        from PIL import Image
        
        # Create a small test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Prepare multipart form data
        files = {
            'file': ('test_photo.jpg', img_bytes, 'image/jpeg')
        }
        
        data = {
            'task_id': self.test_task_id,
            'angle': 'front',
            'gps_lat': 23.8103,
            'gps_lng': 90.4125
        }
        
        headers = {'Authorization': f'Bearer {self.operator_token}'}
        
        response = requests.post(f"{self.base_url}/monitoring/upload-photo", 
                               files=files, data=data, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Photo upload working")
            return True
        else:
            print("❌ Photo upload failed")
            return False

    def test_operator_task_update_with_valid_id(self):
        """Test task status update with valid task ID"""
        print("\n🔄 Testing Operator - Task Status Update (Valid ID)...")
        
        if not self.operator_token:
            print("❌ No operator token")
            return False
        
        # Get tasks first
        headers = {'Authorization': f'Bearer {self.operator_token}'}
        response = requests.get(f"{self.base_url}/monitoring/tasks", headers=headers, timeout=30)
        
        if response.status_code == 200:
            tasks_data = response.json()
            if isinstance(tasks_data, dict) and 'tasks' in tasks_data:
                tasks = tasks_data['tasks']
                if tasks:
                    self.test_task_id = tasks[0]['id']
                    print(f"Using task ID: {self.test_task_id}")
                else:
                    print("❌ No tasks available for update test")
                    return False
            else:
                print("❌ Invalid tasks response format")
                return False
        else:
            print("❌ Could not get tasks for update")
            return False
        
        # Update task status
        update_data = {
            "status": "in_progress",
            "notes": "Task started during API testing"
        }
        
        response = requests.put(f"{self.base_url}/monitoring/tasks/{self.test_task_id}", 
                              json=update_data, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Task update working")
            return True
        else:
            print("❌ Task update failed")
            return False

    def test_create_monitoring_subscription_with_valid_campaign(self):
        """Test monitoring subscription creation with valid campaign"""
        print("\n🛡️ Testing Monitoring Subscription - Create with Valid Campaign...")
        
        if not self.admin_token:
            print("❌ No admin token")
            return False
        
        # First create a test campaign
        campaign_data = {
            "name": "Test Monitoring Campaign",
            "description": "Campaign for monitoring service testing",
            "budget": 50000,
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "status": "Live"
        }
        
        headers = {
            'Authorization': f'Bearer {self.admin_token}',
            'Content-Type': 'application/json'
        }
        
        # Create campaign
        response = requests.post(f"{self.base_url}/campaigns", 
                               json=campaign_data, headers=headers, timeout=30)
        
        if response.status_code == 200:
            self.test_campaign_id = response.json().get('id')
            print(f"✅ Test campaign created: {self.test_campaign_id}")
        else:
            print(f"⚠️ Campaign creation failed, using existing campaign")
            # Try to get existing campaigns
            response = requests.get(f"{self.base_url}/campaigns", headers=headers, timeout=30)
            if response.status_code == 200:
                campaigns = response.json()
                if campaigns:
                    self.test_campaign_id = campaigns[0]['id']
                    print(f"✅ Using existing campaign: {self.test_campaign_id}")
        
        if not self.test_campaign_id:
            print("❌ No campaign available for subscription test")
            return False
        
        # Get assets for subscription
        response = requests.get(f"{self.base_url}/assets/public", timeout=30)
        if response.status_code == 200:
            assets = response.json()
            if assets:
                self.test_asset_id = assets[0]['id']
                print(f"✅ Using asset: {self.test_asset_id}")
            else:
                print("❌ No assets available")
                return False
        else:
            print("❌ Could not get assets")
            return False
        
        # Create monitoring subscription
        subscription_data = {
            "campaign_id": self.test_campaign_id,
            "asset_ids": [self.test_asset_id],
            "frequency": "weekly",
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard",
            "notification_preferences": {
                "email": True,
                "in_app": True,
                "sms": False
            }
        }
        
        response = requests.post(f"{self.base_url}/monitoring/services", 
                               json=subscription_data, headers=headers, timeout=30)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Monitoring subscription creation working")
            return True
        else:
            print("❌ Monitoring subscription creation failed")
            return False

    def test_comprehensive_workflow(self):
        """Test complete monitoring service workflow"""
        print("\n🔄 Testing Complete Monitoring Service Workflow...")
        
        results = {
            "authentication": True,
            "manager_apis": 0,
            "operator_apis": 0,
            "workflow_apis": 0,
            "total_tests": 0,
            "passed_tests": 0
        }
        
        # Test Manager APIs
        print("\n👥 Manager Dashboard APIs:")
        manager_tests = [
            ("Get Operators", self.test_manager_get_operators),
            ("Get Tasks", self.test_manager_get_tasks),
            ("Get Services", self.test_manager_get_services),
            ("Generate Tasks", self.test_manager_generate_tasks_fixed)
        ]
        
        for test_name, test_func in manager_tests:
            results["total_tests"] += 1
            try:
                if test_func():
                    results["passed_tests"] += 1
                    results["manager_apis"] += 1
                    print(f"✅ {test_name}")
                else:
                    print(f"❌ {test_name}")
            except Exception as e:
                print(f"❌ {test_name} - Exception: {str(e)}")
        
        # Test Operator APIs
        print("\n📱 Operator Dashboard APIs:")
        operator_tests = [
            ("Get Assigned Tasks", self.test_operator_get_tasks),
            ("Update Task Status", self.test_operator_task_update_with_valid_id),
            ("Upload Photo", self.test_operator_photo_upload_multipart)
        ]
        
        for test_name, test_func in operator_tests:
            results["total_tests"] += 1
            try:
                if test_func():
                    results["passed_tests"] += 1
                    results["operator_apis"] += 1
                    print(f"✅ {test_name}")
                else:
                    print(f"❌ {test_name}")
            except Exception as e:
                print(f"❌ {test_name} - Exception: {str(e)}")
        
        # Test Workflow APIs
        print("\n🛡️ Monitoring Service Workflow:")
        workflow_tests = [
            ("Create Subscription", self.test_create_monitoring_subscription_with_valid_campaign),
            ("Role-Based Access", self.test_role_based_access)
        ]
        
        for test_name, test_func in workflow_tests:
            results["total_tests"] += 1
            try:
                if test_func():
                    results["passed_tests"] += 1
                    results["workflow_apis"] += 1
                    print(f"✅ {test_name}")
                else:
                    print(f"❌ {test_name}")
            except Exception as e:
                print(f"❌ {test_name} - Exception: {str(e)}")
        
        return results

    def test_manager_get_operators(self):
        """Test manager getting operators"""
        if not self.manager_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.manager_token}'}
        response = requests.get(f"{self.base_url}/users?role=monitoring_operator", 
                              headers=headers, timeout=30)
        return response.status_code == 200

    def test_manager_get_tasks(self):
        """Test manager getting tasks"""
        if not self.manager_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.manager_token}'}
        response = requests.get(f"{self.base_url}/monitoring/tasks", 
                              headers=headers, timeout=30)
        return response.status_code == 200

    def test_manager_get_services(self):
        """Test manager getting services"""
        if not self.manager_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.manager_token}'}
        response = requests.get(f"{self.base_url}/monitoring/services", 
                              headers=headers, timeout=30)
        return response.status_code == 200

    def test_operator_get_tasks(self):
        """Test operator getting tasks"""
        if not self.operator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.operator_token}'}
        response = requests.get(f"{self.base_url}/monitoring/tasks", 
                              headers=headers, timeout=30)
        return response.status_code == 200

    def test_role_based_access(self):
        """Test role-based access control"""
        if not self.operator_token:
            return False
        
        headers = {'Authorization': f'Bearer {self.operator_token}'}
        
        # Operator should not be able to access manager endpoints
        response = requests.get(f"{self.base_url}/users?role=monitoring_operator", 
                              headers=headers, timeout=30)
        
        return response.status_code == 403  # Should be forbidden

    def run_detailed_tests(self):
        """Run detailed monitoring service tests"""
        print("="*80)
        print("🔍 BEATSPACE MONITORING SERVICE DETAILED API TESTING")
        print("="*80)
        
        # Authenticate users
        self.authenticate_users()
        
        # Run comprehensive workflow test
        results = self.test_comprehensive_workflow()
        
        # Print results
        print("\n" + "="*80)
        print("📊 DETAILED TEST RESULTS")
        print("="*80)
        
        success_rate = (results["passed_tests"] / results["total_tests"] * 100) if results["total_tests"] > 0 else 0
        
        print(f"Total Tests: {results['total_tests']}")
        print(f"Passed Tests: {results['passed_tests']}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        print(f"Manager APIs Working: {results['manager_apis']}/4")
        print(f"Operator APIs Working: {results['operator_apis']}/3")
        print(f"Workflow APIs Working: {results['workflow_apis']}/2")
        
        if success_rate >= 75:
            print("\n🎉 MONITORING SERVICE APIs ARE WORKING WELL")
            print("✅ Backend infrastructure is solid for production use")
        elif success_rate >= 50:
            print("\n⚠️ MONITORING SERVICE APIs PARTIALLY WORKING")
            print("🔧 Some endpoints need attention but core functionality is operational")
        else:
            print("\n❌ MONITORING SERVICE APIs NEED SIGNIFICANT WORK")
            print("🚨 Multiple critical issues detected")
        
        return results

if __name__ == "__main__":
    try:
        from PIL import Image
    except ImportError:
        print("Installing Pillow for image testing...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
        from PIL import Image
    
    tester = DetailedMonitoringTester()
    tester.run_detailed_tests()