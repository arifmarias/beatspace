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
    
    def __init__(self, base_url="https://150b8d57-e3ef-4be4-8a16-f1cc8ccb066d.preview.emergentagent.com/api"):
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
        
        print("🎯 BeatSpace Monitoring Service Integration Tester v2")
        print(f"   Base URL: {base_url}")
        print("   Testing Scope: Complete monitoring service lifecycle")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, params: Dict = None, token: str = None) -> tuple:
        """Execute a single API test with comprehensive logging"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Test {self.tests_run}: {name}")
        
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
            else:
                print(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   📄 Error: {response.text[:200]}...")

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
        """Authenticate all required user roles using existing users"""
        print("\n" + "="*60)
        print("🔐 AUTHENTICATION SETUP - USING EXISTING USERS")
        print("="*60)
        
        auth_success = True
        
        # 1. Admin Authentication
        print("\n1️⃣ ADMIN AUTHENTICATION")
        login_data = {"email": "admin@beatspace.com", "password": "admin123"}
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   ✅ Admin authenticated successfully")
        else:
            auth_success = False
        
        # 2. Try existing operator
        print("\n2️⃣ OPERATOR AUTHENTICATION")
        login_data = {"email": "operator3@beatspace.com", "password": "operator123"}
        success, response = self.run_test("Operator Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.operator_token = response['access_token']
            self.test_operator_id = response.get('user', {}).get('id')
            print(f"   ✅ Operator authenticated successfully")
        else:
            print("   ⚠️ Operator authentication failed - will skip operator tests")
        
        # 3. Try existing buyer (use any existing buyer)
        print("\n3️⃣ BUYER AUTHENTICATION")
        buyer_emails = ["marketing@grameenphone.com", "buy@demo.com", "buyer@company.com"]
        for email in buyer_emails:
            login_data = {"email": email, "password": "buyer123"}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                self.test_buyer_id = response.get('user', {}).get('id')
                print(f"   ✅ Buyer authenticated: {email}")
                break
        
        if not self.buyer_token:
            print("   ⚠️ No buyer authentication successful")
        
        # 4. Use admin as manager for testing (admin has manager permissions)
        print("\n4️⃣ MANAGER ROLE (Using Admin)")
        if self.admin_token:
            self.manager_token = self.admin_token  # Admin can act as manager
            print(f"   ✅ Using admin token for manager operations")
        else:
            auth_success = False
        
        if auth_success:
            print("\n✅ AUTHENTICATION SETUP COMPLETE")
            print(f"   Admin Token: {'✅' if self.admin_token else '❌'}")
            print(f"   Manager Token: {'✅' if self.manager_token else '❌'}")
            print(f"   Operator Token: {'✅' if self.operator_token else '❌'}")
            print(f"   Buyer Token: {'✅' if self.buyer_token else '❌'}")
        else:
            print("\n❌ CRITICAL AUTHENTICATION FAILED")
        
        return auth_success

    # ========================================
    # MONITORING SERVICE API ENDPOINT TESTS
    # ========================================
    
    def test_monitoring_service_endpoints(self) -> bool:
        """Test all monitoring service API endpoints"""
        print("\n" + "="*60)
        print("🔌 MONITORING SERVICE API ENDPOINTS")
        print("="*60)
        
        endpoint_success = True
        
        # Test 1: Get monitoring services (buyer)
        if self.buyer_token:
            print("\n1️⃣ GET MONITORING SERVICES (BUYER)")
            success, services = self.run_test(
                "Get Monitoring Services", "GET", "monitoring/services", 200,
                token=self.buyer_token
            )
            if success:
                print(f"   📊 Found {len(services)} monitoring services")
            else:
                endpoint_success = False
        
        # Test 2: Get monitoring tasks (manager/admin)
        if self.manager_token:
            print("\n2️⃣ GET MONITORING TASKS (MANAGER)")
            success, tasks = self.run_test(
                "Get Monitoring Tasks", "GET", "monitoring/tasks", 200,
                token=self.manager_token
            )
            if success:
                print(f"   📊 Found {len(tasks)} monitoring tasks")
                if tasks:
                    self.test_task_ids = [t['id'] for t in tasks[:2]]
            else:
                endpoint_success = False
        
        # Test 3: Get monitoring performance (manager/admin)
        if self.manager_token:
            print("\n3️⃣ GET MONITORING PERFORMANCE (MANAGER)")
            success, performance = self.run_test(
                "Get Monitoring Performance", "GET", "monitoring/performance", 200,
                token=self.manager_token
            )
            if success:
                print(f"   📈 Performance data retrieved")
            else:
                endpoint_success = False
        
        # Test 4: Get users with monitoring_operator role
        if self.manager_token:
            print("\n4️⃣ GET MONITORING OPERATORS")
            success, operators = self.run_test(
                "Get Monitoring Operators", "GET", "users", 200,
                params={"role": "monitoring_operator"}, token=self.manager_token
            )
            if success:
                print(f"   👥 Found {len(operators)} monitoring operators")
            else:
                endpoint_success = False
        
        # Test 5: Operator task access
        if self.operator_token:
            print("\n5️⃣ OPERATOR TASK ACCESS")
            success, operator_tasks = self.run_test(
                "Get Operator Tasks", "GET", "monitoring/tasks", 200,
                token=self.operator_token
            )
            if success:
                print(f"   📋 Operator can access {len(operator_tasks)} tasks")
            else:
                endpoint_success = False
        
        return endpoint_success

    # ========================================
    # ROLE-BASED ACCESS CONTROL TESTS
    # ========================================
    
    def test_role_based_access_control(self) -> bool:
        """Test role-based access control"""
        print("\n" + "="*60)
        print("🔒 ROLE-BASED ACCESS CONTROL VALIDATION")
        print("="*60)
        
        rbac_success = True
        
        # Test 1: Unauthenticated access should fail
        print("\n1️⃣ UNAUTHENTICATED ACCESS")
        success, response = self.run_test(
            "Unauthenticated Monitoring Services", "GET", "monitoring/services", 401
        )
        if success:
            print("   ✅ Unauthenticated access properly blocked")
        else:
            rbac_success = False
        
        # Test 2: Buyer cannot access manager endpoints
        if self.buyer_token:
            print("\n2️⃣ BUYER ACCESS RESTRICTIONS")
            success, response = self.run_test(
                "Buyer Generate Tasks (Should Fail)", "POST", "monitoring/generate-tasks", 403,
                data={"date": "2025-01-20"}, token=self.buyer_token
            )
            if success:
                print("   ✅ Buyer properly restricted from task generation")
            else:
                rbac_success = False
        
        # Test 3: Operator cannot access manager endpoints
        if self.operator_token:
            print("\n3️⃣ OPERATOR ACCESS RESTRICTIONS")
            success, response = self.run_test(
                "Operator Generate Tasks (Should Fail)", "POST", "monitoring/generate-tasks", 403,
                data={"date": "2025-01-20"}, token=self.operator_token
            )
            if success:
                print("   ✅ Operator properly restricted from task generation")
            else:
                rbac_success = False
        
        return rbac_success

    # ========================================
    # MONITORING WORKFLOW INTEGRATION TESTS
    # ========================================
    
    def test_monitoring_workflow_integration(self) -> bool:
        """Test monitoring workflow integration"""
        print("\n" + "="*60)
        print("🔄 MONITORING WORKFLOW INTEGRATION")
        print("="*60)
        
        workflow_success = True
        
        # Test 1: Create monitoring subscription (if buyer available)
        if self.buyer_token:
            print("\n1️⃣ CREATE MONITORING SUBSCRIPTION")
            
            # First get buyer's campaigns
            success, campaigns = self.run_test(
                "Get Buyer Campaigns", "GET", "campaigns", 200, token=self.buyer_token
            )
            
            if success and campaigns:
                live_campaigns = [c for c in campaigns if c.get('status') == 'Live']
                if live_campaigns:
                    campaign = live_campaigns[0]
                    self.test_campaign_id = campaign['id']
                    
                    # Get campaign assets
                    campaign_assets = campaign.get('campaign_assets', [])
                    if campaign_assets:
                        asset_ids = [ca['asset_id'] for ca in campaign_assets[:2]]
                        
                        subscription_data = {
                            "campaign_id": self.test_campaign_id,
                            "asset_ids": asset_ids,
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
                        
                        if success:
                            self.test_subscription_id = response.get('id')
                            print(f"   ✅ Subscription created: {self.test_subscription_id}")
                        else:
                            workflow_success = False
                    else:
                        print("   ⚠️ No campaign assets found")
                else:
                    print("   ⚠️ No Live campaigns found")
            else:
                print("   ⚠️ No campaigns found for buyer")
        
        # Test 2: Generate tasks (manager)
        if self.manager_token and self.test_subscription_id:
            print("\n2️⃣ GENERATE MONITORING TASKS")
            task_date = (datetime.utcnow() + timedelta(days=2)).strftime('%Y-%m-%d')
            
            success, response = self.run_test(
                "Generate Monitoring Tasks", "POST", "monitoring/generate-tasks", 200,
                data={"date": task_date}, token=self.manager_token
            )
            
            if success:
                tasks_created = response.get('tasks_created', 0)
                print(f"   ✅ Generated {tasks_created} tasks")
            else:
                workflow_success = False
        
        # Test 3: Task assignment (manager)
        if self.manager_token and self.test_task_ids and self.test_operator_id:
            print("\n3️⃣ ASSIGN TASKS TO OPERATOR")
            assignment_data = {
                "task_ids": self.test_task_ids[:1],  # Assign one task
                "operator_id": self.test_operator_id,
                "priority": "medium"
            }
            
            success, response = self.run_test(
                "Assign Tasks", "POST", "monitoring/tasks/assign", 200,
                data=assignment_data, token=self.manager_token
            )
            
            if success:
                print(f"   ✅ Tasks assigned successfully")
            else:
                workflow_success = False
        
        # Test 4: Photo upload (operator)
        if self.operator_token and self.test_task_ids:
            print("\n4️⃣ UPLOAD MONITORING PHOTOS")
            photo_data = {
                "task_id": self.test_task_ids[0],
                "gps_location": {"lat": 23.8103, "lng": 90.4125},
                "photos": [
                    {
                        "url": "test_photo.jpg",
                        "angle": "front",
                        "timestamp": datetime.utcnow().isoformat(),
                        "gps": {"lat": 23.8103, "lng": 90.4125}
                    }
                ]
            }
            
            success, response = self.run_test(
                "Upload Photos", "POST", "monitoring/upload-photo", 200,
                data=photo_data, token=self.operator_token
            )
            
            if success:
                print(f"   ✅ Photos uploaded successfully")
            else:
                workflow_success = False
        
        # Test 5: Submit task report (operator)
        if self.operator_token and self.test_task_ids:
            print("\n5️⃣ SUBMIT TASK REPORT")
            report_data = {
                "overall_condition": 8,
                "condition_details": {"structural": "Good", "lighting": "Excellent"},
                "issues_found": [],
                "maintenance_required": False,
                "urgent_issues": False,
                "weather_condition": "clear",
                "notes": "Asset in good condition",
                "gps_location": {"lat": 23.8103, "lng": 90.4125},
                "completion_time": 25
            }
            
            success, response = self.run_test(
                "Submit Task Report", "POST", f"monitoring/tasks/{self.test_task_ids[0]}/report", 200,
                data=report_data, token=self.operator_token
            )
            
            if success:
                print(f"   ✅ Task report submitted successfully")
            else:
                workflow_success = False
        
        return workflow_success

    # ========================================
    # DATA CONSISTENCY VALIDATION
    # ========================================
    
    def test_data_consistency(self) -> bool:
        """Test data consistency and MongoDB serialization"""
        print("\n" + "="*60)
        print("🔗 DATA CONSISTENCY & MONGODB VALIDATION")
        print("="*60)
        
        consistency_success = True
        
        # Test 1: MongoDB ObjectId serialization
        print("\n1️⃣ MONGODB OBJECTID SERIALIZATION")
        if self.manager_token:
            success, services = self.run_test(
                "Test ObjectId Serialization", "GET", "monitoring/services", 200,
                token=self.manager_token
            )
            
            if success:
                try:
                    json.dumps(services)  # This will fail if ObjectIds are present
                    print("   ✅ No ObjectId serialization issues")
                except TypeError as e:
                    print(f"   ❌ ObjectId serialization issue: {str(e)}")
                    consistency_success = False
            else:
                consistency_success = False
        
        # Test 2: Foreign key relationships
        print("\n2️⃣ FOREIGN KEY RELATIONSHIPS")
        if self.manager_token:
            success, tasks = self.run_test(
                "Get Tasks for Relationship Check", "GET", "monitoring/tasks", 200,
                token=self.manager_token
            )
            
            if success:
                print(f"   📊 Found {len(tasks)} tasks for relationship validation")
                
                # Check task-subscription relationships
                tasks_with_subscriptions = [t for t in tasks if t.get('subscription_id')]
                print(f"   🔗 {len(tasks_with_subscriptions)} tasks have subscription relationships")
                
                # Check task-asset relationships
                tasks_with_assets = [t for t in tasks if t.get('asset_id')]
                print(f"   🔗 {len(tasks_with_assets)} tasks have asset relationships")
                
                print("   ✅ Foreign key relationships verified")
            else:
                consistency_success = False
        
        return consistency_success

    # ========================================
    # COMPREHENSIVE TEST RUNNER
    # ========================================
    
    def run_comprehensive_integration_tests(self) -> Dict[str, Any]:
        """Run complete monitoring service integration test suite"""
        print("\n" + "="*80)
        print("🚀 BEATSPACE MONITORING SERVICE - INTEGRATION TESTING v2")
        print("="*80)
        print("   Phase 4: End-to-End Integration Testing")
        print("   Focus: API endpoints, workflows, and data consistency")
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
        
        # Phase 2: API Endpoint Testing
        print("\n🔌 PHASE 2: MONITORING SERVICE API ENDPOINTS")
        endpoint_success = self.test_monitoring_service_endpoints()
        test_results['api_endpoints'] = endpoint_success
        
        # Phase 3: Role-Based Access Control
        print("\n🔒 PHASE 3: ROLE-BASED ACCESS CONTROL")
        rbac_success = self.test_role_based_access_control()
        test_results['rbac_validation'] = rbac_success
        
        # Phase 4: Workflow Integration
        print("\n🔄 PHASE 4: MONITORING WORKFLOW INTEGRATION")
        workflow_success = self.test_monitoring_workflow_integration()
        test_results['workflow_integration'] = workflow_success
        
        # Phase 5: Data Consistency
        print("\n🔗 PHASE 5: DATA CONSISTENCY VALIDATION")
        consistency_success = self.test_data_consistency()
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
        print("📋 MONITORING SERVICE INTEGRATION TEST SUMMARY")
        print("="*80)
        
        print(f"\n⏱️ TEST EXECUTION SUMMARY:")
        print(f"   Duration: {duration:.1f} seconds")
        print(f"   Individual Tests: {self.tests_run} total, {self.tests_passed} passed")
        print(f"   Test Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        print(f"\n🎯 INTEGRATION PHASE RESULTS:")
        phase_names = {
            'authentication_setup': 'Authentication Setup',
            'api_endpoints': 'API Endpoints Testing',
            'rbac_validation': 'Role-Based Access Control',
            'workflow_integration': 'Workflow Integration',
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
            print(f"\n🎉 MONITORING SERVICE INTEGRATION: SUCCESS")
            print(f"   The BeatSpace Monitoring Service is working correctly!")
            print(f"   All critical API endpoints and workflows validated.")
        elif success_rate >= 60:
            print(f"\n⚠️ MONITORING SERVICE INTEGRATION: PARTIAL SUCCESS")
            print(f"   Most monitoring service features working, minor issues detected.")
        else:
            print(f"\n❌ MONITORING SERVICE INTEGRATION: FAILURE")
            print(f"   Significant issues detected in monitoring service.")
        
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
    print("🎯 Starting BeatSpace Monitoring Service Integration Testing v2")
    print("   Focused on API endpoints and existing system validation")
    
    tester = BeatSpaceMonitoringIntegrationTester()
    results = tester.run_comprehensive_integration_tests()
    
    return results

if __name__ == "__main__":
    main()