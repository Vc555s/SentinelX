"""
Crime Hotspot Prediction Model
Predicts crime hotspots based on location and time features.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
import joblib
import os
from datetime import datetime
from typing import List, Dict, Tuple

class CrimeHotspotPredictor:
    def __init__(self, model_path: str = None):
        self.risk_model = None
        self.crime_type_model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.model_path = model_path or 'models/hotspot_model.joblib'
        self.is_trained = False
        
        # Grid parameters for Mumbai
        self.lat_min, self.lat_max = 18.89, 19.27
        self.lon_min, self.lon_max = 72.77, 72.99
        self.grid_size = 0.01  # ~1km grid cells
        
    def _create_features(self, df: pd.DataFrame) -> np.ndarray:
        """Create feature matrix from dataframe."""
        features = []
        
        for _, row in df.iterrows():
            feat = [
                row['latitude'],
                row['longitude'],
                row['hour'],
                row['day_of_week'],
                row['month'],
                np.sin(2 * np.pi * row['hour'] / 24),  # Cyclical hour
                np.cos(2 * np.pi * row['hour'] / 24),
                np.sin(2 * np.pi * row['day_of_week'] / 7),  # Cyclical day
                np.cos(2 * np.pi * row['day_of_week'] / 7),
            ]
            features.append(feat)
        
        return np.array(features)
    
    def train(self, data_path: str = 'data/mumbai_crime_data.csv'):
        """Train the prediction model on crime data."""
        print("Loading training data...")
        df = pd.read_csv(data_path)
        
        if 'incident_time' in df.columns:
            df['incident_time'] = pd.to_datetime(df['incident_time'])
            df['hour'] = df['incident_time'].dt.hour
            df['day_of_week'] = df['incident_time'].dt.weekday
            df['month'] = df['incident_time'].dt.month
        
        print(f"Training on {len(df)} records...")
        
        # Create features
        X = self._create_features(df)
        X_scaled = self.scaler.fit_transform(X)
        
        # Encode crime types
        y_crime_type = self.label_encoder.fit_transform(df['crime_type'])
        
        # Create risk score based on crime type severity
        severity_map = {
            'theft': 0.3, 'vandalism': 0.2, 'fraud': 0.3,
            'burglary': 0.5, 'assault': 0.7, 'robbery': 0.8, 'murder': 1.0
        }
        df['severity'] = df['crime_type'].map(lambda x: severity_map.get(x, 0.5))
        
        # Train crime type classifier
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_crime_type, test_size=0.2, random_state=42
        )
        
        self.crime_type_model = RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=42, n_jobs=-1
        )
        self.crime_type_model.fit(X_train, y_train)
        
        accuracy = self.crime_type_model.score(X_test, y_test)
        print(f"Crime type prediction accuracy: {accuracy:.2%}")
        
        # Train risk level regressor
        self.risk_model = GradientBoostingRegressor(
            n_estimators=100, max_depth=5, random_state=42
        )
        self.risk_model.fit(X_scaled, df['severity'])
        
        self.is_trained = True
        
        # Save models
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.save_model()
        print(f"Models saved to {self.model_path}")
        
        return accuracy
    
    def save_model(self):
        """Save trained models to disk."""
        model_data = {
            'risk_model': self.risk_model,
            'crime_type_model': self.crime_type_model,
            'scaler': self.scaler,
            'label_encoder': self.label_encoder,
            'is_trained': self.is_trained
        }
        joblib.dump(model_data, self.model_path)
    
    def load_model(self):
        """Load trained models from disk."""
        if os.path.exists(self.model_path):
            model_data = joblib.load(self.model_path)
            self.risk_model = model_data['risk_model']
            self.crime_type_model = model_data['crime_type_model']
            self.scaler = model_data['scaler']
            self.label_encoder = model_data['label_encoder']
            self.is_trained = model_data['is_trained']
            return True
        return False
    
    def predict_hotspots(
        self, 
        target_time: datetime = None,
        grid_resolution: float = 0.01
    ) -> List[Dict]:
        """
        Generate hotspot predictions for a given time.
        Returns list of grid cells with risk scores.
        """
        if not self.is_trained:
            if not self.load_model():
                raise ValueError("Model not trained. Call train() first.")
        
        if target_time is None:
            target_time = datetime.now()
        
        hour = target_time.hour
        day_of_week = target_time.weekday()
        month = target_time.month
        
        # Generate grid points
        lats = np.arange(self.lat_min, self.lat_max, grid_resolution)
        lons = np.arange(self.lon_min, self.lon_max, grid_resolution)
        
        predictions = []
        
        for lat in lats:
            for lon in lons:
                features = np.array([[
                    lat, lon, hour, day_of_week, month,
                    np.sin(2 * np.pi * hour / 24),
                    np.cos(2 * np.pi * hour / 24),
                    np.sin(2 * np.pi * day_of_week / 7),
                    np.cos(2 * np.pi * day_of_week / 7),
                ]])
                
                features_scaled = self.scaler.transform(features)
                
                risk_score = self.risk_model.predict(features_scaled)[0]
                crime_type_idx = self.crime_type_model.predict(features_scaled)[0]
                crime_type = self.label_encoder.inverse_transform([crime_type_idx])[0]
                
                # Only include cells with significant risk
                if risk_score > 0.3:
                    predictions.append({
                        'latitude': float(lat),
                        'longitude': float(lon),
                        'risk_score': float(risk_score),
                        'predicted_crime_type': crime_type,
                        'risk_level': self._score_to_level(risk_score),
                        'time': target_time.isoformat()
                    })
        
        # Sort by risk score and return top hotspots
        predictions.sort(key=lambda x: x['risk_score'], reverse=True)
        return predictions[:50]  # Top 50 hotspots
    
    def _score_to_level(self, score: float) -> str:
        """Convert numeric score to risk level."""
        if score >= 0.7:
            return 'critical'
        elif score >= 0.5:
            return 'high'
        elif score >= 0.35:
            return 'medium'
        else:
            return 'low'
    
    def incremental_update(self, new_crime: Dict):
        """
        Update model with new crime report (online learning).
        This is a simplified version - in production, you'd use proper online learning.
        """
        # For now, just log that we received new data
        # Full implementation would use partial_fit or retrain periodically
        print(f"Received new crime report: {new_crime}")
        # TODO: Implement proper online learning with SGDClassifier


if __name__ == '__main__':
    from data_generator import save_crime_data
    
    # Generate training data
    print("Generating training data...")
    os.makedirs('data', exist_ok=True)
    save_crime_data('data/mumbai_crime_data.csv', num_records=10000)
    
    # Train model
    print("\nTraining prediction model...")
    predictor = CrimeHotspotPredictor()
    predictor.train('data/mumbai_crime_data.csv')
    
    # Test prediction
    print("\nTesting predictions...")
    hotspots = predictor.predict_hotspots()
    print(f"\nTop 5 predicted hotspots:")
    for i, h in enumerate(hotspots[:5]):
        print(f"  {i+1}. {h['latitude']:.4f}, {h['longitude']:.4f} - {h['risk_level']} ({h['predicted_crime_type']})")
