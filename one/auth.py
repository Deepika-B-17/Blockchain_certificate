import os
import json
import bcrypt
import pyotp
import jwt
import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = "supersecretkey"  # Change in production
ALGORITHM = "HS256"
USERS_DB = os.path.join(os.path.dirname(__file__), "users.json")

# Helper Functions
def load_users():
    if os.path.exists(USERS_DB):
        try:
            with open(USERS_DB, "r") as f:
                return json.load(f)
        except: return {}
    return {}

def save_users(users):
    with open(USERS_DB, "w") as f:
        json.dump(users, f, indent=4)

# Models
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str # 'institution' or 'student'
    reg_id: Optional[str] = None # For institutions
    student_id: Optional[str] = None # For students

class LoginRequest(BaseModel):
    email: str
    password: str

class Verify2FARequest(BaseModel):
    email: str
    otp: str

@router.post("/register")
def register(request: RegisterRequest):
    users = load_users()
    if request.email in users:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Hash password
    hashed_pw = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    
    # Generate TOTP secret
    totp_secret = pyotp.random_base32()
    
    users[request.email] = {
        "password": hashed_pw,
        "role": request.role,
        "name": request.name,
        "reg_id": request.reg_id,
        "student_id": request.student_id,
        "totp_secret": totp_secret,
        "2fa_enabled": True # Enabling by default as per requirement
    }
    save_users(users)
    
    # Return provisioning URL for QR code
    totp = pyotp.TOTP(totp_secret)
    provisioning_uri = totp.provisioning_uri(name=request.email, issuer_name="BlockCert")
    
    return {
        "message": "Registration successful",
        "totp_secret": totp_secret,
        "provisioning_uri": provisioning_uri
    }

@router.post("/login")
def login(request: LoginRequest):
    users = load_users()
    user = users.get(request.email)
    
    if not user or not bcrypt.checkpw(request.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": "Step 1 successful, 2FA required",
        "2fa_required": True,
        "email": request.email
    }

@router.post("/verify-2fa")
def verify_2fa(request: Verify2FARequest):
    users = load_users()
    user = users.get(request.email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    totp = pyotp.TOTP(user["totp_secret"])
    if not totp.verify(request.otp):
        raise HTTPException(status_code=401, detail="Invalid OTP")
    
    # Generate JWT
    payload = {
        "sub": request.email,
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["name"],
        "email": request.email
    }
