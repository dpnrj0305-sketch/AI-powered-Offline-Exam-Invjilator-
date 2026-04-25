"""
JWT Token Management and Authentication
"""
import jwt
from datetime import datetime, timedelta
from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer

# Security scheme
security = HTTPBearer()

def create_token(user_id: int, username: str, role: str) -> dict:
    """Create a JWT token for the user"""
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "username": username,
        "role": role
    }

def verify_token(credentials = Depends(security)) -> dict:
    """Verify JWT token from request headers"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

def verify_teacher(payload: dict = Depends(verify_token)) -> dict:
    """Verify that the user is a teacher"""
    if payload.get("role") != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers can access this resource"
        )
    return payload

def verify_student(payload: dict = Depends(verify_token)) -> dict:
    """Verify that the user is a student"""
    if payload.get("role") != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can access this resource"
        )
    return payload
