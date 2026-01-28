import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Dict

def detect_hotspots(incidents: List[Dict], epsilon_meters: float = 500, min_samples: int = 5) -> Dict:
    """
    Detect crime hotspots using DBSCAN clustering.
    eps is converted to degrees roughly (approx 1 degree = 111km).
    """
    if not incidents:
        return {"clusters": [], "noise": []}

    df = pd.DataFrame(incidents)
    
    # Simple validation
    if 'latitude' not in df.columns or 'longitude' not in df.columns:
        return {"error": "Missing lat/lon data"}
        
    coords = df[['latitude', 'longitude']].dropna().to_numpy()
    
    if len(coords) == 0:
        return {"clusters": [], "noise": []}

    # Approx conversion: 1 degree ~= 111,000 meters
    # eps in degrees = epsilon_meters / 111000
    eps_degrees = epsilon_meters / 111000.0
    
    # DBSCAN
    db = DBSCAN(eps=eps_degrees, min_samples=min_samples, metric='euclidean', algorithm='auto').fit(coords)
    
    df['cluster'] = db.labels_
    
    # Format results
    results = {
        "clusters": [],
        "noise": df[df['cluster'] == -1].to_dict(orient='records')
    }
    
    # Group by cluster
    unique_clusters = set(db.labels_)
    if -1 in unique_clusters:
        unique_clusters.remove(-1)
        
    for label in unique_clusters:
        cluster_points = df[df['cluster'] == label]
        centroid = {
            "latitude": cluster_points['latitude'].mean(),
            "longitude": cluster_points['longitude'].mean()
        }
        results["clusters"].append({
            "cluster_id": int(label),
            "centroid": centroid,
            "incident_count": len(cluster_points),
            "points": cluster_points.to_dict(orient='records')
        })
        
    return results
