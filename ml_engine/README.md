# SentinelX ML Engine

This directory contains the machine learning pipelines and scripts for Crime Mapping and Predictive Policing.

## Structure
- `data/`: Raw and processed data storage (should be gitignored)
- `notebooks/`: Jupyter notebooks for EDA and model prototyping
- `src/`: Production-ready python scripts for data processing and model training
- `models/`: Saved model artifacts (.pkl, .pt, etc.)

## Key Components
1. **Hotspot Detection**: Clustering algorithms (DBSCAN, K-Means) to identify high-crime areas.
2. **Prediction Models**: Time-series forecasting (Prophet, LSTM) for future trend analysis.
3. **Resource Optimization**: Algorithms to suggest patrol routes.
