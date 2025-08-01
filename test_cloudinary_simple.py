#!/usr/bin/env python3
"""
Simple Cloudinary configuration test
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Load environment variables
from dotenv import load_dotenv
load_dotenv(backend_dir / '.env')

import cloudinary
import cloudinary.uploader

def test_cloudinary_config():
    """Test Cloudinary configuration"""
    print("🔍 Testing Cloudinary Configuration...")
    
    # Get credentials from environment
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME')
    api_key = os.environ.get('CLOUDINARY_API_KEY') 
    api_secret = os.environ.get('CLOUDINARY_API_SECRET')
    
    print(f"Cloud Name: {cloud_name}")
    print(f"API Key: {api_key}")
    print(f"API Secret: {'*' * len(api_secret) if api_secret else 'None'}")
    
    # Configure Cloudinary
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )
    
    # Test with a simple ping/info call
    try:
        # Try to get account info (this doesn't upload anything)
        result = cloudinary.api.ping()
        print("✅ Cloudinary configuration is valid!")
        print(f"Response: {result}")
        return True
    except Exception as e:
        print(f"❌ Cloudinary configuration error: {str(e)}")
        return False

def test_simple_upload():
    """Test a simple upload"""
    print("\n🔍 Testing Simple Upload...")
    
    try:
        # Create a simple 1x1 pixel image data
        import base64
        import io
        
        # 1x1 pixel PNG in base64
        test_image_data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        image_bytes = base64.b64decode(test_image_data)
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            image_bytes,
            folder="beatspace_assets",
            resource_type="image",
            public_id="test_upload_simple"
        )
        
        print("✅ Simple upload successful!")
        print(f"URL: {result.get('secure_url')}")
        print(f"Public ID: {result.get('public_id')}")
        return True
        
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🎯 Cloudinary Simple Configuration Test")
    print("=" * 50)
    
    config_ok = test_cloudinary_config()
    
    if config_ok:
        upload_ok = test_simple_upload()
        if upload_ok:
            print("\n🎉 Cloudinary is working correctly!")
        else:
            print("\n❌ Upload test failed")
    else:
        print("\n❌ Configuration test failed")