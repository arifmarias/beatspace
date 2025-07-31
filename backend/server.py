from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="BeatSpace API", description="Outdoor Advertising Marketplace")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class AssetType(str, Enum):
    BILLBOARD = "Billboard"
    POLICE_BOX = "Police Box"
    ROADSIDE_BARRIER = "Roadside Barrier"
    TRAFFIC_HEIGHT_RESTRICTION = "Traffic Height Restriction Overhead"
    RAILWAY_STATION = "Railway Station"
    MARKET = "Market"
    WALL = "Wall"
    OTHERS = "Others"

class AssetStatus(str, Enum):
    AVAILABLE = "Available"
    BOOKED = "Booked"
    LIVE = "Live"
    WORK_IN_PROGRESS = "Work in Progress"
    UNAVAILABLE = "Unavailable"

class ContractDuration(str, Enum):
    THREE_MONTHS = "3 months"
    SIX_MONTHS = "6 months"
    TWELVE_MONTHS = "12 months"
    CUSTOM = "Custom"

# Models
class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: AssetType
    address: str
    location: Dict[str, float]  # {"lat": float, "lng": float}
    dimensions: str  # e.g., "10 x 20"
    pricing: Dict[str, float]  # {"3_months": 5000, "6_months": 9000, "12_months": 15000}
    status: AssetStatus
    photos: List[str] = []
    description: str = ""
    specifications: Dict[str, Any] = {}
    seller_id: str
    seller_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    next_available_date: Optional[datetime] = None
    visibility_score: int = Field(default=5)  # 1-10 scale
    traffic_volume: str = "Medium"

class AssetCreate(BaseModel):
    name: str
    type: AssetType
    address: str
    location: Dict[str, float]
    dimensions: str
    pricing: Dict[str, float]
    status: AssetStatus = AssetStatus.AVAILABLE
    photos: List[str] = []
    description: str = ""
    specifications: Dict[str, Any] = {}
    seller_id: str
    seller_name: str
    next_available_date: Optional[datetime] = None
    visibility_score: int = 5
    traffic_volume: str = "Medium"

class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    buyer_id: str
    buyer_name: str
    asset_ids: List[str]
    description: str = ""
    budget: float
    status: str = "Draft"  # Draft, Pending Offer, Negotiating, Approved, Live, Completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    notes: str = ""

class CampaignCreate(BaseModel):
    name: str
    buyer_id: str
    buyer_name: str
    asset_ids: List[str]
    description: str = ""
    budget: float
    notes: str = ""

class BestOfferRequest(BaseModel):
    campaign_id: str
    asset_requirements: Dict[str, Dict[str, Any]]  # asset_id -> {duration, services, notes}
    timeline: str = ""
    special_requirements: str = ""

# Sample data initialization
async def init_sample_data():
    """Initialize sample outdoor advertising assets"""
    existing_count = await db.assets.count_documents({})
    if existing_count > 0:
        return
    
    sample_assets = [
        {
            "name": "Downtown Plaza Billboard",
            "type": "Billboard",
            "address": "123 Main Street, Downtown Dubai",
            "location": {"lat": 25.2048, "lng": 55.2708},
            "dimensions": "20 x 40 ft",
            "pricing": {"3_months": 15000, "6_months": 28000, "12_months": 50000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop"
            ],
            "description": "Prime location billboard in the heart of downtown with high visibility and foot traffic.",
            "specifications": {
                "lighting": "LED backlit",
                "material": "Vinyl",
                "installation": "Professional setup included"
            },
            "seller_id": "seller_001",
            "seller_name": "Dubai Outdoor Media",
            "visibility_score": 9,
            "traffic_volume": "High"
        },
        {
            "name": "Metro Station Digital Display",
            "type": "Railway Station",
            "address": "Business Bay Metro Station, Dubai",
            "location": {"lat": 25.1890, "lng": 55.2630},
            "dimensions": "10 x 6 ft",
            "pricing": {"3_months": 8000, "6_months": 14000, "12_months": 25000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&h=600&fit=crop"
            ],
            "description": "Digital display at busy metro station with thousands of daily commuters.",
            "specifications": {
                "type": "Digital LED",
                "resolution": "1920x1080",
                "content_rotation": "30 seconds"
            },
            "seller_id": "seller_002",
            "seller_name": "Transit Ads UAE",
            "visibility_score": 8,
            "traffic_volume": "Very High"
        },
        {
            "name": "Highway Roadside Banner",
            "type": "Roadside Barrier",
            "address": "Sheikh Zayed Road, Al Barsha",
            "location": {"lat": 25.1066, "lng": 55.1772},
            "dimensions": "15 x 8 ft",
            "pricing": {"3_months": 6000, "6_months": 11000, "12_months": 20000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
            ],
            "description": "Strategic roadside advertising on major highway with excellent visibility.",
            "specifications": {
                "material": "Weather-resistant vinyl",
                "mounting": "Steel frame",
                "visibility": "Both directions"
            },
            "seller_id": "seller_003",
            "seller_name": "Highway Media Group",
            "visibility_score": 7,
            "traffic_volume": "High"
        },
        {
            "name": "Mall Entrance Police Box",
            "type": "Police Box",
            "address": "Dubai Mall Entrance, Downtown Dubai",
            "location": {"lat": 25.1975, "lng": 55.2796},
            "dimensions": "4 x 8 ft",
            "pricing": {"3_months": 12000, "6_months": 22000, "12_months": 40000},
            "status": "Booked",
            "photos": [
                "https://images.unsplash.com/photo-1555861496-0666c8981751?w=800&h=600&fit=crop"
            ],
            "description": "Premium police box advertising at Dubai Mall entrance with premium foot traffic.",
            "specifications": {
                "sides": "4 sides available",
                "lighting": "Internal lighting",
                "material": "Vinyl wrap"
            },
            "seller_id": "seller_001",
            "seller_name": "Dubai Outdoor Media",
            "visibility_score": 10,
            "traffic_volume": "Very High",
            "next_available_date": "2025-09-01T00:00:00Z"
        },
        {
            "name": "Marina Walk Wall Display",
            "type": "Wall",
            "address": "Dubai Marina Walk, Marina",
            "location": {"lat": 25.0759, "lng": 55.1372},
            "dimensions": "25 x 12 ft",
            "pricing": {"3_months": 10000, "6_months": 18000, "12_months": 32000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1529612700005-e35377bf1415?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1486162928267-e6274cb3106f?w=800&h=600&fit=crop"
            ],
            "description": "Large wall display on Marina Walk with excellent pedestrian visibility.",
            "specifications": {
                "surface": "Smooth concrete wall",
                "lighting": "External spotlights",
                "accessibility": "Easy installation access"
            },
            "seller_id": "seller_004",
            "seller_name": "Marina Advertising Co.",
            "visibility_score": 8,
            "traffic_volume": "High"
        },
        {
            "name": "JBR Beach Traffic Restriction",
            "type": "Traffic Height Restriction Overhead",
            "address": "JBR Beach Road, Dubai",
            "location": {"lat": 25.0700, "lng": 55.1390},
            "dimensions": "12 x 4 ft",
            "pricing": {"3_months": 7000, "6_months": 12500, "12_months": 22000},
            "status": "Live",
            "photos": [
                "https://images.unsplash.com/photo-1532456745301-b2c645d8b80d?w=800&h=600&fit=crop"
            ],
            "description": "Overhead height restriction signage with advertising space on busy beach road.",
            "specifications": {
                "type": "Overhead mounted",
                "visibility": "Both directions",
                "installation": "Municipal approved"
            },
            "seller_id": "seller_005",
            "seller_name": "Beach Road Media",
            "visibility_score": 6,
            "traffic_volume": "Medium"
        }
    ]
    
    # Convert sample data to Asset models and insert
    for asset_data in sample_assets:
        asset = Asset(**asset_data)
        await db.assets.insert_one(asset.dict())

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await init_sample_data()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "BeatSpace API is running!"}

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    duration: Optional[ContractDuration] = None
):
    """Get all assets with optional filtering"""
    query = {}
    
    if asset_type:
        query["type"] = asset_type
    if status:
        query["status"] = status
    
    assets = await db.assets.find(query).to_list(1000)
    asset_objects = [Asset(**asset) for asset in assets]
    
    # Filter by pricing if specified
    if min_price is not None or max_price is not None or duration:
        filtered_assets = []
        for asset in asset_objects:
            if duration and duration != ContractDuration.CUSTOM:
                price_key = duration.replace(" ", "_")
                if price_key in asset.pricing:
                    price = asset.pricing[price_key]
                    if (min_price is None or price >= min_price) and (max_price is None or price <= max_price):
                        filtered_assets.append(asset)
            else:
                # Check all pricing options
                prices = list(asset.pricing.values())
                if prices:
                    min_asset_price = min(prices)
                    max_asset_price = max(prices)
                    if (min_price is None or max_asset_price >= min_price) and (max_price is None or min_asset_price <= max_price):
                        filtered_assets.append(asset)
        return filtered_assets
    
    return asset_objects

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str):
    """Get specific asset by ID"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return Asset(**asset)

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset: AssetCreate):
    """Create new asset (seller functionality)"""
    asset_obj = Asset(**asset.dict())
    await db.assets.insert_one(asset_obj.dict())
    return asset_obj

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(buyer_id: Optional[str] = None):
    """Get campaigns, optionally filtered by buyer"""
    query = {}
    if buyer_id:
        query["buyer_id"] = buyer_id
    
    campaigns = await db.campaigns.find(query).to_list(1000)
    return [Campaign(**campaign) for campaign in campaigns]

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign: CampaignCreate):
    """Create new campaign"""
    campaign_obj = Campaign(**campaign.dict())
    await db.campaigns.insert_one(campaign_obj.dict())
    return campaign_obj

@api_router.post("/campaigns/{campaign_id}/request-offer")
async def request_best_offer(campaign_id: str, request: BestOfferRequest):
    """Submit request for best offer"""
    # Update campaign status
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": "Pending Offer"}}
    )
    
    # Store the offer request
    offer_request = {
        "id": str(uuid.uuid4()),
        "campaign_id": campaign_id,
        **request.dict(),
        "status": "Pending",
        "created_at": datetime.utcnow()
    }
    await db.offer_requests.insert_one(offer_request)
    
    return {
        "message": "Best offer request submitted successfully",
        "request_id": offer_request["id"],
        "status": "pending_admin_review"
    }

@api_router.get("/stats")
async def get_platform_stats():
    """Get platform statistics"""
    total_assets = await db.assets.count_documents({})
    available_assets = await db.assets.count_documents({"status": "Available"})
    total_campaigns = await db.campaigns.count_documents({})
    
    return {
        "total_assets": total_assets,
        "available_assets": available_assets,
        "total_campaigns": total_campaigns,
        "asset_types": [asset_type.value for asset_type in AssetType]
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()