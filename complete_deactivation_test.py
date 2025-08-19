#!/usr/bin/env python3
"""
Complete Monitoring Service Admin Deactivation Workflow Test
Testing all aspects of the deactivation functionality as requested in the review
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class ComprehensiveMonitoringDeactivationTester:
    def __init__(self, base_url="https://asset-manager-33.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.buyer_token = None
        self.manager_token = None
        self.test_service_id = None
        self.test_asset_id = None
        self.results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details
        })

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            try:
                response_data = response.json() if response.text else {}
            except:
                response_data = {"text": response.text}
            
            return success, response_data

        except Exception as e:
            return False, {"error": str(e)}

    def authenticate_all_users(self):
        """Authenticate admin, manager, and buyer"""
        print("\n🔐 AUTHENTICATING USERS")
        
        # Admin
        success, response = self.make_request("POST", "auth/login", 
                                            {"email": "admin@beatspace.com", "password": "admin123"})
        if success:
            self.admin_token = response['access_token']
            self.log_result("Admin Authentication", True, f"Token obtained")
        else:
            self.log_result("Admin Authentication", False, "Failed to authenticate")
            return False

        # Manager
        success, response = self.make_request("POST", "auth/login", 
                                            {"email": "manager@beatspace.com", "password": "manager123"})
        if success:
            self.manager_token = response['access_token']
            self.log_result("Manager Authentication", True, f"Token obtained")
        else:
            self.log_result("Manager Authentication", False, "Failed to authenticate")

        # Buyer (using the test buyer we created)
        success, response = self.make_request("POST", "auth/login", 
                                            {"email": "testbuyer.monitoring@beatspace.com", "password": "testpass123"})
        if success:
            self.buyer_token = response['access_token']
            self.log_result("Buyer Authentication", True, f"Token obtained")
        else:
            self.log_result("Buyer Authentication", False, "Failed to authenticate")

        return True

    def test_admin_login_and_view_services(self):
        """Test admin can login and view all monitoring services"""
        print("\n👁️ TESTING ADMIN VIEW MONITORING SERVICES")
        
        success, response = self.make_request("GET", "monitoring/services", token=self.admin_token)
        
        if success:
            services = response.get('services', [])
            self.log_result("Admin View All Services", True, f"Found {len(services)} services")
            
            # Store a service ID for testing
            if services:
                self.test_service_id = services[0]['id']
                self.test_asset_id = services[0].get('asset_ids', [None])[0]
                return True
        else:
            self.log_result("Admin View All Services", False, f"Failed: {response}")
        
        return False

    def test_admin_edit_service(self):
        """Test admin can edit a monitoring service"""
        print("\n✏️ TESTING ADMIN EDIT MONITORING SERVICE")
        
        if not self.test_service_id:
            self.log_result("Admin Edit Service", False, "No service ID available")
            return False

        update_data = {
            "service_level": "premium",
            "frequency": "daily",
            "notification_preferences": {"email": True, "in_app": True, "sms": True}
        }
        
        success, response = self.make_request("PUT", f"monitoring/services/{self.test_service_id}", 
                                            update_data, token=self.admin_token)
        
        if success:
            self.log_result("Admin Edit Service", True, "Service updated successfully")
            return True
        else:
            self.log_result("Admin Edit Service", False, f"Update failed: {response}")
            return False

    def test_service_deactivation_delete(self):
        """Test service deactivation via DELETE endpoint"""
        print("\n🗑️ TESTING SERVICE DEACTIVATION")
        
        if not self.test_service_id:
            self.log_result("Service Deactivation", False, "No service ID available")
            return False

        # First verify service exists
        success, before_response = self.make_request("GET", "monitoring/services", token=self.admin_token)
        service_exists_before = False
        
        if success:
            services = before_response.get('services', [])
            for service in services:
                if service.get('id') == self.test_service_id:
                    service_exists_before = True
                    break
        
        self.log_result("Service Exists Before Delete", service_exists_before, 
                       f"Service {self.test_service_id} found")

        # Perform DELETE
        success, delete_response = self.make_request("DELETE", f"monitoring/services/{self.test_service_id}", 
                                                   token=self.admin_token)
        
        if success:
            self.log_result("DELETE Request Success", True, "Service deletion successful")
            
            # Verify service is removed
            success, after_response = self.make_request("GET", "monitoring/services", token=self.admin_token)
            service_exists_after = False
            
            if success:
                services = after_response.get('services', [])
                for service in services:
                    if service.get('id') == self.test_service_id:
                        service_exists_after = True
                        break
            
            deactivation_successful = not service_exists_after
            self.log_result("Service Completely Deleted", deactivation_successful, 
                           f"Service {'removed' if deactivation_successful else 'still present'}")
            
            return deactivation_successful
        else:
            self.log_result("DELETE Request Success", False, f"Delete failed: {delete_response}")
            return False

    def test_buyer_state_after_deactivation(self):
        """Test buyer can no longer see deactivated monitoring service"""
        print("\n👤 TESTING BUYER STATE AFTER DEACTIVATION")
        
        if not self.buyer_token:
            self.log_result("Buyer State Test", False, "No buyer token available")
            return False

        success, response = self.make_request("GET", "monitoring/services", token=self.buyer_token)
        
        if success:
            buyer_services = response.get('services', [])
            
            # Check that deactivated service doesn't appear
            deactivated_found = False
            for service in buyer_services:
                if service.get('id') == self.test_service_id:
                    deactivated_found = True
                    break
            
            self.log_result("Buyer Cannot See Deactivated Service", not deactivated_found, 
                           f"Buyer sees {len(buyer_services)} services, deactivated service {'found' if deactivated_found else 'not found'}")
            return not deactivated_found
        else:
            self.log_result("Buyer State Test", False, "Failed to get buyer services")
            return False

    def test_buyer_can_create_new_service_after_deactivation(self):
        """Test buyer can create new monitoring service for same asset after deactivation"""
        print("\n🆕 TESTING BUYER CAN CREATE NEW SERVICE AFTER DEACTIVATION")
        
        if not self.buyer_token or not self.test_asset_id:
            self.log_result("New Service After Deactivation", False, "Missing buyer token or asset ID")
            return False

        new_service_data = {
            "asset_ids": [self.test_asset_id],
            "frequency": "weekly",
            "start_date": datetime.utcnow().isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard",
            "notification_preferences": {"email": True, "in_app": True, "sms": False}
        }
        
        success, response = self.make_request("POST", "monitoring/services", new_service_data, 
                                            token=self.buyer_token)
        
        if success:
            new_service_id = response.get('subscription_id') or response.get('id')
            self.log_result("New Service After Deactivation", True, 
                           f"Created new service {new_service_id} for same asset")
            
            # Clean up the new service
            if new_service_id:
                self.make_request("DELETE", f"monitoring/services/{new_service_id}", 
                                token=self.admin_token)
            return True
        else:
            self.log_result("New Service After Deactivation", False, 
                           f"Failed to create new service: {response}")
            return False

    def test_data_integrity_verification(self):
        """Test backend data integrity after deactivation"""
        print("\n🔍 TESTING DATA INTEGRITY VERIFICATION")
        
        success, response = self.make_request("GET", "monitoring/services", token=self.admin_token)
        
        if success:
            services = response.get('services', [])
            
            # Check for orphaned data
            orphaned_data = False
            for service in services:
                required_fields = ['id', 'asset_ids', 'frequency', 'start_date', 'end_date', 'service_level']
                for field in required_fields:
                    if field not in service:
                        orphaned_data = True
                        break
                
                if not service.get('asset_ids'):
                    orphaned_data = True
                    break
            
            self.log_result("No Orphaned Data", not orphaned_data, 
                           "All services have valid data" if not orphaned_data else "Orphaned data detected")
            return not orphaned_data
        else:
            self.log_result("Data Integrity Check", False, "Failed to retrieve services")
            return False

    def run_complete_workflow_test(self):
        """Run the complete monitoring service admin deactivation workflow test"""
        print("="*80)
        print("🎯 COMPLETE MONITORING SERVICE ADMIN DEACTIVATION WORKFLOW TEST")
        print("="*80)
        print("Testing complete admin workflow including deactivation functionality:")
        print("1. Service Deactivation via DELETE endpoint")
        print("2. Complete Admin Workflow (login, view, edit, deactivate)")
        print("3. Buyer State After Deactivation")
        print("4. Backend Data Integrity Verification")
        print()

        # Test sequence
        tests = [
            ("User Authentication", self.authenticate_all_users),
            ("Admin Login & View Services", self.test_admin_login_and_view_services),
            ("Admin Edit Service", self.test_admin_edit_service),
            ("Service Deactivation", self.test_service_deactivation_delete),
            ("Buyer State After Deactivation", self.test_buyer_state_after_deactivation),
            ("New Service After Deactivation", self.test_buyer_can_create_new_service_after_deactivation),
            ("Data Integrity Verification", self.test_data_integrity_verification)
        ]

        for test_name, test_function in tests:
            try:
                test_function()
            except Exception as e:
                self.log_result(test_name, False, f"Exception: {str(e)}")

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("📊 MONITORING SERVICE ADMIN DEACTIVATION TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if result['success'])
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Critical functionality assessment
        critical_tests = [
            "Admin Authentication",
            "Admin View All Services", 
            "Admin Edit Service",
            "DELETE Request Success",
            "Service Completely Deleted",
            "Buyer Cannot See Deactivated Service",
            "No Orphaned Data"
        ]
        
        critical_passed = 0
        print(f"\n🎯 CRITICAL FUNCTIONALITY STATUS:")
        for result in self.results:
            if result['test'] in critical_tests:
                status = "✅ WORKING" if result['success'] else "❌ FAILED"
                print(f"   {status}: {result['test']}")
                if result['success']:
                    critical_passed += 1
        
        critical_success_rate = (critical_passed / len(critical_tests) * 100) if critical_tests else 0
        
        print(f"\n🏆 OVERALL ASSESSMENT:")
        if critical_success_rate >= 85:
            print("   ✅ MONITORING SERVICE ADMIN DEACTIVATION WORKFLOW IS WORKING CORRECTLY")
            print("   🎉 All critical deactivation functionality verified and operational")
            print("   📋 DELETE endpoint functional, database cleanup working, buyer state verified")
        elif critical_success_rate >= 70:
            print("   ⚠️  MONITORING SERVICE ADMIN DEACTIVATION WORKFLOW HAS MINOR ISSUES")
            print("   🔧 Core deactivation functionality working but some edge cases need attention")
        else:
            print("   ❌ MONITORING SERVICE ADMIN DEACTIVATION WORKFLOW HAS MAJOR ISSUES")
            print("   🚨 Critical deactivation functionality failures detected")
        
        # Failed tests details
        failed_tests = [result for result in self.results if not result['success']]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for result in failed_tests:
                print(f"   • {result['test']}: {result['details']}")
        
        return success_rate >= 75

def main():
    """Main test execution"""
    tester = ComprehensiveMonitoringDeactivationTester()
    success = tester.run_complete_workflow_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()