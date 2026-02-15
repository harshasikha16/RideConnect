from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import bcrypt
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'rideconnect-secret-key-2024')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================== MODELS ==================

class UserBase(BaseModel):
    user_id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    name: str
    profile_picture: Optional[str] = None
    bio: Optional[str] = None
    profile_type: str = "passenger"  # "rider" (driver) or "passenger"
    is_public: bool = True
    auth_type: str = "email"  # "google", "phone", "email", "guest"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    name: str
    auth_type: str = "email"

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    profile_type: Optional[str] = None
    is_public: Optional[bool] = None

class UserLogin(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class FollowBase(BaseModel):
    follow_id: str
    follower_id: str
    following_id: str
    status: str = "pending"  # "pending", "accepted", "rejected"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FollowRequest(BaseModel):
    following_id: str

class RideBase(BaseModel):
    ride_id: str
    user_id: str
    origin: str
    destination: str
    date_time: datetime
    available_seats: int
    price: Optional[float] = None
    car_details: Optional[str] = None
    preferences: Optional[str] = None  # JSON string for flexibility
    ride_type: str = "offering"  # "offering" (rider posting) or "requesting" (passenger requesting)
    status: str = "active"  # "active", "completed", "cancelled"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RideCreate(BaseModel):
    origin: str
    destination: str
    date_time: datetime
    available_seats: int
    price: Optional[float] = None
    car_details: Optional[str] = None
    preferences: Optional[str] = None
    ride_type: str = "offering"

class RideUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    date_time: Optional[datetime] = None
    available_seats: Optional[int] = None
    price: Optional[float] = None
    car_details: Optional[str] = None
    preferences: Optional[str] = None
    status: Optional[str] = None

class RideRequestBase(BaseModel):
    request_id: str
    ride_id: str
    requester_id: str
    status: str = "pending"  # "pending", "accepted", "rejected"
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RideRequestCreate(BaseModel):
    ride_id: str
    message: Optional[str] = None

# ================== AUTH HELPERS ==================

async def get_current_user(request: Request) -> Optional[UserBase]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Check Authorization header as fallback
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    # Find session
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        return None
    
    # Check expiry with timezone awareness
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at <= datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if user_doc:
        return UserBase(**user_doc)
    return None

async def require_auth(request: Request) -> UserBase:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_session_token() -> str:
    return secrets.token_urlsafe(32)

# ================== AUTH ENDPOINTS ==================

@api_router.get("/")
async def root():
    return {"message": "RideConnect API"}

@api_router.post("/auth/register")
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    if user_data.email:
        existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    if user_data.phone:
        existing = await db.users.find_one({"phone": user_data.phone}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Phone already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "phone": user_data.phone,
        "name": user_data.name,
        "profile_picture": None,
        "bio": None,
        "profile_type": "passenger",
        "is_public": True,
        "auth_type": user_data.auth_type,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Store password if email auth
    if user_data.password and user_data.auth_type == "email":
        await db.user_passwords.insert_one({
            "user_id": user_id,
            "password_hash": hash_password(user_data.password)
        })
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = create_session_token()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "session_token": session_token, "name": user_data.name}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user = None
    
    if credentials.email:
        user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    elif credentials.phone:
        user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    password_doc = await db.user_passwords.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not password_doc or not verify_password(credentials.password, password_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = create_session_token()
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user["user_id"], "session_token": session_token, "name": user["name"]}

@api_router.post("/auth/guest")
async def guest_login(response: Response):
    # Create guest user
    user_id = f"guest_{uuid.uuid4().hex[:12]}"
    guest_num = await db.users.count_documents({"auth_type": "guest"}) + 1
    
    user_doc = {
        "user_id": user_id,
        "email": None,
        "phone": None,
        "name": f"Guest User {guest_num}",
        "profile_picture": None,
        "bio": None,
        "profile_type": "passenger",
        "is_public": True,
        "auth_type": "guest",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = create_session_token()
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "session_token": session_token, "name": user_doc["name"]}

@api_router.post("/auth/google/callback")
async def google_callback(request: Request, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id for user data
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        user_data = resp.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": user_data["email"],
            "phone": None,
            "name": user_data["name"],
            "profile_picture": user_data.get("picture"),
            "bio": None,
            "profile_type": "passenger",
            "is_public": True,
            "auth_type": "google",
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session
    session_token = user_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user_id": user_id, "session_token": session_token, "name": user_data["name"]}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ================== USER ENDPOINTS ==================

@api_router.get("/users/me")
async def get_current_user_profile(request: Request):
    user = await require_auth(request)
    return user

@api_router.put("/users/me")
async def update_profile(request: Request, update_data: UserUpdate):
    user = await require_auth(request)
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_dict}
        )
    
    # Return updated user
    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return UserBase(**updated_user)

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    current_user = await get_current_user(request)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_obj = UserBase(**user)
    
    # Check if profile is private and not following
    if not user_obj.is_public and current_user:
        # Check if current user follows this user
        follow = await db.follows.find_one({
            "follower_id": current_user.user_id,
            "following_id": user_id,
            "status": "accepted"
        }, {"_id": 0})
        
        if not follow and current_user.user_id != user_id:
            # Return limited info for private profiles
            return {
                "user_id": user_obj.user_id,
                "name": user_obj.name,
                "profile_picture": user_obj.profile_picture,
                "profile_type": user_obj.profile_type,
                "is_public": user_obj.is_public,
                "is_private": True
            }
    
    return user_obj

@api_router.get("/users")
async def search_users(q: str = "", limit: int = 20):
    query = {}
    if q:
        query = {"name": {"$regex": q, "$options": "i"}}
    
    users = await db.users.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return [UserBase(**u) for u in users]

# ================== FOLLOW ENDPOINTS ==================

@api_router.post("/follow")
async def follow_user(request: Request, follow_req: FollowRequest):
    user = await require_auth(request)
    
    if user.user_id == follow_req.following_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    # Check if target user exists
    target_user = await db.users.find_one({"user_id": follow_req.following_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check existing follow
    existing = await db.follows.find_one({
        "follower_id": user.user_id,
        "following_id": follow_req.following_id
    }, {"_id": 0})
    
    if existing:
        return {"message": "Already following or request pending", "status": existing["status"]}
    
    # Create follow
    target_is_public = target_user.get("is_public", True)
    follow_id = f"follow_{uuid.uuid4().hex[:12]}"
    
    follow_doc = {
        "follow_id": follow_id,
        "follower_id": user.user_id,
        "following_id": follow_req.following_id,
        "status": "accepted" if target_is_public else "pending",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.follows.insert_one(follow_doc)
    
    return {"message": "Follow request sent" if not target_is_public else "Now following", "status": follow_doc["status"]}

@api_router.delete("/follow/{user_id}")
async def unfollow_user(user_id: str, request: Request):
    user = await require_auth(request)
    
    result = await db.follows.delete_one({
        "follower_id": user.user_id,
        "following_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not following this user")
    
    return {"message": "Unfollowed"}

@api_router.put("/follow/requests/{follow_id}")
async def respond_follow_request(follow_id: str, request: Request, action: str = "accept"):
    user = await require_auth(request)
    
    follow = await db.follows.find_one({
        "follow_id": follow_id,
        "following_id": user.user_id,
        "status": "pending"
    }, {"_id": 0})
    
    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")
    
    new_status = "accepted" if action == "accept" else "rejected"
    await db.follows.update_one(
        {"follow_id": follow_id},
        {"$set": {"status": new_status}}
    )
    
    return {"message": f"Follow request {new_status}"}

@api_router.get("/follow/requests")
async def get_follow_requests(request: Request):
    user = await require_auth(request)
    
    requests = await db.follows.find({
        "following_id": user.user_id,
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    # Get user details for each request
    result = []
    for req in requests:
        follower = await db.users.find_one({"user_id": req["follower_id"]}, {"_id": 0})
        if follower:
            result.append({
                **req,
                "follower": UserBase(**follower)
            })
    
    return result

@api_router.get("/followers/{user_id}")
async def get_followers(user_id: str, request: Request):
    followers = await db.follows.find({
        "following_id": user_id,
        "status": "accepted"
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for f in followers:
        user = await db.users.find_one({"user_id": f["follower_id"]}, {"_id": 0})
        if user:
            result.append(UserBase(**user))
    
    return result

@api_router.get("/following/{user_id}")
async def get_following(user_id: str, request: Request):
    following = await db.follows.find({
        "follower_id": user_id,
        "status": "accepted"
    }, {"_id": 0}).to_list(1000)
    
    result = []
    for f in following:
        user = await db.users.find_one({"user_id": f["following_id"]}, {"_id": 0})
        if user:
            result.append(UserBase(**user))
    
    return result

@api_router.get("/follow/status/{user_id}")
async def get_follow_status(user_id: str, request: Request):
    current_user = await get_current_user(request)
    if not current_user:
        return {"is_following": False, "status": None}
    
    follow = await db.follows.find_one({
        "follower_id": current_user.user_id,
        "following_id": user_id
    }, {"_id": 0})
    
    if not follow:
        return {"is_following": False, "status": None}
    
    return {"is_following": follow["status"] == "accepted", "status": follow["status"]}

# ================== RIDE ENDPOINTS ==================

@api_router.post("/rides")
async def create_ride(request: Request, ride_data: RideCreate):
    user = await require_auth(request)
    
    ride_id = f"ride_{uuid.uuid4().hex[:12]}"
    ride_doc = {
        "ride_id": ride_id,
        "user_id": user.user_id,
        "origin": ride_data.origin,
        "destination": ride_data.destination,
        "date_time": ride_data.date_time,
        "available_seats": ride_data.available_seats,
        "price": ride_data.price,
        "car_details": ride_data.car_details,
        "preferences": ride_data.preferences,
        "ride_type": ride_data.ride_type,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.rides.insert_one(ride_doc)
    
    return RideBase(**ride_doc)

@api_router.get("/rides")
async def get_rides(
    origin: str = None,
    destination: str = None,
    ride_type: str = None,
    limit: int = 50
):
    query = {"status": "active"}
    
    if origin:
        query["origin"] = {"$regex": origin, "$options": "i"}
    if destination:
        query["destination"] = {"$regex": destination, "$options": "i"}
    if ride_type:
        query["ride_type"] = ride_type
    
    rides = await db.rides.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Add user info to each ride
    result = []
    for ride in rides:
        user = await db.users.find_one({"user_id": ride["user_id"]}, {"_id": 0})
        ride_obj = RideBase(**ride)
        result.append({
            **ride_obj.dict(),
            "user": UserBase(**user) if user else None
        })
    
    return result

@api_router.get("/rides/my")
async def get_my_rides(request: Request):
    user = await require_auth(request)
    
    rides = await db.rides.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return [RideBase(**r) for r in rides]

@api_router.get("/rides/{ride_id}")
async def get_ride(ride_id: str):
    ride = await db.rides.find_one({"ride_id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    user = await db.users.find_one({"user_id": ride["user_id"]}, {"_id": 0})
    
    return {
        **RideBase(**ride).dict(),
        "user": UserBase(**user) if user else None
    }

@api_router.put("/rides/{ride_id}")
async def update_ride(ride_id: str, request: Request, update_data: RideUpdate):
    user = await require_auth(request)
    
    ride = await db.rides.find_one({"ride_id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
    
    if update_dict:
        await db.rides.update_one(
            {"ride_id": ride_id},
            {"$set": update_dict}
        )
    
    updated_ride = await db.rides.find_one({"ride_id": ride_id}, {"_id": 0})
    return RideBase(**updated_ride)

@api_router.delete("/rides/{ride_id}")
async def delete_ride(ride_id: str, request: Request):
    user = await require_auth(request)
    
    ride = await db.rides.find_one({"ride_id": ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.rides.delete_one({"ride_id": ride_id})
    return {"message": "Ride deleted"}

# ================== RIDE REQUEST ENDPOINTS ==================

@api_router.post("/rides/request")
async def request_ride(request: Request, req_data: RideRequestCreate):
    user = await require_auth(request)
    
    # Check if ride exists
    ride = await db.rides.find_one({"ride_id": req_data.ride_id}, {"_id": 0})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["user_id"] == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot request your own ride")
    
    # Check existing request
    existing = await db.ride_requests.find_one({
        "ride_id": req_data.ride_id,
        "requester_id": user.user_id,
        "status": {"$in": ["pending", "accepted"]}
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Already requested this ride")
    
    request_id = f"req_{uuid.uuid4().hex[:12]}"
    request_doc = {
        "request_id": request_id,
        "ride_id": req_data.ride_id,
        "requester_id": user.user_id,
        "status": "pending",
        "message": req_data.message,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.ride_requests.insert_one(request_doc)
    
    return RideRequestBase(**request_doc)

@api_router.get("/rides/requests/my")
async def get_my_ride_requests(request: Request):
    """Get requests I've made"""
    user = await require_auth(request)
    
    requests = await db.ride_requests.find(
        {"requester_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for req in requests:
        ride = await db.rides.find_one({"ride_id": req["ride_id"]}, {"_id": 0})
        result.append({
            **RideRequestBase(**req).dict(),
            "ride": RideBase(**ride) if ride else None
        })
    
    return result

@api_router.get("/rides/requests/received")
async def get_received_requests(request: Request):
    """Get requests for my rides"""
    user = await require_auth(request)
    
    # Get my rides
    my_rides = await db.rides.find({"user_id": user.user_id}, {"ride_id": 1, "_id": 0}).to_list(100)
    ride_ids = [r["ride_id"] for r in my_rides]
    
    if not ride_ids:
        return []
    
    requests = await db.ride_requests.find(
        {"ride_id": {"$in": ride_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    result = []
    for req in requests:
        requester = await db.users.find_one({"user_id": req["requester_id"]}, {"_id": 0})
        ride = await db.rides.find_one({"ride_id": req["ride_id"]}, {"_id": 0})
        result.append({
            **RideRequestBase(**req).dict(),
            "requester": UserBase(**requester) if requester else None,
            "ride": RideBase(**ride) if ride else None
        })
    
    return result

@api_router.put("/rides/requests/{request_id}")
async def respond_ride_request(request_id: str, request: Request, action: str = "accept"):
    user = await require_auth(request)
    
    # Get the request
    ride_request = await db.ride_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not ride_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Verify ownership
    ride = await db.rides.find_one({"ride_id": ride_request["ride_id"]}, {"_id": 0})
    if not ride or ride["user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_status = "accepted" if action == "accept" else "rejected"
    
    await db.ride_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": new_status}}
    )
    
    # If accepted, reduce available seats
    if new_status == "accepted" and ride["available_seats"] > 0:
        await db.rides.update_one(
            {"ride_id": ride_request["ride_id"]},
            {"$inc": {"available_seats": -1}}
        )
    
    return {"message": f"Request {new_status}"}

# ================== STATS ENDPOINTS ==================

@api_router.get("/stats/{user_id}")
async def get_user_stats(user_id: str):
    followers_count = await db.follows.count_documents({
        "following_id": user_id,
        "status": "accepted"
    })
    
    following_count = await db.follows.count_documents({
        "follower_id": user_id,
        "status": "accepted"
    })
    
    rides_count = await db.rides.count_documents({"user_id": user_id})
    
    return {
        "followers": followers_count,
        "following": following_count,
        "rides": rides_count
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
