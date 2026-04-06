import numpy as np
import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.db')

def predict_aqi(state, days=3):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT pm25, pm10, so2, co, no2, aqi FROM aqi_data WHERE state=? ORDER BY timestamp DESC LIMIT 7", (state,))
    rows = c.fetchall()
    conn.close()

    if not rows:
        return []

    fields = ["pm25", "pm10", "so2", "co", "no2", "aqi"]
    data = {f: [r[i] for r in rows] for i, f in enumerate(fields)}

    predictions = []
    for day in range(1, days + 1):
        pred = {}
        for f in fields:
            vals = np.array(data[f])
            x = np.arange(len(vals))
            if len(vals) >= 2:
                coeffs = np.polyfit(x, vals, 1)
                future_val = np.polyval(coeffs, len(vals) + day - 1)
                noise = np.std(vals) * 0.1 * np.random.randn()
                pred[f] = round(max(0, future_val + noise), 2)
            else:
                pred[f] = round(vals[0], 2)
        pred["date"] = (datetime.now() + timedelta(days=day)).strftime("%Y-%m-%d")
        predictions.append(pred)

    return predictions
