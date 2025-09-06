import requests
import sys
import json
import io
import tempfile
from datetime import datetime
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

class PDFUploadTester:
    def __init__(self, base_url="https://assetflow-16.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_token = None
        self.buyer_token = None
        self.test_results = {}
        self.test_offer_request_id = None
        self.test_asset_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        # Don't set Content-Type for file uploads - let requests handle it
        if not files:
            headers['Content-Type'] = 'application/json'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=30)
                else:
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

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@beatspace.com",
            "password": "admin123"
        }
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, data=login_data)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
        return success, response

    def test_buyer_login(self):
        """Test buyer login"""
        # Try different existing buyers
        buyer_credentials = [
            ("buy@demo.com", "buyer123"),
            ("testbuyer@performance.com", "buyer123"),
            ("marketing@grameenphone.com", "buyer123")
        ]
        
        for email, password in buyer_credentials:
            login_data = {"email": email, "password": password}
            success, response = self.run_test(f"Buyer Login ({email})", "POST", "auth/login", 200, data=login_data)
            if success and 'access_token' in response:
                self.buyer_token = response['access_token']
                print(f"   ✅ Buyer authenticated: {email}")
                print(f"   Buyer token obtained: {self.buyer_token[:20]}...")
                return True, response
        
        print("   ❌ All buyer login attempts failed")
        return False, {}

    def create_test_pdf(self, filename="test_po.pdf"):
        """Create a test PDF file for upload testing"""
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add content to PDF
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, "Purchase Order Document")
        
        p.setFont("Helvetica", 12)
        p.drawString(50, 700, f"PO Number: PO-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        p.drawString(50, 680, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        p.drawString(50, 660, "Vendor: BeatSpace Advertising")
        p.drawString(50, 640, "Amount: $5,000.00")
        p.drawString(50, 620, "Description: Billboard advertising services")
        
        p.save()
        buffer.seek(0)
        return buffer.getvalue()

    def create_test_offer_request(self):
        """Create a test offer request for PDF upload testing"""
        if not self.buyer_token:
            print("⚠️  No buyer token available for creating offer request")
            return False, {}

        # First get an available asset
        success, assets = self.run_test("Get Public Assets", "GET", "assets/public", 200)
        if not success or not assets:
            print("⚠️  No assets available for creating offer request")
            return False, {}

        asset = assets[0]
        self.test_asset_id = asset['id']

        # Create offer request
        offer_data = {
            "asset_id": asset['id'],
            "campaign_name": "PDF Upload Test Campaign",
            "campaign_type": "new",
            "contract_duration": "3_months",
            "estimated_budget": 50000,
            "service_bundles": {
                "printing": True,
                "setup": True,
                "monitoring": False
            },
            "timeline": "Test timeline for PDF upload",
            "special_requirements": "Test requirements",
            "notes": "Created for PDF upload testing",
            "asset_start_date": "2025-02-01T00:00:00Z",
            "asset_expiration_date": "2025-05-01T00:00:00Z"
        }

        success, response = self.run_test(
            "Create Test Offer Request",
            "POST",
            "offers/request",
            200,
            data=offer_data,
            token=self.buyer_token
        )

        if success:
            self.test_offer_request_id = response.get('id')
            print(f"   ✅ Test offer request created: {self.test_offer_request_id}")
            
            # Update status to "Quoted" so it's ready for PO upload
            if self.admin_token:
                quote_data = {
                    "status": "Quoted",
                    "admin_quoted_price": 45000,
                    "admin_notes": "Test quote for PDF upload testing"
                }
                
                quote_success, quote_response = self.run_test(
                    "Update Offer to Quoted Status",
                    "PATCH",
                    f"admin/offer-requests/{self.test_offer_request_id}/status",
                    200,
                    data=quote_data,
                    token=self.admin_token
                )
                
                if quote_success:
                    print(f"   ✅ Offer request updated to Quoted status")
                
            return True, response
        else:
            print(f"   ❌ Failed to create test offer request")
            return False, {}

    def test_pdf_upload_endpoint(self):
        """Test PDF Upload Endpoint - POST /api/offers/{request_id}/upload-po"""
        print("🎯 TESTING PDF UPLOAD ENDPOINT")
        
        if not self.test_offer_request_id:
            print("⚠️  No test offer request available for PDF upload")
            return False, {}

        if not self.buyer_token:
            print("⚠️  No buyer token available for PDF upload")
            return False, {}

        # Create test PDF
        pdf_content = self.create_test_pdf()
        
        # Prepare file upload
        files = {
            'file': ('test_po.pdf', pdf_content, 'application/pdf')
        }
        
        data = {
            'uploaded_by': 'buyer'
        }

        success, response = self.run_test(
            "PDF Upload - Valid PDF File",
            "POST",
            f"offers/{self.test_offer_request_id}/upload-po",
            200,
            data=data,
            files=files,
            token=self.buyer_token
        )

        if success:
            print(f"   ✅ PDF uploaded successfully")
            print(f"   PO URL: {response.get('po_url', 'N/A')}")
            print(f"   Status: {response.get('status', 'N/A')}")
            
            # Store the URL for access testing
            self.uploaded_pdf_url = response.get('po_url')
            
            # Verify Cloudinary configuration
            po_url = response.get('po_url', '')
            if 'cloudinary.com' in po_url:
                print(f"   ✅ File uploaded to Cloudinary")
                
                # Check for single .pdf extension (not .pdf.pdf)
                if po_url.count('.pdf') == 1:
                    print(f"   ✅ Single .pdf extension confirmed")
                else:
                    print(f"   ❌ Multiple .pdf extensions detected: {po_url}")
                
                # Check for proper folder structure
                if 'purchase_orders' in po_url:
                    print(f"   ✅ File stored in correct folder: purchase_orders")
                else:
                    print(f"   ⚠️  File not in expected folder")
                    
            else:
                print(f"   ❌ File not uploaded to Cloudinary")
            
            return True, response
        else:
            print(f"   ❌ PDF upload failed")
            return False, {}

    def test_file_access(self):
        """Test that uploaded PDF files are accessible via generated URLs"""
        print("🎯 TESTING FILE ACCESS")
        
        if not hasattr(self, 'uploaded_pdf_url') or not self.uploaded_pdf_url:
            print("⚠️  No uploaded PDF URL available for access testing")
            return False, {}

        try:
            # Test direct access to the PDF URL
            response = requests.get(self.uploaded_pdf_url, timeout=30)
            
            if response.status_code == 200:
                print(f"   ✅ PDF file accessible via URL")
                print(f"   Status Code: {response.status_code}")
                print(f"   Content-Type: {response.headers.get('Content-Type', 'N/A')}")
                print(f"   Content-Length: {len(response.content)} bytes")
                
                # Verify it's actually a PDF
                if response.content.startswith(b'%PDF'):
                    print(f"   ✅ File is valid PDF format")
                else:
                    print(f"   ❌ File is not valid PDF format")
                
                return True, {"accessible": True, "content_length": len(response.content)}
            else:
                print(f"   ❌ PDF file not accessible")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {"accessible": False, "status_code": response.status_code}
                
        except Exception as e:
            print(f"   ❌ Error accessing PDF file: {str(e)}")
            return False, {"accessible": False, "error": str(e)}

    def test_offer_request_integration(self):
        """Test that offer request is properly updated after PDF upload"""
        print("🎯 TESTING OFFER REQUEST INTEGRATION")
        
        if not self.test_offer_request_id or not self.admin_token:
            print("⚠️  Missing offer request ID or admin token")
            return False, {}

        # Get the updated offer request
        success, response = self.run_test(
            "Get Updated Offer Request",
            "GET",
            f"admin/offer-requests",
            200,
            token=self.admin_token
        )

        if success:
            # Find our test offer request
            test_offer = None
            for offer in response:
                if offer.get('id') == self.test_offer_request_id:
                    test_offer = offer
                    break
            
            if test_offer:
                print(f"   ✅ Offer request found")
                
                # Check status
                status = test_offer.get('status')
                if status == "PO Uploaded":
                    print(f"   ✅ Status correctly updated to 'PO Uploaded'")
                else:
                    print(f"   ❌ Status is '{status}', expected 'PO Uploaded'")
                
                # Check po_document_url
                po_url = test_offer.get('po_document_url')
                if po_url:
                    print(f"   ✅ po_document_url field populated")
                    print(f"   URL: {po_url[:50]}...")
                else:
                    print(f"   ❌ po_document_url field not populated")
                
                # Check po_uploaded_by
                uploaded_by = test_offer.get('po_uploaded_by')
                if uploaded_by == 'buyer':
                    print(f"   ✅ po_uploaded_by correctly set to 'buyer'")
                else:
                    print(f"   ❌ po_uploaded_by is '{uploaded_by}', expected 'buyer'")
                
                # Check po_uploaded_at
                uploaded_at = test_offer.get('po_uploaded_at')
                if uploaded_at:
                    print(f"   ✅ po_uploaded_at timestamp set")
                else:
                    print(f"   ❌ po_uploaded_at timestamp not set")
                
                return True, test_offer
            else:
                print(f"   ❌ Test offer request not found")
                return False, {}
        else:
            print(f"   ❌ Failed to get offer requests")
            return False, {}

    def test_error_handling(self):
        """Test error handling for invalid file uploads"""
        print("🎯 TESTING ERROR HANDLING")
        
        if not self.test_offer_request_id or not self.buyer_token:
            print("⚠️  Missing offer request ID or buyer token")
            return False, {}

        error_tests = []

        # Test 1: Non-PDF file upload
        text_content = b"This is not a PDF file"
        files = {
            'file': ('test.txt', text_content, 'text/plain')
        }
        data = {'uploaded_by': 'buyer'}

        success, response = self.run_test(
            "Error Test - Non-PDF File",
            "POST",
            f"offers/{self.test_offer_request_id}/upload-po",
            400,  # Should fail with 400 Bad Request
            data=data,
            files=files,
            token=self.buyer_token
        )
        error_tests.append(("Non-PDF file rejection", success))

        # Test 2: Missing file
        data = {'uploaded_by': 'buyer'}

        success, response = self.run_test(
            "Error Test - Missing File",
            "POST",
            f"offers/{self.test_offer_request_id}/upload-po",
            422,  # Should fail with validation error
            data=data,
            token=self.buyer_token
        )
        error_tests.append(("Missing file validation", success))

        # Test 3: Invalid offer request ID
        pdf_content = self.create_test_pdf()
        files = {
            'file': ('test_po.pdf', pdf_content, 'application/pdf')
        }
        data = {'uploaded_by': 'buyer'}

        success, response = self.run_test(
            "Error Test - Invalid Offer ID",
            "POST",
            "offers/invalid-id/upload-po",
            404,  # Should fail with 404 Not Found
            data=data,
            files=files,
            token=self.buyer_token
        )
        error_tests.append(("Invalid offer ID handling", success))

        # Test 4: No authentication
        success, response = self.run_test(
            "Error Test - No Authentication",
            "POST",
            f"offers/{self.test_offer_request_id}/upload-po",
            401,  # Should fail with 401 Unauthorized
            data=data,
            files=files
        )
        error_tests.append(("Authentication required", success))

        passed_tests = sum(1 for _, success in error_tests if success)
        total_tests = len(error_tests)
        
        print(f"   📊 Error handling tests: {passed_tests}/{total_tests} passed")
        
        for test_name, success in error_tests:
            status = "✅" if success else "❌"
            print(f"   {status} {test_name}")
        
        return passed_tests == total_tests, {"passed": passed_tests, "total": total_tests}

    def run_comprehensive_pdf_upload_test(self):
        """Run comprehensive PDF upload functionality test suite"""
        print("\n" + "="*80)
        print("🚀 PDF UPLOAD FUNCTIONALITY COMPREHENSIVE TEST SUITE")
        print("="*80)
        print("   Testing the enhanced PO upload endpoint with fixes")
        print("   Focus: PDF upload, Cloudinary integration, file access")
        print()
        
        # Authentication setup
        print("🔐 AUTHENTICATION SETUP")
        admin_success, _ = self.test_admin_login()
        buyer_success, _ = self.test_buyer_login()
        
        if not admin_success or not buyer_success:
            print("❌ Authentication failed - cannot proceed with tests")
            return
        
        # Create test data
        print("\n🔧 TEST DATA SETUP")
        offer_success, _ = self.create_test_offer_request()
        
        if not offer_success:
            print("❌ Test data setup failed - cannot proceed with tests")
            return
        
        # Run PDF upload tests
        print("\n📋 PDF UPLOAD TESTS")
        
        pdf_tests = [
            ("PDF Upload Endpoint Testing", self.test_pdf_upload_endpoint),
            ("File Access Testing", self.test_file_access),
            ("Offer Request Integration", self.test_offer_request_integration),
            ("Error Handling", self.test_error_handling)
        ]
        
        passed_tests = 0
        total_tests = len(pdf_tests)
        
        for test_name, test_func in pdf_tests:
            print(f"\n--- {test_name} ---")
            try:
                success, result = test_func()
                if success:
                    passed_tests += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
        
        # Final summary
        print("\n" + "="*80)
        print("📊 PDF UPLOAD TEST RESULTS SUMMARY")
        print("="*80)
        print(f"Total Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        print()
        print(f"Major Test Categories: {passed_tests}/{total_tests} passed")
        
        if passed_tests == total_tests:
            print("🎉 ALL PDF UPLOAD TESTS PASSED!")
        else:
            print(f"⚠️  {total_tests - passed_tests} test categories failed")
        
        return passed_tests, total_tests

if __name__ == "__main__":
    tester = PDFUploadTester()
    tester.run_comprehensive_pdf_upload_test()