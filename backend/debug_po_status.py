import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def debug_po_status():
    """Debug PO uploaded status matching"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/beatspace_db')
    client = AsyncIOMotorClient(mongo_url)
    db = client.beatspace_db
    
    try:
        # Find all assets
        assets = await db.assets.find({}).to_list(None)
        print(f"Found {len(assets)} assets")
        
        # Find all offer requests
        offers = await db.offer_requests.find({}).to_list(None)
        print(f"Found {len(offers)} offer requests")
        
        # Check for PO Uploaded offers specifically
        po_uploaded_offers = await db.offer_requests.find({"status": "PO Uploaded"}).to_list(None)
        print(f"Found {len(po_uploaded_offers)} PO Uploaded offers")
        
        # Check HatirJheel asset specifically
        hatir_jheel = await db.assets.find_one({"name": {"$regex": "HatirJheel", "$options": "i"}})
        if hatir_jheel:
            print(f"\n🔍 HatirJheel Asset:")
            print(f"  ID: {hatir_jheel['id']}")
            print(f"  Name: {hatir_jheel['name']}")
            print(f"  Status: {hatir_jheel.get('status', 'No Status')}")
            
            # Check for offers for this asset
            asset_offers = await db.offer_requests.find({"asset_id": hatir_jheel['id']}).to_list(None)
            print(f"  Found {len(asset_offers)} offers for this asset:")
            
            for offer in asset_offers:
                print(f"    - Offer ID: {offer['id']}")
                print(f"      Status: {offer.get('status', 'No Status')}")
                print(f"      Buyer ID: {offer.get('buyer_id', 'No Buyer')}")
                print(f"      Created: {offer.get('created_at', 'No Date')}")
                
            # Specifically check for PO Uploaded offers for this asset
            po_offer = await db.offer_requests.find_one({"asset_id": hatir_jheel['id'], "status": "PO Uploaded"})
            if po_offer:
                print(f"  ✅ Found PO Uploaded offer: {po_offer['id']}")
            else:
                print(f"  ❌ No PO Uploaded offer found for this asset")
        else:
            print("❌ HatirJheel asset not found")
            
        # List all assets with their names
        print("\n📋 All Assets:")
        for asset in assets:
            print(f"  - {asset.get('name', 'No Name')} (ID: {asset['id']}, Status: {asset.get('status', 'No Status')})")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_po_status())