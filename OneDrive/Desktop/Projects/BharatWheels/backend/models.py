from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base

class Car(Base):
    __tablename__ = "cars"
    id = Column(Integer, primary_key=True, index=True)
    vin = Column(String, unique=True)
    make = Column(String)
    model = Column(String)
    year = Column(Integer)
    base_price = Column(Float)
    current_highest_bid = Column(Float, default=0)
    image_url = Column(String)
    status = Column(String, default="active")
    
    # New Specs & Auction Logic
    mileage = Column(Integer) 
    fuel_type = Column(String)
    transmission = Column(String)
    seller_contact = Column(String)
    auction_end_time = Column(DateTime)
    
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)