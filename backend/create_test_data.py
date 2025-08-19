import asyncio
import os
import uuid
import bcrypt
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

async def create_test_data():
    """Create test data with PO Uploaded scenario"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL')
    client = AsyncIOMotorClient(mongo_url)
    db = client.beatspace_db
    
    try:
        # Clear existing data
        await db.users.delete_many({})
        await db.assets.delete_many({})
        await db.offer_requests.delete_many({})
        await db.campaigns.delete_many({})
        
        # Create admin user
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "email": "admin@beatspace.com",
            "password_hash": hash_password("admin123"),
            "company_name": "BeatSpace Admin",
            "contact_name": "System Administrator",
            "phone": "+8801234567890",
            "role": "admin",
            "status": "approved",
            "created_at": datetime.utcnow(),
            "verified_at": datetime.utcnow(),
            "subscription_plan": "enterprise"
        }
        await db.users.insert_one(admin_user)
        print("✅ Created admin user")
        
        # Create buyer user
        buyer_id = str(uuid.uuid4())
        buyer_user = {
            "id": buyer_id,
            "email": "buyer@demo.com",
            "password_hash": hash_password("buyer123"),
            "company_name": "Demo Company",
            "contact_name": "Demo Buyer",
            "phone": "+8801234567891",
            "role": "buyer",
            "status": "approved",
            "created_at": datetime.utcnow(),
            "verified_at": datetime.utcnow(),
            "subscription_plan": "basic"
        }
        await db.users.insert_one(buyer_user)
        print("✅ Created buyer user")
        
        # Create HatirJheel asset
        hatirjheel_id = str(uuid.uuid4())
        hatirjheel_asset = {
            "id": hatirjheel_id,
            "name": "HatirJheel Billboard",
            "type": "Billboard",
            "category": "Public",
            "status": "Available",
            "location": "Dhaka, Bangladesh",
            "division": "Dhaka",
            "district": "Dhaka",
            "area": "HatirJheel",
            "address": "HatirJheel Lake, Dhaka",
            "dimensions": {"width": 25, "height": 12},
            "daily_rate": 8000,
            "weekly_rate": 50000,
            "monthly_rate": 180000,
            "image_url": "https://images.unsplash.com/photo-1519266711047-de48b59cac33?w=800",
            "show_in_marketplace": True,
            "next_available_date": datetime.utcnow() + timedelta(days=60),  # 60 days from now
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await db.assets.insert_one(hatirjheel_asset)
        print("✅ Created HatirJheel asset")
        
        # Create other sample assets
        other_assets = [
            {
                "id": str(uuid.uuid4()),
                "name": "Times Square Billboard",
                "type": "Billboard",
                "category": "Public",
                "status": "Available",
                "location": "Dhaka, Bangladesh",
                "division": "Dhaka",
                "district": "Dhaka",
                "area": "Gulshan",
                "address": "Gulshan Avenue, Dhaka",
                "dimensions": {"width": 20, "height": 10},
                "daily_rate": 5000,
                "weekly_rate": 30000,
                "monthly_rate": 100000,
                "image_url": "https://images.unsplash.com/photo-1519266711047-de48b59cac33?w=800",
                "show_in_marketplace": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        await db.assets.insert_many(other_assets)
        print("✅ Created other sample assets")
        
        # Create offer request with PO Uploaded status for HatirJheel
        offer_id = str(uuid.uuid4())
        po_uploaded_offer = {
            "id": offer_id,
            "asset_id": hatirjheel_id,
            "buyer_id": buyer_id,
            "buyer_name": "Demo Buyer",
            "buyer_email": "buyer@demo.com",
            "tentative_start_date": datetime.utcnow() + timedelta(days=7),
            "tentative_end_date": datetime.utcnow() + timedelta(days=67),  # 60 days contract
            "contract_duration": "2_months",
            "status": "PO Uploaded",
            "po_document_url": "https://res.cloudinary.com/demo/raw/upload/v1/purchase_orders/po_test_123.pdf",
            "po_uploaded_by": "buyer",
            "po_uploaded_at": datetime.utcnow() - timedelta(hours=2),
            "admin_quoted_price": 150000,
            "notes": "Test PO uploaded offer for HatirJheel asset",
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow() - timedelta(hours=2)
        }
        await db.offer_requests.insert_one(po_uploaded_offer)
        print("✅ Created PO Uploaded offer for HatirJheel")
        
        print(f"\n🎯 Test Scenario Created:")
        print(f"   Asset: HatirJheel Billboard (ID: {hatirjheel_id})")
        print(f"   Offer: PO Uploaded status (ID: {offer_id})")
        print(f"   Expected: Marketplace should show 'Awaiting Go Live' for HatirJheel")
        
    except Exception as e:
        print(f"❌ Error creating test data: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())