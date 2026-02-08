#!/usr/bin/env python3
"""
Generate Synthetic Training Data for Crime Hotspot Prediction
Based on real Mumbai ward data and crime statistics.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import json

# Mumbai Wards with coordinates and crime risk weights
# Higher weights for low-income areas (Dharavi, Kurla, M/E Ward)
MUMBAI_WARDS = {
    "G/N": {"name": "Dharavi-Mahim-Dadar", "lat": 19.0419, "lng": 72.8478, "risk_weight": 1.8},
    "L": {"name": "Kurla-Sakinaka", "lat": 19.0651, "lng": 72.8838, "risk_weight": 1.6},
    "M/E": {"name": "Mankhurd-Deonar", "lat": 19.0466, "lng": 72.9176, "risk_weight": 1.7},
    "M/W": {"name": "Chembur", "lat": 19.0522, "lng": 72.8982, "risk_weight": 1.2},
    "E": {"name": "Byculla-Nagpada", "lat": 18.9795, "lng": 72.8383, "risk_weight": 1.5},
    "F/N": {"name": "Matunga-Sion-Wadala", "lat": 19.0232, "lng": 72.8581, "risk_weight": 1.1},
    "N": {"name": "Ghatkopar-Vidyavihar", "lat": 19.0796, "lng": 72.9082, "risk_weight": 1.0},
    "K/E": {"name": "Andheri-East", "lat": 19.1197, "lng": 72.8465, "risk_weight": 1.1},
    "K/W": {"name": "Andheri-West", "lat": 19.1285, "lng": 72.8361, "risk_weight": 0.9},
    "H/E": {"name": "Bandra-East", "lat": 19.0596, "lng": 72.8479, "risk_weight": 0.9},
    "H/W": {"name": "Bandra-West", "lat": 19.0544, "lng": 72.8267, "risk_weight": 0.7},
    "S": {"name": "Powai-Vikhroli", "lat": 19.1177, "lng": 72.9109, "risk_weight": 0.8},
    "P/N": {"name": "Malad", "lat": 19.1874, "lng": 72.8484, "risk_weight": 1.0},
    "P/S": {"name": "Goregaon", "lat": 19.1556, "lng": 72.8495, "risk_weight": 0.9},
    "R/C": {"name": "Borivali", "lat": 19.2307, "lng": 72.8567, "risk_weight": 0.8},
    "R/N": {"name": "Dahisar", "lat": 19.2590, "lng": 72.8613, "risk_weight": 0.7},
    "R/S": {"name": "Kandivali", "lat": 19.2052, "lng": 72.8522, "risk_weight": 0.9},
    "T": {"name": "Mulund", "lat": 19.1726, "lng": 72.9561, "risk_weight": 0.7},
    "A": {"name": "Colaba-Churchgate", "lat": 18.9220, "lng": 72.8347, "risk_weight": 0.6},
    "B": {"name": "Dongri-Bhendi-Bazar", "lat": 18.9586, "lng": 72.8347, "risk_weight": 1.3},
    "C": {"name": "Pydhonie-Bhuleshwar", "lat": 18.9520, "lng": 72.8310, "risk_weight": 1.0},
    "D": {"name": "Malabar-Hill", "lat": 18.9551, "lng": 72.7975, "risk_weight": 0.5},
    "F/S": {"name": "Parel", "lat": 19.0073, "lng": 72.8428, "risk_weight": 1.0},
    "G/S": {"name": "Worli-Prabhadevi", "lat": 19.0166, "lng": 72.8152, "risk_weight": 0.8},
}

# Crime types with their characteristics
CRIME_TYPES = {
    "Murder": {"peak_hours": [23, 0, 1, 2, 3], "night_multiplier": 1.8, "severity": 5},
    "Attempt to Murder": {"peak_hours": [22, 23, 0, 1, 2], "night_multiplier": 1.5, "severity": 4},
    "Rape": {"peak_hours": [22, 23, 0, 1, 2, 3, 4], "night_multiplier": 1.6, "severity": 5},
    "Molestation": {"peak_hours": [18, 19, 20, 21, 22, 23], "night_multiplier": 1.4, "severity": 3},
    "Robbery": {"peak_hours": [20, 21, 22, 23, 0, 1, 2], "night_multiplier": 1.6, "severity": 4},
    "Thefts": {"peak_hours": [10, 11, 14, 15, 16, 17, 18, 19], "night_multiplier": 0.7, "severity": 2},
    "Hurt": {"peak_hours": [18, 19, 20, 21, 22, 23], "night_multiplier": 1.2, "severity": 3},
    "Riots": {"peak_hours": [14, 15, 16, 17, 18, 19], "night_multiplier": 0.5, "severity": 4},
}

# Base monthly crime data from user
BASE_CRIME_DATA = """Month-Year,Crime Type,Number
October-2021,Rape,54
October-2021,Molestation,250
April-2022,Rape,88
April-2022,Molestation,277
May-2022,Murder,11
May-2022,Attempt to Murder,17
May-2022,Robbery,46
May-2022,Thefts,602
May-2022,Hurt,395
May-2022,Riots,22
May-2022,Rape,92
May-2022,Molestation,221
June-2022,Rape,73
June-2022,Molestation,196
July-2022,Rape,73
July-2022,Molestation,120
August-2022,Murder,5
August-2022,Attempt to Murder,25
August-2022,Robbery,64
August-2022,Thefts,709
August-2022,Hurt,355
August-2022,Riots,18
August-2022,Rape,58
August-2022,Molestation,143
September-2022,Murder,5
September-2022,Attempt to Murder,25
September-2022,Robbery,64
September-2022,Thefts,709
September-2022,Hurt,355
September-2022,Riots,18
September-2022,Rape,67
September-2022,Molestation,191
October-2022,Murder,6
October-2022,Attempt to Murder,15
October-2022,Robbery,57
October-2022,Thefts,535
October-2022,Hurt,304
October-2022,Riots,25
October-2022,Rape,65
October-2022,Molestation,190
November-2022,Murder,6
November-2022,Attempt to Murder,15
November-2022,Robbery,57
November-2022,Thefts,535
November-2022,Hurt,304
November-2022,Riots,25
November-2022,Rape,65
November-2022,Molestation,190
December-2022,Murder,11
December-2022,Attempt to Murder,17
December-2022,Robbery,46
December-2022,Thefts,602
December-2022,Hurt,395
December-2022,Riots,22
December-2022,Rape,92
December-2022,Molestation,221"""


def parse_month_year(month_year_str):
    """Parse 'Month-Year' format to datetime."""
    month_map = {
        "January": 1, "February": 2, "March": 3, "April": 4,
        "May": 5, "June": 6, "July": 7, "August": 8,
        "September": 9, "October": 10, "November": 11, "December": 12
    }
    month_str, year_str = month_year_str.split("-")
    return datetime(int(year_str), month_map[month_str], 1)


def get_hour_weight(hour, crime_type):
    """Get hour weight based on crime type characteristics."""
    info = CRIME_TYPES.get(crime_type, {"peak_hours": list(range(24)), "night_multiplier": 1.0})
    
    # Base weight
    if hour in info["peak_hours"]:
        weight = 2.0
    elif hour in range(22, 24) or hour in range(0, 6):  # Night hours
        weight = info["night_multiplier"]
    else:
        weight = 0.5
    
    return weight


def generate_training_data(output_path: str):
    """Generate synthetic training data from base statistics."""
    
    # Parse base data
    from io import StringIO
    base_df = pd.read_csv(StringIO(BASE_CRIME_DATA))
    
    all_records = []
    record_id = 0
    
    np.random.seed(42)
    
    for _, row in base_df.iterrows():
        month_date = parse_month_year(row["Month-Year"])
        crime_type = row["Crime Type"]
        total_crimes = int(row["Number"])
        
        # Distribute crimes across wards based on risk weights
        ward_weights = {w: info["risk_weight"] for w, info in MUMBAI_WARDS.items()}
        total_weight = sum(ward_weights.values())
        
        for ward_id, ward_info in MUMBAI_WARDS.items():
            # Calculate crimes for this ward
            ward_proportion = ward_info["risk_weight"] / total_weight
            ward_crimes = int(total_crimes * ward_proportion * np.random.uniform(0.8, 1.2))
            
            if ward_crimes == 0:
                continue
            
            # Distribute across days of month
            days_in_month = 30
            
            for _ in range(ward_crimes):
                # Random day
                day = np.random.randint(1, days_in_month + 1)
                
                # Hour based on crime type distribution
                hour_weights = [get_hour_weight(h, crime_type) for h in range(24)]
                hour_weights = np.array(hour_weights) / sum(hour_weights)
                hour = np.random.choice(range(24), p=hour_weights)
                
                # Create timestamp
                try:
                    timestamp = datetime(month_date.year, month_date.month, min(day, 28), hour)
                except:
                    timestamp = datetime(month_date.year, month_date.month, 28, hour)
                
                # Add some noise to coordinates
                lat = ward_info["lat"] + np.random.normal(0, 0.005)
                lng = ward_info["lng"] + np.random.normal(0, 0.005)
                
                record = {
                    "record_id": record_id,
                    "timestamp": timestamp,
                    "ward_id": ward_id,
                    "ward_name": ward_info["name"],
                    "latitude": lat,
                    "longitude": lng,
                    "crime_type": crime_type,
                    "hour": hour,
                    "day_of_week": timestamp.weekday(),
                    "month": timestamp.month,
                    "year": timestamp.year,
                    "is_weekend": 1 if timestamp.weekday() >= 5 else 0,
                    "is_night": 1 if (hour >= 22 or hour <= 5) else 0,
                    "ward_risk_weight": ward_info["risk_weight"],
                }
                
                all_records.append(record)
                record_id += 1
    
    # Create DataFrame
    df = pd.DataFrame(all_records)
    
    # Sort by timestamp
    df = df.sort_values("timestamp").reset_index(drop=True)
    
    # Save to CSV
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} training records")
    print(f"Saved to: {output_path}")
    
    # Print summary
    print("\n=== Data Summary ===")
    print(f"Date Range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"\nCrimes by Ward (top 10):")
    print(df["ward_id"].value_counts().head(10))
    print(f"\nCrimes by Type:")
    print(df["crime_type"].value_counts())
    print(f"\nCrimes by Hour distribution:")
    print(df["hour"].value_counts().sort_index())
    
    return df


def generate_ward_geojson(output_path: str):
    """Generate GeoJSON for Mumbai wards."""
    features = []
    
    for ward_id, info in MUMBAI_WARDS.items():
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [info["lng"], info["lat"]]
            },
            "properties": {
                "ward_id": ward_id,
                "name": info["name"],
                "risk_weight": info["risk_weight"]
            }
        }
        features.append(feature)
    
    geojson = {
        "type": "FeatureCollection",
        "features": features
    }
    
    with open(output_path, "w") as f:
        json.dump(geojson, f, indent=2)
    
    print(f"Saved ward GeoJSON to: {output_path}")


if __name__ == "__main__":
    # Create output directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "..", "data")
    os.makedirs(data_dir, exist_ok=True)
    
    # Generate training data
    training_path = os.path.join(data_dir, "mumbai_crime_training.csv")
    generate_training_data(training_path)
    
    # Generate ward GeoJSON
    geojson_path = os.path.join(data_dir, "mumbai_wards.geojson")
    generate_ward_geojson(geojson_path)
