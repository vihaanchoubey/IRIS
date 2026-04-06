import numpy as np
import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.db')

def predict_water(state, weeks=3):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT ph, tds, fluoride, arsenic, iron FROM water_quality WHERE state=? ORDER BY timestamp DESC LIMIT 7", (state,))
    rows = c.fetchall()
    conn.close()

    if not rows:
        return []

    fields = ["ph", "tds", "fluoride", "arsenic", "iron"]
    data = {f: [r[i] for r in rows] for i, f in enumerate(fields)}

    predictions = []
    for week in range(1, weeks + 1):
        pred = {}
        for f in fields:
            vals = np.array(data[f])
            x = np.arange(len(vals))
            if len(vals) >= 2:
                coeffs = np.polyfit(x, vals, 1)
                future_val = np.polyval(coeffs, len(vals) + week - 1)
                noise = np.std(vals) * 0.05 * np.random.randn()
                pred[f] = round(max(0, future_val + noise), 4)
            else:
                pred[f] = round(vals[0], 4)
        pred["week"] = f"Week {week}"
        pred["date"] = (datetime.now() + timedelta(weeks=week)).strftime("%Y-%m-%d")
        predictions.append(pred)

    return predictions
