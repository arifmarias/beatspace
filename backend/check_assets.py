import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_assets():
    """Check all assets and their statuses"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/beatspace_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client.beatspace_db
    
    try:
        # Get all assets
        assets = await db.assets.find({}).to_list(None)
        
        print(f"Found {len(assets)} total assets")
        
        status_counts = {}
        for asset in assets:
            status = asset.get('status', 'No Status')
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Print details of any asset with unusual status
            if status not in ['Available', 'Pending Offer', 'Negotiating', 'Booked', 'Work in Progress', 'Live', 'Completed', 'Pending Approval', 'Unavailable']:
                print(f"⚠️  Asset {asset['id']} has unusual status: '{status}'")
                print(f"   Name: {asset.get('name', 'Unknown')}")
                print(f"   Category: {asset.get('category', 'Unknown')}")
        
        print("\nStatus summary:")
        for status, count in status_counts.items():
            print(f"  {status}: {count}")
            
    except Exception as e:
        print(f"❌ Error checking assets: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(check_assets())