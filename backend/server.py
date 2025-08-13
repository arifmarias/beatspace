from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, status, File, UploadFile, Form, WebSocket, WebSocketDisconnect
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

# WebSocket Connection Manager for Real-time Updates
class ConnectionManager:
    def __init__(self):
        # Store connections by user_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str):
        """Add connection to active connections (connection should already be accepted)"""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        print(f"✅ WebSocket connected for user: {user_id}")
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove connection from active connections"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            # Clean up empty user entries
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"❌ WebSocket disconnected for user: {user_id}")
        
    async def send_to_user(self, user_id: str, message: dict):
        """Send message to all connections for a specific user"""
        if user_id not in self.active_connections:
            print(f"⚠️ No active connections for user: {user_id}")
            return False
            
        message["timestamp"] = message.get("timestamp", datetime.utcnow().isoformat())
        
        disconnected = []
        success_count = 0
        
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(message))
                success_count += 1
                print(f"📤 Sent message to user {user_id}: {message.get('type')}")
            except Exception as e:
                print(f"❌ Failed to send message to {user_id}: {e}")
                # Mark for removal if connection is dead
                disconnected.append(websocket)
        
        # Clean up dead connections
        for ws in disconnected:
            self.disconnect(ws, user_id)
            
        return success_count > 0
                
    async def send_to_all_admins(self, message: dict):
        """Send message to all admin users"""
        admin_keywords = ['admin', 'administrator'] 
        for user_id in self.active_connections.keys():
            if any(keyword in user_id.lower() for keyword in admin_keywords):
                await self.send_to_user(user_id, message)
                
    def get_connection_count(self) -> int:
        """Get total number of active connections"""
        return sum(len(connections) for connections in self.active_connections.values())

# Initialize connection manager
websocket_manager = ConnectionManager()

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
    MANAGER = "manager"          # New: Monitoring operations manager
    MONITORING_OPERATOR = "monitoring_operator"  # New: Field monitoring staff

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

# Monitoring Report Models
class ConditionStatus(str, Enum):
    EXCELLENT = "Excellent"
    GOOD = "Good"
    FAIR = "Fair"
    NEEDS_ATTENTION = "Needs Attention"

class MaintenanceStatus(str, Enum):
    UP_TO_DATE = "Up to date"
    DUE_SOON = "Due soon"
    OVERDUE = "Overdue"

class MonitoringReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_id: str
    condition_status: ConditionStatus = ConditionStatus.EXCELLENT
    maintenance_status: MaintenanceStatus = MaintenanceStatus.UP_TO_DATE
    active_issues: str = ""  # Text field for issues written by admin
    last_inspection_date: datetime = Field(default_factory=datetime.utcnow)
    inspector_name: str = "Admin Team"
    next_inspection_due: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=30))
    inspection_notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

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
    admin_quoted_price: Optional[float] = None  # Add this field
    admin_notes: Optional[str] = None  # Add this field
    final_offer: Optional[float] = None  # Change from dict to float
    quoted_at: Optional[datetime] = None
    # NEW: Asset booking date fields
    tentative_start_date: Optional[datetime] = None
    tentative_end_date: Optional[datetime] = None
    confirmed_start_date: Optional[datetime] = None
    confirmed_end_date: Optional[datetime] = None
    # Asset dates from Request Best Offer form
    asset_start_date: Optional[datetime] = None
    asset_expiration_date: Optional[datetime] = None

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
    # Asset dates from Request Best Offer form
    asset_start_date: Optional[datetime] = None
    asset_expiration_date: Optional[datetime] = None

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
    password_hash: Optional[str] = None  # Store hashed password

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
    buyer_id: Optional[str] = None  # Track which buyer booked this asset
    buyer_name: Optional[str] = None  # Track buyer name for easy reference
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
    creative_tags: List[str] = []  # NEW: Creative tags for buyer assets
    creative_timeline: Optional[datetime] = None  # NEW: Creative expiry timeline

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

# Creative Management Models
class CreativeUpdate(BaseModel):
    creative_tags: Optional[List[str]] = None
    creative_timeline: Optional[datetime] = None

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

# ====================================
# MONITORING SERVICE DATA MODELS - PHASE 1
# ====================================

class MonitoringFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BI_WEEKLY = "bi_weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class TaskStatus(str, Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class MonitoringServiceSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: Optional[str] = None  # Optional for individual asset monitoring
    buyer_id: str
    asset_ids: List[str]
    frequency: MonitoringFrequency
    start_date: datetime
    end_date: datetime
    custom_schedule: Optional[Dict[str, Any]] = None  # For custom frequencies
    notification_preferences: Dict[str, bool] = Field(default_factory=lambda: {
        "email": True,
        "in_app": True,
        "sms": False
    })
    service_level: str = "standard"  # standard, premium
    status: str = "active"  # active, paused, expired, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MonitoringTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    asset_id: str
    assigned_operator_id: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    scheduled_date: datetime
    due_date: datetime
    completed_at: Optional[datetime] = None
    estimated_duration: int = 30  # minutes
    
    # GPS and Location
    asset_location: Optional[Dict[str, float]] = None  # lat, lng
    operator_location: Optional[Dict[str, float]] = None
    location_verified: bool = False
    
    # Task Requirements
    required_photos: List[str] = Field(default_factory=lambda: ["front", "back", "close_up"])
    required_checks: List[str] = Field(default_factory=lambda: ["condition", "lighting", "visibility"])
    special_instructions: str = ""
    
    # Route Optimization
    route_order: Optional[int] = None
    estimated_travel_time: Optional[int] = None  # minutes from previous task
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MonitoringReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    operator_id: str
    asset_id: str
    subscription_id: str
    
    # Photo Documentation
    photos: List[Dict[str, Any]] = []  # {url, angle, timestamp, gps, quality_score}
    photo_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Condition Assessment
    overall_condition: int = Field(ge=1, le=10)  # 1-10 rating
    condition_details: Dict[str, Any] = Field(default_factory=dict)
    issues_found: List[str] = []
    maintenance_required: bool = False
    urgent_issues: bool = False
    
    # Environmental Data
    weather_condition: str = "clear"
    lighting_condition: str = "good"
    visibility_rating: int = Field(ge=1, le=10)
    
    # Operator Notes
    notes: str = ""
    voice_notes: List[str] = []  # URLs to voice recordings
    completion_time: int = 0  # minutes spent on task
    
    # GPS Verification
    gps_location: Dict[str, float] = Field(default_factory=dict)  # actual location when report submitted
    location_accuracy: float = 0.0  # meters
    location_verified: bool = False
    
    # Quality Control
    quality_score: float = 0.0  # auto-calculated quality score
    requires_review: bool = False
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = None

class OperatorPerformance(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    operator_id: str
    date: datetime
    
    # Task Metrics
    tasks_assigned: int = 0
    tasks_completed: int = 0
    tasks_overdue: int = 0
    completion_rate: float = 0.0
    
    # Quality Metrics
    average_quality_score: float = 0.0
    reports_requiring_review: int = 0
    customer_satisfaction: float = 0.0
    
    # Efficiency Metrics
    average_task_time: float = 0.0  # minutes
    route_efficiency: float = 0.0  # actual vs optimal travel time
    photos_per_task: float = 0.0
    
    # Location and Movement
    total_distance_traveled: float = 0.0  # kilometers
    locations_visited: int = 0
    gps_accuracy_average: float = 0.0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Create/Update Models for API endpoints
class MonitoringServiceCreate(BaseModel):
    campaign_id: Optional[str] = None  # Optional for individual asset monitoring
    asset_ids: List[str]
    frequency: MonitoringFrequency
    start_date: datetime
    end_date: datetime
    custom_schedule: Optional[Dict[str, Any]] = None
    notification_preferences: Optional[Dict[str, bool]] = None
    service_level: str = "standard"

class TaskAssignment(BaseModel):
    task_ids: List[str]
    operator_id: str
    priority: Optional[TaskPriority] = None
    special_instructions: Optional[str] = None

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_operator_id: Optional[str] = None
    special_instructions: Optional[str] = None
    scheduled_date: Optional[datetime] = None

class MonitoringReportSubmit(BaseModel):
    photos: List[Dict[str, Any]]
    overall_condition: int = Field(ge=1, le=10)
    condition_details: Optional[Dict[str, Any]] = None
    issues_found: Optional[List[str]] = []
    maintenance_required: bool = False
    urgent_issues: bool = False
    weather_condition: Optional[str] = "clear"
    lighting_condition: Optional[str] = "good"
    visibility_rating: Optional[int] = Field(ge=1, le=10, default=8)
    notes: Optional[str] = ""
    voice_notes: Optional[List[str]] = []
    gps_location: Dict[str, float]
    completion_time: Optional[int] = None

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

# ====================================
# MONITORING SERVICE AUTH HELPERS - PHASE 1
# ====================================

async def require_manager(current_user: User = Depends(get_current_user)):
    """Require Manager role for monitoring operations management"""
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user

async def require_monitoring_operator(current_user: User = Depends(get_current_user)):
    """Require Monitoring Operator role for field operations"""
    if current_user.role != UserRole.MONITORING_OPERATOR:
        raise HTTPException(status_code=403, detail="Monitoring Operator access required")
    return current_user

async def require_monitoring_staff(current_user: User = Depends(get_current_user)):
    """Require Manager, Monitoring Operator, or Admin role for monitoring operations"""
    if current_user.role not in [UserRole.MANAGER, UserRole.MONITORING_OPERATOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Monitoring staff access required")
    return current_user

async def require_admin_or_manager(current_user: User = Depends(get_current_user)):
    """Require Admin or Manager role for monitoring oversight"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Admin or Manager access required")
    return current_user

async def require_manager_or_admin(current_user: User = Depends(get_current_user)):
    """Require Manager or Admin role for user management"""
    if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Manager or Admin access required")
    return current_user

def clean_mongodb_doc(doc):
    """Recursively clean MongoDB documents by removing ObjectIds and converting them to strings"""
    if isinstance(doc, dict):
        cleaned = {}
        for key, value in doc.items():
            if key == "_id":
                # Skip MongoDB _id field entirely
                continue
            else:
                cleaned[key] = clean_mongodb_doc(value)
        return cleaned
    elif isinstance(doc, list):
        return [clean_mongodb_doc(item) for item in doc]
    elif hasattr(doc, '__dict__'):
        # Handle objects with attributes
        return clean_mongodb_doc(doc.__dict__)
    else:
        return doc

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
    
    # Get asset IDs from both legacy and new structure
    asset_ids = campaign.get("assets", [])  # Legacy structure
    
    # Check for new campaign_assets structure
    if campaign.get("campaign_assets"):
        asset_ids.extend([ca.get("asset_id") for ca in campaign["campaign_assets"] if ca.get("asset_id")])
    
    # Remove duplicates and None values
    asset_ids = list(set([aid for aid in asset_ids if aid]))
    
    if not asset_ids:
        return
    
    # Set asset status based on campaign status
    if campaign_status == "Live":
        new_asset_status = AssetStatus.LIVE  # Changed: Live campaigns mean Live assets
    elif campaign_status == "Draft":
        new_asset_status = AssetStatus.AVAILABLE
    elif campaign_status == "Completed":
        new_asset_status = AssetStatus.AVAILABLE  # Assets become available again
    else:
        return  # Don't change asset status for other campaign statuses
    
    # Update all assets in the campaign
    await db.assets.update_many(
        {"id": {"$in": asset_ids}},
        {"$set": {"status": new_asset_status, "updated_at": datetime.utcnow()}}
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
    """Initialize application with admin credentials only"""
    
    # Clear all existing data
    await db.assets.delete_many({})
    await db.campaigns.delete_many({})
    await db.offer_requests.delete_many({})
    await db.users.delete_many({})
    
    # Create only admin user
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
async def create_dummy_booked_assets_data():
    """Create dummy data with Live campaigns and Booked assets for testing"""
    
    # Get the existing buyer
    buyer = await db.users.find_one({"email": "marketing@grameenphone.com"})
    if not buyer:
        return
    
    # Create some assets with "Booked" status
    booked_assets = [
        {
            "id": str(uuid.uuid4()),
            "name": "Gulshan Avenue Digital Billboard",
            "type": "Billboard",  # Fixed: Use valid enum value
            "address": "Gulshan Avenue, Dhaka",
            "dimensions": "20ft x 10ft",  # Added missing field
            "condition": "Excellent",
            "location": {"lat": 23.780153, "lng": 90.414230},
            "district": "Dhaka",
            "division": "Dhaka",
            "seller_id": "seller123",
            "seller_name": "Dhaka Digital Media",
            "pricing": {"3_months": 75000, "6_months": 135000, "12_months": 240000},  # Fixed pricing structure
            "status": "Booked",  # Booked status
            "photos": ["https://example.com/image1.jpg"],
            "description": "Prime location digital billboard at Gulshan Avenue with high visibility",
            "specifications": {"lighting": "LED backlit", "material": "Digital display"},
            "visibility_score": 9,
            "traffic_volume": "Very High",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),  
            "name": "Dhanmondi Metro Station Banner",
            "type": "Railway Station",  # Fixed: Use valid enum value
            "address": "Dhanmondi Metro Station, Dhaka",
            "dimensions": "15ft x 8ft",  # Added missing field
            "condition": "Good",
            "location": {"lat": 23.746466, "lng": 90.376015},
            "district": "Dhaka",
            "division": "Dhaka", 
            "seller_id": "seller456",
            "seller_name": "Metro Advertising Co",
            "pricing": {"3_months": 45000, "6_months": 80000, "12_months": 150000},  # Fixed pricing structure
            "status": "Booked",  # Booked status
            "photos": ["https://example.com/image2.jpg"],
            "description": "High-traffic banner at Dhanmondi Metro Station",
            "specifications": {"lighting": "Standard", "material": "Vinyl banner"},
            "visibility_score": 8,
            "traffic_volume": "High", 
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Uttara Shopping Mall Display",
            "type": "Market",  # Fixed: Use valid enum value (closest to shopping mall)
            "address": "Uttara Shopping Mall, Dhaka",
            "dimensions": "10ft x 6ft",  # Added missing field
            "condition": "Excellent", 
            "location": {"lat": 23.875441, "lng": 90.396736},
            "district": "Dhaka",
            "division": "Dhaka",
            "seller_id": "seller789", 
            "seller_name": "Mall Media Solutions",
            "pricing": {"3_months": 54000, "6_months": 97200, "12_months": 180000},  # Fixed pricing structure
            "status": "Booked",  # Booked status
            "photos": ["https://example.com/image3.jpg"],
            "description": "Digital display at Uttara Shopping Mall with high foot traffic",
            "specifications": {"lighting": "LED display", "material": "Digital screen"},
            "visibility_score": 7,
            "traffic_volume": "High",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Mirpur Road Side Banner", 
            "type": "Billboard",  # Fixed: Use valid enum value
            "address": "Mirpur Road, Dhaka",
            "dimensions": "12ft x 8ft",  # Added missing field
            "condition": "Good",
            "location": {"lat": 23.822249, "lng": 90.365420},
            "district": "Dhaka", 
            "division": "Dhaka",
            "seller_id": "seller101",
            "seller_name": "Road Banner Pro",
            "pricing": {"3_months": 36000, "6_months": 64800, "12_months": 120000},  # Fixed pricing structure
            "status": "Available",  # This one is available (for requested status)
            "photos": ["https://example.com/image4.jpg"],
            "description": "Roadside banner on busy Mirpur Road",
            "specifications": {"lighting": "Standard", "material": "Vinyl banner"},
            "visibility_score": 6, 
            "traffic_volume": "Medium",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert booked assets
    for asset in booked_assets:
        await db.assets.insert_one(asset)
    
    # Create Live campaigns with booked assets
    campaign1_id = str(uuid.uuid4())
    campaign2_id = str(uuid.uuid4())
    
    live_campaigns = [
        {
            "id": campaign1_id,
            "name": "Grameenphone 5G Launch Campaign",
            "description": "Major campaign for 5G service launch across Dhaka",
            "buyer_id": buyer["id"],
            "buyer_name": buyer["company_name"],
            "budget": 150000,
            "start_date": datetime.utcnow(),
            "end_date": datetime.utcnow() + timedelta(days=60),
            "status": "Live",  # Live campaign
            "campaign_assets": [
                {
                    "asset_id": booked_assets[0]["id"],  # Gulshan Avenue Digital Billboard
                    "asset_name": booked_assets[0]["name"],
                    "asset_start_date": datetime.utcnow(),
                    "asset_expiration_date": datetime.utcnow() + timedelta(days=60)
                },
                {
                    "asset_id": booked_assets[1]["id"],  # Dhanmondi Metro Station Banner  
                    "asset_name": booked_assets[1]["name"],
                    "asset_start_date": datetime.utcnow(),
                    "asset_expiration_date": datetime.utcnow() + timedelta(days=60)
                }
            ],
            "created_at": datetime.utcnow() - timedelta(days=5),
            "updated_at": datetime.utcnow()
        },
        {
            "id": campaign2_id, 
            "name": "Weekend Data Pack Promotion",
            "description": "Promotional campaign for weekend data packages",
            "buyer_id": buyer["id"],
            "buyer_name": buyer["company_name"], 
            "budget": 80000,
            "start_date": datetime.utcnow() + timedelta(days=7),
            "end_date": datetime.utcnow() + timedelta(days=37),
            "status": "Live",  # Live campaign
            "campaign_assets": [
                {
                    "asset_id": booked_assets[2]["id"],  # Uttara Shopping Mall Display
                    "asset_name": booked_assets[2]["name"],
                    "asset_start_date": datetime.utcnow() + timedelta(days=7),
                    "asset_expiration_date": datetime.utcnow() + timedelta(days=37)
                }
            ],
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert live campaigns
    for campaign in live_campaigns:
        await db.campaigns.insert_one(campaign)
    
    # Create some offer requests (for the Available asset)
    offer_request = {
        "id": str(uuid.uuid4()),
        "buyer_id": buyer["id"],
        "buyer_name": buyer["company_name"],
        "asset_id": booked_assets[3]["id"],  # Mirpur Road Side Banner (Available)
        "asset_name": booked_assets[3]["name"],
        "campaign_type": "existing",
        "campaign_name": "Weekend Data Pack Promotion",
        "existing_campaign_id": campaign2_id,
        "contract_duration": "1_month",
        "estimated_budget": 45000,
        "service_bundles": {
            "printing": True,
            "setup": True, 
            "monitoring": False
        },
        "timeline": "Asset needed for weekend promotion campaign",
        "special_requirements": "Weekend visibility focus",
        "notes": "Part of existing weekend data pack campaign",
        "status": "Pending",
        "created_at": datetime.utcnow() - timedelta(hours=6)
    }
    
    await db.offer_requests.insert_one(offer_request)
    
    print("✅ Dummy booked assets data created successfully!")
    print(f"📊 Created {len(booked_assets)} assets (3 Booked, 1 Available)")
    print(f"📊 Created {len(live_campaigns)} Live campaigns")
    print(f"📊 Created 1 offer request")

# Create dummy data endpoint for testing
@api_router.post("/admin/create-dummy-data")
async def create_dummy_data(current_user: User = Depends(get_current_user)):
    """DISABLED: Dummy data creation disabled for production"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    raise HTTPException(status_code=400, detail="Dummy data creation is disabled in production. Please create real data through the UI.")

# Initialize sample data on startup
@app.on_event("startup") 
async def startup_event():
    """Initialize only essential admin user for production - NO DUMMY DATA"""
    await init_essential_users_only()

async def init_essential_users_only():
    """Initialize only essential admin user for production - NO DUMMY DATA"""
    
    # Check if admin exists
    existing_admin = await db.users.find_one({"email": "admin@beatspace.com"})
    
    if not existing_admin:
        # Create admin user only
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@beatspace.com",
            "password_hash": hash_password("admin123"),
            "company_name": "BeatSpace Admin",
            "contact_name": "System Administrator",
            "phone": "+8801234567890",
            "role": "admin",
            "status": "approved",
            "created_at": datetime.utcnow()
        }
        await db.users.insert_one(admin_user)
        print("✅ Admin user created")
    else:
        print("✅ Admin user already exists")
    
    print("🚀 Production system initialized - NO DUMMY DATA")

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

@api_router.patch("/admin/offer-requests/{request_id}/status")
async def update_offer_request_status_admin(
    request_id: str,
    status_data: dict,
    admin_user: User = Depends(require_admin)
):
    """Update offer request status (admin only)"""
    offer_request = await db.offer_requests.find_one({"id": request_id})
    if not offer_request:
        raise HTTPException(status_code=404, detail="Offer request not found")
    
    new_status = status_data.get("status")
    valid_statuses = ["Pending", "In Process", "On Hold", "Approved", "Rejected"]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Valid statuses: {valid_statuses}")
    
    # Update offer request status
    # If approved, update asset status to Booked and set buyer information
    if new_status == "Approved":
        # Calculate confirmed dates based on tentative dates or contract duration
        tentative_start = offer_request.get("tentative_start_date")
        tentative_end = offer_request.get("tentative_end_date")
        
        # If no tentative dates, calculate from current date + contract duration
        if not tentative_start:
            tentative_start = datetime.utcnow()
        
        if not tentative_end:
            # Calculate end date based on contract duration
            contract_duration = offer_request.get("contract_duration", "1_month")
            if contract_duration == "1_month":
                tentative_end = tentative_start + timedelta(days=30)
            elif contract_duration == "3_months":
                tentative_end = tentative_start + timedelta(days=90)
            elif contract_duration == "6_months":
                tentative_end = tentative_start + timedelta(days=180)
            elif contract_duration == "12_months":
                tentative_end = tentative_start + timedelta(days=365)
            else:
                tentative_end = tentative_start + timedelta(days=30)  # Default to 1 month
        
        # Update offer request with confirmed dates
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": new_status,
                "confirmed_start_date": tentative_start,
                "confirmed_end_date": tentative_end,
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Update asset with booking info and next_available_date
        await db.assets.update_one(
            {"id": offer_request["asset_id"]},
            {"$set": {
                "status": AssetStatus.LIVE,
                "buyer_id": offer_request["buyer_id"],
                "buyer_name": offer_request["buyer_name"],
                "next_available_date": tentative_end,  # Asset becomes available after booking ends
                "updated_at": datetime.utcnow()
            }}
        )

        # Update campaign status to "Live" if asset gets booked
        campaign_id = offer_request.get("existing_campaign_id")
        if campaign_id:
            # Check if campaign should be marked as Live
            campaign = await db.campaigns.find_one({"id": campaign_id})
            if campaign and campaign.get("status") == "Draft":
                # If campaign has at least one booked asset, mark as Live
                await db.campaigns.update_one(
                    {"id": campaign_id},
                    {"$set": {"status": "Live", "updated_at": datetime.utcnow()}}
                )
    
    # If rejected or on hold, make asset available again and clear buyer information
    elif new_status in ["Rejected", "On Hold"]:
        await db.assets.update_one(
            {"id": offer_request["asset_id"]},
            {"$set": {
                "status": AssetStatus.AVAILABLE,
                "buyer_id": None,
                "buyer_name": None,
                "next_available_date": None,  # Clear next available date when asset becomes available
                "updated_at": datetime.utcnow()
            }}
        )
    
    return {"message": f"Offer request status updated to {new_status}"}

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
    
    # 🚀 REAL-TIME EVENT: Notify admin of new offer request
    try:
        await websocket_manager.send_to_all_admins({
            "type": "new_offer_request",
            "offer_id": offer_request.id,
            "asset_name": asset["name"],
            "buyer_name": current_user.company_name,
            "buyer_email": current_user.email,
            "asset_id": offer_data.asset_id,
            "requested_start_date": offer_request.asset_start_date.isoformat() if offer_request.asset_start_date else None,
            "requested_end_date": offer_request.asset_expiration_date.isoformat() if offer_request.asset_expiration_date else None,
            "timestamp": datetime.utcnow().isoformat(),
            "message": f"New offer request from {current_user.company_name} for {asset['name']}"
        })
        print(f"✅ New offer request notification sent to admins")
    except Exception as ws_error:
        print(f"❌ WebSocket notification failed: {ws_error}")
    
    
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
    
    # Update offer request with quote - use consistent field names
    # Increment quote count to track how many times admin has quoted
    current_quote_count = request.get("quote_count", 0)
    # Ensure we're working with an integer
    if isinstance(current_quote_count, str):
        try:
            current_quote_count = int(current_quote_count)
        except:
            current_quote_count = 0
    elif current_quote_count is None:
        current_quote_count = 0
    
    new_quote_count = current_quote_count + 1
    
    await db.offer_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "Quoted",
            "admin_quoted_price": quote_data.get("quoted_price"),  # Frontend sends quoted_price
            "final_offer": quote_data.get("quoted_price"),  # Keep both for compatibility
            "admin_response": quote_data.get("admin_notes"),
            "admin_notes": quote_data.get("admin_notes"),
            "quoted_at": datetime.utcnow(),
            "quote_count": new_quote_count  # Track quote iteration
        }}
    )
    
    # Send notification to buyer (placeholder)
    logger.info(f"Quote provided for offer request: {request_id} - Price: {quote_data.get('quoted_price')}")
    
    # 🚀 REAL-TIME EVENT: Send WebSocket notification to buyer
    try:
        # Enhanced buyer email lookup - multiple fallback methods
        buyer_email = None
        buyer_id = request.get("buyer_id")
        asset_name = request.get("asset_name", "Unknown Asset")
        
        print(f"🔍 WebSocket Debug - Attempting buyer email lookup for request: {request_id}")
        print(f"🔍 Request data - buyer_id: {buyer_id}, asset_name: {asset_name}")
        
        # Method 1: Direct email lookup from request (if available)
        buyer_email = request.get("buyer_email") or request.get("created_by")
        if buyer_email:
            print(f"✅ Found buyer email directly from request: {buyer_email}")
        
        # Method 2: Lookup email using buyer_id
        if not buyer_email and buyer_id:
            print(f"🔍 Looking up buyer email by ID: {buyer_id}")
            buyer_doc = await db.users.find_one({"id": buyer_id})
            if buyer_doc:
                buyer_email = buyer_doc.get("email")
                print(f"✅ Found buyer email from buyer_id lookup: {buyer_email}")
            else:
                print(f"⚠️ Could not find buyer with ID: {buyer_id}")
                
        # Method 3: Alternative lookup by buyer_name if available
        if not buyer_email:
            buyer_name = request.get("buyer_name")
            if buyer_name:
                print(f"🔍 Attempting lookup by buyer_name: {buyer_name}")
                buyer_doc = await db.users.find_one({"company_name": buyer_name})
                if buyer_doc:
                    buyer_email = buyer_doc.get("email")
                    print(f"✅ Found buyer email from buyer_name lookup: {buyer_email}")
        
        if buyer_email:
            # Send real-time notification to buyer
            notification_data = {
                "type": "offer_quoted",
                "offer_id": request_id,
                "asset_name": asset_name,
                "price": quote_data.get("quoted_price"),
                "admin_notes": quote_data.get("admin_notes"),
                "quote_count": new_quote_count,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"New price quote received for {asset_name}: ৳{quote_data.get('quoted_price'):,}"
            }
            
            await websocket_manager.send_to_user(buyer_email, notification_data)
            print(f"✅ Real-time OFFER_QUOTED notification sent to buyer: {buyer_email}")
            print(f"📤 Notification payload: {notification_data}")
        else:
            print(f"❌ Could not determine buyer email for WebSocket notification")
            print(f"🔍 Available request fields: {list(request.keys())}")
            # Print first few chars of values for debugging
            for key, value in request.items():
                if key in ["buyer_id", "buyer_name", "buyer_email", "created_by"]:
                    print(f"   {key}: {str(value)[:50]}...")
            
    except Exception as ws_error:
        print(f"❌ WebSocket notification failed: {ws_error}")
        import traceback
        traceback.print_exc()
        # Don't fail the main operation if WebSocket fails
    
    return {"message": "Quote added successfully", "quoted_price": quote_data.get("quoted_price")}

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
        # Calculate confirmed dates based on tentative dates or contract duration
        tentative_start = request.get("tentative_start_date")
        tentative_end = request.get("tentative_end_date")
        
        # If no tentative dates, calculate from current date + contract duration
        if not tentative_start:
            tentative_start = datetime.utcnow()
        
        if not tentative_end:
            # Calculate end date based on contract duration
            contract_duration = request.get("contract_duration", "1_month")
            if contract_duration == "1_month":
                tentative_end = tentative_start + timedelta(days=30)
            elif contract_duration == "3_months":
                tentative_end = tentative_start + timedelta(days=90)
            elif contract_duration == "6_months":
                tentative_end = tentative_start + timedelta(days=180)
            elif contract_duration == "12_months":
                tentative_end = tentative_start + timedelta(days=365)
            else:
                tentative_end = tentative_start + timedelta(days=30)  # Default to 1 month
        
        # Update request status with confirmed dates
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "Accepted",
                "confirmed_start_date": tentative_start,
                "confirmed_end_date": tentative_end
            }}
        )
        
        # Update asset status to Booked and set buyer information + next_available_date
        await db.assets.update_one(
            {"id": request["asset_id"]},
            {"$set": {
                "status": AssetStatus.LIVE,
                "buyer_id": current_user.id,
                "buyer_name": current_user.company_name,
                "next_available_date": tentative_end,  # Asset becomes available after booking ends
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Add asset to campaign if it's linked to an existing campaign
        if request.get("existing_campaign_id"):
            campaign_id = request["existing_campaign_id"]
            asset_data = await db.assets.find_one({"id": request["asset_id"]})
            
            if asset_data:
                campaign_asset = {
                    "asset_id": request["asset_id"],
                    "asset_name": asset_data.get("name", ""),
                    "asset_start_date": tentative_start,  # Use calculated confirmed dates
                    "asset_expiration_date": tentative_end
                }
                
                # Add asset to campaign's assets array
                await db.campaigns.update_one(
                    {"id": campaign_id},
                    {
                        "$addToSet": {"campaign_assets": campaign_asset},
                        "$set": {"updated_at": datetime.utcnow()}
                    }
                )
                logger.info(f"Added asset {request['asset_id']} to campaign {campaign_id}")
                
                # Check if campaign should be marked as Live
                campaign = await db.campaigns.find_one({"id": campaign_id})
                if campaign and campaign.get("status") == "Draft":
                    # If campaign has at least one booked asset, mark as Live
                    await db.campaigns.update_one(
                        {"id": campaign_id},
                        {"$set": {"status": "Live", "updated_at": datetime.utcnow()}}
                    )
                    logger.info(f"Campaign {campaign_id} status updated to Live")
        
        logger.info(f"Offer accepted: {request_id}")
        
        # 🚀 REAL-TIME EVENT: Notify admin of offer approval
        try:
            asset_name = request.get("asset_name", "Unknown Asset")
            await websocket_manager.send_to_all_admins({
                "type": "offer_approved",
                "offer_id": request_id,
                "asset_name": asset_name,
                "buyer_name": current_user.company_name,
                "buyer_email": current_user.email,
                "final_price": request.get("admin_quoted_price"),
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Offer approved by {current_user.company_name} for {asset_name}"
            })
            print(f"✅ Offer approved notification sent to admins")
        except Exception as ws_error:
            print(f"❌ WebSocket notification failed: {ws_error}")
        
        
    elif response_action == "reject":
        # Update request status
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {"status": "Rejected"}}
        )
        
        # Return asset to Available status and clear buyer information
        await db.assets.update_one(
            {"id": request["asset_id"]},
            {"$set": {
                "status": AssetStatus.AVAILABLE,
                "buyer_id": None,
                "buyer_name": None,
                "next_available_date": None,  # Clear next available date when asset becomes available
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Offer rejected: {request_id}")
        
        # 🚀 REAL-TIME EVENT: Notify admin of offer rejection
        try:
            asset_name = request.get("asset_name", "Unknown Asset")
            await websocket_manager.send_to_all_admins({
                "type": "offer_rejected",
                "offer_id": request_id,
                "asset_name": asset_name,
                "buyer_name": current_user.company_name,
                "buyer_email": current_user.email,
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Offer rejected by {current_user.company_name} for {asset_name}"
            })
            print(f"✅ Offer rejected notification sent to admins")
        except Exception as ws_error:
            print(f"❌ WebSocket notification failed: {ws_error}")
        
    
    elif response_action == "modify" or response_action == "request_revision":
        # Buyer requests price revision
        await db.offer_requests.update_one(
            {"id": request_id},
            {"$set": {
                "status": "Revision Requested",
                "revision_requested": True,
                "revision_requested_at": datetime.utcnow(),
                "revision_reason": response_data.get("reason", "Buyer requested price revision")
            }}
        )
        
        logger.info(f"Offer revision requested: {request_id}")
        
        # 🚀 REAL-TIME EVENT: Notify admin of revision request
        try:
            asset_name = request.get("asset_name", "Unknown Asset")
            await websocket_manager.send_to_all_admins({
                "type": "revision_requested",
                "offer_id": request_id,
                "asset_name": asset_name,
                "buyer_name": current_user.company_name,
                "buyer_email": current_user.email,
                "revision_reason": response_data.get("reason", "Buyer requested price revision"),
                "timestamp": datetime.utcnow().isoformat(),
                "message": f"Revision requested by {current_user.company_name} for {asset_name}"
            })
            print(f"✅ Revision request notification sent to admins")
        except Exception as ws_error:
            print(f"❌ WebSocket notification failed: {ws_error}")
        
    
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

@api_router.post("/admin/refresh-data")
async def refresh_application_data(current_user: User = Depends(require_admin)):
    """Refresh all application data with fresh sample data - Admin only"""
    try:
        await init_bangladesh_sample_data()
        return {"message": "Application data refreshed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error refreshing data: {str(e)}")

@api_router.get("/assets/live")
async def get_live_assets(current_user: User = Depends(get_current_user)):
    """Get live assets for the current buyer"""
    try:
        # Filter assets by buyer and Live status
        live_assets = await db.assets.find({
            "status": AssetStatus.LIVE,
            "buyer_id": current_user.id
        }).to_list(None)
        
        # Get approved/accepted offers for campaign details
        approved_offers = await db.offer_requests.find({
            "buyer_id": current_user.id,
            "status": {"$in": ["Approved", "Accepted"]}  # Include both statuses
        }).to_list(None)
        
        # Create lookup for offers by asset_id for campaign details
        offers_by_asset = {offer["asset_id"]: offer for offer in approved_offers}
        
        live_assets_data = []
        
        for asset in live_assets:
            # Get campaign details from the corresponding offer
            offer = offers_by_asset.get(asset["id"])
            
            live_asset = {
                "id": asset["id"],
                "name": asset["name"],
                "address": asset.get("address", "Address not available"),
                "area": asset.get("area", ""), # Include area field
                "district": asset.get("district", ""), # Include district field
                "division": asset.get("division", ""), # Include division field
                "type": asset.get("type", "Billboard"),
                "campaignName": offer.get("campaign_name", "Unknown Campaign") if offer else "Unknown Campaign",
                "assetStartDate": offer.get("confirmed_start_date") or offer.get("tentative_start_date") if offer else None,
                "assetEndDate": offer.get("confirmed_end_date") or offer.get("tentative_end_date") if offer else None,
                "duration": offer.get("contract_duration", "1 month") if offer else "N/A",
                "expiryDate": offer.get("confirmed_end_date") or offer.get("tentative_end_date") if offer else asset.get("next_available_date"),
                "cost": offer.get("final_offer") or offer.get("admin_quoted_price") if offer else 0,  # Final offered price
                "lastStatus": "Live",
                "location": asset.get("location", {}),
                "images": asset.get("images", []),
                "creative_tags": asset.get("creative_tags", []),  # Include creative tags
                "creative_timeline": asset.get("creative_timeline")  # Include creative timeline
            }
            live_assets_data.append(live_asset)
        
        return live_assets_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching live assets: {str(e)}")

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

@api_router.patch("/assets/{asset_id}/creative")
async def update_asset_creative(
    asset_id: str,
    creative_data: CreativeUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update creative tags and timeline for an asset (buyer only)"""
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Only buyers can update creative fields, and only for their own assets
    if current_user.role != UserRole.BUYER or asset.get("buyer_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Can only update creative fields for your own assets")
    
    # Prepare update data
    update_data = {}
    if creative_data.creative_tags is not None:
        update_data["creative_tags"] = creative_data.creative_tags
    if creative_data.creative_timeline is not None:
        update_data["creative_timeline"] = creative_data.creative_timeline
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No creative data provided")
    
    updated_asset = await db.assets.find_one_and_update(
        {"id": asset_id},
        {"$set": update_data},
        return_document=True
    )
    
    return {"message": "Creative data updated successfully", "asset": Asset(**updated_asset)}

# Admin-specific routes
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(admin_user: User = Depends(require_admin)):
    """Get all users for admin management"""
    users = await db.users.find({}).to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users", response_model=List[User])
async def get_users_by_role(
    role: Optional[str] = Query(None, description="Filter users by role"),
    current_user: User = Depends(require_manager_or_admin)
):
    """Get users with optional role filtering for managers"""
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query).to_list(1000)
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
    user_data["password_hash"] = hash_password(user_data.get("password", "tempPassword123"))
    if "password" in user_data:
        del user_data["password"]  # Remove plain password
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
    
    # Handle password update with proper hashing
    if "password" in user_data and user_data["password"]:
        user_data["password_hash"] = hash_password(user_data["password"])
        del user_data["password"]  # Remove plain text password
    
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
    
    # Set default status to Draft if not provided
    if "status" not in campaign_data or not campaign_data["status"]:
        campaign_data["status"] = CampaignStatus.DRAFT
    
    campaign = Campaign(
        **campaign_data,
        buyer_name=buyer["company_name"]
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
    """Delete campaign (admin only) - Enhanced with proper cleanup"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    print(f"🗑️ Admin deleting campaign: {campaign_id} ({campaign.get('name')})")
    
    # Step 1: Get all assets associated with this campaign and make them available
    campaign_assets = []
    if campaign.get("assets"):
        for asset_data in campaign["assets"]:
            asset_id = asset_data.get("asset_id")
            if asset_id:
                campaign_assets.append(asset_id)
    
    # Free up all campaign assets - make them Available
    if campaign_assets:
        result = await db.assets.update_many(
            {"id": {"$in": campaign_assets}},
            {"$set": {
                "status": AssetStatus.AVAILABLE,
                "buyer_id": None,
                "buyer_name": None, 
                "next_available_date": None,
                "updated_at": datetime.utcnow()
            }}
        )
        print(f"✅ Freed up {result.modified_count} assets from campaign")
    
    # Step 2: Handle offer requests associated with this campaign
    # Find offer requests that reference this campaign
    offer_requests = await db.offer_requests.find({
        "$or": [
            {"existing_campaign_id": campaign_id},
            {"campaign_name": campaign.get("name")}
        ]
    }).to_list(None)
    
    if offer_requests:
        print(f"🔍 Found {len(offer_requests)} offer requests associated with campaign")
        
        # For each offer request, free up the asset and delete/update the request
        for request in offer_requests:
            asset_id = request.get("asset_id")
            if asset_id:
                # Make the asset available
                await db.assets.update_one(
                    {"id": asset_id},
                    {"$set": {
                        "status": AssetStatus.AVAILABLE,
                        "buyer_id": None,
                        "buyer_name": None,
                        "next_available_date": None,
                        "updated_at": datetime.utcnow()
                    }}
                )
                print(f"✅ Asset {asset_id} made available")
        
        # Delete all associated offer requests
        delete_result = await db.offer_requests.delete_many({
            "$or": [
                {"existing_campaign_id": campaign_id},
                {"campaign_name": campaign.get("name")}
            ]
        })
        print(f"✅ Deleted {delete_result.deleted_count} associated offer requests")
    
    # Step 3: Delete the campaign itself
    await db.campaigns.delete_one({"id": campaign_id})
    print(f"✅ Campaign {campaign_id} deleted successfully")
    
    # Step 4: Send real-time notification to affected buyers (if any)
    try:
        buyer_id = campaign.get("buyer_id")
        if buyer_id:
            # Find buyer email
            buyer = await db.users.find_one({"id": buyer_id})
            if buyer:
                await websocket_manager.send_to_user(buyer["email"], {
                    "type": "campaign_deleted",
                    "campaign_id": campaign_id,
                    "campaign_name": campaign.get("name"),
                    "message": f"Campaign '{campaign.get('name')}' has been deleted by admin",
                    "timestamp": datetime.utcnow().isoformat()
                })
                print(f"✅ Notified buyer {buyer['email']} of campaign deletion")
    except Exception as ws_error:
        print(f"⚠️ WebSocket notification failed: {ws_error}")
    
    return {
        "message": f"Campaign '{campaign.get('name')}' deleted successfully",
        "assets_freed": len(campaign_assets),
        "offer_requests_deleted": len(offer_requests) if offer_requests else 0
    }

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
        # Exclude demo/test campaigns for buyers
        query["name"] = {"$not": {"$regex": "(?i)demo|test|sample"}}
    elif current_user.role == UserRole.ADMIN:
        # Admin can see all campaigns (including demo for debugging)
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

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete campaign - Only allowed for Draft campaigns with no associated offer requests"""
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Check permissions - only campaign owner can delete their campaigns
    if current_user.role == UserRole.BUYER and campaign["buyer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own campaigns")
    
    # Business rule: Only allow deletion of Draft campaigns
    if campaign.get("status") != "Draft":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete campaign with status '{campaign.get('status')}'. Only Draft campaigns can be deleted."
        )
    
    # Business rule: Check for associated offer requests
    offer_requests = await db.offer_requests.find({"existing_campaign_id": campaign_id}).to_list(None)
    if offer_requests:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete campaign. There are {len(offer_requests)} associated offer request(s). Please remove all offer requests first."
        )
    
    # Delete the campaign
    result = await db.campaigns.delete_one({"id": campaign_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": f"Campaign '{campaign.get('name')}' deleted successfully"}

# Monitoring Report Endpoints
@api_router.get("/assets/{asset_id}/monitoring")
async def get_asset_monitoring(asset_id: str):
    """Get monitoring report for a specific asset"""
    try:
        # Get asset details
        asset = await db.assets.find_one({"id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Get or create monitoring report
        monitoring_report = await db.monitoring_reports.find_one({"asset_id": asset_id})
        
        if not monitoring_report:
            # Create default monitoring report if none exists
            default_report = MonitoringReport(
                asset_id=asset_id,
                condition_status=ConditionStatus.EXCELLENT,
                maintenance_status=MaintenanceStatus.UP_TO_DATE,
                active_issues="",
                inspector_name="Admin Team",
                inspection_notes="Initial monitoring record created."
            )
            monitoring_report = default_report.dict()
            await db.monitoring_reports.insert_one(monitoring_report)
        
        # Remove MongoDB ObjectId to avoid serialization issues
        if "_id" in monitoring_report:
            del monitoring_report["_id"]
        
        # Ensure the monitoring report includes current asset photos
        monitoring_report["photos"] = asset.get("photos", [])
        
        return monitoring_report
        
    except Exception as e:
        logger.error(f"Error fetching monitoring report for asset {asset_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring report: {str(e)}")

@api_router.post("/assets/{asset_id}/monitoring")
async def update_asset_monitoring(asset_id: str, monitoring_data: dict, current_user: User = Depends(get_current_user)):
    """Update monitoring report for a specific asset (Admin only)"""
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only admins can update monitoring reports")
        
        # Check if asset exists
        asset = await db.assets.find_one({"id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # Update monitoring report
        update_data = {
            **monitoring_data,
            "inspector_name": current_user.contact_name,
            "updated_at": datetime.utcnow()
        }
        
        result = await db.monitoring_reports.update_one(
            {"asset_id": asset_id},
            {"$set": update_data},
            upsert=True
        )
        
        # If photos are provided, also update the asset's photos array
        if "photos" in monitoring_data and monitoring_data["photos"]:
            await db.assets.update_one(
                {"id": asset_id},
                {"$set": {"photos": monitoring_data["photos"]}}
            )
        
        return {"message": "Monitoring report updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating monitoring report for asset {asset_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating monitoring report: {str(e)}")

@api_router.post("/assets/{asset_id}/request-inspection")
async def request_inspection(asset_id: str, request_data: dict, current_user: dict = Depends(get_current_user)):
    """Request inspection for an asset (sends notification to admin)"""
    try:
        # Check if asset exists and belongs to the buyer
        asset = await db.assets.find_one({"id": asset_id})
        if not asset:
            raise HTTPException(status_code=404, detail="Asset not found")
        
        # For now, just update the monitoring report with inspection request
        inspection_request = {
            "inspection_notes": f"Inspection requested by {current_user['name']} on {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}. Reason: {request_data.get('reason', 'General inspection request')}",
            "updated_at": datetime.utcnow()
        }
        
        await db.monitoring_reports.update_one(
            {"asset_id": asset_id},
            {"$set": inspection_request},
            upsert=True
        )
        
        return {"message": "Inspection request submitted successfully"}
        
    except Exception as e:
        logger.error(f"Error submitting inspection request for asset {asset_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting inspection request: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "BeatSpace API v3.0 - Advanced Features Ready", "version": "3.0.0"}

# ====================================
# MONITORING SERVICE API ENDPOINTS - PHASE 1 & 2
# ====================================

# ============= MONITORING SERVICE MANAGEMENT =============

@api_router.post("/monitoring/services")
async def create_monitoring_service(
    service_data: MonitoringServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new monitoring service subscription for a campaign or individual assets"""
    try:
        # Handle campaign-based monitoring
        if service_data.campaign_id:
            # Verify the user owns the campaign
            campaign = await db.campaigns.find_one({"id": service_data.campaign_id, "buyer_id": current_user.id})
            if not campaign:
                raise HTTPException(status_code=404, detail="Campaign not found or access denied")
        else:
            # Handle individual asset monitoring - verify user owns all assets
            for asset_id in service_data.asset_ids:
                asset = await db.assets.find_one({"id": asset_id, "buyer_id": current_user.id})
                if not asset:
                    raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found or access denied")
        
        # Create monitoring subscription
        subscription = MonitoringServiceSubscription(**service_data.dict(), buyer_id=current_user.id)
        await db.monitoring_subscriptions.insert_one(subscription.dict())
        
        # Generate initial tasks based on frequency and schedule
        await generate_monitoring_tasks(subscription.id, subscription)
        
        return {"message": "Monitoring service created successfully", "subscription_id": subscription.id}
        
    except Exception as e:
        logger.error(f"Error creating monitoring service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating monitoring service: {str(e)}")

@api_router.get("/monitoring/services")
async def get_monitoring_services(current_user: User = Depends(get_current_user)):
    """Get monitoring services for current user"""
    try:
        query = {"buyer_id": current_user.id} if current_user.role == UserRole.BUYER else {}
        
        if current_user.role in [UserRole.ADMIN, UserRole.MANAGER]:
            # Admins and managers can see all services
            query = {}
        
        try:
            services = await db.monitoring_subscriptions.find(query).to_list(1000)
            logger.info(f"Found {len(services)} services in database")
            
            # Clean the data to remove ObjectIds
            cleaned_services = [clean_mongodb_doc(service) for service in services]
            
            return {"services": cleaned_services}
            
        except Exception as e:
            logger.error(f"Database query error: {str(e)}")
            return {"services": [], "error": str(e)}
        
    except Exception as e:
        logger.error(f"Error fetching monitoring services: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring services: {str(e)}")

@api_router.put("/monitoring/services/{service_id}")
async def update_monitoring_service(
    service_id: str,
    update_data: dict,
    current_user: User = Depends(require_admin_or_manager)
):
    """Update a monitoring service (admin/manager only)"""
    try:
        # Validate the service exists
        existing_service = await db.monitoring_subscriptions.find_one({"id": service_id})
        if not existing_service:
            raise HTTPException(status_code=404, detail="Monitoring service not found")
        
        # Prepare update data
        allowed_fields = ["service_level", "frequency", "notification_preferences", "end_date"]
        update_doc = {}
        
        for field in allowed_fields:
            if field in update_data:
                update_doc[field] = update_data[field]
        
        # Add updated timestamp
        update_doc["updated_at"] = datetime.utcnow()
        
        # Update the service
        result = await db.monitoring_subscriptions.update_one(
            {"id": service_id},
            {"$set": update_doc}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes made to monitoring service")
        
        # Fetch and return updated service
        updated_service = await db.monitoring_subscriptions.find_one({"id": service_id})
        cleaned_service = clean_mongodb_doc(updated_service)
        
        return {"message": "Monitoring service updated successfully", "service": cleaned_service}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating monitoring service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating monitoring service: {str(e)}")

@api_router.get("/monitoring/services/{subscription_id}")
async def get_monitoring_service(
    subscription_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get specific monitoring service details"""
    try:
        service = await db.monitoring_subscriptions.find_one({"id": subscription_id})
        if not service:
            raise HTTPException(status_code=404, detail="Monitoring service not found")
        
        # Check permissions
        if current_user.role == UserRole.BUYER and service["buyer_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return {"service": service}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching monitoring service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring service: {str(e)}")

# TEST ENDPOINT FOR DEBUGGING
@api_router.get("/test/monitoring-tasks")
async def test_monitoring_tasks(current_user: User = Depends(require_monitoring_staff)):
    """Test endpoint for monitoring tasks"""
    try:
        logger.info("Testing monitoring tasks endpoint")
        return {"message": "Test successful", "user_role": current_user.role.value}
    except Exception as e:
        logger.error(f"Test error: {str(e)}")
        return {"error": str(e)}

# ============= TASK MANAGEMENT =============

@api_router.get("/monitoring/tasks")
async def get_monitoring_tasks(
    status: Optional[str] = None,
    operator_id: Optional[str] = None,
    current_user: User = Depends(require_monitoring_staff)
):
    """Get monitoring tasks (filtered by role)"""
    try:
        logger.info(f"Fetching monitoring tasks for user {current_user.id} with role {current_user.role}")
        query = {}
        
        if current_user.role == UserRole.MONITORING_OPERATOR:
            # Operators only see their assigned tasks
            query["assigned_operator_id"] = current_user.id
        
        if status:
            query["status"] = status
        if operator_id and current_user.role == UserRole.MANAGER:
            query["assigned_operator_id"] = operator_id
        
        logger.info(f"Query: {query}")
        
        try:
            tasks = await db.monitoring_tasks.find(query).sort("scheduled_date", 1).to_list(1000)
            logger.info(f"Found {len(tasks)} tasks")
            
            # Clean the data to remove ObjectIds
            cleaned_tasks = [clean_mongodb_doc(task) for task in tasks]
            
            return {"tasks": cleaned_tasks}
            
        except Exception as e:
            logger.error(f"Error querying monitoring_tasks: {str(e)}")
            return {"tasks": []}
        
    except Exception as e:
        logger.error(f"Error fetching monitoring tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring tasks: {str(e)}")

@api_router.post("/monitoring/tasks/assign")
async def assign_monitoring_tasks(
    assignment: TaskAssignment,
    manager: User = Depends(require_manager)
):
    """Assign monitoring tasks to operators"""
    try:
        # Verify operator exists and has correct role
        operator = await db.users.find_one({"id": assignment.operator_id, "role": UserRole.MONITORING_OPERATOR})
        if not operator:
            raise HTTPException(status_code=404, detail="Monitoring operator not found")
        
        # Update tasks
        result = await db.monitoring_tasks.update_many(
            {"id": {"$in": assignment.task_ids}},
            {
                "$set": {
                    "assigned_operator_id": assignment.operator_id,
                    "status": TaskStatus.ASSIGNED,
                    "priority": assignment.priority or TaskPriority.MEDIUM,
                    "special_instructions": assignment.special_instructions or "",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Send real-time notification to operator
        await websocket_manager.send_to_user(assignment.operator_id, {
            "type": "tasks_assigned",
            "message": f"{result.modified_count} new tasks assigned to you",
            "task_count": result.modified_count,
            "priority": assignment.priority
        })
        
        return {"message": f"Assigned {result.modified_count} tasks to operator", "updated_count": result.modified_count}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error assigning tasks: {str(e)}")

@api_router.put("/monitoring/tasks/{task_id}")
async def update_monitoring_task(
    task_id: str,
    update_data: TaskUpdate,
    current_user: User = Depends(require_monitoring_staff)
):
    """Update monitoring task"""
    try:
        # Verify task exists and permissions
        task = await db.monitoring_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check permissions
        if current_user.role == UserRole.MONITORING_OPERATOR:
            if task["assigned_operator_id"] != current_user.id:
                raise HTTPException(status_code=403, detail="You can only update your assigned tasks")
            # Operators can only update status and completion
            allowed_fields = {"status"}
            update_dict = {k: v for k, v in update_data.dict(exclude_unset=True).items() if k in allowed_fields}
        else:
            # Managers can update all fields
            update_dict = update_data.dict(exclude_unset=True)
        
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await db.monitoring_tasks.update_one(
            {"id": task_id},
            {"$set": update_dict}
        )
        
        return {"message": "Task updated successfully", "updated": result.modified_count > 0}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating task: {str(e)}")

# ============= MONITORING REPORTS =============

@api_router.post("/monitoring/tasks/{task_id}/report")
async def submit_monitoring_report(
    task_id: str,
    report_data: MonitoringReportSubmit,
    operator: User = Depends(require_monitoring_operator)
):
    """Submit monitoring report for a completed task"""
    try:
        # Verify task exists and is assigned to operator
        task = await db.monitoring_tasks.find_one({"id": task_id, "assigned_operator_id": operator.id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found or not assigned to you")
        
        # Create monitoring report
        report = MonitoringReport(
            task_id=task_id,
            operator_id=operator.id,
            asset_id=task["asset_id"],
            subscription_id=task["subscription_id"],
            **report_data.dict()
        )
        
        # Calculate quality score based on completeness and GPS accuracy
        quality_score = calculate_report_quality(report)
        report.quality_score = quality_score
        report.submitted_at = datetime.utcnow()
        
        # Validate GPS location (within 50 meters of asset)
        if task.get("asset_location"):
            distance = calculate_gps_distance(report.gps_location, task["asset_location"])
            report.location_accuracy = distance
            report.location_verified = distance <= 50.0  # 50 meter radius
        
        # Save report
        await db.monitoring_reports.insert_one(report.dict())
        
        # Update task status
        await db.monitoring_tasks.update_one(
            {"id": task_id},
            {
                "$set": {
                    "status": TaskStatus.COMPLETED,
                    "completed_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Get subscription details for notifications
        subscription = await db.monitoring_subscriptions.find_one({"id": task["subscription_id"]})
        if subscription:
            # Send real-time notification to buyer
            await websocket_manager.send_to_user(subscription["buyer_id"], {
                "type": "monitoring_update",
                "message": f"Monitoring update received for your asset",
                "asset_id": task["asset_id"],
                "report_id": report.id,
                "condition_rating": report.overall_condition
            })
        
        return {
            "message": "Monitoring report submitted successfully",
            "report_id": report.id,
            "quality_score": quality_score,
            "location_verified": report.location_verified
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting monitoring report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error submitting monitoring report: {str(e)}")

@api_router.get("/monitoring/reports")
async def get_monitoring_reports(
    asset_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get monitoring reports (filtered by role and permissions)"""
    try:
        query = {}
        
        if current_user.role == UserRole.BUYER:
            # Buyers can only see reports for their subscriptions
            subscriptions = await db.monitoring_subscriptions.find({"buyer_id": current_user.id}).to_list(1000)
            subscription_ids = [s["id"] for s in subscriptions]
            query["subscription_id"] = {"$in": subscription_ids}
        elif current_user.role == UserRole.MONITORING_OPERATOR:
            # Operators can only see their own reports
            query["operator_id"] = current_user.id
        
        # Apply filters
        if asset_id:
            query["asset_id"] = asset_id
        if subscription_id:
            query["subscription_id"] = subscription_id
        if operator_id and current_user.role in [UserRole.ADMIN, UserRole.MANAGER]:
            query["operator_id"] = operator_id
        
        reports = await db.monitoring_reports.find(query).sort("created_at", -1).to_list(1000)
        return {"reports": reports}
        
    except Exception as e:
        logger.error(f"Error fetching monitoring reports: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching monitoring reports: {str(e)}")

# ============= PERFORMANCE & ANALYTICS =============

@api_router.get("/monitoring/performance")
async def get_monitoring_performance(
    operator_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    manager: User = Depends(require_admin_or_manager)
):
    """Get monitoring performance metrics"""
    try:
        query = {}
        if operator_id:
            query["operator_id"] = operator_id
        
        # Date range filtering
        if date_from or date_to:
            date_filter = {}
            if date_from:
                date_filter["$gte"] = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            if date_to:
                date_filter["$lte"] = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query["date"] = date_filter
        
        performance_data = await db.operator_performance.find(query).sort("date", -1).to_list(1000)
        return {"performance": performance_data}
        
    except Exception as e:
        logger.error(f"Error fetching performance data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching performance data: {str(e)}")

# ============= HELPER FUNCTIONS =============

async def generate_monitoring_tasks(subscription_id: str, subscription: MonitoringServiceSubscription):
    """Generate monitoring tasks based on subscription schedule"""
    try:
        tasks = []
        current_date = subscription.start_date
        
        while current_date <= subscription.end_date:
            for asset_id in subscription.asset_ids:
                # Get asset location for GPS verification
                asset = await db.assets.find_one({"id": asset_id})
                asset_location = asset.get("gps_coordinates") if asset else None
                
                # Calculate due date based on frequency
                due_date = current_date + timedelta(hours=2)  # 2-hour completion window
                
                task = MonitoringTask(
                    subscription_id=subscription_id,
                    asset_id=asset_id,
                    scheduled_date=current_date,
                    due_date=due_date,
                    asset_location=asset_location,
                    priority=TaskPriority.MEDIUM
                )
                tasks.append(task.dict())
            
            # Calculate next date based on frequency
            if subscription.frequency == MonitoringFrequency.DAILY:
                current_date += timedelta(days=1)
            elif subscription.frequency == MonitoringFrequency.WEEKLY:
                current_date += timedelta(weeks=1)
            elif subscription.frequency == MonitoringFrequency.BI_WEEKLY:
                current_date += timedelta(weeks=2)
            elif subscription.frequency == MonitoringFrequency.MONTHLY:
                current_date += timedelta(days=30)
            else:  # CUSTOM
                break  # Custom schedules need special handling
        
        if tasks:
            await db.monitoring_tasks.insert_many(tasks)
        
        return len(tasks)
        
    except Exception as e:
        logger.error(f"Error generating monitoring tasks: {str(e)}")
        return 0

def calculate_report_quality(report: MonitoringReport) -> float:
    """Calculate quality score for monitoring report"""
    score = 0.0
    
    # Photo completeness (40% of score)
    if len(report.photos) >= 3:
        score += 40.0
    elif len(report.photos) >= 2:
        score += 30.0
    elif len(report.photos) >= 1:
        score += 20.0
    
    # Notes completeness (20% of score)
    if len(report.notes) >= 50:
        score += 20.0
    elif len(report.notes) >= 20:
        score += 15.0
    elif len(report.notes) >= 5:
        score += 10.0
    
    # Condition assessment (20% of score)
    if report.overall_condition > 0:
        score += 20.0
    
    # GPS accuracy (20% of score)
    if report.location_verified:
        score += 20.0
    elif report.location_accuracy < 100.0:
        score += 15.0
    elif report.location_accuracy < 200.0:
        score += 10.0
    
    return min(score, 100.0)  # Cap at 100

def calculate_gps_distance(loc1: Dict[str, float], loc2: Dict[str, float]) -> float:
    """Calculate distance between two GPS coordinates in meters"""
    try:
        from math import radians, cos, sin, asin, sqrt
        
        # Convert to radians
        lat1, lon1 = radians(loc1["lat"]), radians(loc1["lng"])
        lat2, lon2 = radians(loc2["lat"]), radians(loc2["lng"])
        
        # Haversine formula
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))
        
        # Earth radius in meters
        r = 6371000
        return c * r
        
    except Exception:
        return 999.0  # Return large distance if calculation fails

# ============= PHOTO UPLOAD & MANAGEMENT =============

@api_router.post("/monitoring/upload-photo")
async def upload_monitoring_photo(
    file: UploadFile = File(...),
    task_id: str = Form(...),
    angle: str = Form(...),
    gps_lat: float = Form(...),
    gps_lng: float = Form(...),
    operator: User = Depends(require_monitoring_operator)
):
    """Upload photo for monitoring task with GPS validation"""
    try:
        # Verify task belongs to operator
        task = await db.monitoring_tasks.find_one({"id": task_id, "assigned_operator_id": operator.id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found or not assigned to you")
        
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed")
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"monitoring_{task_id}_{angle}_{int(datetime.utcnow().timestamp())}.{file_extension}"
        
        # For demo purposes, save to local storage (in production, use cloud storage)
        import os
        upload_dir = "/app/uploads/monitoring"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Calculate GPS distance from asset location
        gps_location = {"lat": gps_lat, "lng": gps_lng}
        distance_accuracy = 999.0
        location_verified = False
        
        if task.get("asset_location"):
            distance_accuracy = calculate_gps_distance(gps_location, task["asset_location"])
            location_verified = distance_accuracy <= 50.0  # 50 meter tolerance
        
        # Create photo metadata
        photo_metadata = {
            "id": str(uuid.uuid4()),
            "url": f"/uploads/monitoring/{unique_filename}",
            "angle": angle,
            "timestamp": datetime.utcnow().isoformat(),
            "gps_location": gps_location,
            "distance_accuracy": distance_accuracy,
            "location_verified": location_verified,
            "file_size": len(content),
            "filename": unique_filename,
            "quality_score": 8.5  # Auto-calculated in production
        }
        
        # Store photo metadata in task
        await db.monitoring_tasks.update_one(
            {"id": task_id},
            {
                "$push": {"photos": photo_metadata},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        return {
            "message": "Photo uploaded successfully",
            "photo_id": photo_metadata["id"],
            "location_verified": location_verified,
            "distance_accuracy": round(distance_accuracy, 2)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")

@api_router.get("/monitoring/photos/{photo_filename}")
async def get_monitoring_photo(
    photo_filename: str,
    current_user: User = Depends(get_current_user)
):
    """Retrieve monitoring photo with access control"""
    try:
        import os
        from fastapi.responses import FileResponse
        
        file_path = f"/app/uploads/monitoring/{photo_filename}"
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Photo not found")
        
        # For production, add proper access control based on subscription ownership
        # For now, allow any authenticated user to view photos
        
        return FileResponse(
            path=file_path,
            media_type="image/jpeg",
            headers={"Cache-Control": "public, max-age=3600"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving photo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving photo: {str(e)}")

# ============= AUTOMATED TASK GENERATION =============

@api_router.post("/monitoring/generate-tasks")
async def generate_tasks_for_date(
    request: dict,
    current_user: User = Depends(require_admin_or_manager)
):
    """Generate monitoring tasks for a specific date"""
    try:
        date = request.get("date")
        if not date:
            raise HTTPException(status_code=400, detail="Date is required")
        
        target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        
        # Get all active subscriptions
        subscriptions = await db.monitoring_subscriptions.find({"status": "active"}).to_list(1000)
        
        tasks_created = 0
        for subscription in subscriptions:
            # Check if this date matches the subscription frequency
            if should_generate_task_for_date(subscription, target_date):
                for asset_id in subscription["asset_ids"]:
                    # Check if task already exists for this date
                    existing_task = await db.monitoring_tasks.find_one({
                        "subscription_id": subscription["id"],
                        "asset_id": asset_id,
                        "scheduled_date": {
                            "$gte": target_date.replace(hour=0, minute=0, second=0),
                            "$lt": target_date.replace(hour=23, minute=59, second=59)
                        }
                    })
                    
                    if not existing_task:
                        # Get asset location
                        asset = await db.assets.find_one({"id": asset_id})
                        asset_location = asset.get("gps_coordinates") if asset else None
                        
                        # Create task
                        task = MonitoringTask(
                            subscription_id=subscription["id"],
                            asset_id=asset_id,
                            scheduled_date=target_date,
                            due_date=target_date + timedelta(hours=4),
                            asset_location=asset_location,
                            priority=TaskPriority.MEDIUM
                        )
                        
                        await db.monitoring_tasks.insert_one(task.dict())
                        tasks_created += 1
        
        return {"message": f"Generated {tasks_created} monitoring tasks for {date}", "tasks_created": tasks_created}
        
    except Exception as e:
        logger.error(f"Error generating tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating tasks: {str(e)}")

def should_generate_task_for_date(subscription: dict, target_date: datetime) -> bool:
    """Determine if a task should be generated for the given date based on frequency"""
    try:
        start_date = subscription.get("start_date")
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)
        
        # Calculate days since start
        days_diff = (target_date.date() - start_date.date()).days
        
        frequency = subscription.get("frequency")
        
        if frequency == MonitoringFrequency.DAILY:
            return days_diff >= 0
        elif frequency == MonitoringFrequency.WEEKLY:
            return days_diff >= 0 and days_diff % 7 == 0
        elif frequency == MonitoringFrequency.BI_WEEKLY:
            return days_diff >= 0 and days_diff % 14 == 0
        elif frequency == MonitoringFrequency.MONTHLY:
            return days_diff >= 0 and days_diff % 30 == 0
        else:  # CUSTOM
            # Custom frequency handling would go here
            return False
            
    except Exception:
        return False

# WebSocket endpoint for real-time updates
# WebSocket endpoints moved to app level - router endpoints removed

# Include the router in the main app
app.include_router(api_router)

# WebSocket endpoints must be at app level, not router level
@app.websocket("/api/test-ws")
async def websocket_test_endpoint(websocket: WebSocket):
    """Simple WebSocket test endpoint"""
    try:
        await websocket.accept()
        print("🎉 Test WebSocket connected successfully!")
        await websocket.send_text("Hello from WebSocket!")
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                print(f"Received: {data}")
                await websocket.send_text(f"Echo: {data}")
            except WebSocketDisconnect:
                print("Test WebSocket disconnected normally")
                break
    except Exception as e:
        print(f"Test WebSocket error: {e}")

@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint_main(websocket: WebSocket, user_id: str):
    """Main WebSocket endpoint at app level"""
    try:
        # Get token from query parameters
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
        
        if not token:
            await websocket.close(code=4001, reason="Token required")
            return
            
        # Accept connection first
        await websocket.accept()
        print(f"🎉 WebSocket connected for user: {user_id}")
        
        # Simple token validation (just check it exists and has reasonable length)
        if len(token) < 50:  # JWT should be much longer
            await websocket.close(code=4003, reason="Invalid token")
            return
            
        # Add to manager and handle messages
        await websocket_manager.connect(websocket, user_id)
        await websocket_manager.send_to_user(user_id, {
            "type": "connection_status",
            "message": "Connected successfully",
            "user_id": user_id
        })
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                print(f"Received message: {message}")
                
                if message.get("type") == "ping":
                    await websocket_manager.send_to_user(user_id, {
                        "type": "pong", 
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
            except WebSocketDisconnect:
                print(f"WebSocket disconnected: {user_id}")
                break
            except Exception as e:
                print(f"WebSocket message error: {e}")
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        websocket_manager.disconnect(websocket, user_id)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Add WebSocket-specific headers
    expose_headers=["*"],
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