"""
Mumbai Crime Data Generator
Generates realistic synthetic crime data for training the prediction model.
"""

import random
import pandas as pd
from datetime import datetime, timedelta
import numpy as np

# Mumbai localities with their coordinates and crime profiles
MUMBAI_LOCALITIES = {
    # South Mumbai (Commercial/Tourist) - Higher theft, lower violent crime
    'Colaba': {'lat': 18.9067, 'lon': 72.8147, 'crime_weights': {'theft': 0.4, 'fraud': 0.2, 'burglary': 0.15, 'assault': 0.1, 'robbery': 0.1, 'vandalism': 0.05}},
    'Fort': {'lat': 18.9340, 'lon': 72.8356, 'crime_weights': {'theft': 0.35, 'fraud': 0.3, 'burglary': 0.15, 'assault': 0.1, 'robbery': 0.05, 'vandalism': 0.05}},
    'Churchgate': {'lat': 18.9322, 'lon': 72.8264, 'crime_weights': {'theft': 0.4, 'fraud': 0.25, 'burglary': 0.1, 'assault': 0.1, 'robbery': 0.1, 'vandalism': 0.05}},
    'Marine Drive': {'lat': 18.9442, 'lon': 72.8234, 'crime_weights': {'theft': 0.35, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.15, 'fraud': 0.1, 'burglary': 0.05}},
    
    # Central Mumbai (Mixed) - Moderate crime rates
    'Dadar': {'lat': 19.0178, 'lon': 72.8478, 'crime_weights': {'theft': 0.3, 'assault': 0.2, 'burglary': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Parel': {'lat': 19.0036, 'lon': 72.8414, 'crime_weights': {'theft': 0.25, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Worli': {'lat': 19.0176, 'lon': 72.8190, 'crime_weights': {'theft': 0.3, 'fraud': 0.2, 'burglary': 0.2, 'assault': 0.15, 'robbery': 0.1, 'vandalism': 0.05}},
    
    # Western Suburbs (Residential/Commercial) - Mixed crime patterns
    'Bandra West': {'lat': 19.0596, 'lon': 72.8295, 'crime_weights': {'theft': 0.35, 'burglary': 0.2, 'assault': 0.15, 'robbery': 0.15, 'fraud': 0.1, 'vandalism': 0.05}},
    'Bandra East': {'lat': 19.0590, 'lon': 72.8458, 'crime_weights': {'theft': 0.3, 'assault': 0.2, 'burglary': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Andheri West': {'lat': 19.1197, 'lon': 72.8295, 'crime_weights': {'theft': 0.3, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.1, 'vandalism': 0.1, 'fraud': 0.05}},
    'Andheri East': {'lat': 19.1136, 'lon': 72.8697, 'crime_weights': {'theft': 0.25, 'assault': 0.25, 'burglary': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Juhu': {'lat': 19.1075, 'lon': 72.8263, 'crime_weights': {'theft': 0.35, 'burglary': 0.2, 'assault': 0.15, 'robbery': 0.15, 'fraud': 0.1, 'vandalism': 0.05}},
    'Goregaon': {'lat': 19.1663, 'lon': 72.8526, 'crime_weights': {'theft': 0.25, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Malad': {'lat': 19.1873, 'lon': 72.8486, 'crime_weights': {'theft': 0.25, 'assault': 0.25, 'burglary': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Kandivali': {'lat': 19.2047, 'lon': 72.8568, 'crime_weights': {'theft': 0.25, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Borivali': {'lat': 19.2295, 'lon': 72.8567, 'crime_weights': {'theft': 0.25, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    
    # Eastern Suburbs - Higher crime rates
    'Kurla': {'lat': 19.0726, 'lon': 72.8845, 'crime_weights': {'assault': 0.25, 'theft': 0.25, 'robbery': 0.2, 'burglary': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Ghatkopar': {'lat': 19.0873, 'lon': 72.9082, 'crime_weights': {'theft': 0.25, 'assault': 0.25, 'burglary': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Chembur': {'lat': 19.0522, 'lon': 72.8994, 'crime_weights': {'theft': 0.25, 'assault': 0.2, 'burglary': 0.2, 'robbery': 0.2, 'vandalism': 0.1, 'fraud': 0.05}},
    'Mulund': {'lat': 19.1726, 'lon': 72.9568, 'crime_weights': {'theft': 0.25, 'burglary': 0.25, 'assault': 0.2, 'robbery': 0.15, 'vandalism': 0.1, 'fraud': 0.05}},
    'Powai': {'lat': 19.1176, 'lon': 72.9060, 'crime_weights': {'theft': 0.3, 'burglary': 0.25, 'assault': 0.15, 'fraud': 0.15, 'robbery': 0.1, 'vandalism': 0.05}},
    
    # Dharavi area - Higher crime density
    'Dharavi': {'lat': 19.0438, 'lon': 72.8534, 'crime_weights': {'assault': 0.25, 'theft': 0.2, 'robbery': 0.2, 'vandalism': 0.15, 'burglary': 0.15, 'fraud': 0.05}},
}

# Time-based crime patterns (hour of day -> crime type multiplier)
TIME_PATTERNS = {
    'theft': {0: 0.3, 6: 0.5, 9: 1.2, 12: 1.5, 15: 1.3, 18: 1.4, 21: 1.0},
    'assault': {0: 0.8, 6: 0.3, 9: 0.5, 12: 0.7, 15: 0.6, 18: 1.0, 21: 1.5},
    'robbery': {0: 1.2, 6: 0.4, 9: 0.6, 12: 0.8, 15: 0.7, 18: 1.0, 21: 1.4},
    'burglary': {0: 0.5, 6: 0.3, 9: 0.4, 12: 1.2, 15: 1.5, 18: 0.8, 21: 0.6},
    'vandalism': {0: 1.0, 6: 0.3, 9: 0.4, 12: 0.6, 15: 0.8, 18: 1.2, 21: 1.5},
    'fraud': {0: 0.2, 6: 0.4, 9: 1.5, 12: 1.2, 15: 1.3, 18: 0.8, 21: 0.3},
}

def get_time_multiplier(crime_type: str, hour: int) -> float:
    """Get crime probability multiplier based on time of day."""
    pattern = TIME_PATTERNS.get(crime_type, {})
    hours = sorted(pattern.keys())
    for i, h in enumerate(hours):
        if hour < h:
            return pattern.get(hours[i-1] if i > 0 else hours[-1], 1.0)
    return pattern.get(hours[-1], 1.0)

def add_noise_to_coords(lat: float, lon: float, radius_km: float = 0.5) -> tuple:
    """Add random noise to coordinates within a radius."""
    # Approximate degrees per km
    lat_noise = random.gauss(0, radius_km / 111)  # 1 degree lat ≈ 111 km
    lon_noise = random.gauss(0, radius_km / 85)   # 1 degree lon ≈ 85 km at this latitude
    return lat + lat_noise, lon + lon_noise

def generate_crime_data(
    num_records: int = 5000,
    start_date: datetime = None,
    end_date: datetime = None
) -> pd.DataFrame:
    """Generate synthetic crime data for Mumbai."""
    
    if start_date is None:
        start_date = datetime.now() - timedelta(days=365)
    if end_date is None:
        end_date = datetime.now()
    
    records = []
    localities = list(MUMBAI_LOCALITIES.keys())
    
    # Weight localities by crime density (some areas have more crime)
    locality_weights = {
        'Dharavi': 2.0, 'Kurla': 1.5, 'Andheri East': 1.3,
        'Bandra East': 1.2, 'Ghatkopar': 1.2, 'Chembur': 1.3,
    }
    
    for i in range(num_records):
        # Select locality with weighting
        if random.random() < 0.4:
            # 40% chance from high-crime areas
            locality = random.choice([k for k in locality_weights.keys()])
        else:
            locality = random.choice(localities)
        
        loc_data = MUMBAI_LOCALITIES[locality]
        crime_weights = loc_data['crime_weights']
        
        # Generate random timestamp
        time_delta = (end_date - start_date).total_seconds()
        random_seconds = random.random() * time_delta
        incident_time = start_date + timedelta(seconds=random_seconds)
        
        # Select crime type based on locality weights and time
        crime_types = list(crime_weights.keys())
        weights = list(crime_weights.values())
        
        # Adjust weights based on time of day
        hour = incident_time.hour
        adjusted_weights = []
        for ct, w in zip(crime_types, weights):
            multiplier = get_time_multiplier(ct, hour)
            adjusted_weights.append(w * multiplier)
        
        # Normalize weights
        total = sum(adjusted_weights)
        adjusted_weights = [w/total for w in adjusted_weights]
        
        crime_type = random.choices(crime_types, weights=adjusted_weights, k=1)[0]
        
        # Add coordinate noise
        lat, lon = add_noise_to_coords(loc_data['lat'], loc_data['lon'])
        
        records.append({
            'latitude': round(lat, 6),
            'longitude': round(lon, 6),
            'location_name': locality,
            'crime_type': crime_type,
            'incident_time': incident_time,
            'hour': hour,
            'day_of_week': incident_time.weekday(),
            'month': incident_time.month,
        })
    
    df = pd.DataFrame(records)
    return df

def save_crime_data(filepath: str = 'data/mumbai_crime_data.csv', num_records: int = 5000):
    """Generate and save crime data to CSV."""
    df = generate_crime_data(num_records)
    df.to_csv(filepath, index=False)
    print(f"Generated {len(df)} crime records and saved to {filepath}")
    return df

if __name__ == '__main__':
    import os
    os.makedirs('data', exist_ok=True)
    save_crime_data()
