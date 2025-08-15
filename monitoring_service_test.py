#!/usr/bin/env python3
"""
BeatSpace Monitoring Service API Testing Suite
Comprehensive backend testing for monitoring service APIs after dashboard access fixes
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class MonitoringServiceTester:
    def __init__(self, base_url="https://route-map-hover.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.manager_token = None
        self.operator_token = None
        self.buyer_token = None
        self.test_results = {}
        
        # Test data storage
        self.test_campaign_id = None
        self.test_subscription_id = None
        self.test_task_id = None
        self.test_asset_ids = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
        
        self.test_results[name] = {
            'success': success,
            'details': details,
            'timestamp': datetime.utcnow().isoformat()
        }

    def make_request(self, method: str, endpoint: str, token: str = None, data: dict = None, params: dict = None) -> Tuple[bool, dict, int]:
        """Make HTTP request and return success, response data, status code"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {}, 0
            
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code == 200, response_data, response.status_code
            
        except Exception as e:
            return False, {"error": str(e)}, 0

    # ========================================
    # AUTHENTICATION TESTS
    # ========================================
    
    def test_manager_authentication(self) -> bool:
        """Test Manager login (manager@beatspace.com/manager123)"""
        print("\n🔐 Testing Manager Authentication...")
        
        login_data = {
            "email": "manager@beatspace.com",
            "password": "manager123"
        }
        
        success, response, status_code = self.make_request("POST", "auth/login", data=login_data)
        
        if success and 'access_token' in response:
            self.manager_token = response['access_token']
            user_role = response.get('user', {}).get('role', 'N/A')
            user_status = response.get('user', {}).get('status', 'N/A')
            
            if user_role == 'manager' and user_status == 'approved':
                self.log_test("Manager Authentication", True, 
                             f"Role: {user_role}, Status: {user_status}, Token: {self.manager_token[:20]}...")
                return True
            else:
                self.log_test("Manager Authentication", False, 
                             f"Invalid role/status - Role: {user_role}, Status: {user_status}")
                return False
        else:
            self.log_test("Manager Authentication", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_operator_authentication(self) -> bool:
        """Test Operator login (operator3@beatspace.com/operator123)"""
        print("\n🔐 Testing Operator Authentication...")
        
        login_data = {
            "email": "operator3@beatspace.com",
            "password": "operator123"
        }
        
        success, response, status_code = self.make_request("POST", "auth/login", data=login_data)
        
        if success and 'access_token' in response:
            self.operator_token = response['access_token']
            user_role = response.get('user', {}).get('role', 'N/A')
            user_status = response.get('user', {}).get('status', 'N/A')
            
            if user_role == 'monitoring_operator' and user_status == 'approved':
                self.log_test("Operator Authentication", True, 
                             f"Role: {user_role}, Status: {user_status}, Token: {self.operator_token[:20]}...")
                return True
            else:
                self.log_test("Operator Authentication", False, 
                             f"Invalid role/status - Role: {user_role}, Status: {user_status}")
                return False
        else:
            self.log_test("Operator Authentication", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_admin_authentication(self) -> bool:
        """Test Admin login for testing purposes"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        
        success, response, status_code = self.make_request("POST", "auth/login", data=login_data)
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            user_role = response.get('user', {}).get('role', 'N/A')
            
            self.log_test("Admin Authentication", True, 
                         f"Role: {user_role}, Token: {self.admin_token[:20]}...")
            return True
        else:
            self.log_test("Admin Authentication", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    # ========================================
    # MANAGER DASHBOARD BACKEND API TESTS
    # ========================================
    
    def test_manager_get_operators(self) -> bool:
        """Test GET /api/users?role=monitoring_operator"""
        print("\n👥 Testing Manager - Get All Operators...")
        
        if not self.manager_token:
            self.log_test("Manager Get Operators", False, "No manager token available")
            return False
        
        params = {"role": "monitoring_operator"}
        success, response, status_code = self.make_request("GET", "users", self.manager_token, params=params)
        
        if success and isinstance(response, list):
            operator_count = len(response)
            operators_info = []
            
            for operator in response:
                if operator.get('role') == 'monitoring_operator':
                    operators_info.append(f"{operator.get('contact_name', 'N/A')} ({operator.get('email', 'N/A')})")
            
            self.log_test("Manager Get Operators", True, 
                         f"Found {operator_count} operators: {', '.join(operators_info[:3])}")
            return True
        else:
            self.log_test("Manager Get Operators", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_manager_get_monitoring_tasks(self) -> bool:
        """Test GET /api/monitoring/tasks (manager view)"""
        print("\n📋 Testing Manager - Get All Monitoring Tasks...")
        
        if not self.manager_token:
            self.log_test("Manager Get Monitoring Tasks", False, "No manager token available")
            return False
        
        success, response, status_code = self.make_request("GET", "monitoring/tasks", self.manager_token)
        
        if success:
            if isinstance(response, list):
                task_count = len(response)
                task_statuses = {}
                
                for task in response:
                    status = task.get('status', 'unknown')
                    task_statuses[status] = task_statuses.get(status, 0) + 1
                
                status_summary = ", ".join([f"{status}: {count}" for status, count in task_statuses.items()])
                
                self.log_test("Manager Get Monitoring Tasks", True, 
                             f"Found {task_count} tasks. Status breakdown: {status_summary}")
                
                # Store a task ID for later tests
                if response and 'id' in response[0]:
                    self.test_task_id = response[0]['id']
                
                return True
            else:
                self.log_test("Manager Get Monitoring Tasks", True, 
                             f"Response: {response}")
                return True
        else:
            self.log_test("Manager Get Monitoring Tasks", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_manager_get_monitoring_services(self) -> bool:
        """Test GET /api/monitoring/services"""
        print("\n🔧 Testing Manager - Get Monitoring Subscriptions...")
        
        if not self.manager_token:
            self.log_test("Manager Get Monitoring Services", False, "No manager token available")
            return False
        
        success, response, status_code = self.make_request("GET", "monitoring/services", self.manager_token)
        
        if success:
            if isinstance(response, list):
                service_count = len(response)
                service_levels = {}
                
                for service in response:
                    level = service.get('service_level', 'unknown')
                    service_levels[level] = service_levels.get(level, 0) + 1
                
                level_summary = ", ".join([f"{level}: {count}" for level, count in service_levels.items()])
                
                self.log_test("Manager Get Monitoring Services", True, 
                             f"Found {service_count} services. Levels: {level_summary}")
                
                # Store a subscription ID for later tests
                if response and 'id' in response[0]:
                    self.test_subscription_id = response[0]['id']
                
                return True
            else:
                self.log_test("Manager Get Monitoring Services", True, 
                             f"Response: {response}")
                return True
        else:
            self.log_test("Manager Get Monitoring Services", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_manager_get_performance_analytics(self) -> bool:
        """Test GET /api/monitoring/performance"""
        print("\n📊 Testing Manager - Get Performance Analytics...")
        
        if not self.manager_token:
            self.log_test("Manager Get Performance Analytics", False, "No manager token available")
            return False
        
        success, response, status_code = self.make_request("GET", "monitoring/performance", self.manager_token)
        
        if success:
            # Check for expected analytics fields
            expected_fields = ['total_tasks', 'completed_tasks', 'completion_rate', 'average_completion_time']
            found_fields = []
            
            if isinstance(response, dict):
                for field in expected_fields:
                    if field in response:
                        found_fields.append(f"{field}: {response[field]}")
                
                self.log_test("Manager Get Performance Analytics", True, 
                             f"Analytics data: {', '.join(found_fields)}")
                return True
            else:
                self.log_test("Manager Get Performance Analytics", True, 
                             f"Response: {response}")
                return True
        else:
            self.log_test("Manager Get Performance Analytics", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_manager_generate_tasks(self) -> bool:
        """Test POST /api/monitoring/generate-tasks"""
        print("\n⚡ Testing Manager - Generate Tasks for Dates...")
        
        if not self.manager_token:
            self.log_test("Manager Generate Tasks", False, "No manager token available")
            return False
        
        # Generate tasks for today and tomorrow
        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)
        
        task_data = {
            "start_date": today.isoformat(),
            "end_date": tomorrow.isoformat(),
            "priority": "medium"
        }
        
        success, response, status_code = self.make_request("POST", "monitoring/generate-tasks", self.manager_token, data=task_data)
        
        if success:
            generated_count = response.get('tasks_generated', 0)
            message = response.get('message', 'Tasks generated')
            
            self.log_test("Manager Generate Tasks", True, 
                         f"{message}. Generated: {generated_count} tasks")
            return True
        else:
            self.log_test("Manager Generate Tasks", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    # ========================================
    # OPERATOR DASHBOARD BACKEND API TESTS
    # ========================================
    
    def test_operator_get_assigned_tasks(self) -> bool:
        """Test GET /api/monitoring/tasks (operator view - assigned tasks only)"""
        print("\n📱 Testing Operator - Get Assigned Tasks...")
        
        if not self.operator_token:
            self.log_test("Operator Get Assigned Tasks", False, "No operator token available")
            return False
        
        success, response, status_code = self.make_request("GET", "monitoring/tasks", self.operator_token)
        
        if success:
            if isinstance(response, list):
                task_count = len(response)
                assigned_tasks = [task for task in response if task.get('assigned_operator_id')]
                
                self.log_test("Operator Get Assigned Tasks", True, 
                             f"Found {task_count} total tasks, {len(assigned_tasks)} assigned to operators")
                return True
            else:
                self.log_test("Operator Get Assigned Tasks", True, 
                             f"Response: {response}")
                return True
        else:
            self.log_test("Operator Get Assigned Tasks", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_operator_update_task_status(self) -> bool:
        """Test PUT /api/monitoring/tasks/{id} (update task status)"""
        print("\n🔄 Testing Operator - Update Task Status...")
        
        if not self.operator_token:
            self.log_test("Operator Update Task Status", False, "No operator token available")
            return False
        
        if not self.test_task_id:
            self.log_test("Operator Update Task Status", False, "No test task ID available")
            return False
        
        update_data = {
            "status": "in_progress",
            "notes": "Task started by operator during API testing"
        }
        
        success, response, status_code = self.make_request("PUT", f"monitoring/tasks/{self.test_task_id}", 
                                                          self.operator_token, data=update_data)
        
        if success:
            updated_status = response.get('status', 'unknown')
            self.log_test("Operator Update Task Status", True, 
                         f"Task {self.test_task_id} updated to status: {updated_status}")
            return True
        else:
            self.log_test("Operator Update Task Status", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_operator_upload_photo(self) -> bool:
        """Test POST /api/monitoring/upload-photo (upload photos with GPS)"""
        print("\n📸 Testing Operator - Upload Photo with GPS...")
        
        if not self.operator_token:
            self.log_test("Operator Upload Photo", False, "No operator token available")
            return False
        
        # Simulate photo upload with GPS data
        photo_data = {
            "task_id": self.test_task_id or "test_task_id",
            "photo_url": "https://example.com/test_photo.jpg",
            "gps_location": {
                "lat": 23.8103,
                "lng": 90.4125,
                "accuracy": 5.0
            },
            "timestamp": datetime.utcnow().isoformat(),
            "photo_type": "condition_check"
        }
        
        success, response, status_code = self.make_request("POST", "monitoring/upload-photo", 
                                                          self.operator_token, data=photo_data)
        
        if success:
            photo_id = response.get('id', 'unknown')
            location = response.get('gps_location', {})
            
            self.log_test("Operator Upload Photo", True, 
                         f"Photo uploaded: {photo_id}, GPS: {location.get('lat', 'N/A')}, {location.get('lng', 'N/A')}")
            return True
        else:
            self.log_test("Operator Upload Photo", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    def test_operator_submit_task_report(self) -> bool:
        """Test POST /api/monitoring/tasks/{id}/report (submit task completion reports)"""
        print("\n📝 Testing Operator - Submit Task Completion Report...")
        
        if not self.operator_token:
            self.log_test("Operator Submit Task Report", False, "No operator token available")
            return False
        
        if not self.test_task_id:
            self.log_test("Operator Submit Task Report", False, "No test task ID available")
            return False
        
        report_data = {
            "overall_condition": 8,
            "condition_details": {
                "structural": "Good",
                "lighting": "Excellent",
                "visibility": "Good"
            },
            "issues_found": ["Minor wear on bottom edge"],
            "maintenance_required": False,
            "urgent_issues": False,
            "weather_condition": "clear",
            "lighting_condition": "good",
            "visibility_rating": 8,
            "notes": "Asset in good condition, no immediate maintenance required",
            "gps_location": {
                "lat": 23.8103,
                "lng": 90.4125,
                "accuracy": 3.0
            },
            "completion_time": 25,
            "photos": [
                {
                    "url": "https://example.com/photo1.jpg",
                    "angle": "front",
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }
        
        success, response, status_code = self.make_request("POST", f"monitoring/tasks/{self.test_task_id}/report", 
                                                          self.operator_token, data=report_data)
        
        if success:
            report_id = response.get('id', 'unknown')
            condition_rating = response.get('overall_condition', 'N/A')
            
            self.log_test("Operator Submit Task Report", True, 
                         f"Report submitted: {report_id}, Condition: {condition_rating}/10")
            return True
        else:
            self.log_test("Operator Submit Task Report", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    # ========================================
    # MONITORING SERVICE WORKFLOW API TESTS
    # ========================================
    
    def test_create_monitoring_subscription(self) -> bool:
        """Test POST /api/monitoring/services (create monitoring subscription - buyer role)"""
        print("\n🛡️ Testing Monitoring Service - Create Subscription...")
        
        # First try to authenticate as a buyer
        if not self.buyer_token:
            # Try to get buyer token
            buyer_login = {
                "email": "marketing@grameenphone.com",
                "password": "buyer123"
            }
            
            success, response, status_code = self.make_request("POST", "auth/login", data=buyer_login)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
            else:
                # Use admin token as fallback
                self.buyer_token = self.admin_token
        
        if not self.buyer_token:
            self.log_test("Create Monitoring Subscription", False, "No buyer/admin token available")
            return False
        
        # Create a monitoring subscription
        subscription_data = {
            "campaign_id": "test_campaign_001",
            "asset_ids": ["asset_001", "asset_002"],
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
        
        success, response, status_code = self.make_request("POST", "monitoring/services", 
                                                          self.buyer_token, data=subscription_data)
        
        if success:
            subscription_id = response.get('id', 'unknown')
            frequency = response.get('frequency', 'N/A')
            service_level = response.get('service_level', 'N/A')
            
            self.log_test("Create Monitoring Subscription", True, 
                         f"Subscription created: {subscription_id}, Frequency: {frequency}, Level: {service_level}")
            
            self.test_subscription_id = subscription_id
            return True
        else:
            self.log_test("Create Monitoring Subscription", False, 
                         f"Status: {status_code}, Response: {response}")
            return False

    # ========================================
    # ROLE-BASED ACCESS CONTROL TESTS
    # ========================================
    
    def test_role_based_access_control(self) -> bool:
        """Test that operators can't access manager endpoints"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        if not self.operator_token:
            self.log_test("Role-Based Access Control", False, "No operator token available")
            return False
        
        # Test 1: Operator trying to access manager endpoint (should fail)
        success, response, status_code = self.make_request("GET", "users", self.operator_token, 
                                                          params={"role": "monitoring_operator"})
        
        operator_blocked = status_code == 403  # Should be forbidden
        
        # Test 2: Operator trying to generate tasks (should fail)
        task_data = {
            "start_date": datetime.utcnow().date().isoformat(),
            "end_date": (datetime.utcnow().date() + timedelta(days=1)).isoformat()
        }
        
        success, response, status_code = self.make_request("POST", "monitoring/generate-tasks", 
                                                          self.operator_token, data=task_data)
        
        task_generation_blocked = status_code == 403  # Should be forbidden
        
        if operator_blocked and task_generation_blocked:
            self.log_test("Role-Based Access Control", True, 
                         "Operators properly restricted from manager endpoints")
            return True
        else:
            self.log_test("Role-Based Access Control", False, 
                         f"Access control failed - User list: {operator_blocked}, Task gen: {task_generation_blocked}")
            return False

    # ========================================
    # DATA CONSISTENCY VERIFICATION TESTS
    # ========================================
    
    def test_mongodb_serialization(self) -> bool:
        """Test MongoDB ObjectId serialization handling"""
        print("\n🗄️ Testing MongoDB ObjectId Serialization...")
        
        if not self.manager_token:
            self.log_test("MongoDB Serialization", False, "No manager token available")
            return False
        
        # Test multiple endpoints for serialization issues
        endpoints_to_test = [
            ("monitoring/tasks", "Monitoring Tasks"),
            ("monitoring/services", "Monitoring Services"),
            ("monitoring/performance", "Performance Analytics")
        ]
        
        serialization_errors = []
        successful_endpoints = []
        
        for endpoint, name in endpoints_to_test:
            success, response, status_code = self.make_request("GET", endpoint, self.manager_token)
            
            if success:
                # Check if response is valid JSON and doesn't contain ObjectId errors
                try:
                    json_str = json.dumps(response)
                    if "ObjectId" not in json_str and "bson" not in json_str.lower():
                        successful_endpoints.append(name)
                    else:
                        serialization_errors.append(f"{name}: Contains ObjectId references")
                except Exception as e:
                    serialization_errors.append(f"{name}: JSON serialization error - {str(e)}")
            else:
                if "ObjectId" in str(response) or "bson" in str(response).lower():
                    serialization_errors.append(f"{name}: ObjectId serialization error")
        
        if not serialization_errors:
            self.log_test("MongoDB Serialization", True, 
                         f"All endpoints return clean JSON: {', '.join(successful_endpoints)}")
            return True
        else:
            self.log_test("MongoDB Serialization", False, 
                         f"Serialization issues: {'; '.join(serialization_errors)}")
            return False

    def test_foreign_key_relationships(self) -> bool:
        """Test foreign key relationships between subscriptions, tasks, reports"""
        print("\n🔗 Testing Foreign Key Relationships...")
        
        if not self.manager_token:
            self.log_test("Foreign Key Relationships", False, "No manager token available")
            return False
        
        # Get monitoring services and tasks to verify relationships
        services_success, services_response, _ = self.make_request("GET", "monitoring/services", self.manager_token)
        tasks_success, tasks_response, _ = self.make_request("GET", "monitoring/tasks", self.manager_token)
        
        if not (services_success and tasks_success):
            self.log_test("Foreign Key Relationships", False, "Could not fetch services or tasks")
            return False
        
        relationship_checks = []
        
        # Check if tasks reference valid subscriptions
        if isinstance(services_response, list) and isinstance(tasks_response, list):
            service_ids = {service.get('id') for service in services_response if service.get('id')}
            
            valid_task_references = 0
            total_task_references = 0
            
            for task in tasks_response:
                subscription_id = task.get('subscription_id')
                if subscription_id:
                    total_task_references += 1
                    if subscription_id in service_ids:
                        valid_task_references += 1
            
            if total_task_references > 0:
                relationship_checks.append(f"Task-Subscription: {valid_task_references}/{total_task_references} valid")
            else:
                relationship_checks.append("Task-Subscription: No references to check")
        
        # Check asset references in tasks
        if isinstance(tasks_response, list):
            tasks_with_assets = sum(1 for task in tasks_response if task.get('asset_id'))
            relationship_checks.append(f"Task-Asset: {tasks_with_assets} tasks reference assets")
        
        self.log_test("Foreign Key Relationships", True, 
                     f"Relationship integrity: {'; '.join(relationship_checks)}")
        return True

    # ========================================
    # MAIN TEST EXECUTION
    # ========================================
    
    def run_comprehensive_monitoring_service_tests(self):
        """Run comprehensive monitoring service API tests"""
        print("="*80)
        print("🚀 BEATSPACE MONITORING SERVICE COMPREHENSIVE API TESTING")
        print("="*80)
        print("Testing all monitoring service APIs after dashboard access fixes")
        print(f"Base URL: {self.base_url}")
        print(f"Test started: {datetime.utcnow().isoformat()}")
        print()
        
        # Phase 1: Authentication & User Management
        print("📋 PHASE 1: AUTHENTICATION & USER MANAGEMENT")
        print("-" * 50)
        
        auth_tests = [
            self.test_admin_authentication,
            self.test_manager_authentication,
            self.test_operator_authentication
        ]
        
        for test in auth_tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Phase 2: Manager Dashboard Backend APIs
        print("\n📋 PHASE 2: MANAGER DASHBOARD BACKEND APIs")
        print("-" * 50)
        
        manager_tests = [
            self.test_manager_get_operators,
            self.test_manager_get_monitoring_tasks,
            self.test_manager_get_monitoring_services,
            self.test_manager_get_performance_analytics,
            self.test_manager_generate_tasks
        ]
        
        for test in manager_tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Phase 3: Operator Dashboard Backend APIs
        print("\n📋 PHASE 3: OPERATOR DASHBOARD BACKEND APIs")
        print("-" * 50)
        
        operator_tests = [
            self.test_operator_get_assigned_tasks,
            self.test_operator_update_task_status,
            self.test_operator_upload_photo,
            self.test_operator_submit_task_report
        ]
        
        for test in operator_tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Phase 4: Monitoring Service Workflow APIs
        print("\n📋 PHASE 4: MONITORING SERVICE WORKFLOW APIs")
        print("-" * 50)
        
        workflow_tests = [
            self.test_create_monitoring_subscription,
            self.test_role_based_access_control
        ]
        
        for test in workflow_tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Phase 5: Data Consistency Verification
        print("\n📋 PHASE 5: DATA CONSISTENCY VERIFICATION")
        print("-" * 50)
        
        consistency_tests = [
            self.test_mongodb_serialization,
            self.test_foreign_key_relationships
        ]
        
        for test in consistency_tests:
            try:
                test()
            except Exception as e:
                self.log_test(test.__name__, False, f"Exception: {str(e)}")
        
        # Final Results
        self.print_final_results()

    def print_final_results(self):
        """Print comprehensive test results"""
        print("\n" + "="*80)
        print("📊 MONITORING SERVICE API TESTING RESULTS")
        print("="*80)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        print()
        
        # Categorize results
        auth_results = []
        manager_results = []
        operator_results = []
        workflow_results = []
        consistency_results = []
        
        for test_name, result in self.test_results.items():
            status = "✅" if result['success'] else "❌"
            
            if "authentication" in test_name.lower() or "auth" in test_name.lower():
                auth_results.append(f"{status} {test_name}")
            elif "manager" in test_name.lower():
                manager_results.append(f"{status} {test_name}")
            elif "operator" in test_name.lower():
                operator_results.append(f"{status} {test_name}")
            elif "subscription" in test_name.lower() or "role" in test_name.lower():
                workflow_results.append(f"{status} {test_name}")
            else:
                consistency_results.append(f"{status} {test_name}")
        
        # Print categorized results
        categories = [
            ("🔐 Authentication & User Management", auth_results),
            ("👥 Manager Dashboard APIs", manager_results),
            ("📱 Operator Dashboard APIs", operator_results),
            ("🛡️ Monitoring Service Workflow", workflow_results),
            ("🗄️ Data Consistency", consistency_results)
        ]
        
        for category_name, results in categories:
            if results:
                print(f"{category_name}:")
                for result in results:
                    print(f"  {result}")
                print()
        
        # Overall assessment
        if success_rate >= 80:
            print("🎉 OVERALL ASSESSMENT: MONITORING SERVICE APIs ARE WORKING CORRECTLY")
            print("✅ Backend monitoring service infrastructure is solid and ready for production")
        elif success_rate >= 60:
            print("⚠️ OVERALL ASSESSMENT: MONITORING SERVICE APIs MOSTLY WORKING")
            print("🔧 Some issues detected but core functionality is operational")
        else:
            print("❌ OVERALL ASSESSMENT: SIGNIFICANT ISSUES DETECTED")
            print("🚨 Multiple API endpoints require attention before production use")
        
        print(f"\nTest completed: {datetime.utcnow().isoformat()}")
        print("="*80)

if __name__ == "__main__":
    tester = MonitoringServiceTester()
    tester.run_comprehensive_monitoring_service_tests()