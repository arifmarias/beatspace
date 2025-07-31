from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from enum import Enum
import bcrypt
from jose import JWTError, jwt
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = "beatspace_secret_key_2025_production"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(
    title="BeatSpace API", 
    description="Bangladesh Outdoor Advertising Marketplace - Production System",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums
class AssetType(str, Enum):
    BILLBOARD = "Billboard"
    POLICE_BOX = "Police Box"
    ROADSIDE_BARRIER = "Roadside Barrier"
    TRAFFIC_HEIGHT_RESTRICTION = "Traffic Height Restriction Overhead"
    RAILWAY_STATION = "Railway Station"
    MARKET = "Market"
    WALL = "Wall"
    BRIDGE = "Bridge"
    BUS_STOP = "Bus Stop"
    OTHERS = "Others"

class AssetStatus(str, Enum):
    AVAILABLE = "Available"
    PENDING_APPROVAL = "Pending Approval"
    BOOKED = "Booked"
    LIVE = "Live"
    WORK_IN_PROGRESS = "Work in Progress"
    UNAVAILABLE = "Unavailable"

class UserRole(str, Enum):
    BUYER = "buyer"
    SELLER = "seller"
    ADMIN = "admin"

class UserStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    company_name: str
    contact_name: str
    phone: str
    role: UserRole
    status: UserStatus = UserStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    address: Optional[str] = None
    website: Optional[str] = None
    business_license: Optional[str] = None  # Document URL for sellers
    verified_at: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    contact_name: str
    phone: str
    role: UserRole
    address: Optional[str] = None
    website: Optional[str] = None
    business_license: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: AssetType
    address: str
    location: Dict[str, float]  # {"lat": float, "lng": float}
    dimensions: str  # e.g., "10 x 20"
    pricing: Dict[str, float]  # {"3_months": 50000, "6_months": 90000, "12_months": 150000}
    status: AssetStatus
    photos: List[str] = []
    description: str = ""
    specifications: Dict[str, Any] = {}
    seller_id: str
    seller_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    next_available_date: Optional[datetime] = None
    visibility_score: int = Field(default=5)  # 1-10 scale
    traffic_volume: str = "Medium"
    district: str = ""
    division: str = ""

class AssetCreate(BaseModel):
    name: str
    type: AssetType
    address: str
    location: Dict[str, float]
    dimensions: str
    pricing: Dict[str, float]
    photos: List[str] = []
    description: str = ""
    specifications: Dict[str, Any] = {}
    visibility_score: int = 5
    traffic_volume: str = "Medium"
    district: str = ""
    division: str = ""

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

# Utility functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Bangladesh sample data initialization
async def init_bangladesh_sample_data():
    """Initialize sample outdoor advertising assets for Bangladesh"""
    existing_count = await db.assets.count_documents({})
    if existing_count > 0:
        return
    
    bangladesh_assets = [
        {
            "name": "Dhanmondi Lake Billboard",
            "type": "Billboard",
            "address": "Dhanmondi Lake, Road 32, Dhaka 1209",
            "location": {"lat": 23.7461, "lng": 90.3742},
            "dimensions": "20 x 40 ft",
            "pricing": {"3_months": 150000, "6_months": 280000, "12_months": 500000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1541888946425-d81bb1924c35?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop"
            ],
            "description": "Prime location billboard at Dhanmondi Lake with high visibility and foot traffic from affluent residential area.",
            "specifications": {
                "lighting": "LED backlit",
                "material": "Vinyl with weather protection",
                "installation": "Professional setup included"
            },
            "seller_id": "seller_bd_001",
            "seller_name": "Dhaka Outdoor Media Ltd.",
            "visibility_score": 9,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka"
        },
        {
            "name": "Farmgate Metro Station Display",
            "type": "Railway Station",
            "address": "Farmgate Metro Station, Tejgaon, Dhaka 1215",
            "location": {"lat": 23.7588, "lng": 90.3892},
            "dimensions": "12 x 8 ft",
            "pricing": {"3_months": 80000, "6_months": 140000, "12_months": 250000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&h=600&fit=crop"
            ],
            "description": "Digital display at busy Farmgate Metro Station with thousands of daily commuters from all economic segments.",
            "specifications": {
                "type": "Digital LED Screen",
                "resolution": "1920x1080 Full HD",
                "content_rotation": "30 seconds per ad"
            },
            "seller_id": "seller_bd_002",
            "seller_name": "Metro Ads Bangladesh",
            "visibility_score": 8,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka"
        },
        {
            "name": "Chittagong Highway Billboard",
            "type": "Billboard",
            "address": "Dhaka-Chittagong Highway, Cumilla",
            "location": {"lat": 23.4607, "lng": 91.1809},
            "dimensions": "25 x 15 ft",
            "pricing": {"3_months": 60000, "6_months": 110000, "12_months": 200000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
            ],
            "description": "Strategic highway billboard on major Dhaka-Chittagong route with excellent visibility for inter-city travelers.",
            "specifications": {
                "material": "Weather-resistant vinyl",
                "mounting": "Steel frame with wind resistance",
                "visibility": "Both directions traffic"
            },
            "seller_id": "seller_bd_003",
            "seller_name": "Highway Media Bangladesh",
            "visibility_score": 7,
            "traffic_volume": "High",
            "district": "Cumilla",
            "division": "Chittagong"
        },
        {
            "name": "New Market Police Box",
            "type": "Police Box",
            "address": "New Market, Azimpur Road, Dhaka 1205",
            "location": {"lat": 23.7272, "lng": 90.3981},
            "dimensions": "4 x 8 ft (4 sides)",
            "pricing": {"3_months": 120000, "6_months": 220000, "12_months": 400000},
            "status": "Booked",
            "photos": [
                "https://images.unsplash.com/photo-1555861496-0666c8981751?w=800&h=600&fit=crop"
            ],
            "description": "Premium police box advertising at New Market with massive foot traffic from shoppers and commuters.",
            "specifications": {
                "sides": "4 sides available for advertising",
                "lighting": "Internal LED lighting",
                "material": "Vinyl wrap with anti-graffiti coating"
            },
            "seller_id": "seller_bd_001",
            "seller_name": "Dhaka Outdoor Media Ltd.",
            "visibility_score": 10,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka",
            "next_available_date": "2025-10-01T00:00:00Z"
        },
        {
            "name": "Sylhet Bus Terminal Wall",
            "type": "Wall",
            "address": "Sylhet Central Bus Terminal, Amberkhana",
            "location": {"lat": 24.8949, "lng": 91.8687},
            "dimensions": "30 x 15 ft",
            "pricing": {"3_months": 45000, "6_months": 80000, "12_months": 140000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1529612700005-e35377bf1415?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1486162928267-e6274cb3106f?w=800&h=600&fit=crop"
            ],
            "description": "Large wall display at Sylhet's main bus terminal with excellent visibility for inter-district travelers.",
            "specifications": {
                "surface": "Smooth concrete wall",
                "lighting": "External LED spotlights",
                "accessibility": "Easy installation and maintenance access"
            },
            "seller_id": "seller_bd_004",
            "seller_name": "Sylhet Advertising Co.",
            "visibility_score": 8,
            "traffic_volume": "High",
            "district": "Sylhet",
            "division": "Sylhet"
        },
        {
            "name": "Chittagong Port Road Bridge Banner",
            "type": "Bridge",
            "address": "Khatunganj Bridge, Chittagong Port Access Road",
            "location": {"lat": 22.3475, "lng": 91.8123},
            "dimensions": "20 x 6 ft",
            "pricing": {"3_months": 70000, "6_months": 125000, "12_months": 220000},
            "status": "Live",
            "photos": [
                "https://images.unsplash.com/photo-1532456745301-b2c645d8b80d?w=800&h=600&fit=crop"
            ],
            "description": "Bridge banner on busy port access road with high commercial vehicle traffic and port users.",
            "specifications": {
                "type": "Overhead bridge banner",
                "visibility": "Both directions",
                "weather_protection": "Monsoon resistant materials"
            },
            "seller_id": "seller_bd_005",
            "seller_name": "Chittagong Port Ads",
            "visibility_score": 7,
            "traffic_volume": "High",
            "district": "Chittagong",
            "division": "Chittagong"
        },
        {
            "name": "Uttara Bus Stop Shelter",
            "type": "Bus Stop",
            "address": "Uttara Sector 7, Airport Road, Dhaka 1230",
            "location": {"lat": 23.8759, "lng": 90.3795},
            "dimensions": "8 x 4 ft",
            "pricing": {"3_months": 35000, "6_months": 65000, "12_months": 120000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop"
            ],
            "description": "Bus stop shelter advertising in upscale Uttara area with consistent daily commuter exposure.",
            "specifications": {
                "type": "Backlit poster display",
                "protection": "Weather-resistant frame",
                "maintenance": "Monthly cleaning included"
            },
            "seller_id": "seller_bd_006",
            "seller_name": "Urban Transit Ads",
            "visibility_score": 6,
            "traffic_volume": "Medium",
            "district": "Dhaka",
            "division": "Dhaka"
        }
    ]
    
    # Convert and insert sample data
    for asset_data in bangladesh_assets:
        asset = Asset(**asset_data)
        await db.assets.insert_one(asset.dict())

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await init_bangladesh_sample_data()

# Authentication Routes
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserCreate):
    """Register new user (buyer or seller)"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_data.password)
    
    # Create user
    user_dict = user_data.dict()
    del user_dict['password']
    user = User(**user_dict)
    
    # Store user with hashed password
    user_doc = user.dict()
    user_doc['password_hash'] = hashed_password
    
    await db.users.insert_one(user_doc)
    
    return {
        "message": "Registration successful. Please wait for admin approval.",
        "user_id": user.id,
        "status": user.status
    }

@api_router.post("/auth/login", response_model=Token)
async def login_user(login_data: UserLogin):
    """Login user and return JWT token"""
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user['status'] != UserStatus.APPROVED:
        raise HTTPException(status_code=403, detail=f"Account status: {user['status']}. Please wait for admin approval.")
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['id'], "role": user['role']}, 
        expires_delta=access_token_expires
    )
    
    # Remove password from response
    user_obj = User(**user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj
    }

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Public Routes (no authentication required)
@api_router.get("/")
async def root():
    return {"message": "BeatSpace API - Bangladesh Outdoor Advertising Marketplace"}

@api_router.get("/assets/public", response_model=List[Asset])
async def get_public_assets(
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    division: Optional[str] = None,
    district: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    """Get publicly available assets (no authentication required)"""
    query = {"status": {"$in": ["Available", "Booked", "Live"]}}
    
    if asset_type:
        query["type"] = asset_type
    if status:
        query["status"] = status
    if division:
        query["division"] = division
    if district:
        query["district"] = district
    
    assets = await db.assets.find(query).to_list(1000)
    asset_objects = [Asset(**asset) for asset in assets]
    
    # Filter by pricing if specified
    if min_price is not None or max_price is not None:
        filtered_assets = []
        for asset in asset_objects:
            prices = list(asset.pricing.values())
            if prices:
                min_asset_price = min(prices)
                max_asset_price = max(prices)
                if (min_price is None or max_asset_price >= min_price) and (max_price is None or min_asset_price <= max_price):
                    filtered_assets.append(asset)
        return filtered_assets
    
    return asset_objects

@api_router.get("/stats/public", response_model=dict)
async def get_public_stats():
    """Get public platform statistics"""
    total_assets = await db.assets.count_documents({})
    available_assets = await db.assets.count_documents({"status": "Available"})
    total_users = await db.users.count_documents({})
    
    # Get asset distribution by division
    pipeline = [
        {"$group": {"_id": "$division", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    division_stats = await db.assets.aggregate(pipeline).to_list(10)
    
    return {
        "total_assets": total_assets,
        "available_assets": available_assets,
        "total_users": total_users,
        "divisions": division_stats,
        "asset_types": [asset_type.value for asset_type in AssetType],
        "currency": "BDT"
    }

# Protected Routes (authentication required)
@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    current_user: User = Depends(get_current_user),
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    division: Optional[str] = None,
    district: Optional[str] = None
):
    """Get assets (authenticated users)"""
    query = {}
    
    # Sellers can only see their own assets
    if current_user.role == UserRole.SELLER:
        query["seller_id"] = current_user.id
    
    if asset_type:
        query["type"] = asset_type
    if status:
        query["status"] = status
    if division:
        query["division"] = division
    if district:
        query["district"] = district
    
    assets = await db.assets.find(query).to_list(1000)
    return [Asset(**asset) for asset in assets]

@api_router.post("/assets", response_model=Asset)
async def create_asset(
    asset: AssetCreate, 
    current_user: User = Depends(get_current_user)
):
    """Create new asset (seller only)"""
    if current_user.role != UserRole.SELLER:
        raise HTTPException(status_code=403, detail="Only sellers can create assets")
    
    asset_obj = Asset(
        **asset.dict(),
        seller_id=current_user.id,
        seller_name=current_user.company_name,
        status=AssetStatus.PENDING_APPROVAL
    )
    
    await db.assets.insert_one(asset_obj.dict())
    return asset_obj

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(current_user: User = Depends(get_current_user)):
    """Get user campaigns"""
    query = {}
    if current_user.role == UserRole.BUYER:
        query["buyer_id"] = current_user.id
    
    campaigns = await db.campaigns.find(query).to_list(1000)
    return [Campaign(**campaign) for campaign in campaigns]

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