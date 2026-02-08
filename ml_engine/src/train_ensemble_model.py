#!/usr/bin/env python3
"""
Train LightGBM + XGBoost Ensemble with Logistic Regression Meta-Learner
Crime Hotspot Prediction Model for SentinelX

This script trains an ensemble model combining LightGBM and XGBoost base learners
with a Logistic Regression meta-learner for stacking.
"""

import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_predict
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score
import warnings
warnings.filterwarnings('ignore')

# Try importing LightGBM and XGBoost
try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("Warning: LightGBM not installed. Installing...")

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("Warning: XGBoost not installed. Installing...")


# Mumbai location mapping for feature engineering
LOCATION_RISK_WEIGHTS = {
    'Dharavi': 1.8, 'Kurla': 1.6, 'Ghatkopar': 1.5, 'Dadar': 1.4, 'Chembur': 1.3,
    'Bandra East': 1.2, 'Bandra West': 1.1, 'Andheri East': 1.2, 'Andheri West': 1.1,
    'Malad': 1.0, 'Goregaon': 0.9, 'Borivali': 0.8, 'Kandivali': 0.9, 'Mulund': 0.7,
    'Powai': 0.8, 'Worli': 0.9, 'Parel': 1.0, 'Fort': 0.7, 'Colaba': 0.6,
    'Marine Drive': 0.5, 'Churchgate': 0.6, 'Sion': 0.9, 'Juhu': 0.7
}

CRIME_SEVERITY = {
    'theft': 0.6, 'assault': 0.8, 'robbery': 0.9, 'burglary': 0.7,
    'vandalism': 0.4, 'fraud': 0.5, 'murder': 1.0, 'molestation': 0.85,
    'rape': 0.95, 'riots': 0.9
}


class EnsembleHotspotPredictor:
    """
    Crime Hotspot Prediction using LightGBM + XGBoost Ensemble with LR Meta-Learner.
    """
    
    def __init__(self):
        self.lgb_model = None
        self.xgb_model = None
        self.meta_learner = None
        self.location_encoder = LabelEncoder()
        self.crime_encoder = LabelEncoder()
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = None
        
    def prepare_features(self, df: pd.DataFrame) -> tuple:
        """Prepare features for training/prediction."""
        df = df.copy()
        
        # Encode location names
        if 'location_name' in df.columns:
            df['location_encoded'] = self.location_encoder.fit_transform(df['location_name'].fillna('Unknown'))
            df['location_risk'] = df['location_name'].map(LOCATION_RISK_WEIGHTS).fillna(1.0)
        else:
            df['location_encoded'] = 0
            df['location_risk'] = 1.0
            
        # Encode crime types
        if 'crime_type' in df.columns:
            df['crime_encoded'] = self.crime_encoder.fit_transform(df['crime_type'].fillna('other'))
            df['crime_severity'] = df['crime_type'].str.lower().map(CRIME_SEVERITY).fillna(0.5)
        else:
            df['crime_encoded'] = 0
            df['crime_severity'] = 0.5
        
        # Time-based features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['day_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['day_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Is weekend
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Time of day categories
        df['is_night'] = ((df['hour'] >= 22) | (df['hour'] <= 5)).astype(int)
        df['is_evening'] = ((df['hour'] >= 18) & (df['hour'] <= 21)).astype(int)
        df['is_rush_hour'] = (((df['hour'] >= 8) & (df['hour'] <= 10)) | 
                              ((df['hour'] >= 17) & (df['hour'] <= 19))).astype(int)
        
        # Spatial grid features (for clustering patterns)
        df['lat_grid'] = (df['latitude'] * 100).astype(int)
        df['lon_grid'] = (df['longitude'] * 100).astype(int)
        df['spatial_hash'] = df['lat_grid'] * 1000 + df['lon_grid']
        
        # Interaction features
        df['location_time_interaction'] = df['location_encoded'] * df['hour']
        df['risk_time_interaction'] = df['location_risk'] * df['is_night']
        
        # Create target: is this a high-risk hotspot?
        # Based on location risk, time of day, and crime severity
        risk_score = (df['location_risk'] * 0.4 + 
                     df['crime_severity'] * 0.3 +
                     df['is_night'] * 0.15 +
                     df['is_evening'] * 0.1 +
                     df['is_weekend'] * 0.05)
        df['is_hotspot'] = (risk_score >= 0.6).astype(int)
        
        # Feature columns
        feature_cols = [
            'latitude', 'longitude', 'hour', 'day_of_week', 'month',
            'location_encoded', 'location_risk', 'crime_encoded', 'crime_severity',
            'hour_sin', 'hour_cos', 'day_sin', 'day_cos', 'month_sin', 'month_cos',
            'is_weekend', 'is_night', 'is_evening', 'is_rush_hour',
            'lat_grid', 'lon_grid', 'spatial_hash',
            'location_time_interaction', 'risk_time_interaction'
        ]
        
        self.feature_names = feature_cols
        X = df[feature_cols].values
        y = df['is_hotspot'].values
        
        return X, y, df
    
    def train(self, data_path: str, model_save_dir: str):
        """Train the ensemble model."""
        print("="*60)
        print("Training LightGBM + XGBoost Ensemble with LR Meta-Learner")
        print("="*60)
        
        # Load data
        print(f"\n📂 Loading data from: {data_path}")
        df = pd.read_csv(data_path)
        print(f"   Loaded {len(df)} crime records")
        
        # Prepare features
        print("\n🔧 Preparing features...")
        X, y, df_processed = self.prepare_features(df)
        print(f"   Feature matrix shape: {X.shape}")
        print(f"   Target distribution: {np.bincount(y)}")
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        print(f"\n📊 Train/Test split: {len(X_train)}/{len(X_test)}")
        
        # === Train LightGBM ===
        print("\n🌲 Training LightGBM model...")
        lgb_params = {
            'objective': 'binary',
            'metric': 'auc',
            'boosting_type': 'gbdt',
            'num_leaves': 31,
            'learning_rate': 0.05,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'n_estimators': 200,
            'random_state': 42
        }
        
        self.lgb_model = lgb.LGBMClassifier(**lgb_params)
        self.lgb_model.fit(X_train, y_train)
        
        lgb_train_pred = self.lgb_model.predict_proba(X_train)[:, 1]
        lgb_test_pred = self.lgb_model.predict_proba(X_test)[:, 1]
        lgb_auc = roc_auc_score(y_test, lgb_test_pred)
        print(f"   LightGBM Test AUC: {lgb_auc:.4f}")
        
        # === Train XGBoost ===
        print("\n🚀 Training XGBoost model...")
        xgb_params = {
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'max_depth': 6,
            'learning_rate': 0.05,
            'n_estimators': 200,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': 42,
            'use_label_encoder': False,
            'verbosity': 0
        }
        
        self.xgb_model = xgb.XGBClassifier(**xgb_params)
        self.xgb_model.fit(X_train, y_train)
        
        xgb_train_pred = self.xgb_model.predict_proba(X_train)[:, 1]
        xgb_test_pred = self.xgb_model.predict_proba(X_test)[:, 1]
        xgb_auc = roc_auc_score(y_test, xgb_test_pred)
        print(f"   XGBoost Test AUC: {xgb_auc:.4f}")
        
        # === Train LR Meta-Learner (Stacking) ===
        print("\n📈 Training Logistic Regression meta-learner...")
        
        # Create meta-features from base model predictions
        meta_train = np.column_stack([lgb_train_pred, xgb_train_pred])
        meta_test = np.column_stack([lgb_test_pred, xgb_test_pred])
        
        self.meta_learner = LogisticRegression(
            C=1.0, 
            solver='lbfgs',
            max_iter=500,
            random_state=42
        )
        self.meta_learner.fit(meta_train, y_train)
        
        # Final ensemble predictions
        ensemble_pred = self.meta_learner.predict_proba(meta_test)[:, 1]
        ensemble_auc = roc_auc_score(y_test, ensemble_pred)
        ensemble_acc = accuracy_score(y_test, (ensemble_pred >= 0.5).astype(int))
        
        print(f"\n" + "="*60)
        print("📊 ENSEMBLE MODEL PERFORMANCE")
        print("="*60)
        print(f"   LightGBM AUC:     {lgb_auc:.4f}")
        print(f"   XGBoost AUC:      {xgb_auc:.4f}")
        print(f"   Ensemble AUC:     {ensemble_auc:.4f}")
        print(f"   Ensemble Accuracy: {ensemble_acc:.4f}")
        print(f"   Improvement:      +{(ensemble_auc - max(lgb_auc, xgb_auc))*100:.2f}%")
        
        # Classification report
        print("\n📋 Classification Report:")
        y_pred = (ensemble_pred >= 0.5).astype(int)
        print(classification_report(y_test, y_pred, target_names=['Low Risk', 'High Risk']))
        
        # Feature importance (from LightGBM)
        print("\n🎯 Top 10 Important Features (LightGBM):")
        importance = pd.DataFrame({
            'feature': self.feature_names,
            'importance': self.lgb_model.feature_importances_
        }).sort_values('importance', ascending=False)
        for _, row in importance.head(10).iterrows():
            print(f"   {row['feature']}: {row['importance']:.4f}")
        
        # === Save Models ===
        print("\n💾 Saving models...")
        os.makedirs(model_save_dir, exist_ok=True)
        
        # Save individual models
        lgb_path = os.path.join(model_save_dir, 'lightgbm_model.pkl')
        xgb_path = os.path.join(model_save_dir, 'xgboost_model.pkl')
        meta_path = os.path.join(model_save_dir, 'meta_learner.pkl')
        ensemble_path = os.path.join(model_save_dir, 'ensemble_model.pkl')
        
        joblib.dump(self.lgb_model, lgb_path)
        joblib.dump(self.xgb_model, xgb_path)
        joblib.dump(self.meta_learner, meta_path)
        
        # Save complete ensemble
        ensemble_data = {
            'lgb_model': self.lgb_model,
            'xgb_model': self.xgb_model,
            'meta_learner': self.meta_learner,
            'location_encoder': self.location_encoder,
            'crime_encoder': self.crime_encoder,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'trained_at': datetime.now().isoformat(),
            'metrics': {
                'lgb_auc': lgb_auc,
                'xgb_auc': xgb_auc,
                'ensemble_auc': ensemble_auc,
                'ensemble_accuracy': ensemble_acc
            }
        }
        joblib.dump(ensemble_data, ensemble_path)
        
        print(f"   ✅ LightGBM model: {lgb_path}")
        print(f"   ✅ XGBoost model: {xgb_path}")
        print(f"   ✅ Meta-learner: {meta_path}")
        print(f"   ✅ Complete ensemble: {ensemble_path}")
        
        self.is_trained = True
        
        print("\n" + "="*60)
        print("✅ TRAINING COMPLETE!")
        print("="*60)
        
        return ensemble_data
    
    def load(self, ensemble_path: str):
        """Load a trained ensemble model."""
        data = joblib.load(ensemble_path)
        self.lgb_model = data['lgb_model']
        self.xgb_model = data['xgb_model']
        self.meta_learner = data['meta_learner']
        self.location_encoder = data['location_encoder']
        self.crime_encoder = data['crime_encoder']
        self.scaler = data['scaler']
        self.feature_names = data['feature_names']
        self.is_trained = True
        print(f"✅ Loaded ensemble model (trained at: {data['trained_at']})")
        print(f"   Ensemble AUC: {data['metrics']['ensemble_auc']:.4f}")
        return data['metrics']
    
    def predict(self, X):
        """Make predictions using the ensemble."""
        if not self.is_trained:
            raise ValueError("Model not trained. Call train() or load() first.")
        
        X_scaled = self.scaler.transform(X)
        
        lgb_pred = self.lgb_model.predict_proba(X_scaled)[:, 1]
        xgb_pred = self.xgb_model.predict_proba(X_scaled)[:, 1]
        meta_features = np.column_stack([lgb_pred, xgb_pred])
        
        return self.meta_learner.predict_proba(meta_features)[:, 1]


def main():
    """Main training function."""
    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    
    data_path = os.path.join(project_root, 'data', 'mumbai_crime_data.csv')
    model_dir = os.path.join(script_dir, '..', 'models')
    
    print("\n" + "="*60)
    print("🚔 SentinelX Crime Hotspot Prediction Model Training")
    print("="*60)
    print(f"📁 Data path: {data_path}")
    print(f"📁 Model directory: {model_dir}")
    
    # Check if data exists
    if not os.path.exists(data_path):
        print(f"❌ Error: Data file not found at {data_path}")
        return
    
    # Train model
    predictor = EnsembleHotspotPredictor()
    metrics = predictor.train(data_path, model_dir)
    
    print("\n🎉 Model training complete! Models saved to:")
    print(f"   {model_dir}")
    
    return metrics


if __name__ == "__main__":
    main()
