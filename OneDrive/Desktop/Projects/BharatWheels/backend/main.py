from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hashlib

import models
import database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PYDANTIC SCHEMAS ---

class BidRequest(BaseModel):
    car_id: int
    user_id: int
    amount: float

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# --- PASSWORD HASHING ---

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# --- WEBSOCKET MANAGER ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, car_id: int, websocket: WebSocket):
        await websocket.accept()
        if car_id not in self.active_connections:
            self.active_connections[car_id] = []
        self.active_connections[car_id].append(websocket)

    def disconnect(self, car_id: int, websocket: WebSocket):
        if car_id in self.active_connections:
            self.active_connections[car_id].remove(websocket)

    async def broadcast(self, car_id: int, message: str):
        if car_id in self.active_connections:
            for connection in self.active_connections[car_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# --- AUTH ENDPOINTS ---

@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(database.get_db)):
    # Check if email already exists
    existing = db.query(models.User).filter(models.User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = models.User(
        name=req.name,
        email=req.email,
        password=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"id": user.id, "name": user.name, "email": user.email}

@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email")

    if user.password != hash_password(req.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {"id": user.id, "name": user.name, "email": user.email}

# --- CAR ENDPOINTS ---

@app.get("/cars")
def get_cars(db: Session = Depends(database.get_db)):
    cars = db.query(models.Car).all()
    print(f"DEBUG: Found {len(cars)} cars in database")
    return cars

@app.post("/bid")
async def place_bid(bid: BidRequest, db: Session = Depends(database.get_db)):
    car = db.query(models.Car).filter(models.Car.id == bid.car_id).with_for_update().first()

    if not car:
        raise HTTPException(status_code=404, detail="Car not found")

    current_price = car.current_highest_bid if car.current_highest_bid > 0 else car.base_price

    if bid.amount <= current_price:
        return {"error": f"Bid must be higher than current price of ₹{current_price}"}

    car.current_highest_bid = bid.amount
    db.commit()

    await manager.broadcast(bid.car_id, f"Car {bid.car_id} new bid {bid.amount}")

    return {"message": "Bid successful", "new_price": bid.amount}

@app.websocket("/ws/{car_id}")
async def websocket_endpoint(websocket: WebSocket, car_id: int):
    await manager.connect(car_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(car_id, websocket)