from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
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
import cloudinary
import cloudinary.uploader
import emails
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = "beatspace_secret_key_2025_production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours for better UX

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'beatspace-demo'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', 'demo_key_123'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 'demo_secret_456')
)

# Create the main app
app = FastAPI(
    title="BeatSpace API", 
    description="Bangladesh Outdoor Advertising Marketplace - Production System v3.0",
    version="3.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Enums (Previous enums plus new ones)
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
    PENDING_OFFER = "Pending Offer"
    NEGOTIATING = "Negotiating"
    BOOKED = "Booked"
    WORK_IN_PROGRESS = "Work in Progress"
    LIVE = "Live"
    COMPLETED = "Completed"
    PENDING_APPROVAL = "Pending Approval"
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

class CampaignStatus(str, Enum):
    DRAFT = "Draft"
    NEGOTIATION = "Negotiation"
    READY = "Ready"
    LIVE = "Live"
    COMPLETED = "Completed"

class CampaignAsset(BaseModel):
    asset_id: str
    asset_name: str
    asset_start_date: datetime
    asset_expiration_date: datetime
    added_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# Models (Enhanced with Phase 3 features)
# Enhanced Models for Request Best Offer Workflow
class ServiceBundles(BaseModel):
    printing: bool = False
    setup: bool = False
    monitoring: bool = False

class OfferRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_id: str
    buyer_name: str
    asset_id: str
    asset_name: str
    campaign_name: str
    campaign_type: str  # 'new' or 'existing'
    existing_campaign_id: Optional[str] = None
    contract_duration: str
    estimated_budget: Optional[float] = None
    service_bundles: ServiceBundles
    timeline: Optional[str] = None
    special_requirements: Optional[str] = None
    notes: Optional[str] = None
    status: str = "Pending"  # Pending, Processing, Quoted, Accepted, Rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)
    admin_response: Optional[str] = None
    final_offer: Optional[dict] = None
    quoted_at: Optional[datetime] = None

class OfferRequestCreate(BaseModel):
    asset_id: str
    campaign_name: str
    campaign_type: str  # 'new' or 'existing'
    existing_campaign_id: Optional[str] = None
    contract_duration: str
    estimated_budget: Optional[float] = None
    service_bundles: ServiceBundles
    timeline: Optional[str] = None
    special_requirements: Optional[str] = None
    notes: Optional[str] = None

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

class UserStatusUpdate(BaseModel):
    status: UserStatus
    reason: Optional[str] = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    company_name: str
    contact_name: str
    phone: str
    role: UserRole
    status: UserStatus = UserStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified_at: Optional[datetime] = None
    address: Optional[str] = None
    website: Optional[str] = None
    business_license: Optional[str] = None
    last_login: Optional[datetime] = None
    subscription_plan: Optional[str] = "basic"

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: AssetType
    address: str
    location: Dict[str, float]
    dimensions: str
    pricing: Dict[str, float]
    status: AssetStatus
    photos: List[str] = []
    description: str = ""
    specifications: Dict[str, Any] = {}
    seller_id: str
    seller_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    next_available_date: Optional[datetime] = None
    visibility_score: int = Field(default=5)
    traffic_volume: str = "Medium"
    district: str = ""
    division: str = ""
    total_bookings: int = 0
    total_revenue: float = 0
    last_monitored: Optional[datetime] = None

class MonitoringRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    photos: List[str] = []
    condition_rating: int = Field(ge=1, le=10)
    notes: str = ""
    weather_condition: str = "Clear"
    maintenance_required: bool = False
    issues_reported: str = ""
    inspector: str = ""
    gps_location: Optional[Dict[str, float]] = None

class FinalOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    campaign_id: str
    final_pricing: Dict[str, float]
    terms: str
    timeline: str
    included_services: List[str]
    total_amount: float
    admin_notes: str = ""
    status: str = "Offer Ready"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=7))

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    offer_id: str
    amount: float
    currency: str = "BDT"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: str = ""
    transaction_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    invoice_url: Optional[str] = None

# Enhanced Models for Phase 3
class MonitoringRecordCreate(BaseModel):
    asset_id: str
    photos: List[str] = []
    condition_rating: int = Field(ge=1, le=10)
    notes: str = ""
    weather_condition: str = "Clear"
    maintenance_required: bool = False
    issues_reported: str = ""
    inspector: str = ""
    gps_location: Optional[Dict[str, float]] = None

class FinalOfferCreate(BaseModel):
    request_id: str
    campaign_id: str
    final_pricing: Dict[str, float]
    terms: str
    timeline: str
    included_services: List[str] = []
    total_amount: float
    admin_notes: str = ""

class PaymentCreate(BaseModel):
    campaign_id: str
    offer_id: str
    amount: float
    payment_method: str = "bank_transfer"

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
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
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
    
    # Update last login
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    return User(**user)

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Email notification functions
def send_notification_email(to_email: str, subject: str, content: str):
    """Send notification email (demo implementation)"""
    try:
        # In production, implement actual email sending
        print(f"📧 Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"Email error: {e}")
        return False

def generate_invoice_pdf(payment: Payment, campaign_data: dict) -> bytes:
    """Generate PDF invoice"""
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, "BeatSpace - Invoice")
    
    # Invoice details
    p.setFont("Helvetica", 12)
    p.drawString(50, 700, f"Invoice ID: {payment.id}")
    p.drawString(50, 680, f"Campaign: {campaign_data.get('name', 'N/A')}")
    p.drawString(50, 660, f"Amount: ৳{payment.amount:,.2f}")
    p.drawString(50, 640, f"Date: {payment.created_at.strftime('%Y-%m-%d')}")
    
    p.save()
    buffer.seek(0)
    return buffer.getvalue()

async def update_assets_status_for_campaign(campaign_id: str, campaign_status: str):
    """Update asset statuses based on campaign status"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        return
    
    asset_ids = campaign.get("assets", [])
    if not asset_ids:
        return
    
    # Set asset status based on campaign status
    if campaign_status == "Live":
        new_asset_status = AssetStatus.LIVE
    elif campaign_status == "Draft":
        new_asset_status = AssetStatus.AVAILABLE
    elif campaign_status == "Booked":
        new_asset_status = AssetStatus.BOOKED
    else:
        return  # Don't change asset status for other campaign statuses
    
    # Update all assets in the campaign
    await db.assets.update_many(
        {"id": {"$in": asset_ids}},
        {"$set": {"status": new_asset_status}}
    )
    
    logger.info(f"Updated {len(asset_ids)} assets to status '{new_asset_status}' for campaign {campaign_id}")

@api_router.put("/campaigns/{campaign_id}/status")
async def update_campaign_status(
    campaign_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update campaign status and handle asset status changes"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check permissions
    if current_user.role == UserRole.BUYER and campaign["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update your own campaigns")
    
    new_status = status_data.get("status")
    if new_status not in ["Draft", "Live", "Paused", "Completed", "Cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid campaign status")
    
    # Update campaign status
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
    )
    
    # Update asset statuses based on campaign status
    await update_assets_status_for_campaign(campaign_id, new_status)
    
    return {"message": f"Campaign status updated to {new_status}"}

# Enhanced sample data initialization
async def init_bangladesh_sample_data():
    """Initialize comprehensive sample data"""
    
    # Clear existing data to ensure fresh start
    await db.assets.delete_many({})
    await db.campaigns.delete_many({})
    
    # Only keep essential users (admin and demo accounts)
    existing_admin = await db.users.find_one({"email": "admin@beatspace.com"})
    existing_seller = await db.users.find_one({"email": "dhaka.media@example.com"})
    existing_buyer = await db.users.find_one({"email": "marketing@grameenphone.com"})
    
    if not existing_admin or not existing_seller or not existing_buyer:
        # Clear all users and recreate essential ones
        await db.users.delete_many({})
        
        # Create admin user
        admin_user = {
            "id": str(uuid.uuid4()),
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
        
        # Create sample seller users
        sample_sellers = [
            {
                "id": "seller_bd_001",
                "email": "dhaka.media@example.com",
                "password_hash": hash_password("seller123"),
                "company_name": "Dhaka Outdoor Media Ltd.",
                "contact_name": "Rahman Ahmed",
                "phone": "+8801712345678",
                "role": "seller",
                "status": "approved",
                "created_at": datetime.utcnow(),
                "verified_at": datetime.utcnow(),
                "address": "Dhanmondi, Dhaka",
                "subscription_plan": "premium"
            },
            {
                "id": "seller_bd_002", 
                "email": "ctg.ads@example.com",
                "password_hash": hash_password("seller123"),
                "company_name": "Chittagong Advertising Solutions",
                "contact_name": "Fatima Khan",
                "phone": "+8801812345678",
                "role": "seller",
                "status": "approved",
                "created_at": datetime.utcnow(),
                "verified_at": datetime.utcnow(),
                "address": "Chittagong City",
                "subscription_plan": "basic"
            }
        ]
        
        for seller in sample_sellers:
            await db.users.insert_one(seller)
        
        # Create sample buyer user
        sample_buyer = {
            "id": "buyer_bd_001",
            "email": "marketing@grameenphone.com",
            "password_hash": hash_password("buyer123"),
            "company_name": "Grameenphone Ltd.",
            "contact_name": "Sarah Rahman",
            "phone": "+8801912345678",
            "role": "buyer",
            "status": "approved",
            "created_at": datetime.utcnow(),
            "verified_at": datetime.utcnow(),
            "address": "Gulshan, Dhaka",
            "subscription_plan": "enterprise"
        }
        await db.users.insert_one(sample_buyer)
    
    # Sample assets (Enhanced with complete data) - only create if none exist
    existing_assets = await db.assets.count_documents({})
    if existing_assets == 0:
        bangladesh_assets = [
        {
            "id": str(uuid.uuid4()),
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
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "visibility_score": 9,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka",
            "total_bookings": 12,
            "total_revenue": 1800000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Farmgate Metro Station Display",
            "type": "Railway Station",
            "address": "Farmgate Metro Station, Tejgaon, Dhaka",
            "location": {"lat": 23.7558, "lng": 90.3897},
            "dimensions": "15 x 30 ft",
            "pricing": {"3_months": 120000, "6_months": 220000, "12_months": 400000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop"
            ],
            "description": "High-traffic digital display at Farmgate Metro Station, perfect for reaching daily commuters.",
            "specifications": {
                "lighting": "Digital LED screen",
                "material": "Weatherproof digital display",
                "installation": "Mounted installation included"
            },
            "seller_id": "seller_bd_001",
            "seller_name": "Dhaka Outdoor Media Ltd.",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "visibility_score": 8,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka",
            "total_bookings": 8,
            "total_revenue": 960000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Gulshan Circle Wall Advertisement",
            "type": "Wall",
            "address": "Gulshan Circle 1, Dhaka 1212",
            "location": {"lat": 23.7808, "lng": 90.4134},
            "dimensions": "25 x 35 ft",
            "pricing": {"3_months": 180000, "6_months": 330000, "12_months": 600000},
            "status": "Booked",
            "photos": [
                "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=800&h=600&fit=crop"
            ],
            "description": "Premium wall space at Gulshan Circle, one of Dhaka's most prestigious commercial areas.",
            "specifications": {
                "lighting": "Spotlit during evening hours",
                "material": "Vinyl with UV protection",
                "installation": "Professional mounting included"
            },
            "seller_id": "seller_bd_001",
            "seller_name": "Dhaka Outdoor Media Ltd.",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "next_available_date": datetime.utcnow() + timedelta(days=90),
            "visibility_score": 10,
            "traffic_volume": "Very High",
            "district": "Dhaka",
            "division": "Dhaka",
            "total_bookings": 15,
            "total_revenue": 2700000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Chittagong Port Road Billboard",
            "type": "Billboard",
            "address": "Port Access Road, Chittagong",
            "location": {"lat": 22.3569, "lng": 91.7832},
            "dimensions": "18 x 36 ft",
            "pricing": {"3_months": 100000, "6_months": 180000, "12_months": 320000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop"
            ],
            "description": "Strategic billboard location on the main route to Chittagong Port, high commercial vehicle traffic.",
            "specifications": {
                "lighting": "Solar-powered LED lighting",
                "material": "Weather-resistant vinyl",
                "installation": "Steel structure with concrete foundation"
            },
            "seller_id": "seller_bd_002",
            "seller_name": "Chittagong Advertising Solutions",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "visibility_score": 7,
            "traffic_volume": "High",
            "district": "Chittagong",
            "division": "Chittagong",
            "total_bookings": 6,
            "total_revenue": 600000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Sylhet Airport Entrance Display",
            "type": "Billboard",
            "address": "Osmani International Airport, Sylhet",
            "location": {"lat": 24.9633, "lng": 91.8679},
            "dimensions": "12 x 24 ft",
            "pricing": {"3_months": 80000, "6_months": 145000, "12_months": 260000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=600&fit=crop"
            ],
            "description": "Airport entrance billboard targeting business travelers and tourists visiting Sylhet.",
            "specifications": {
                "lighting": "LED backlit panel",
                "material": "Aluminum composite with vinyl wrap",
                "installation": "Professional installation and maintenance"
            },
            "seller_id": "seller_bd_002",
            "seller_name": "Chittagong Advertising Solutions",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "visibility_score": 6,
            "traffic_volume": "Medium",
            "district": "Sylhet",
            "division": "Sylhet",
            "total_bookings": 4,
            "total_revenue": 320000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Rajshahi University Area Billboard",
            "type": "Billboard", 
            "address": "University Road, Rajshahi",
            "location": {"lat": 24.3745, "lng": 88.6042},
            "dimensions": "16 x 32 ft",
            "pricing": {"3_months": 70000, "6_months": 125000, "12_months": 220000},
            "status": "Work in Progress",
            "photos": [
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop"
            ],
            "description": "University area billboard targeting students, faculty, and young professionals in Rajshahi.",
            "specifications": {
                "lighting": "Standard evening illumination", 
                "material": "Vinyl banner with steel frame",
                "installation": "Currently under construction"
            },
            "seller_id": "seller_bd_002",
            "seller_name": "Chittagong Advertising Solutions",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "next_available_date": datetime.utcnow() + timedelta(days=30),
            "visibility_score": 5,
            "traffic_volume": "Medium",
            "district": "Rajshahi",
            "division": "Rajshahi",
            "total_bookings": 2,
            "total_revenue": 140000
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Khulna Shipyard Bridge Banner",
            "type": "Bridge",
            "address": "Rupsha Bridge, Khulna",
            "location": {"lat": 22.8456, "lng": 89.5403},
            "dimensions": "30 x 10 ft",
            "pricing": {"3_months": 60000, "6_months": 110000, "12_months": 190000},
            "status": "Available",
            "photos": [
                "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&h=600&fit=crop"
            ],
            "description": "Bridge banner over major river crossing in Khulna, visible to all vehicle and pedestrian traffic.",
            "specifications": {
                "lighting": "No artificial lighting",
                "material": "Heavy-duty mesh banner",
                "installation": "Bridge-mounted with safety harness access"
            },
            "seller_id": "seller_bd_002",
            "seller_name": "Chittagong Advertising Solutions",
            "created_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
            "visibility_score": 6,
            "traffic_volume": "High",
            "district": "Khulna",
            "division": "Khulna",
            "total_bookings": 3,
            "total_revenue": 180000
        }
    ]
    
        # Insert enhanced assets
        for asset_data in bangladesh_assets:
            asset = Asset(**asset_data)
            await db.assets.insert_one(asset.dict())
    
    # Create sample campaigns with realistic statuses - only if none exist
    existing_campaigns = await db.campaigns.count_documents({})
    if existing_campaigns == 0:
        campaign_1_id = str(uuid.uuid4())
        campaign_2_id = str(uuid.uuid4())
        campaign_3_id = str(uuid.uuid4())
        
        sample_campaigns = [
        {
            "id": campaign_1_id,
            "name": "Grameenphone 5G Launch Campaign",
            "buyer_id": "buyer_bd_001",
            "buyer_name": "Grameenphone Ltd.",
            "description": "National campaign to promote new 5G services across major cities",
            "assets": [bangladesh_assets[0]["id"], bangladesh_assets[1]["id"]],  # Dhanmondi Lake + Farmgate Metro
            "status": "Live",
            "budget": 500000,
            "created_at": datetime.utcnow() - timedelta(days=30),
            "updated_at": datetime.utcnow() - timedelta(days=15),
            "start_date": datetime.utcnow() - timedelta(days=15),
            "end_date": datetime.utcnow() + timedelta(days=75)
        },
        {
            "id": campaign_2_id,
            "name": "Summer Fashion Collection 2025",
            "buyer_id": "buyer_bd_001", 
            "buyer_name": "Grameenphone Ltd.",
            "description": "Seasonal fashion promotion targeting urban youth",
            "assets": [bangladesh_assets[3]["id"], bangladesh_assets[4]["id"]],  # Chittagong Port + Sylhet Airport
            "status": "Draft",
            "budget": 300000,
            "created_at": datetime.utcnow() - timedelta(days=7),
            "updated_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "id": campaign_3_id,
            "name": "Bank Asia Digital Banking",
            "buyer_id": "buyer_bd_001",
            "buyer_name": "Grameenphone Ltd.",
            "description": "Promoting digital banking services across Bangladesh",
            "assets": [bangladesh_assets[2]["id"]],  # Gulshan Circle (already set to Booked)
            "status": "Live",
            "budget": 600000,
            "created_at": datetime.utcnow() - timedelta(days=45),
            "updated_at": datetime.utcnow() - timedelta(days=30),
            "start_date": datetime.utcnow() - timedelta(days=30),
            "end_date": datetime.utcnow() + timedelta(days=60)
        }
        ]
        
        # Update asset statuses to match campaign statuses
        # Assets in Live campaigns should be "Live"
        bangladesh_assets[0]["status"] = "Live"  # Dhanmondi Lake - Live campaign
        bangladesh_assets[1]["status"] = "Live"  # Farmgate Metro - Live campaign
        bangladesh_assets[2]["status"] = "Live"  # Gulshan Circle - Live campaign
        
        # Assets in Draft campaigns remain "Available"
        bangladesh_assets[3]["status"] = "Available"  # Chittagong Port - Draft campaign
        bangladesh_assets[4]["status"] = "Available"  # Sylhet Airport - Draft campaign
        
        # Some assets not in any campaign
        bangladesh_assets[5]["status"] = "Work in Progress"  # Rajshahi University
        bangladesh_assets[6]["status"] = "Available"  # Khulna Bridge
        
        for campaign in sample_campaigns:
            existing_campaign = await db.campaigns.find_one({"id": campaign["id"]})
            if not existing_campaign:
                await db.campaigns.insert_one(campaign)
    
    # Create sample offer requests with realistic data
    existing_offers = await db.offer_requests.count_documents({})
    if existing_offers == 0:
        sample_offers = [
            {
                "id": str(uuid.uuid4()),
                "buyer_id": "buyer_bd_001",
                "buyer_name": "Grameenphone Ltd.",
                "asset_id": bangladesh_assets[2]["id"],  # New Market Billboard
                "asset_name": "New Market Billboard",
                "campaign_name": "Winter Sale Campaign 2025",
                "campaign_type": "existing",
                "existing_campaign_id": campaign_1_id,
                "contract_duration": "3_months",
                "estimated_budget": 85000,
                "service_bundles": {
                    "printing": True,
                    "setup": True,
                    "monitoring": False
                },
                "timeline": f"Asset starts from {(datetime.utcnow() + timedelta(days=14)).strftime('%m/%d/%Y')}",
                "special_requirements": "Need high-resolution printing with weather-resistant material",
                "notes": "Priority asset for winter campaign launch",
                "status": "Pending",
                "created_at": datetime.utcnow() - timedelta(days=3)
            },
            {
                "id": str(uuid.uuid4()),
                "buyer_id": "buyer_bd_001",
                "buyer_name": "Grameenphone Ltd.",
                "asset_id": bangladesh_assets[5]["id"],  # Rajshahi University
                "asset_name": "Rajshahi University Area Billboard",
                "campaign_name": "Student Internet Package 2025",
                "campaign_type": "existing", 
                "existing_campaign_id": campaign_2_id,
                "contract_duration": "6_months",
                "estimated_budget": 125000,
                "service_bundles": {
                    "printing": True,
                    "setup": False,
                    "monitoring": True
                },
                "timeline": f"Asset starts from {(datetime.utcnow() + timedelta(days=7)).strftime('%m/%d/%Y')}",
                "special_requirements": "Youth-focused design with vibrant colors and university theme",
                "notes": "Target university students and faculty members",
                "status": "Processing",
                "created_at": datetime.utcnow() - timedelta(days=5)
            },
            {
                "id": str(uuid.uuid4()),
                "buyer_id": "buyer_bd_001",
                "buyer_name": "Grameenphone Ltd.",
                "asset_id": bangladesh_assets[6]["id"],  # Khulna Bridge
                "asset_name": "Khulna Shipyard Bridge Banner",
                "campaign_name": "Eid Special Offer 2025",
                "campaign_type": "existing",
                "existing_campaign_id": campaign_3_id,
                "contract_duration": "12_months",
                "estimated_budget": 190000,
                "service_bundles": {
                    "printing": True,
                    "setup": True,
                    "monitoring": True
                },
                "timeline": f"Asset starts from {(datetime.utcnow() + timedelta(days=21)).strftime('%m/%d/%Y')}",
                "special_requirements": "Heavy-duty materials for bridge installation, safety compliance required",
                "notes": "Long-term strategic placement for regional market penetration",
                "status": "Pending",
                "created_at": datetime.utcnow() - timedelta(days=1)
            },
            {
                "id": str(uuid.uuid4()),
                "buyer_id": "buyer_bd_001",
                "buyer_name": "Grameenphone Ltd.",
                "asset_id": bangladesh_assets[0]["id"],  # Dhanmondi Lake
                "asset_name": "Dhanmondi Lake LED Display",
                "campaign_name": "Digital Banking Launch",
                "campaign_type": "existing",
                "existing_campaign_id": campaign_1_id,
                "contract_duration": "3_months", 
                "estimated_budget": 150000,
                "service_bundles": {
                    "printing": False,
                    "setup": True,
                    "monitoring": True
                },
                "timeline": f"Asset starts from {(datetime.utcnow() + timedelta(days=10)).strftime('%m/%d/%Y')}",
                "special_requirements": "Digital content creation and scheduling, prime time slots preferred",
                "notes": "High-visibility location for digital banking services promotion",
                "status": "Quoted",
                "created_at": datetime.utcnow() - timedelta(days=8)
            },
            {
                "id": str(uuid.uuid4()),
                "buyer_id": "buyer_bd_001",
                "buyer_name": "Grameenphone Ltd.",
                "asset_id": bangladesh_assets[1]["id"],  # Farmgate Metro
                "asset_name": "Farmgate Metro Station Display",
                "campaign_name": "Weekend Data Pack Promotion",
                "campaign_type": "existing",
                "existing_campaign_id": campaign_2_id,
                "contract_duration": "6_months",
                "estimated_budget": 180000,
                "service_bundles": {
                    "printing": True,
                    "setup": True,
                    "monitoring": False
                },
                "timeline": f"Asset starts from {(datetime.utcnow() + timedelta(days=5)).strftime('%m/%d/%Y')}",
                "special_requirements": "Metro-compliant materials, rush hour visibility optimization",
                "notes": "Target commuters during peak hours for data pack promotions",
                "status": "Pending",
                "created_at": datetime.utcnow() - timedelta(hours=12)
            }
        ]
        
        for offer in sample_offers:
            await db.offer_requests.insert_one(offer)

# Initialize sample data on startup
@app.on_event("startup")
async def startup_event():
    await init_bangladesh_sample_data()

# Authentication Routes (same as before)
@api_router.post("/auth/register", response_model=dict)
async def register_user(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = hash_password(user_data.password)
    user_dict = user_data.dict()
    del user_dict['password']
    user = User(**user_dict)
    
    user_doc = user.dict()
    user_doc['password_hash'] = hashed_password
    
    await db.users.insert_one(user_doc)
    
    # Send welcome email
    send_notification_email(
        user.email,
        "Welcome to BeatSpace!",
        f"Thank you for registering, {user.contact_name}. Your account is pending approval."
    )
    
    return {
        "message": "Registration successful. Please wait for admin approval.",
        "user_id": user.id,
        "status": user.status
    }

@api_router.post("/auth/login", response_model=Token)
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user['status'] != UserStatus.APPROVED:
        raise HTTPException(status_code=403, detail=f"Account status: {user['status']}. Please wait for admin approval.")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['id'], "role": user['role']}, 
        expires_delta=access_token_expires
    )
    
    user_obj = User(**user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj
    }

# Phase 3: Advanced Admin Routes
@api_router.get("/admin/offer-requests", response_model=List[OfferRequest])
async def get_offer_requests(admin_user: User = Depends(require_admin)):
    """Get all offer requests for admin mediation"""
    requests = await db.offer_requests.find().to_list(1000)
    return [OfferRequest(**req) for req in requests]

@api_router.post("/admin/submit-final-offer")
async def submit_final_offer(
    offer_data: FinalOfferCreate,
    admin_user: User = Depends(require_admin)
):
    """Submit final negotiated offer"""
    offer = FinalOffer(**offer_data.dict())
    await db.final_offers.insert_one(offer.dict())
    
    # Update offer request status
    await db.offer_requests.update_one(
        {"id": offer_data.request_id},
        {"$set": {"status": "Offer Ready", "updated_at": datetime.utcnow()}}
    )
    
    # Update campaign status
    await db.campaigns.update_one(
        {"id": offer_data.campaign_id},
        {"$set": {"status": CampaignStatus.NEGOTIATING, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Final offer submitted successfully", "offer_id": offer.id}

@api_router.post("/admin/notify-buyer")
async def notify_buyer(
    notification_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Send notification to buyer"""
    campaign_id = notification_data.get("campaign_id")
    notification_type = notification_data.get("type")
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    buyer = await db.users.find_one({"id": campaign["buyer_id"]})
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    
    # Send email notification
    if notification_type == "offer_ready":
        send_notification_email(
            buyer["email"],
            "Your BeatSpace Offer is Ready!",
            f"Good news! We've prepared a customized offer for your campaign '{campaign['name']}'. Please log in to review."
        )
    
    return {"message": "Notification sent successfully"}

# Phase 3: Monitoring System Routes
@api_router.get("/monitoring/records", response_model=List[MonitoringRecord])
async def get_monitoring_records(
    current_user: User = Depends(get_current_user),
    asset_type: Optional[str] = None,
    date_range: Optional[str] = "30_days"
):
    """Get monitoring records"""
    query = {}
    
    # Date range filter
    if date_range:
        days_back = {"7_days": 7, "30_days": 30, "90_days": 90}.get(date_range, 30)
        start_date = datetime.utcnow() - timedelta(days=days_back)
        query["timestamp"] = {"$gte": start_date}
    
    records = await db.monitoring_records.find(query).sort("timestamp", -1).to_list(1000)
    return [MonitoringRecord(**record) for record in records]

@api_router.post("/monitoring/records", response_model=MonitoringRecord)
async def create_monitoring_record(
    record_data: MonitoringRecordCreate,
    current_user: User = Depends(get_current_user)
):
    """Create new monitoring record"""
    record = MonitoringRecord(**record_data.dict())
    await db.monitoring_records.insert_one(record.dict())
    
    # Update asset last monitored timestamp
    await db.assets.update_one(
        {"id": record_data.asset_id},
        {"$set": {"last_monitored": datetime.utcnow()}}
    )
    
    return record

@api_router.get("/monitoring/report/{asset_id}")
async def generate_monitoring_report(
    asset_id: str,
    date_range: str = "30_days",
    current_user: User = Depends(get_current_user)
):
    """Generate monitoring report PDF"""
    # Get asset and monitoring records
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    days_back = {"7_days": 7, "30_days": 30, "90_days": 90}.get(date_range, 30)
    start_date = datetime.utcnow() - timedelta(days=days_back)
    
    records = await db.monitoring_records.find({
        "asset_id": asset_id,
        "timestamp": {"$gte": start_date}
    }).sort("timestamp", -1).to_list(1000)
    
    # Generate PDF report
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, 750, f"Monitoring Report: {asset['name']}")
    
    # Asset details
    p.setFont("Helvetica", 12)
    y_position = 720
    p.drawString(50, y_position, f"Asset Type: {asset['type']}")
    y_position -= 20
    p.drawString(50, y_position, f"Location: {asset['address']}")
    y_position -= 20
    p.drawString(50, y_position, f"Report Period: Last {days_back} days")
    y_position -= 20
    p.drawString(50, y_position, f"Total Records: {len(records)}")
    
    # Summary
    if records:
        avg_condition = sum(r['condition_rating'] for r in records) / len(records)
        y_position -= 30
        p.drawString(50, y_position, f"Average Condition Rating: {avg_condition:.1f}/10")
    
    p.save()
    buffer.seek(0)
    
    return StreamingResponse(
        io.BytesIO(buffer.getvalue()),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=monitoring-report-{asset_id}.pdf"}
    )

# Phase 3: Analytics Routes
@api_router.get("/analytics/overview")
async def get_analytics_overview(
    date_range: str = "30_days",
    current_user: User = Depends(get_current_user)
):
    """Get analytics overview"""
    days_back = {"7_days": 7, "30_days": 30, "90_days": 90, "6_months": 180, "1_year": 365}.get(date_range, 30)
    start_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Calculate metrics
    total_campaigns = await db.campaigns.count_documents({"created_at": {"$gte": start_date}})
    total_revenue = await db.payments.aggregate([
        {"$match": {"created_at": {"$gte": start_date}, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    revenue_amount = total_revenue[0]["total"] if total_revenue else 0
    
    return {
        "total_revenue": revenue_amount,
        "total_bookings": total_campaigns,
        "total_assets": await db.assets.count_documents({}),
        "active_campaigns": await db.campaigns.count_documents({"status": "Live"}),
        "avg_booking_value": revenue_amount / max(total_campaigns, 1),
        "conversion_rate": 23.5,  # Calculate from actual data
        "growth_rate": 12.3  # Calculate from period comparison
    }

@api_router.get("/analytics/revenue")
async def get_revenue_analytics(
    date_range: str = "30_days",
    current_user: User = Depends(get_current_user)
):
    """Get revenue analytics data"""
    days_back = {"7_days": 7, "30_days": 30, "90_days": 90}.get(date_range, 30)
    
    # Generate demo data for visualization
    from datetime import date, timedelta
    import random
    
    revenue_data = []
    for i in range(days_back):
        current_date = date.today() - timedelta(days=days_back - i - 1)
        revenue_data.append({
            "date": current_date.strftime("%b %d"),
            "revenue": random.randint(20000, 80000),
            "bookings": random.randint(2, 8),
            "inquiries": random.randint(5, 15)
        })
    
    return revenue_data

@api_router.get("/analytics/assets")
async def get_asset_analytics(
    date_range: str = "30_days",
    current_user: User = Depends(get_current_user)
):
    """Get asset analytics"""
    # Aggregate asset data by type
    pipeline = [
        {"$group": {
            "_id": "$type",
            "count": {"$sum": 1},
            "revenue": {"$sum": "$total_revenue"}
        }}
    ]
    
    asset_stats = await db.assets.aggregate(pipeline).to_list(100)
    
    # Add colors for charts
    colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"]
    
    return [
        {
            "name": stat["_id"],
            "count": stat["count"],
            "revenue": stat["revenue"],
            "color": colors[i % len(colors)]
        }
        for i, stat in enumerate(asset_stats)
    ]

# Phase 3: Payment System Routes
@api_router.post("/payments", response_model=Payment)
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create payment for campaign"""
    payment = Payment(**payment_data.dict())
    await db.payments.insert_one(payment.dict())
    
    # Generate invoice
    campaign = await db.campaigns.find_one({"id": payment_data.campaign_id})
    invoice_pdf = generate_invoice_pdf(payment, campaign or {})
    
    # In production, save to cloud storage
    invoice_url = f"/api/payments/{payment.id}/invoice"
    await db.payments.update_one(
        {"id": payment.id},
        {"$set": {"invoice_url": invoice_url}}
    )
    
    return payment

@api_router.get("/payments/{payment_id}/invoice")
async def get_payment_invoice(
    payment_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get payment invoice PDF"""
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    campaign = await db.campaigns.find_one({"id": payment["campaign_id"]})
    invoice_pdf = generate_invoice_pdf(Payment(**payment), campaign or {})
    
    return StreamingResponse(
        io.BytesIO(invoice_pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice-{payment_id}.pdf"}
    )

# Request Best Offer Workflow Endpoints
@api_router.post("/offers/request", response_model=OfferRequest)
async def create_offer_request(
    offer_data: OfferRequestCreate,
    current_user: User = Depends(get_current_user)
):
    """Submit a Request Best Offer"""
    if current_user.role != UserRole.BUYER:
        raise HTTPException(status_code=403, detail="Only buyers can request offers")
    
    # Get asset details
    asset = await db.assets.find_one({"id": offer_data.asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Create offer request
    offer_request = OfferRequest(
        **offer_data.dict(),
        buyer_id=current_user.id,
        buyer_name=current_user.company_name,
        asset_name=asset["name"]
    )
    
    # Insert into database
    await db.offer_requests.insert_one(offer_request.dict())
    
    # Update asset status to Pending Offer
    await db.assets.update_one(
        {"id": offer_data.asset_id},
        {"$set": {"status": AssetStatus.PENDING_OFFER}}
    )
    
    # Send notification email to admin (placeholder)
    logger.info(f"New offer request submitted: {offer_request.id} by {current_user.company_name}")
    
    return offer_request

@api_router.get("/offers/requests", response_model=List[OfferRequest])
async def get_offer_requests(current_user: User = Depends(get_current_user)):
    """Get offer requests based on user role"""
    query = {}
    
    if current_user.role == UserRole.BUYER:
        query["buyer_id"] = current_user.id
    elif current_user.role == UserRole.ADMIN:
        # Admin can see all requests
        pass
    else:
        # Sellers can see requests for their assets
        user_assets = await db.assets.find({"seller_id": current_user.id}).to_list(1000)
        asset_ids = [asset["id"] for asset in user_assets]
        query["asset_id"] = {"$in": asset_ids}
    
    requests = await db.offer_requests.find(query).sort("created_at", -1).to_list(1000)
    return [OfferRequest(**request) for request in requests]

@api_router.get("/offers/requests/{request_id}", response_model=OfferRequest)
async def get_offer_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get single offer request"""
    request = await db.offer_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    # Check permissions
    if (current_user.role == UserRole.BUYER and request["buyer_id"] != current_user.id) or \
       (current_user.role == UserRole.SELLER):
        # For sellers, check if they own the asset
        asset = await db.assets.find_one({"id": request["asset_id"]})
        if not asset or asset["seller_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return OfferRequest(**request)

@api_router.put("/offers/requests/{request_id}", response_model=OfferRequest)
async def update_offer_request(
    request_id: str,
    offer_data: OfferRequestCreate,
    current_user: User = Depends(get_current_user)
):
    """Update an offer request (buyer only, and only if status is Pending)"""
    request = await db.offer_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    if current_user.role != UserRole.BUYER or request["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if request["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Can only edit pending offer requests")
    
    # Update the offer request
    update_data = offer_data.dict()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.offer_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    # Get updated request
    updated_request = await db.offer_requests.find_one({"id": request_id})
    return OfferRequest(**updated_request)

@api_router.delete("/offers/requests/{request_id}")
async def delete_offer_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete an offer request (buyer only, and only if status is Pending)"""
    request = await db.offer_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    if current_user.role != UserRole.BUYER or request["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if request["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Can only delete pending offer requests")
    
    # Reset asset status to Available
    await db.assets.update_one(
        {"id": request["asset_id"]},
        {"$set": {"status": AssetStatus.AVAILABLE}}
    )
    
    # Delete the offer request
    await db.offer_requests.delete_one({"id": request_id})
    
    return {"message": "Offer request deleted successfully"}

@api_router.put("/admin/offers/{request_id}/quote")
async def update_offer_quote(
    request_id: str,
    quote_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Admin: Add quote to offer request"""
    request = await db.offer_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    # Update offer request with quote
    await db.offer_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "Quoted",
            "final_offer": quote_data.get("final_offer"),
            "admin_response": quote_data.get("admin_response"),
            "quoted_at": datetime.utcnow()
        }}
    )
    
    # Update asset status to Negotiating
    await db.assets.update_one(
        {"id": request["asset_id"]},
        {"$set": {"status": AssetStatus.NEGOTIATING}}
    )
    
    # Send notification to buyer (placeholder)
    logger.info(f"Quote provided for offer request: {request_id}")
    
    return {"message": "Quote added successfully"}

@api_router.put("/offers/{request_id}/respond")
async def respond_to_offer(
    request_id: str,
    response_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Buyer: Respond to offer quote"""
    if current_user.role != UserRole.BUYER:
        raise HTTPException(status_code=403, detail="Only buyers can respond to offers")
    
    request = await db.offer_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    if request["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only respond to your own requests")
    
    response_action = response_data.get("action")  # "accept", "reject", "modify"
    
    if response_action == "accept":
        # Update request status
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "Accepted"}}
        )
        
        # Update asset status to Booked
        await db.assets.update_one(
            {"id": request["asset_id"]},
            {"$set": {"status": AssetStatus.BOOKED}}
        )
        
        logger.info(f"Offer accepted: {request_id}")
        
    elif response_action == "reject":
        # Update request status
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "Rejected"}}
        )
        
        # Return asset to Available status
        await db.assets.update_one(
            {"id": request["asset_id"]},
            {"$set": {"status": AssetStatus.AVAILABLE}}
        )
        
        logger.info(f"Offer rejected: {request_id}")
    
    return {"message": f"Offer {response_action}ed successfully"}

# Enhanced Asset Routes
@api_router.get("/assets/batch")
async def get_assets_batch(
    ids: str,
    current_user: User = Depends(get_current_user)
):
    """Get multiple assets by IDs"""
    asset_ids = ids.split(',')
    assets = await db.assets.find({"id": {"$in": asset_ids}}).to_list(1000)
    return [Asset(**asset) for asset in assets]

# File upload route
@api_router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload image to Cloudinary cloud storage"""
    try:
        # Read file content
        content = await file.read()
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            folder="beatspace_assets",  # Organize uploads in a folder
            resource_type="image",
            public_id=f"asset_{uuid.uuid4().hex[:8]}",  # Unique public ID
            transformation=[
                {'width': 800, 'height': 600, 'crop': 'limit'},  # Resize large images
                {'quality': 'auto'},  # Optimize quality
                {'fetch_format': 'auto'}  # Auto format selection
            ]
        )
        
        return {
            "url": result.get('secure_url'),
            "public_id": result.get('public_id'),
            "filename": file.filename,
            "width": result.get('width'),
            "height": result.get('height')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.post("/upload/images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload multiple images to Cloudinary cloud storage"""
    try:
        uploaded_images = []
        
        for file in files:
            # Read file content
            content = await file.read()
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                content,
                folder="beatspace_assets",
                resource_type="image",
                public_id=f"asset_{uuid.uuid4().hex[:8]}",
                transformation=[
                    {'width': 800, 'height': 600, 'crop': 'limit'},
                    {'quality': 'auto'},
                    {'fetch_format': 'auto'}
                ]
            )
            
            uploaded_images.append({
                "url": result.get('secure_url'),
                "public_id": result.get('public_id'),
                "filename": file.filename,
                "width": result.get('width'),
                "height": result.get('height')
            })
        
        return {"images": uploaded_images}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Public Stats Route
@api_router.get("/stats/public")
async def get_public_stats():
    """Get public statistics for homepage and marketplace"""
    try:
        total_assets = await db.assets.count_documents({})
        available_assets = await db.assets.count_documents({"status": "Available"})
        total_users = await db.users.count_documents({})
        active_campaigns = await db.campaigns.count_documents({"status": "Live"}) if "campaigns" in await db.list_collection_names() else 0
        
        return {
            "total_assets": total_assets,
            "available_assets": available_assets,
            "total_users": total_users,
            "active_campaigns": active_campaigns,
            "success_rate": 95.2,  # Demo metric
            "platform_uptime": "99.9%"  # Demo metric
        }
    except Exception as e:
        logger.error(f"Error fetching public stats: {e}")
        # Return default stats in case of error
        return {
            "total_assets": 7,
            "available_assets": 5,
            "total_users": 12,
            "active_campaigns": 3,
            "success_rate": 95.2,
            "platform_uptime": "99.9%"
        }

# Public Assets Route
@api_router.get("/assets/public", response_model=List[Asset])
async def get_public_assets():
    """Get all public assets for marketplace display"""
    try:
        assets = await db.assets.find({}).to_list(1000)
        return [Asset(**asset) for asset in assets]
    except Exception as e:
        logger.error(f"Error fetching public assets: {e}")
        return []

# Enhanced Asset CRUD Routes
@api_router.get("/assets", response_model=List[Asset])
async def get_assets(
    current_user: User = Depends(get_current_user),
    type: Optional[str] = None,
    status: Optional[str] = None,
    division: Optional[str] = None
):
    """Get assets with optional filtering"""
    query = {}
    
    # Filter by seller for seller users
    if current_user.role == UserRole.SELLER:
        query["seller_id"] = current_user.id
    
    # Apply filters
    if type and type != "all":
        query["type"] = type
    if status and status != "all":
        query["status"] = status
    if division and division != "all":
        query["division"] = division
    
    assets = await db.assets.find(query).to_list(1000)
    return [Asset(**asset) for asset in assets]

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    """Get single asset by ID"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return Asset(**asset)

@api_router.post("/assets", response_model=Asset)
async def create_asset(
    asset_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create new asset (seller or admin)"""
    if current_user.role not in [UserRole.SELLER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only sellers and admins can create assets")
    
    # For admin users, use the provided seller information from the form
    # For seller users, use their own information
    if current_user.role == UserRole.SELLER:
        asset_data["seller_id"] = current_user.id
        asset_data["seller_name"] = current_user.company_name
        asset_data["status"] = AssetStatus.PENDING_APPROVAL
    else:  # Admin user
        # Admin can specify seller_id and seller_name from the form
        # Status can be set to Available directly (admin approval)
        if not asset_data.get("seller_id"):
            raise HTTPException(status_code=400, detail="Seller ID is required for admin asset creation")
        asset_data["status"] = AssetStatus.AVAILABLE  # Admin-created assets are pre-approved
    
    asset = Asset(**asset_data)
    await db.assets.insert_one(asset.dict())
    
    return asset

@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(
    asset_id: str,
    asset_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update asset"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check permissions
    if current_user.role == UserRole.SELLER and asset["seller_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update your own assets")
    
    # Remove fields that shouldn't be updated by sellers
    if current_user.role == UserRole.SELLER:
        asset_data.pop("status", None)
        asset_data.pop("seller_id", None)
        asset_data.pop("seller_name", None)
    
    updated_asset = await db.assets.find_one_and_update(
        {"id": asset_id},
        {"$set": asset_data},
        return_document=True
    )
    
    return Asset(**updated_asset)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(
    asset_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete asset"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check permissions
    if current_user.role == UserRole.SELLER and asset["seller_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own assets")
    
    await db.assets.delete_one({"id": asset_id})
    return {"message": "Asset deleted successfully"}

# Admin-specific routes
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(admin_user: User = Depends(require_admin)):
    """Get all users for admin management"""
    users = await db.users.find({}).to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/admin/assets", response_model=List[Asset])
async def get_all_assets_admin(admin_user: User = Depends(require_admin)):
    """Get all assets for admin management"""
    assets = await db.assets.find({}).to_list(1000)
    return [Asset(**asset) for asset in assets]

@api_router.patch("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    admin_user: User = Depends(require_admin)
):
    """Update user status (approve/reject/suspend)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {"status": status_update.status}
    if status_update.status == UserStatus.APPROVED:
        update_data["verified_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    # Send notification email
    user_obj = User(**user)
    if status_update.status == UserStatus.APPROVED:
        send_notification_email(
            user_obj.email,
            "Account Approved - Welcome to BeatSpace!",
            f"Great news! Your BeatSpace account has been approved. You can now access all platform features."
        )
    elif status_update.status == UserStatus.REJECTED:
        reason = status_update.reason or "Please contact support for more information."
        send_notification_email(
            user_obj.email,
            "Account Status Update",
            f"Your BeatSpace account application has been reviewed. Reason: {reason}"
        )
    
    return {"message": f"User status updated to {status_update.status}"}

@api_router.post("/admin/users", response_model=User)
async def create_user_admin(
    user_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Create new user (admin only)"""
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.get("email")})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    user_data["password"] = hash_password(user_data.get("password", "tempPassword123"))
    user_data["status"] = UserStatus.PENDING  # Default status for admin-created users
    user_data["created_at"] = datetime.utcnow()
    
    user = User(**user_data)
    await db.users.insert_one(user.dict())
    
    return user

@api_router.put("/admin/users/{user_id}", response_model=User)
async def update_user_admin(
    user_id: str,
    user_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Update user information (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow updating password through this endpoint
    if "password" in user_data:
        del user_data["password"]
    
    # Don't allow updating created_at
    if "created_at" in user_data:
        del user_data["created_at"]
    
    user_data["updated_at"] = datetime.utcnow()
    
    updated_user = await db.users.find_one_and_update(
        {"id": user_id},
        {"$set": user_data},
        return_document=True
    )
    
    return User(**updated_user)

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(
    user_id: str,
    admin_user: User = Depends(require_admin)
):
    """Delete user (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting admin users
    if user.get("role") == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    
    # Delete associated data (campaigns, assets, etc.)
    # Delete user's campaigns
    await db.campaigns.delete_many({"buyer_id": user_id})
    
    # Delete user's assets (if seller)
    await db.assets.delete_many({"seller_id": user_id})
    
    # Delete the user
    await db.users.delete_one({"id": user_id})
    
    return {"message": f"User and associated data deleted successfully"}

@api_router.patch("/admin/assets/{asset_id}/status")
async def update_asset_status(
    asset_id: str,
    status_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Update asset status (approve/reject)"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    new_status = status_data.get("status")
    if new_status not in [s.value for s in AssetStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": new_status}
    if new_status == AssetStatus.AVAILABLE:
        update_data["approved_at"] = datetime.utcnow()
    
    await db.assets.update_one(
        {"id": asset_id},
        {"$set": update_data}
    )
    
    # Notify seller
    seller = await db.users.find_one({"id": asset["seller_id"]})
    if seller:
        asset_obj = Asset(**asset)
        if new_status == AssetStatus.AVAILABLE:
            send_notification_email(
                seller["email"],
                "Asset Approved!",
                f"Your asset '{asset_obj.name}' has been approved and is now live on BeatSpace."
            )
    
    return {"message": f"Asset status updated to {new_status}"}

# Campaign Management Routes
class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    buyer_id: str
    buyer_name: str
    description: str = ""
    campaign_assets: List[CampaignAsset] = []  # Enhanced asset management
    status: CampaignStatus = CampaignStatus.DRAFT
    budget: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    campaign_assets: List[CampaignAsset] = []
    budget: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# Admin Campaign Management Endpoints
@api_router.get("/admin/campaigns", response_model=List[Campaign])
async def get_all_campaigns_admin(admin_user: User = Depends(require_admin)):
    """Get all campaigns for admin management"""
    campaigns = await db.campaigns.find({}).to_list(1000)
    return [Campaign(**campaign) for campaign in campaigns]

@api_router.post("/admin/campaigns", response_model=Campaign)
async def create_campaign_admin(
    campaign_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Create new campaign (admin only)"""
    # Get buyer information from buyer_id
    buyer = await db.users.find_one({"id": campaign_data.get("buyer_id")})
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")
    
    campaign = Campaign(
        **campaign_data,
        buyer_name=buyer["company_name"],
        status=CampaignStatus.DRAFT
    )
    
    await db.campaigns.insert_one(campaign.dict())
    return campaign

@api_router.put("/admin/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign_admin(
    campaign_id: str,
    campaign_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Update campaign information (admin only)"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign_data["updated_at"] = datetime.utcnow()
    
    # If buyer_id is being changed, update buyer_name
    if "buyer_id" in campaign_data:
        buyer = await db.users.find_one({"id": campaign_data["buyer_id"]})
        if buyer:
            campaign_data["buyer_name"] = buyer["company_name"]
    
    updated_campaign = await db.campaigns.find_one_and_update(
        {"id": campaign_id},
        {"$set": campaign_data},
        return_document=True
    )
    
    return Campaign(**updated_campaign)

@api_router.delete("/admin/campaigns/{campaign_id}")
async def delete_campaign_admin(
    campaign_id: str,
    admin_user: User = Depends(require_admin)
):
    """Delete campaign (admin only)"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Delete the campaign
    await db.campaigns.delete_one({"id": campaign_id})
    
    return {"message": f"Campaign deleted successfully"}

@api_router.patch("/admin/campaigns/{campaign_id}/status")
async def update_campaign_status_admin(
    campaign_id: str,
    status_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Update campaign status (admin only)"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    new_status = status_data.get("status")
    if new_status not in [s.value for s in CampaignStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": new_status, "updated_at": datetime.utcnow()}
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": update_data}
    )
    
    return {"message": f"Campaign status updated to {new_status}"}

@api_router.get("/campaigns/{campaign_id}", response_model=Campaign)
async def get_campaign(campaign_id: str, current_user: User = Depends(get_current_user)):
    """Get single campaign by ID"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check permissions
    if current_user.role == UserRole.BUYER and campaign["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only view your own campaigns")
    
    return Campaign(**campaign)

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(current_user: User = Depends(get_current_user)):
    """Get campaigns for current user"""
    query = {}
    
    if current_user.role == UserRole.BUYER:
        query["buyer_id"] = current_user.id
    elif current_user.role == UserRole.ADMIN:
        # Admin can see all campaigns
        pass
    else:
        # Sellers can see campaigns that include their assets
        user_assets = await db.assets.find({"seller_id": current_user.id}).to_list(1000)
        asset_ids = [asset["id"] for asset in user_assets]
        query["assets"] = {"$in": asset_ids}
    
    campaigns = await db.campaigns.find(query).to_list(1000)
    return [Campaign(**campaign) for campaign in campaigns]

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(
    campaign_data: CampaignCreate,
    current_user: User = Depends(get_current_user)
):
    """Create new campaign (buyer only)"""
    if current_user.role != UserRole.BUYER:
        raise HTTPException(status_code=403, detail="Only buyers can create campaigns")
    
    campaign = Campaign(
        **campaign_data.dict(),
        buyer_id=current_user.id,
        buyer_name=current_user.company_name
    )
    
    await db.campaigns.insert_one(campaign.dict())
    return campaign

@api_router.put("/campaigns/{campaign_id}", response_model=Campaign)
async def update_campaign(
    campaign_id: str,
    campaign_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update campaign"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check permissions
    if current_user.role == UserRole.BUYER and campaign["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update your own campaigns")
    
    campaign_data["updated_at"] = datetime.utcnow()
    
    updated_campaign = await db.campaigns.find_one_and_update(
        {"id": campaign_id},
        {"$set": campaign_data},
        return_document=True
    )
    
    return Campaign(**updated_campaign)

@api_router.get("/")
async def root():
    return {"message": "BeatSpace API v3.0 - Advanced Features Ready", "version": "3.0.0"}

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