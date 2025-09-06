import requests
import cloudinary
import cloudinary.uploader
import os
import base64
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'dtkyz8v6f'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', '554777785594141'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 'nKI4sHe5jGGa4g_tPKIjOvC9D1I')
)

def create_test_pdf():
    """Create a test PDF file"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, "Test PDF for Cloudinary Upload")
    p.setFont("Helvetica", 12)
    p.drawString(50, 700, "This is a test PDF to verify Cloudinary configuration")
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_cloudinary_configurations():
    """Test different Cloudinary upload configurations"""
    
    print("🔧 TESTING CLOUDINARY PDF UPLOAD CONFIGURATIONS")
    print("="*60)
    
    pdf_content = create_test_pdf()
    file_base64 = base64.b64encode(pdf_content).decode('utf-8')
    data_uri = f"data:application/pdf;base64,{file_base64}"
    
    configurations = [
        {
            "name": "Current Configuration (with delivery_type)",
            "params": {
                "resource_type": "auto",
                "folder": "test_purchase_orders",
                "public_id": "test_po_current",
                "use_filename": False,
                "unique_filename": False,
                "format": "pdf",
                "type": "upload",
                "overwrite": True,
                "delivery_type": "upload"
            }
        },
        {
            "name": "Fixed Configuration (without delivery_type)",
            "params": {
                "resource_type": "auto",
                "folder": "test_purchase_orders",
                "public_id": "test_po_fixed",
                "use_filename": False,
                "unique_filename": False,
                "format": "pdf",
                "overwrite": True
            }
        },
        {
            "name": "Simple Configuration",
            "params": {
                "resource_type": "raw",
                "folder": "test_purchase_orders",
                "public_id": "test_po_simple",
                "overwrite": True
            }
        },
        {
            "name": "Image Resource Type",
            "params": {
                "resource_type": "image",
                "folder": "test_purchase_orders",
                "public_id": "test_po_image",
                "overwrite": True
            }
        }
    ]
    
    results = []
    
    for config in configurations:
        print(f"\n--- Testing: {config['name']} ---")
        
        try:
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(data_uri, **config['params'])
            
            secure_url = upload_result.get("secure_url")
            print(f"✅ Upload successful")
            print(f"   URL: {secure_url}")
            print(f"   Resource Type: {upload_result.get('resource_type')}")
            print(f"   Format: {upload_result.get('format')}")
            
            # Test access
            if secure_url:
                access_response = requests.get(secure_url, timeout=10)
                if access_response.status_code == 200:
                    print(f"✅ File accessible (Status: {access_response.status_code})")
                    print(f"   Content-Type: {access_response.headers.get('Content-Type')}")
                    print(f"   Content-Length: {len(access_response.content)} bytes")
                    
                    # Verify PDF content
                    if access_response.content.startswith(b'%PDF'):
                        print(f"✅ Valid PDF content")
                        results.append((config['name'], True, secure_url))
                    else:
                        print(f"❌ Invalid PDF content")
                        results.append((config['name'], False, secure_url))
                else:
                    print(f"❌ File not accessible (Status: {access_response.status_code})")
                    print(f"   Error: {access_response.text[:200]}")
                    results.append((config['name'], False, secure_url))
            else:
                print(f"❌ No secure URL returned")
                results.append((config['name'], False, None))
                
        except Exception as e:
            print(f"❌ Upload failed: {str(e)}")
            results.append((config['name'], False, None))
    
    # Summary
    print("\n" + "="*60)
    print("📊 CLOUDINARY CONFIGURATION TEST RESULTS")
    print("="*60)
    
    working_configs = []
    for name, success, url in results:
        status = "✅ WORKING" if success else "❌ FAILED"
        print(f"{status}: {name}")
        if success:
            working_configs.append((name, url))
    
    if working_configs:
        print(f"\n🎉 Found {len(working_configs)} working configuration(s):")
        for name, url in working_configs:
            print(f"   - {name}")
            print(f"     URL: {url}")
    else:
        print(f"\n❌ No working configurations found")
    
    return working_configs

if __name__ == "__main__":
    test_cloudinary_configurations()