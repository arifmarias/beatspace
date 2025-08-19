import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def fix_invalid_asset_status():
    """Fix assets with invalid 'PO Uploaded' status"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/beatspace_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client.beatspace_db
    
    try:
        # Find assets with invalid status
        invalid_assets = await db.assets.find({"status": "PO Uploaded"}).to_list(None)
        
        print(f"Found {len(invalid_assets)} assets with invalid 'PO Uploaded' status")
        
        for asset in invalid_assets:
            print(f"Asset ID: {asset['id']}, Name: {asset.get('name', 'Unknown')}")
            
            # Update the asset status to Available
            result = await db.assets.update_one(
                {"id": asset["id"]},
                {"$set": {"status": "Available"}}
            )
            
            if result.modified_count > 0:
                print(f"✅ Fixed asset {asset['id']} - changed status from 'PO Uploaded' to 'Available'")
            else:
                print(f"❌ Failed to fix asset {asset['id']}")
    
        print(f"✅ Fixed {len(invalid_assets)} assets with invalid status")
        
    except Exception as e:
        print(f"❌ Error fixing assets: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(fix_invalid_asset_status())