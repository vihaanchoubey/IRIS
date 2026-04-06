import os, sys, threading, time
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, render_template
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = 'iris-env-intelligence-2024'

@app.after_request
def add_cors(r):
    r.headers['Access-Control-Allow-Origin'] = '*'
    return r

db_path = os.path.join(os.path.dirname(__file__), 'database.db')
if not os.path.exists(db_path):
    from database.init_db import init_db
    init_db()
else:
    try:
        import sqlite3
        conn = sqlite3.connect(db_path)
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        conn.close()
        if 'users' not in tables or 'alerts' not in tables:
            from database.init_db import init_db
            init_db()
    except: pass

from backend.api_routes import api
app.register_blueprint(api)

def run_scheduler():
    from backend.data_fetcher import fetch_and_store
    time.sleep(2)
    while True:
        try: fetch_and_store()
        except Exception as e: print(f"[Scheduler] Error: {e}")
        time.sleep(1800)

threading.Thread(target=run_scheduler, daemon=True).start()

@app.route('/')
def index(): return render_template('index.html')
@app.route('/aqi')
def aqi_page(): return render_template('aqi.html')
@app.route('/water')
def water_page(): return render_template('water.html')
@app.route('/noise')
def noise_page(): return render_template('noise.html')
@app.route('/emissions')
def emissions_page(): return render_template('emissions.html')
@app.route('/geospatial')
def geospatial_page(): return render_template('geospatial-monitoring.html')
@app.route('/login')
def login_page(): return render_template('login.html')
@app.route('/admin')
def admin_page(): return render_template('admin.html')
@app.route('/signup')
def signup_page(): return render_template('signup.html')
@app.route('/verify-email')
def verify_email_page(): return render_template('verify-email.html')
@app.route('/submit-report')
def submit_report_page(): return render_template('submit_report.html')
@app.route('/admin/reports')
def admin_reports_page(): return render_template('admin_reports.html')

if __name__ == '__main__':
    print("\n  IRIS – Integrated Regional Intelligence System")
    print("  Open http://127.0.0.1:5000 or your network IP\n")
    app.run(debug=False, host='0.0.0.0', port=5000)
