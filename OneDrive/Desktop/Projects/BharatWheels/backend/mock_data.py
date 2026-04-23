import random
from datetime import datetime, timedelta  # 🟢 Added datetime imports
from sqlalchemy.orm import sessionmaker
from database import engine
import models

models.Base.metadata.create_all(bind=engine)
Session = sessionmaker(bind=engine)
session = Session()

def seed_data():
    print("🚀 Re-stocking BharatWheels: 50 Cars with 15-Minute Timers...")
    session.query(models.User).delete()
    session.query(models.Car).delete()

    fleet_templates = [
        {
            "make": "Mahindra", "model": "Thar", "base": 1720000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Mahindra_Thar_SUV_in_%22Red_Rage%22_color_at_Ashiana_Brahmanda,_East_Singbhum_India_(Ank_Kumar,_Infosys_limited)_02.jpg?width=800",
            "colors": ["Stealth Black", "Rage Red"],
            "fuels": ["Diesel", "Petrol"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Tata", "model": "Nexon EV", "base": 1640000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/2020_Tata_Nexon_EV_(India)_front_view.png?width=800",
            "colors": ["Empowered Oxide", "Teal Blue"],
            "fuels": ["EV"], # EV only!
            "transmissions": ["Automatic"] # EVs are automatic
        },
        {
            "make": "Toyota", "model": "Fortuner", "base": 4350000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Fortuner_White.jpg?width=800",
            "colors": ["Attitude Black", "Silver Metallic"],
            "fuels": ["Diesel", "Petrol"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Hyundai", "model": "Creta", "base": 1920000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai_Creta_SU2_PE_1.5_Premium_Slate_Blue_Pearl_03.jpg?width=800",
            "colors": ["Abyss Black", "Fiery Red"],
            "fuels": ["Petrol", "Diesel"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Mahindra", "model": "Scorpio-N", "base": 2180000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/2024_Mahindra_Scorpio_Z8L_front.jpg?width=800",
            "colors": ["Deep Forest", "Napoli Black"],
            "fuels": ["Diesel", "Petrol"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Maruti", "model": "Swift", "base": 920000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Maruti_Suzuki_Swift_4456.JPG?width=800",
            "colors": ["Lustre Blue", "Sizzling Red"],
            "fuels": ["Petrol"], # Swift is Petrol only in recent years
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Skoda", "model": "Slavia", "base": 1680000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Skoda_Slavia_Side_view.jpg?width=800",
            "colors": ["Carbon Steel", "Crystal Blue"],
            "fuels": ["Petrol"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Tata", "model": "Harrier", "base": 2450000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Tata_Buzzard_Sport_Genf_2019_1Y7A5793.jpg?width=800",
            "colors": ["Oberon Black", "Sunlit Yellow"],
            "fuels": ["Diesel"], # Harrier is Diesel only
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Mahindra", "model": "XUV700", "base": 2680000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/2021_Mahindra_XUV700_2.2_AX7_(India)_front_view.png?width=800",
            "colors": ["Midnight Black", "Everest White"],
            "fuels": ["Petrol", "Diesel"],
            "transmissions": ["Manual", "Automatic"]
        },
        {
            "make": "Kia", "model": "Seltos", "base": 2050000,
            "img_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Kia_Seltos_2024.jpg?width=800",
            "colors": ["Pewter Olive", "Aurora Black"],
            "fuels": ["Petrol", "Diesel"],
            "transmissions": ["Manual", "Automatic"]
        },
    ]

    for i in range(50):
        template = random.choice(fleet_templates)
        color = random.choice(template["colors"])
        random_year = random.randint(2021, 2026)
        
        # Generate realistic random mileage (lower for newer cars)
        if random_year >= 2025:
            random_mileage = random.randint(1500, 15000)
        elif random_year >= 2023:
            random_mileage = random.randint(15000, 45000)
        else:
            random_mileage = random.randint(45000, 95000)
            
        fuel = random.choice(template["fuels"])
        transmission = random.choice(template["transmissions"])
        
        # 🟢 Generate Random Indian Phone Number 🟢
        first_digit = random.choice([7, 8, 9])
        rest_of_number = random.randint(100000000, 999999999)
        indian_phone = f"+91 {first_digit}{rest_of_number}"
        
        # 🟢 The Timer Logic 🟢
        # Ends exactly 15 minutes from when this script is run
        end_time = datetime.now() + timedelta(minutes=15)
        
        car = models.Car(
            vin=f"BW-{random_year}-IND-{1000 + i}",
            make=template["make"],
            model=template["model"],
            year=random_year,
            base_price=template["base"] + random.randint(-40000, 60000),
            current_highest_bid=0,
            image_url=template["img_url"], 
            status=color,
            mileage=random_mileage,
            fuel_type=fuel,
            transmission=transmission,
            seller_contact=indian_phone,
            auction_end_time=end_time  # 🟢 Assigned to database here
        )
        session.add(car)

    session.commit()
    print(f"✅ Finished: 50 Cars added! Auctions will close in exactly 15 minutes.")

if __name__ == "__main__":
    seed_data()