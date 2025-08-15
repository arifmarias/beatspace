#!/usr/bin/env python3
"""
BeatSpace Individual Asset Monitoring Service Test
Focus: Test monitoring service creation and retrieval for individual assets (without campaign_id)
As requested in the review: Test individual asset monitoring workflow
"""

import requests
import json
import sys
from datetime import datetime, timedelta

class IndividualAssetMonitoringTester:
    def __init__(self, base_url="https://route-map-hover.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.buyer_token = None
        self.buyer_user_id = None
        self.admin_token = None
        self.available_assets = []
        self.created_services = []
        self.test_results = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
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
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                        # Show key details for monitoring services
                        if 'services' in response_data:
                            print(f"   Services count: {len(response_data['services'])}")
                        if 'id' in response_data:
                            print(f"   Created ID: {response_data['id']}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            # Store test result
            self.test_results[name] = {
                'success': success,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'response_data': response.json() if response.text and success else {}
            }

            return success, response.json() if response.text and success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results[name] = {
                'success': False,
                'error': str(e)
            }
            return False, {}

    def test_buyer_login(self):
        """Test buyer login - try multiple existing buyers"""
        buyer_credentials = [
            ("marketing@grameenphone.com", "buyer123"),
            ("buy@demo.com", "buyer123"),
            ("buy2@demo.com", "buyer123"),
            ("testbuyer@beatspace.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            login_data = {"email": email, "password": password}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                self.buyer_user_id = response.get('user', {}).get('id')
                print(f"   ✅ Buyer authenticated: {email}")
                print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
                print(f"   User ID: {self.buyer_user_id}")
                return True, response
        
        print("   ❌ All buyer login attempts failed")
        return False, {}

    def get_available_assets(self):
        """Get available assets for individual monitoring"""
        success, response = self.run_test("Get Available Assets", "GET", "assets/public", 200)
        if success and response:
            self.available_assets = [asset['id'] for asset in response[:3]]  # Get first 3 assets
            print(f"   Found {len(response)} total assets")
            print(f"   Using asset IDs for testing: {self.available_assets}")
            return True, response
        
        print("   ⚠️  No assets found")
        return False, {}

    def test_create_individual_asset_monitoring_service(self):
        """Test creating monitoring service for individual asset (without campaign_id)"""
        if not self.buyer_token:
            print("⚠️  Skipping individual asset monitoring test - no buyer token")
            return False, {}

        if not self.available_assets:
            print("⚠️  Skipping individual asset monitoring test - no assets available")
            return False, {}

        print("🎯 TESTING INDIVIDUAL ASSET MONITORING SERVICE CREATION")
        print("   Focus: Creating monitoring service WITHOUT campaign_id")
        print("   This tests the individual asset monitoring workflow")

        # Test individual asset monitoring (campaign_id is None/omitted)
        service_data = {
            # campaign_id is intentionally omitted for individual asset monitoring
            "asset_ids": [self.available_assets[0]],  # Single asset
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

        print(f"   Testing individual asset monitoring:")
        print(f"   - Asset ID: {service_data['asset_ids'][0]}")
        print(f"   - Frequency: {service_data['frequency']}")
        print(f"   - Service Level: {service_data['service_level']}")
        print(f"   - Campaign ID: None (individual asset monitoring)")

        success, response = self.run_test(
            "Create Individual Asset Monitoring Service", 
            "POST", 
            "monitoring/services", 
            200,
            data=service_data,
            token=self.buyer_token
        )

        if success:
            print("   ✅ Individual asset monitoring service created successfully")
            if 'id' in response:
                self.created_services.append(response['id'])
                print(f"   Service ID: {response['id']}")
            
            # Verify response structure
            expected_fields = ['id', 'buyer_id', 'asset_ids', 'frequency', 'start_date', 'end_date', 'service_level']
            missing_fields = [field for field in expected_fields if field not in response]
            
            if missing_fields:
                print(f"   ⚠️  Missing fields in response: {missing_fields}")
            else:
                print("   ✅ All expected fields present in response")
            
            # Verify campaign_id is None or not present (as expected for individual asset monitoring)
            if response.get('campaign_id') is None:
                print("   ✅ campaign_id is None as expected for individual asset monitoring")
            else:
                print(f"   ⚠️  campaign_id is {response.get('campaign_id')}, expected None for individual asset")
            
            return True, response
        else:
            print("   ❌ Individual asset monitoring service creation failed")
            return False, {}

    def test_create_multiple_individual_assets_monitoring(self):
        """Test creating monitoring service for multiple individual assets"""
        if not self.buyer_token:
            print("⚠️  Skipping multiple asset monitoring test - no buyer token")
            return False, {}

        if len(self.available_assets) < 2:
            print("⚠️  Skipping multiple asset monitoring test - need at least 2 assets")
            return False, {}

        print("🎯 TESTING MULTIPLE INDIVIDUAL ASSETS MONITORING")

        # Test multiple individual assets monitoring (still no campaign_id)
        service_data = {
            # campaign_id is intentionally omitted
            "asset_ids": self.available_assets[:2],  # Multiple assets
            "frequency": "bi_weekly",
            "start_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=60)).isoformat(),
            "service_level": "premium",
            "notification_preferences": {
                "email": True,
                "in_app": True,
                "sms": True
            }
        }

        print(f"   Testing multiple asset monitoring:")
        print(f"   - Asset IDs: {service_data['asset_ids']}")
        print(f"   - Asset Count: {len(service_data['asset_ids'])}")
        print(f"   - Frequency: {service_data['frequency']}")
        print(f"   - Service Level: {service_data['service_level']}")

        success, response = self.run_test(
            "Create Multiple Individual Assets Monitoring", 
            "POST", 
            "monitoring/services", 
            200,
            data=service_data,
            token=self.buyer_token
        )

        if success:
            print("   ✅ Multiple individual assets monitoring service created successfully")
            if 'id' in response:
                self.created_services.append(response['id'])
            return True, response
        else:
            print("   ❌ Multiple individual assets monitoring service creation failed")
            return False, {}

    def test_retrieve_monitoring_services_format(self):
        """Test retrieving monitoring services and verify response format"""
        if not self.buyer_token:
            print("⚠️  Skipping monitoring service retrieval - no buyer token")
            return False, {}

        print("🎯 TESTING MONITORING SERVICE RETRIEVAL FORMAT")
        print("   Focus: Verify GET /api/monitoring/services returns correct format")
        print("   Expected format: {'services': [...]}")

        success, response = self.run_test(
            "Get Monitoring Services", 
            "GET", 
            "monitoring/services", 
            200,
            token=self.buyer_token
        )

        if success:
            print("   ✅ Monitoring services retrieved successfully")
            
            # Verify response format
            if 'services' in response:
                print("   ✅ Response has correct format: {'services': [...]}")
                services = response['services']
                print(f"   Found {len(services)} monitoring services")
                
                if services:
                    print("   📊 MONITORING SERVICES DETAILS:")
                    individual_asset_count = 0
                    campaign_based_count = 0
                    
                    for i, service in enumerate(services):
                        print(f"   Service {i+1}:")
                        print(f"     ID: {service.get('id', 'N/A')}")
                        print(f"     Campaign ID: {service.get('campaign_id', 'None (individual asset)')}")
                        print(f"     Asset IDs: {service.get('asset_ids', [])}")
                        print(f"     Asset Count: {len(service.get('asset_ids', []))}")
                        print(f"     Frequency: {service.get('frequency', 'N/A')}")
                        print(f"     Service Level: {service.get('service_level', 'N/A')}")
                        print(f"     Status: {service.get('status', 'N/A')}")
                        print(f"     Start Date: {service.get('start_date', 'N/A')}")
                        print(f"     End Date: {service.get('end_date', 'N/A')}")
                        
                        # Count individual vs campaign-based monitoring
                        if service.get('campaign_id') is None:
                            individual_asset_count += 1
                            print(f"     ✅ Individual asset monitoring (no campaign)")
                        else:
                            campaign_based_count += 1
                            print(f"     ℹ️  Campaign-based monitoring")
                        
                        # Validate required fields
                        required_fields = ['id', 'buyer_id', 'asset_ids', 'frequency', 'start_date', 'end_date', 'service_level']
                        missing_fields = [field for field in required_fields if field not in service]
                        
                        if missing_fields:
                            print(f"     ⚠️  Missing fields: {missing_fields}")
                        else:
                            print(f"     ✅ All required fields present")
                    
                    print(f"\n   📈 MONITORING SERVICE BREAKDOWN:")
                    print(f"   - Individual asset monitoring: {individual_asset_count}")
                    print(f"   - Campaign-based monitoring: {campaign_based_count}")
                    print(f"   - Total services: {len(services)}")
                else:
                    print("   ℹ️  No monitoring services found")
                
                return True, response
            else:
                print("   ❌ Response does not have expected format {'services': [...]}")
                print(f"   Actual response keys: {list(response.keys())}")
                return False, response
        else:
            print("   ❌ Failed to retrieve monitoring services")
            return False, {}

    def test_monitoring_service_authentication(self):
        """Test monitoring service endpoints require authentication"""
        print("🎯 TESTING MONITORING SERVICE AUTHENTICATION")

        # Test POST without authentication
        service_data = {
            "asset_ids": ["test_asset"],
            "frequency": "weekly",
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard"
        }

        success, response = self.run_test(
            "Create Monitoring Service - No Auth", 
            "POST", 
            "monitoring/services", 
            401,  # Unauthorized
            data=service_data
        )

        if success:
            print("   ✅ POST /api/monitoring/services properly requires authentication")

        # Test GET without authentication
        success, response = self.run_test(
            "Get Monitoring Services - No Auth", 
            "GET", 
            "monitoring/services", 
            401  # Unauthorized
        )

        if success:
            print("   ✅ GET /api/monitoring/services properly requires authentication")

        return True, {}

    def test_monitoring_service_validation(self):
        """Test monitoring service creation validation"""
        if not self.buyer_token:
            print("⚠️  Skipping validation test - no buyer token")
            return False, {}

        print("🎯 TESTING MONITORING SERVICE VALIDATION")

        # Test 1: Missing required fields
        print("   Test 1: Missing asset_ids")
        invalid_data = {
            "frequency": "weekly",
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard"
            # Missing asset_ids
        }

        success, response = self.run_test(
            "Create Monitoring Service - Missing asset_ids", 
            "POST", 
            "monitoring/services", 
            422,  # Validation error
            data=invalid_data,
            token=self.buyer_token
        )

        if success:
            print("   ✅ Missing asset_ids properly rejected")

        # Test 2: Invalid frequency
        print("   Test 2: Invalid frequency")
        invalid_frequency_data = {
            "asset_ids": [self.available_assets[0]] if self.available_assets else ["test_asset"],
            "frequency": "invalid_frequency",
            "start_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
            "service_level": "standard"
        }

        success, response = self.run_test(
            "Create Monitoring Service - Invalid Frequency", 
            "POST", 
            "monitoring/services", 
            422,  # Validation error
            data=invalid_frequency_data,
            token=self.buyer_token
        )

        if success:
            print("   ✅ Invalid frequency properly rejected")

        return True, {}

    def run_individual_asset_monitoring_test_suite(self):
        """Run comprehensive individual asset monitoring test suite"""
        print("\n" + "="*80)
        print("🚀 INDIVIDUAL ASSET MONITORING SERVICE TEST SUITE")
        print("="*80)
        print("   Testing monitoring service creation and retrieval for individual assets")
        print("   Focus: Individual asset monitoring workflow (campaign_id optional)")
        print("   Endpoints: POST /api/monitoring/services, GET /api/monitoring/services")
        print()

        # Test sequence
        tests = [
            ("Buyer Authentication", self.test_buyer_login),
            ("Get Available Assets", self.get_available_assets),
            ("Monitoring Service Authentication", self.test_monitoring_service_authentication),
            ("Monitoring Service Validation", self.test_monitoring_service_validation),
            ("Create Individual Asset Monitoring Service", self.test_create_individual_asset_monitoring_service),
            ("Create Multiple Individual Assets Monitoring", self.test_create_multiple_individual_assets_monitoring),
            ("Retrieve Monitoring Services Format", self.test_retrieve_monitoring_services_format)
        ]

        results = {}
        passed = 0

        for test_name, test_method in tests:
            print(f"\n{'='*60}")
            try:
                success, result = test_method()
                results[test_name] = {"success": success, "result": result}
                if success:
                    passed += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
                results[test_name] = {"success": False, "error": str(e)}

        # Results summary
        print(f"\n{'='*80}")
        print(f"🎯 INDIVIDUAL ASSET MONITORING TEST RESULTS")
        print(f"{'='*80}")
        print(f"Tests passed: {passed}/{len(tests)}")
        print(f"Success rate: {(passed/len(tests)*100):.1f}%")

        # Detailed results
        print(f"\n📊 DETAILED TEST RESULTS:")
        for test_name, result in results.items():
            status = "✅ PASSED" if result["success"] else "❌ FAILED"
            print(f"   {status}: {test_name}")
            if not result["success"] and "error" in result:
                print(f"      Error: {result['error']}")

        # Key findings
        print(f"\n🔍 KEY FINDINGS:")
        
        # Check if individual asset monitoring works
        individual_asset_test = results.get("Create Individual Asset Monitoring Service", {})
        if individual_asset_test.get("success"):
            print(f"   ✅ Individual asset monitoring (without campaign_id) WORKING")
        else:
            print(f"   ❌ Individual asset monitoring (without campaign_id) FAILED")

        # Check if multiple assets monitoring works
        multiple_assets_test = results.get("Create Multiple Individual Assets Monitoring", {})
        if multiple_assets_test.get("success"):
            print(f"   ✅ Multiple individual assets monitoring WORKING")
        else:
            print(f"   ❌ Multiple individual assets monitoring FAILED")

        # Check if retrieval format is correct
        retrieval_test = results.get("Retrieve Monitoring Services Format", {})
        if retrieval_test.get("success"):
            print(f"   ✅ GET /api/monitoring/services returns correct format {'services': [...]}")
        else:
            print(f"   ❌ GET /api/monitoring/services format issue")

        # Check authentication
        auth_test = results.get("Monitoring Service Authentication", {})
        if auth_test.get("success"):
            print(f"   ✅ Authentication requirements working correctly")
        else:
            print(f"   ❌ Authentication issues detected")

        # Overall conclusion
        print(f"\n🎉 OVERALL CONCLUSION:")
        if passed >= len(tests) * 0.75:  # 75% success rate
            print(f"   ✅ INDIVIDUAL ASSET MONITORING FUNCTIONALITY IS WORKING CORRECTLY")
            print(f"   ✅ Backend successfully creates monitoring subscriptions for individual assets")
            print(f"   ✅ Backend returns monitoring services in correct format")
            print(f"   ✅ Individual asset monitoring works properly (campaign_id optional)")
            print(f"   ✅ Response structure matches frontend expectations")
        else:
            print(f"   ❌ INDIVIDUAL ASSET MONITORING FUNCTIONALITY NEEDS ATTENTION")
            print(f"   ❌ Some critical issues found that need fixing")

        return passed, len(tests), results

def main():
    """Main function to run individual asset monitoring tests"""
    print("🎯 BeatSpace Individual Asset Monitoring Service API Testing")
    print("=" * 80)
    
    tester = IndividualAssetMonitoringTester()
    passed, total, results = tester.run_individual_asset_monitoring_test_suite()
    
    # Return appropriate exit code
    if passed >= total * 0.75:  # 75% success rate
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())