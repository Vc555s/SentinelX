import pandas as pd
from typing import List, Dict
import io
from fastapi import UploadFile

def parse_csv_data(contents: bytes) -> List[Dict]:
    """
    Parse uploaded CSV content into a list of dictionaries.
    Assumes CSV has columns fitting our schema or generic ones that need mapping.
    """
    df = pd.read_csv(io.BytesIO(contents))
    
    # Basic cleaning
    df.columns = [c.lower().strip().replace(' ', '_') for c in df.columns]
    
    # Fill NaN with None/Null for JSON compatibility
    df = df.where(pd.notnull(df), None)
    
    return df.to_dict(orient='records')

def map_csv_to_incident_schema(row: Dict) -> Dict:
    """
    Attempt to map CSV columns to CrimeIncident schema.
    This is a helper and might need customization based on actual dataset.
    """
    return {
        "fir_id": str(row.get('fir_id') or row.get('id') or ''),
        "crime_type": row.get('crime_type') or row.get('type') or 'other',
        "description": row.get('description') or row.get('desc'),
        "latitude": row.get('latitude') or row.get('lat'),
        "longitude": row.get('longitude') or row.get('lon') or row.get('long'),
        "location_name": row.get('location_name') or row.get('address') or row.get('location'),
        "incident_time": row.get('incident_time') or row.get('date') or row.get('time'),
        "status": row.get('status') or 'reported'
    }
