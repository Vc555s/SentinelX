import pandas as pd
from typing import List, Dict

def predict_trends(incidents: List[Dict]) -> Dict:
    """
    Basic trend analysis using Moving Averages.
    Advanced forecasting (Prophet/LSTM) would go here.
    """
    if not incidents:
        return {"trends": []}
        
    df = pd.DataFrame(incidents)
    df['incident_time'] = pd.to_datetime(df['incident_time'])
    
    # Resample by day
    daily_counts = df.set_index('incident_time').resample('D').size()
    
    # Calculate moving average (7-day)
    moving_avg = daily_counts.rolling(window=7).mean().fillna(0)
    
    # Future "prediction" (simplistic: linear extrapolation or just returning recent trend)
    # For MVP, we return the historical trend used for charting
    
    trend_data = []
    for date, count in daily_counts.items():
        trend_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "count": int(count),
            "moving_avg": float(moving_avg.get(date, 0))
        })
        
    return {"daily_trends": trend_data}
