import asyncio
import os
import uuid
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

async def create_sample_assets():
    """Create sample assets for marketplace"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/beatspace_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client.beatspace_db
    
    try:
        # Sample asset data
        sample_assets = [
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
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Central Railway Station Display",
                "type": "Railway Station",
                "category": "Public", 
                "status": "Available",
                "location": "Chittagong, Bangladesh",
                "division": "Chittagong",
                "district": "Chittagong",
                "area": "Station Road",
                "address": "Chittagong Railway Station",
                "dimensions": {"width": 15, "height": 8},
                "daily_rate": 3000,
                "weekly_rate": 18000,
                "monthly_rate": 60000,
                "image_url": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
                "show_in_marketplace": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnov()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Shopping Mall Entrance",
                "type": "Wall",
                "category": "Existing Asset",
                "status": "Available", 
                "location": "Sylhet, Bangladesh",
                "division": "Sylhet",
                "district": "Sylhet",
                "area": "Zindabazar",
                "address": "City Center Mall, Sylhet",
                "dimensions": {"width": 12, "height": 6},
                "daily_rate": 2500,
                "weekly_rate": 15000,
                "monthly_rate": 50000,
                "image_url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800",
                "show_in_marketplace": True,
                "asset_expiry_date": datetime.utcnow() + timedelta(days=30),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Bus Stop Advertisement Panel",
                "type": "Bus Stop",
                "category": "Public",
                "status": "Available",
                "location": "Rajshahi, Bangladesh", 
                "division": "Rajshahi",
                "district": "Rajshahi",
                "area": "New Market",
                "address": "New Market Bus Stop, Rajshahi",
                "dimensions": {"width": 8, "height": 4},
                "daily_rate": 1500,
                "weekly_rate": 9000,
                "monthly_rate": 30000,
                "image_url": "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800",
                "show_in_marketplace": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        # Insert sample assets
        result = await db.assets.insert_many(sample_assets)
        print(f"✅ Created {len(result.inserted_ids)} sample assets")
        
        # Verify creation
        count = await db.assets.count_documents({})
        print(f"✅ Total assets in database: {count}")
        
    except Exception as e:
        print(f"❌ Error creating sample assets: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_sample_assets())