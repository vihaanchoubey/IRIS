from apscheduler.schedulers.background import BackgroundScheduler
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from backend.data_fetcher import fetch_and_store

scheduler = BackgroundScheduler()

def start():
    scheduler.add_job(fetch_and_store, 'interval', minutes=30, id='data_refresh')
    scheduler.start()
    print("Scheduler started: data refreshes every 30 minutes.")

def stop():
    scheduler.shutdown()
