#!/usr/bin/env python3
"""
Train LightGBM Crime Hotspot Prediction Model
Outputs Mapbox-compatible predictions with risk scores.
"""

import pandas as pd
import numpy as np
import joblib
import os
import json
from datetime import datetime
from typing import Dict, List, Tuple

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    print("LightGBM not installed. Using sklearn GradientBoosting fallback.")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

# Mumbai Wards Reference
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


class HotspotPredictor:
    """Crime Hotspot Prediction using LightGBM or GradientBoosting."""
    
    def __init__(self):
        self.model = None
        self.ward_encoder = LabelEncoder()
        self.crime_encoder = LabelEncoder()
        self.feature_names = []
        self.ward_stats = {}
        
    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Prepare features for training/prediction."""
        
        # Encode categorical variables
        df = df.copy()
        df["ward_encoded"] = self.ward_encoder.fit_transform(df["ward_id"])
        df["crime_encoded"] = self.crime_encoder.fit_transform(df["crime_type"])
        
        # Cyclical encoding for hour
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)
        
        # Cyclical encoding for day of week
        df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
        df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)
        
        # Cyclical encoding for month
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
        
        # Calculate crime counts per ward per time window
        df["date"] = pd.to_datetime(df["timestamp"]).dt.date
        ward_hour_counts = df.groupby(["ward_id", "hour", "date"]).size().reset_index(name="crime_count")
        
        # Merge back
        df = df.merge(ward_hour_counts, on=["ward_id", "hour", "date"], how="left")
        df["crime_count"] = df["crime_count"].fillna(0)
        
        # Create hotspot label (above mean + 1std)
        self.ward_stats = df.groupby("ward_id")["crime_count"].agg(["mean", "std"]).to_dict()
        
        def is_hotspot(row):
            ward = row["ward_id"]
            threshold = self.ward_stats["mean"].get(ward, 1) + self.ward_stats["std"].get(ward, 0.5)
            return 1 if row["crime_count"] >= max(threshold, 2) else 0
        
        df["is_hotspot"] = df.apply(is_hotspot, axis=1)
        
        # Feature columns
        self.feature_names = [
            "ward_encoded", "hour_sin", "hour_cos", "dow_sin", "dow_cos",
            "month_sin", "month_cos", "is_weekend", "is_night", "ward_risk_weight"
        ]
        
        X = df[self.feature_names]
        y = df["is_hotspot"]
        
        return X, y
    
    def train(self, data_path: str, model_save_path: str):
        """Train the hotspot prediction model."""
        
        print("Loading training data...")
        df = pd.read_csv(data_path)
        print(f"Loaded {len(df)} records")
        
        print("Preparing features...")
        X, y = self.prepare_features(df)
        
        print(f"Feature shape: {X.shape}")
        print(f"Hotspot distribution: {y.value_counts().to_dict()}")
        
        # Time-based split (train on older, test on newer)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        print(f"\nTraining set: {len(X_train)}, Test set: {len(X_test)}")
        
        # Train model
        if LIGHTGBM_AVAILABLE:
            print("\nTraining LightGBM model...")
            self.model = lgb.LGBMClassifier(
                objective="binary",
                num_leaves=31,
                learning_rate=0.05,
                n_estimators=300,
                feature_fraction=0.8,
                random_state=42,
                verbose=-1
            )
        else:
            print("\nTraining GradientBoosting model (fallback)...")
            self.model = GradientBoostingClassifier(
                n_estimators=200,
                learning_rate=0.05,
                max_depth=5,
                random_state=42
            )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        print("\n=== Model Evaluation ===")
        y_pred = self.model.predict(X_test)
        y_proba = self.model.predict_proba(X_test)[:, 1]
        
        print(classification_report(y_test, y_pred))
        print(f"ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}")
        
        # Feature importance
        print("\n=== Feature Importance ===")
        if LIGHTGBM_AVAILABLE:
            importances = self.model.feature_importances_
        else:
            importances = self.model.feature_importances_
        
        for name, imp in sorted(zip(self.feature_names, importances), key=lambda x: -x[1]):
            print(f"  {name}: {imp:.4f}")
        
        # Save model
        model_data = {
            "model": self.model,
            "ward_encoder": self.ward_encoder,
            "crime_encoder": self.crime_encoder,
            "feature_names": self.feature_names,
            "ward_stats": self.ward_stats,
            "wards": MUMBAI_WARDS
        }
        
        joblib.dump(model_data, model_save_path)
        print(f"\nModel saved to: {model_save_path}")
        
        return self.model
    
    def load(self, model_path: str):
        """Load a trained model."""
        model_data = joblib.load(model_path)
        self.model = model_data["model"]
        self.ward_encoder = model_data["ward_encoder"]
        self.crime_encoder = model_data["crime_encoder"]
        self.feature_names = model_data["feature_names"]
        self.ward_stats = model_data["ward_stats"]
        return self
    
    def predict_hotspots(self, hour: int = None, day_of_week: int = None) -> List[Dict]:
        """
        Predict hotspots for all wards at a given time.
        Returns Mapbox-compatible GeoJSON features.
        """
        if self.model is None:
            raise ValueError("Model not loaded. Call load() first.")
        
        now = datetime.now()
        hour = hour if hour is not None else now.hour
        day_of_week = day_of_week if day_of_week is not None else now.weekday()
        month = now.month
        
        predictions = []
        
        for ward_id, ward_info in MUMBAI_WARDS.items():
            # Create feature vector
            try:
                ward_encoded = self.ward_encoder.transform([ward_id])[0]
            except:
                ward_encoded = 0
            
            features = {
                "ward_encoded": ward_encoded,
                "hour_sin": np.sin(2 * np.pi * hour / 24),
                "hour_cos": np.cos(2 * np.pi * hour / 24),
                "dow_sin": np.sin(2 * np.pi * day_of_week / 7),
                "dow_cos": np.cos(2 * np.pi * day_of_week / 7),
                "month_sin": np.sin(2 * np.pi * month / 12),
                "month_cos": np.cos(2 * np.pi * month / 12),
                "is_weekend": 1 if day_of_week >= 5 else 0,
                "is_night": 1 if (hour >= 22 or hour <= 5) else 0,
                "ward_risk_weight": ward_info["risk_weight"]
            }
            
            X = pd.DataFrame([features])[self.feature_names]
            
            # Predict probability
            risk_score = self.model.predict_proba(X)[0, 1]
            
            # Determine intensity level
            if risk_score >= 0.7:
                intensity = "critical"
            elif risk_score >= 0.5:
                intensity = "high"
            elif risk_score >= 0.3:
                intensity = "medium"
            else:
                intensity = "low"
            
            # Create GeoJSON feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [ward_info["lng"], ward_info["lat"]]
                },
                "properties": {
                    "ward_id": ward_id,
                    "ward_name": ward_info["name"],
                    "risk_score": round(float(risk_score), 3),
                    "intensity": intensity,
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "is_night": features["is_night"],
                    "base_risk": ward_info["risk_weight"]
                }
            }
            
            predictions.append(feature)
        
        # Sort by risk score descending
        predictions.sort(key=lambda x: -x["properties"]["risk_score"])
        
        return predictions
    
    def get_prediction_geojson(self, hour: int = None, day_of_week: int = None) -> Dict:
        """Get predictions as complete GeoJSON FeatureCollection."""
        features = self.predict_hotspots(hour, day_of_week)
        
        return {
            "type": "FeatureCollection",
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "hour": hour if hour is not None else datetime.now().hour,
                "day_of_week": day_of_week if day_of_week is not None else datetime.now().weekday()
            },
            "features": features
        }


def main():
    """Train the model."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "mumbai_crime_training.csv")
    
    models_dir = os.path.join(script_dir, "..", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, "hotspot_lightgbm.pkl")
    
    predictor = HotspotPredictor()
    predictor.train(data_path, model_path)
    
    # Test predictions
    print("\n=== Sample Predictions (Current Time) ===")
    predictor_loaded = HotspotPredictor()
    predictor_loaded.load(model_path)
    
    geojson = predictor_loaded.get_prediction_geojson()
    print(f"\nTop 5 Hotspots:")
    for f in geojson["features"][:5]:
        props = f["properties"]
        print(f"  {props['ward_name']}: {props['risk_score']:.2f} ({props['intensity']})")
    
    # Test night prediction
    print("\n=== Night Predictions (2 AM) ===")
    geojson_night = predictor_loaded.get_prediction_geojson(hour=2)
    print("Top 5 Night Hotspots:")
    for f in geojson_night["features"][:5]:
        props = f["properties"]
        print(f"  {props['ward_name']}: {props['risk_score']:.2f} ({props['intensity']})")


if __name__ == "__main__":
    main()
