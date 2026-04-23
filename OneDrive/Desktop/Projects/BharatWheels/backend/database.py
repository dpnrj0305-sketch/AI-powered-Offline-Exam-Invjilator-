import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Get the absolute path of the directory where database.py is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Define the absolute path to the database file
# This forces the app to always use the file in your 'backend' folder
DB_PATH = os.path.join(BASE_DIR, "auction.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# 3. Create the SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

# 4. Create a SessionLocal class for database requests
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Create the Base class that our models will inherit from
Base = declarative_base()

# Helper function to get a database session (used in main.py)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()