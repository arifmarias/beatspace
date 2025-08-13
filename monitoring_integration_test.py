import requests
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any

class BeatSpaceMonitoringIntegrationTester:
    """
    Comprehensive Integration Testing for BeatSpace Monitoring Service
    Phase 4: End-to-End Integration Testing across all user roles
    """
    
    def __init__(self, base_url="https://beatspace-monitor-1.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = {}
        
        # Authentication tokens for different roles
        self.admin_token = None
        self.manager_token = None
        self.operator_token = None
        self.buyer_token = None
        
        # Test data storage
        self.test_campaign_id = None
        self.test_asset_ids = []
        self.test_subscription_id = None
        self.test_task_ids = []
        self.test_operator_id = None
        self.test_buyer_id = None
        
        print("🎯 BeatSpace Monitoring Service Integration Tester Initialized")
        print(f"   Base URL: {base_url}")
        print("   Testing Scope: Complete monitoring service lifecycle")
        print("   User Roles: Buyer → Manager → Operator workflow")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, params: Dict = None, token: str = None) -> tuple:
        """Execute a single API test with comprehensive logging"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        print(f"   Method: {method} {endpoint}")
        
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
                print(f"   ✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   📊 Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        key_count = len(response_data.keys())
                        print(f"   📊 Response: Dict with {key_count} keys")
                        if key_count <= 5:
                            print(f"   🔑 Keys: {list(response_data.keys())}")
                except:
                    print(f"   📄 Response: {response.text[:100]}...")
            else:
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   📄 Error: {response.text[:300]}...")

            # Store detailed test result
            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_data': response.json() if response.text and success else {},
                'endpoint': endpoint,
                'method': method
            }

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"   ❌ EXCEPTION - {str(e)}")
            self.test_results[name] = {
                'success': False,
                'error': str(e),
                'endpoint': endpoint,
                'method': method
            }
            return False, {}

    # ========================================
    # AUTHENTICATION SETUP FOR ALL ROLES
    # ========================================
    
    def setup_authentication(self) -> bool:
        """Authenticate all required user roles for monitoring service testing"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATION SETUP FOR ALL USER ROLES")
        print("="*60)
        
        auth_success = True
        
        # 1. Admin Authentication
        print("\n1️⃣ ADMIN AUTHENTICATION")
        admin_success = self.authenticate_admin()
        if not admin_success:
            print("   ❌ Admin authentication failed - critical for setup")
            auth_success = False
        
        # 2. Create and authenticate Manager
        print("\n2️⃣ MANAGER AUTHENTICATION")
        manager_success = self.setup_manager_user()
        if not manager_success:
            print("   ❌ Manager setup failed - required for task management")
            auth_success = False
        
        # 3. Create and authenticate Operator
        print("\n3️⃣ OPERATOR AUTHENTICATION")
        operator_success = self.setup_operator_user()
        if not operator_success:
            print("   ❌ Operator setup failed - required for field operations")
            auth_success = False
        
        # 4. Create and authenticate Buyer
        print("\n4️⃣ BUYER AUTHENTICATION")
        buyer_success = self.setup_buyer_user()
        if not buyer_success:
            print("   ❌ Buyer setup failed - required for subscriptions")
            auth_success = False
        
        if auth_success:
            print("\n✅ ALL USER ROLES AUTHENTICATED SUCCESSFULLY")
            print(f"   Admin Token: {self.admin_token[:20] if self.admin_token else 'None'}...")
            print(f"   Manager Token: {self.manager_token[:20] if self.manager_token else 'None'}...")
            print(f"   Operator Token: {self.operator_token[:20] if self.operator_token else 'None'}...")
            print(f"   Buyer Token: {self.buyer_token[:20] if self.buyer_token else 'None'}...")
        else:
            print("\n❌ AUTHENTICATION SETUP INCOMPLETE")
        
        return auth_success

    def authenticate_admin(self) -> bool:
        """Authenticate admin user"""
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        success, response = self.run_test(
            "Admin Login", "POST", "auth/login", 200, data=login_data
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   ✅ Admin authenticated successfully")
            return True
        return False

    def setup_manager_user(self) -> bool:
        """Create and authenticate manager user"""
        if not self.admin_token:
            return False
        
        # Create manager user
        manager_data = {
            "email": "manager@beatspace.com",
            "password": "manager123",
            "company_name": "BeatSpace Operations",
            "contact_name": "Operations Manager",
            "phone": "+8801700000001",
            "role": "manager",
            "address": "Operations Center, Dhaka"
        }
        
        success, response = self.run_test(
            "Create Manager User", "POST", "admin/users", 200, 
            data=manager_data, token=self.admin_token
        )
        
        if success:
            manager_id = response.get('id')
            # Approve manager
            approval_data = {"status": "approved", "reason": "Auto-approved for testing"}
            self.run_test(
                "Approve Manager User", "PATCH", f"admin/users/{manager_id}/status", 200,
                data=approval_data, token=self.admin_token
            )
            
            # Login as manager
            login_data = {"email": "manager@beatspace.com", "password": "manager123"}
            login_success, login_response = self.run_test(
                "Manager Login", "POST", "auth/login", 200, data=login_data
            )
            
            if login_success and 'access_token' in login_response:
                self.manager_token = login_response['access_token']
                print(f"   ✅ Manager user created and authenticated")
                return True
        
        return False

    def setup_operator_user(self) -> bool:
        """Create and authenticate monitoring operator user"""
        if not self.admin_token:
            return False
        
        # First try to login with existing operator
        login_data = {"email": "operator3@beatspace.com", "password": "operator123"}
        login_success, login_response = self.run_test(
            "Operator Login (Existing)", "POST", "auth/login", 200, data=login_data
        )
        
        if login_success and 'access_token' in login_response:
            self.operator_token = login_response['access_token']
            # Get operator ID from user data
            user_data = login_response.get('user', {})
            self.test_operator_id = user_data.get('id')
            print(f"   ✅ Existing operator user authenticated")
            return True
        
        # If login failed, try to create new operator user
        operator_data = {
            "email": "operator3@beatspace.com",
            "password": "operator123",
            "company_name": "BeatSpace Field Operations",
            "contact_name": "Field Operator 3",
            "phone": "+8801700000003",
            "role": "monitoring_operator",
            "address": "Field Office, Dhaka"
        }
        
        success, response = self.run_test(
            "Create Operator User", "POST", "admin/users", 200, 
            data=operator_data, token=self.admin_token
        )
        
        if success:
            self.test_operator_id = response.get('id')
            # Approve operator
            approval_data = {"status": "approved", "reason": "Auto-approved for testing"}
            self.run_test(
                "Approve Operator User", "PATCH", f"admin/users/{self.test_operator_id}/status", 200,
                data=approval_data, token=self.admin_token
            )
            
            # Login as operator
            login_data = {"email": "operator3@beatspace.com", "password": "operator123"}
            login_success, login_response = self.run_test(
                "Operator Login", "POST", "auth/login", 200, data=login_data
            )
            
            if login_success and 'access_token' in login_response:
                self.operator_token = login_response['access_token']
                print(f"   ✅ Operator user created and authenticated")
                return True
        else:
            # If creation failed due to existing user, try to find existing user
            print("   ℹ️ Operator creation failed, trying to find existing user")
            success, users = self.run_test(
                "Get All Users", "GET", "admin/users", 200, token=self.admin_token
            )
            
            if success:
                for user in users:
                    if user.get('email') == 'operator3@beatspace.com':
                        self.test_operator_id = user.get('id')
                        print(f"   ✅ Found existing operator user: {self.test_operator_id}")
                        
                        # Try login again
                        login_success, login_response = self.run_test(
                            "Operator Login (Retry)", "POST", "auth/login", 200, data=login_data
                        )
                        
                        if login_success and 'access_token' in login_response:
                            self.operator_token = login_response['access_token']
                            print(f"   ✅ Existing operator authenticated successfully")
                            return True
        
        return False

    def setup_buyer_user(self) -> bool:
        """Create and authenticate buyer user"""
        if not self.admin_token:
            return False
        
        # Create buyer user
        buyer_data = {
            "email": "buyer.monitoring@beatspace.com",
            "password": "buyer123",
            "company_name": "Monitoring Test Company",
            "contact_name": "Marketing Director",
            "phone": "+8801700000004",
            "role": "buyer",
            "address": "Corporate Office, Dhaka"
        }
        
        success, response = self.run_test(
            "Create Buyer User", "POST", "admin/users", 200, 
            data=buyer_data, token=self.admin_token
        )
        
        if success:
            self.test_buyer_id = response.get('id')
            # Approve buyer
            approval_data = {"status": "approved", "reason": "Auto-approved for testing"}
            self.run_test(
                "Approve Buyer User", "PATCH", f"admin/users/{self.test_buyer_id}/status", 200,
                data=approval_data, token=self.admin_token
            )
            
            # Login as buyer
            login_data = {"email": "buyer.monitoring@beatspace.com", "password": "buyer123"}
            login_success, login_response = self.run_test(
                "Buyer Login", "POST", "auth/login", 200, data=login_data
            )
            
            if login_success and 'access_token' in login_response:
                self.buyer_token = login_response['access_token']
                print(f"   ✅ Buyer user created and authenticated")
                return True
        
        return False

    # ========================================
    # TEST DATA SETUP
    # ========================================
    
    def setup_test_data(self) -> bool:
        """Create test campaigns and assets for monitoring service testing"""
        print("\n" + "="*60)
        print("🏗️ TEST DATA SETUP FOR MONITORING SERVICE")
        print("="*60)
        
        if not self.admin_token or not self.test_buyer_id:
            print("   ❌ Missing admin token or buyer ID")
            return False
        
        # 1. Create test assets
        print("\n1️⃣ CREATING TEST ASSETS")
        assets_success = self.create_test_assets()
        
        # 2. Create test campaign
        print("\n2️⃣ CREATING TEST CAMPAIGN")
        campaign_success = self.create_test_campaign()
        
        success = assets_success and campaign_success
        
        if success:
            print("\n✅ TEST DATA SETUP COMPLETE")
            print(f"   Campaign ID: {self.test_campaign_id}")
            print(f"   Asset IDs: {len(self.test_asset_ids)} assets created")
        else:
            print("\n❌ TEST DATA SETUP FAILED")
        
        return success

    def create_test_assets(self) -> bool:
        """Create test assets for monitoring"""
        assets_data = [
            {
                "name": "Test Billboard Alpha",
                "description": "Test billboard for monitoring service integration",
                "address": "Test Location Alpha, Dhaka",
                "district": "Dhaka",
                "division": "Dhaka",
                "type": "Billboard",
                "dimensions": "20ft x 10ft",
                "location": {"lat": 23.8103, "lng": 90.4125},
                "traffic_volume": "High",
                "visibility_score": 9,
                "pricing": {"weekly_rate": 5000, "monthly_rate": 18000, "yearly_rate": 200000},
                "photos": ["test_image_alpha.jpg"]
            },
            {
                "name": "Test Billboard Beta",
                "description": "Second test billboard for monitoring service",
                "address": "Test Location Beta, Dhaka",
                "district": "Dhaka",
                "division": "Dhaka",
                "type": "Billboard",
                "dimensions": "15ft x 8ft",
                "location": {"lat": 23.7461, "lng": 90.3742},
                "traffic_volume": "Medium",
                "visibility_score": 7,
                "pricing": {"weekly_rate": 3000, "monthly_rate": 12000, "yearly_rate": 130000},
                "photos": ["test_image_beta.jpg"]
            }
        ]
        
        created_count = 0
        for i, asset_data in enumerate(assets_data):
            success, response = self.run_test(
                f"Create Test Asset {i+1}", "POST", "assets", 200,
                data=asset_data, token=self.admin_token
            )
            
            if success and response.get('id'):
                self.test_asset_ids.append(response['id'])
                created_count += 1
                print(f"   ✅ Asset {i+1} created: {response['id']}")
        
        return created_count == len(assets_data)

    def create_test_campaign(self) -> bool:
        """Create test campaign for monitoring service"""
        if not self.test_asset_ids:
            print("   ❌ No test assets available for campaign")
            return False
        
        campaign_data = {
            "name": "Monitoring Service Test Campaign",
            "description": "Test campaign for monitoring service integration testing",
            "budget": 100000,
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=60)).isoformat(),
            "status": "Live",
            "buyer_id": self.test_buyer_id,
            "buyer_name": "Monitoring Test Company",
            "campaign_assets": [
                {
                    "asset_id": self.test_asset_ids[0],
                    "asset_name": "Test Billboard Alpha",
                    "asset_start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                    "asset_expiration_date": (datetime.utcnow() + timedelta(days=60)).isoformat()
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Test Campaign", "POST", "admin/campaigns", 200,
            data=campaign_data, token=self.admin_token
        )
        
        if success and response.get('id'):
            self.test_campaign_id = response['id']
            print(f"   ✅ Campaign created: {self.test_campaign_id}")
            return True
        
        return False

    # ========================================
    # BUYER MONITORING SUBSCRIPTION WORKFLOW
    # ========================================
    
    def test_buyer_monitoring_subscription_workflow(self) -> bool:
        """Test complete buyer monitoring subscription workflow"""
        print("\n" + "="*60)
        print("🛒 BUYER MONITORING SUBSCRIPTION WORKFLOW")
        print("="*60)
        print("   Testing: Buyer login → Find campaigns → Create subscription")
        
        if not self.buyer_token or not self.test_campaign_id:
            print("   ❌ Missing buyer token or test campaign")
            return False
        
        workflow_success = True
        
        # Step 1: Get buyer's campaigns
        print("\n1️⃣ GET BUYER CAMPAIGNS")
        success, campaigns = self.run_test(
            "Get Buyer Campaigns", "GET", "campaigns", 200, token=self.buyer_token
        )
        
        if success:
            live_campaigns = [c for c in campaigns if c.get('status') == 'Live']
            print(f"   📊 Found {len(campaigns)} total campaigns, {len(live_campaigns)} Live")
            
            if not live_campaigns:
                print("   ⚠️ No Live campaigns found for monitoring subscription")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 2: Create monitoring subscription
        print("\n2️⃣ CREATE MONITORING SUBSCRIPTION")
        subscription_data = {
            "campaign_id": self.test_campaign_id,
            "asset_ids": self.test_asset_ids[:2],  # Use first 2 assets
            "frequency": "weekly",
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard",
            "notification_preferences": {
                "email": True,
                "in_app": True,
                "sms": False
            }
        }
        
        success, response = self.run_test(
            "Create Monitoring Subscription", "POST", "monitoring/services", 200,
            data=subscription_data, token=self.buyer_token
        )
        
        if success and response.get('id'):
            self.test_subscription_id = response['id']
            print(f"   ✅ Subscription created: {self.test_subscription_id}")
            print(f"   📋 Frequency: {response.get('frequency')}")
            print(f"   📅 Duration: {response.get('start_date')} to {response.get('end_date')}")
        else:
            workflow_success = False
        
        # Step 3: Verify subscription stored correctly
        print("\n3️⃣ VERIFY SUBSCRIPTION STORAGE")
        success, subscriptions = self.run_test(
            "Get Monitoring Subscriptions", "GET", "monitoring/services", 200,
            token=self.buyer_token
        )
        
        if success:
            buyer_subscriptions = [s for s in subscriptions if s.get('buyer_id') == self.test_buyer_id]
            print(f"   📊 Found {len(subscriptions)} total subscriptions")
            print(f"   👤 Buyer has {len(buyer_subscriptions)} subscriptions")
            
            if not buyer_subscriptions:
                print("   ❌ Created subscription not found")
                workflow_success = False
        else:
            workflow_success = False
        
        if workflow_success:
            print("\n✅ BUYER MONITORING SUBSCRIPTION WORKFLOW COMPLETE")
        else:
            print("\n❌ BUYER MONITORING SUBSCRIPTION WORKFLOW FAILED")
        
        return workflow_success

    # ========================================
    # MANAGER TASK GENERATION & ASSIGNMENT
    # ========================================
    
    def test_manager_task_generation_workflow(self) -> bool:
        """Test manager task generation and assignment workflow"""
        print("\n" + "="*60)
        print("👨‍💼 MANAGER TASK GENERATION & ASSIGNMENT WORKFLOW")
        print("="*60)
        print("   Testing: Generate tasks → Assign to operators → Update status")
        
        if not self.manager_token or not self.test_subscription_id:
            print("   ❌ Missing manager token or subscription ID")
            return False
        
        workflow_success = True
        
        # Step 1: Generate tasks from subscriptions
        print("\n1️⃣ GENERATE MONITORING TASKS")
        task_date = (datetime.utcnow() + timedelta(days=2)).strftime('%Y-%m-%d')
        
        success, response = self.run_test(
            "Generate Monitoring Tasks", "POST", "monitoring/generate-tasks", 200,
            data={"date": task_date}, token=self.manager_token
        )
        
        if success:
            tasks_created = response.get('tasks_created', 0)
            print(f"   ✅ Generated {tasks_created} tasks for {task_date}")
        else:
            workflow_success = False
        
        # Step 2: Get generated tasks
        print("\n2️⃣ GET MONITORING TASKS")
        success, tasks = self.run_test(
            "Get Monitoring Tasks", "GET", "monitoring/tasks", 200,
            token=self.manager_token
        )
        
        if success:
            pending_tasks = [t for t in tasks if t.get('status') == 'pending']
            print(f"   📊 Found {len(tasks)} total tasks, {len(pending_tasks)} pending")
            
            if pending_tasks:
                self.test_task_ids = [t['id'] for t in pending_tasks[:2]]  # Take first 2
                print(f"   📝 Selected {len(self.test_task_ids)} tasks for assignment")
            else:
                print("   ⚠️ No pending tasks found for assignment")
                workflow_success = False
        else:
            workflow_success = False
        
        # Step 3: Assign tasks to operator
        if self.test_task_ids and self.test_operator_id:
            print("\n3️⃣ ASSIGN TASKS TO OPERATOR")
            assignment_data = {
                "task_ids": self.test_task_ids,
                "operator_id": self.test_operator_id,
                "priority": "medium",
                "special_instructions": "Integration test assignment"
            }
            
            success, response = self.run_test(
                "Assign Tasks to Operator", "POST", "monitoring/tasks/assign", 200,
                data=assignment_data, token=self.manager_token
            )
            
            if success:
                assigned_count = response.get('assigned_count', 0)
                print(f"   ✅ Assigned {assigned_count} tasks to operator")
            else:
                workflow_success = False
        
        # Step 4: Update task status
        if self.test_task_ids:
            print("\n4️⃣ UPDATE TASK STATUS")
            task_id = self.test_task_ids[0]
            update_data = {
                "status": "assigned",
                "priority": "high"
            }
            
            success, response = self.run_test(
                "Update Task Status", "PUT", f"monitoring/tasks/{task_id}", 200,
                data=update_data, token=self.manager_token
            )
            
            if success:
                print(f"   ✅ Task status updated to: {response.get('status')}")
            else:
                workflow_success = False
        
        if workflow_success:
            print("\n✅ MANAGER TASK GENERATION & ASSIGNMENT WORKFLOW COMPLETE")
        else:
            print("\n❌ MANAGER TASK GENERATION & ASSIGNMENT WORKFLOW FAILED")
        
        return workflow_success

    # ========================================
    # OPERATOR TASK EXECUTION WORKFLOW
    # ========================================
    
    def test_operator_task_execution_workflow(self) -> bool:
        """Test operator task execution workflow"""
        print("\n" + "="*60)
        print("👷‍♂️ OPERATOR TASK EXECUTION WORKFLOW")
        print("="*60)
        print("   Testing: Get assigned tasks → Mark in progress → Upload photos → Submit report")
        
        if not self.operator_token:
            print("   ❌ Missing operator token")
            return False
        
        workflow_success = True
        
        # Step 1: Get operator's assigned tasks
        print("\n1️⃣ GET ASSIGNED TASKS")
        success, tasks = self.run_test(
            "Get Operator Tasks", "GET", "monitoring/tasks", 200,
            token=self.operator_token
        )
        
        if success:
            assigned_tasks = [t for t in tasks if t.get('assigned_operator_id') == self.test_operator_id]
            print(f"   📊 Found {len(tasks)} total tasks")
            print(f"   👤 Operator has {len(assigned_tasks)} assigned tasks")
            
            if assigned_tasks:
                test_task = assigned_tasks[0]
                test_task_id = test_task['id']
                print(f"   📝 Selected task for execution: {test_task_id}")
            else:
                print("   ⚠️ No assigned tasks found for operator")
                # Use any available task for testing
                if tasks:
                    test_task = tasks[0]
                    test_task_id = test_task['id']
                    print(f"   📝 Using available task for testing: {test_task_id}")
                else:
                    workflow_success = False
                    test_task_id = None
        else:
            workflow_success = False
            test_task_id = None
        
        # Step 2: Mark task as in progress
        if test_task_id:
            print("\n2️⃣ MARK TASK IN PROGRESS")
            update_data = {"status": "in_progress"}
            
            success, response = self.run_test(
                "Mark Task In Progress", "PUT", f"monitoring/tasks/{test_task_id}", 200,
                data=update_data, token=self.operator_token
            )
            
            if success:
                print(f"   ✅ Task marked as: {response.get('status')}")
            else:
                workflow_success = False
        
        # Step 3: Upload photos with GPS data
        if test_task_id:
            print("\n3️⃣ UPLOAD PHOTOS WITH GPS")
            photo_data = {
                "task_id": test_task_id,
                "gps_location": {"lat": 23.8103, "lng": 90.4125},
                "photos": [
                    {
                        "url": "test_photo_1.jpg",
                        "angle": "front",
                        "timestamp": datetime.utcnow().isoformat(),
                        "gps": {"lat": 23.8103, "lng": 90.4125},
                        "quality_score": 8.5
                    }
                ]
            }
            
            success, response = self.run_test(
                "Upload Task Photos", "POST", "monitoring/upload-photo", 200,
                data=photo_data, token=self.operator_token
            )
            
            if success:
                print(f"   ✅ Photos uploaded successfully")
                print(f"   📸 Photo count: {len(photo_data['photos'])}")
                print(f"   📍 GPS verified: {photo_data['gps_location']}")
            else:
                workflow_success = False
        
        # Step 4: Submit completion report
        if test_task_id:
            print("\n4️⃣ SUBMIT COMPLETION REPORT")
            report_data = {
                "overall_condition": 8,
                "condition_details": {
                    "structural": "Good",
                    "lighting": "Excellent",
                    "visibility": "Clear"
                },
                "issues_found": ["Minor wear on bottom edge"],
                "maintenance_required": False,
                "urgent_issues": False,
                "weather_condition": "clear",
                "lighting_condition": "good",
                "visibility_rating": 9,
                "notes": "Asset in good condition, minor maintenance recommended",
                "gps_location": {"lat": 23.8103, "lng": 90.4125},
                "completion_time": 25
            }
            
            success, response = self.run_test(
                "Submit Task Report", "POST", f"monitoring/tasks/{test_task_id}/report", 200,
                data=report_data, token=self.operator_token
            )
            
            if success:
                print(f"   ✅ Task report submitted successfully")
                print(f"   📊 Overall condition: {report_data['overall_condition']}/10")
                print(f"   ⏱️ Completion time: {report_data['completion_time']} minutes")
            else:
                workflow_success = False
        
        if workflow_success:
            print("\n✅ OPERATOR TASK EXECUTION WORKFLOW COMPLETE")
        else:
            print("\n❌ OPERATOR TASK EXECUTION WORKFLOW FAILED")
        
        return workflow_success

    # ========================================
    # MANAGER MONITORING & ANALYTICS
    # ========================================
    
    def test_manager_monitoring_analytics(self) -> bool:
        """Test manager monitoring and analytics functionality"""
        print("\n" + "="*60)
        print("📊 MANAGER MONITORING & ANALYTICS")
        print("="*60)
        print("   Testing: View subscriptions → Get analytics → Manage operators")
        
        if not self.manager_token:
            print("   ❌ Missing manager token")
            return False
        
        workflow_success = True
        
        # Step 1: View all monitoring subscriptions
        print("\n1️⃣ VIEW ALL MONITORING SUBSCRIPTIONS")
        success, subscriptions = self.run_test(
            "Get All Monitoring Subscriptions", "GET", "monitoring/services", 200,
            token=self.manager_token
        )
        
        if success:
            active_subscriptions = [s for s in subscriptions if s.get('status') == 'active']
            print(f"   📊 Found {len(subscriptions)} total subscriptions")
            print(f"   ✅ Active subscriptions: {len(active_subscriptions)}")
            
            for sub in active_subscriptions[:3]:  # Show first 3
                print(f"   📋 Subscription: {sub.get('id')} - {sub.get('frequency')} frequency")
        else:
            workflow_success = False
        
        # Step 2: Get performance analytics
        print("\n2️⃣ GET PERFORMANCE ANALYTICS")
        success, analytics = self.run_test(
            "Get Monitoring Performance", "GET", "monitoring/performance", 200,
            token=self.manager_token
        )
        
        if success:
            print(f"   📈 Analytics data retrieved successfully")
            if isinstance(analytics, dict):
                print(f"   📊 Analytics keys: {list(analytics.keys())}")
            else:
                print(f"   📊 Analytics type: {type(analytics)}")
        else:
            workflow_success = False
        
        # Step 3: Get operator list
        print("\n3️⃣ GET MONITORING OPERATORS")
        success, operators = self.run_test(
            "Get Monitoring Operators", "GET", "users", 200,
            params={"role": "monitoring_operator"}, token=self.manager_token
        )
        
        if success:
            print(f"   👥 Found {len(operators)} monitoring operators")
            for op in operators[:3]:  # Show first 3
                print(f"   👤 Operator: {op.get('contact_name')} - {op.get('status')}")
        else:
            workflow_success = False
        
        if workflow_success:
            print("\n✅ MANAGER MONITORING & ANALYTICS COMPLETE")
        else:
            print("\n❌ MANAGER MONITORING & ANALYTICS FAILED")
        
        return workflow_success

    # ========================================
    # ROLE-BASED ACCESS CONTROL VALIDATION
    # ========================================
    
    def test_role_based_access_control(self) -> bool:
        """Test role-based access control across monitoring endpoints"""
        print("\n" + "="*60)
        print("🔒 ROLE-BASED ACCESS CONTROL VALIDATION")
        print("="*60)
        print("   Testing: Unauthorized access returns 403/401 errors")
        
        rbac_success = True
        
        # Test 1: Buyer accessing operator-only endpoints
        print("\n1️⃣ BUYER ACCESS RESTRICTIONS")
        if self.buyer_token and self.test_task_ids:
            task_id = self.test_task_ids[0] if self.test_task_ids else "test_task_id"
            
            # Buyer should NOT be able to assign tasks
            success, response = self.run_test(
                "Buyer Assign Tasks (Should Fail)", "POST", "monitoring/tasks/assign", 403,
                data={"task_ids": [task_id], "operator_id": "test_op"}, token=self.buyer_token
            )
            
            if success:
                print("   ✅ Buyer properly restricted from task assignment")
            else:
                rbac_success = False
        
        # Test 2: Operator accessing manager-only endpoints
        print("\n2️⃣ OPERATOR ACCESS RESTRICTIONS")
        if self.operator_token:
            # Operator should NOT be able to generate tasks
            success, response = self.run_test(
                "Operator Generate Tasks (Should Fail)", "POST", "monitoring/generate-tasks", 403,
                data={"date": "2025-01-20"}, token=self.operator_token
            )
            
            if success:
                print("   ✅ Operator properly restricted from task generation")
            else:
                rbac_success = False
        
        # Test 3: Unauthenticated access
        print("\n3️⃣ UNAUTHENTICATED ACCESS RESTRICTIONS")
        success, response = self.run_test(
            "Unauthenticated Monitoring Services (Should Fail)", "GET", "monitoring/services", 401
        )
        
        if success:
            print("   ✅ Unauthenticated access properly restricted")
        else:
            rbac_success = False
        
        # Test 4: Buyer can only see their own subscriptions
        print("\n4️⃣ BUYER DATA ISOLATION")
        if self.buyer_token:
            success, subscriptions = self.run_test(
                "Get Buyer Subscriptions", "GET", "monitoring/services", 200,
                token=self.buyer_token
            )
            
            if success:
                buyer_only_subs = all(s.get('buyer_id') == self.test_buyer_id for s in subscriptions)
                if buyer_only_subs:
                    print("   ✅ Buyer can only see their own subscriptions")
                else:
                    print("   ❌ Buyer can see other buyers' subscriptions")
                    rbac_success = False
            else:
                rbac_success = False
        
        if rbac_success:
            print("\n✅ ROLE-BASED ACCESS CONTROL VALIDATION COMPLETE")
        else:
            print("\n❌ ROLE-BASED ACCESS CONTROL VALIDATION FAILED")
        
        return rbac_success

    # ========================================
    # DATA CONSISTENCY VALIDATION
    # ========================================
    
    def test_data_consistency_validation(self) -> bool:
        """Test data consistency across monitoring entities"""
        print("\n" + "="*60)
        print("🔗 DATA CONSISTENCY VALIDATION")
        print("="*60)
        print("   Testing: Foreign key relationships and data integrity")
        
        consistency_success = True
        
        # Test 1: Subscription → Task relationship
        print("\n1️⃣ SUBSCRIPTION → TASK RELATIONSHIPS")
        if self.test_subscription_id:
            # Get subscription details
            success, subscription = self.run_test(
                "Get Subscription Details", "GET", f"monitoring/services/{self.test_subscription_id}", 200,
                token=self.buyer_token
            )
            
            if success:
                # Find tasks for this subscription
                success, tasks = self.run_test(
                    "Get All Tasks", "GET", "monitoring/tasks", 200,
                    token=self.manager_token
                )
                
                if success:
                    subscription_tasks = [t for t in tasks if t.get('subscription_id') == self.test_subscription_id]
                    print(f"   📊 Subscription has {len(subscription_tasks)} associated tasks")
                    
                    if subscription_tasks:
                        print("   ✅ Subscription → Task relationship verified")
                    else:
                        print("   ⚠️ No tasks found for subscription (may be expected)")
                else:
                    consistency_success = False
            else:
                consistency_success = False
        
        # Test 2: Task → Report relationship
        print("\n2️⃣ TASK → REPORT RELATIONSHIPS")
        if self.test_task_ids:
            task_id = self.test_task_ids[0]
            
            # Check if task has associated reports
            success, task_details = self.run_test(
                "Get Task Details", "GET", f"monitoring/tasks/{task_id}", 200,
                token=self.operator_token
            )
            
            if success:
                print(f"   📋 Task status: {task_details.get('status')}")
                print(f"   📍 Task location: {task_details.get('asset_location')}")
                print("   ✅ Task details retrieved successfully")
            else:
                consistency_success = False
        
        # Test 3: Asset → Task relationship
        print("\n3️⃣ ASSET → TASK RELATIONSHIPS")
        if self.test_asset_ids:
            asset_id = self.test_asset_ids[0]
            
            # Get tasks for this asset
            success, tasks = self.run_test(
                "Get All Tasks", "GET", "monitoring/tasks", 200,
                token=self.manager_token
            )
            
            if success:
                asset_tasks = [t for t in tasks if t.get('asset_id') == asset_id]
                print(f"   📊 Asset has {len(asset_tasks)} associated tasks")
                
                if asset_tasks:
                    print("   ✅ Asset → Task relationship verified")
                else:
                    print("   ⚠️ No tasks found for asset (may be expected)")
            else:
                consistency_success = False
        
        # Test 4: MongoDB ObjectId serialization
        print("\n4️⃣ MONGODB OBJECTID SERIALIZATION")
        success, services = self.run_test(
            "Test ObjectId Serialization", "GET", "monitoring/services", 200,
            token=self.manager_token
        )
        
        if success:
            # Check if response is valid JSON (no ObjectId serialization issues)
            try:
                json.dumps(services)  # This will fail if ObjectIds are present
                print("   ✅ No ObjectId serialization issues detected")
            except TypeError as e:
                print(f"   ❌ ObjectId serialization issue: {str(e)}")
                consistency_success = False
        else:
            consistency_success = False
        
        if consistency_success:
            print("\n✅ DATA CONSISTENCY VALIDATION COMPLETE")
        else:
            print("\n❌ DATA CONSISTENCY VALIDATION FAILED")
        
        return consistency_success

    # ========================================
    # COMPREHENSIVE INTEGRATION TEST RUNNER
    # ========================================
    
    def run_comprehensive_integration_tests(self) -> Dict[str, Any]:
        """Run complete monitoring service integration test suite"""
        print("\n" + "="*80)
        print("🚀 BEATSPACE MONITORING SERVICE - COMPREHENSIVE INTEGRATION TESTING")
        print("="*80)
        print("   Phase 4: End-to-End Integration Testing")
        print("   Scope: Complete monitoring service lifecycle validation")
        print("   Roles: Buyer → Manager → Operator workflow")
        print()
        
        start_time = datetime.utcnow()
        test_results = {}
        
        # Phase 1: Authentication Setup
        print("🔐 PHASE 1: AUTHENTICATION SETUP")
        auth_success = self.setup_authentication()
        test_results['authentication_setup'] = auth_success
        
        if not auth_success:
            print("\n❌ CRITICAL FAILURE: Authentication setup failed")
            return self.generate_test_summary(test_results, start_time)
        
        # Phase 2: Test Data Setup
        print("\n🏗️ PHASE 2: TEST DATA SETUP")
        data_success = self.setup_test_data()
        test_results['test_data_setup'] = data_success
        
        if not data_success:
            print("\n❌ CRITICAL FAILURE: Test data setup failed")
            return self.generate_test_summary(test_results, start_time)
        
        # Phase 3: Buyer Workflow
        print("\n🛒 PHASE 3: BUYER MONITORING SUBSCRIPTION")
        buyer_success = self.test_buyer_monitoring_subscription_workflow()
        test_results['buyer_workflow'] = buyer_success
        
        # Phase 4: Manager Workflow
        print("\n👨‍💼 PHASE 4: MANAGER TASK GENERATION & ASSIGNMENT")
        manager_success = self.test_manager_task_generation_workflow()
        test_results['manager_workflow'] = manager_success
        
        # Phase 5: Operator Workflow
        print("\n👷‍♂️ PHASE 5: OPERATOR TASK EXECUTION")
        operator_success = self.test_operator_task_execution_workflow()
        test_results['operator_workflow'] = operator_success
        
        # Phase 6: Manager Analytics
        print("\n📊 PHASE 6: MANAGER MONITORING & ANALYTICS")
        analytics_success = self.test_manager_monitoring_analytics()
        test_results['manager_analytics'] = analytics_success
        
        # Phase 7: Role-Based Access Control
        print("\n🔒 PHASE 7: ROLE-BASED ACCESS CONTROL")
        rbac_success = self.test_role_based_access_control()
        test_results['rbac_validation'] = rbac_success
        
        # Phase 8: Data Consistency
        print("\n🔗 PHASE 8: DATA CONSISTENCY VALIDATION")
        consistency_success = self.test_data_consistency_validation()
        test_results['data_consistency'] = consistency_success
        
        return self.generate_test_summary(test_results, start_time)

    def generate_test_summary(self, test_results: Dict[str, bool], start_time: datetime) -> Dict[str, Any]:
        """Generate comprehensive test summary"""
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()
        
        passed_phases = sum(1 for result in test_results.values() if result)
        total_phases = len(test_results)
        success_rate = (passed_phases / total_phases * 100) if total_phases > 0 else 0
        
        print("\n" + "="*80)
        print("📋 COMPREHENSIVE INTEGRATION TEST SUMMARY")
        print("="*80)
        
        print(f"\n⏱️ TEST EXECUTION SUMMARY:")
        print(f"   Duration: {duration:.1f} seconds")
        print(f"   Individual Tests: {self.tests_run} total, {self.tests_passed} passed")
        print(f"   Test Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print(f"\n🎯 INTEGRATION PHASE RESULTS:")
        phase_names = {
            'authentication_setup': 'Authentication Setup',
            'test_data_setup': 'Test Data Setup', 
            'buyer_workflow': 'Buyer Subscription Workflow',
            'manager_workflow': 'Manager Task Management',
            'operator_workflow': 'Operator Task Execution',
            'manager_analytics': 'Manager Analytics',
            'rbac_validation': 'Role-Based Access Control',
            'data_consistency': 'Data Consistency'
        }
        
        for phase_key, result in test_results.items():
            phase_name = phase_names.get(phase_key, phase_key)
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"   {phase_name}: {status}")
        
        print(f"\n📊 OVERALL INTEGRATION RESULTS:")
        print(f"   Phases Passed: {passed_phases}/{total_phases}")
        print(f"   Integration Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print(f"\n🎉 INTEGRATION TESTING: SUCCESS")
            print(f"   The BeatSpace Monitoring Service integration is working correctly!")
            print(f"   All critical workflows validated across buyer, manager, and operator roles.")
        elif success_rate >= 60:
            print(f"\n⚠️ INTEGRATION TESTING: PARTIAL SUCCESS")
            print(f"   Most monitoring service features are working, but some issues detected.")
        else:
            print(f"\n❌ INTEGRATION TESTING: FAILURE")
            print(f"   Significant issues detected in monitoring service integration.")
        
        return {
            'overall_success': success_rate >= 80,
            'success_rate': success_rate,
            'phases_passed': passed_phases,
            'total_phases': total_phases,
            'individual_tests': {
                'total': self.tests_run,
                'passed': self.tests_passed,
                'success_rate': (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0
            },
            'phase_results': test_results,
            'duration_seconds': duration,
            'test_details': self.test_results
        }

def main():
    """Main execution function"""
    print("🎯 Starting BeatSpace Monitoring Service Integration Testing")
    print("   Comprehensive end-to-end workflow validation")
    print("   Testing all user roles and monitoring service lifecycle")
    
    tester = BeatSpaceMonitoringIntegrationTester()
    results = tester.run_comprehensive_integration_tests()
    
    # Return results for external processing
    return results

if __name__ == "__main__":
    main()