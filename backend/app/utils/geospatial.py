import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from typing import List, Dict, Optional
import json

def process_coordinates(df: pd.DataFrame, lat_col: str = 'latitude', lon_col: str = 'longitude') -> gpd.GeoDataFrame:
    """
    Convert a DataFrame with lat/lon columns to a GeoDataFrame.
    """
    geometry = [Point(xy) for xy in zip(df[lon_col], df[lat_col])]
    gdf = gpd.GeoDataFrame(df, geometry=geometry)
    # Set default CRS to WGS84 (standard lat/lon)
    gdf.set_crs(epsg=4326, inplace=True)
    return gdf

def validate_coordinates(lat: float, lon: float) -> bool:
    """
    Simple validation for latitude and longitude.
    """
    if not (-90 <= lat <= 90):
        return False
    if not (-180 <= lon <= 180):
        return False
    return True

def export_to_geojson(data: List[Dict]) -> str:
    """
    Convert list of incident dictionaries to GeoJSON string.
    """
    df = pd.DataFrame(data)
    if 'latitude' not in df.columns or 'longitude' not in df.columns:
        return json.dumps({"type": "FeatureCollection", "features": []})
        
    gdf = process_coordinates(df)
    return gdf.to_json()
