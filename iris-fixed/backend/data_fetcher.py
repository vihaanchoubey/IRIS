"""
IRIS — Data fetcher (30-min scheduler)
Uses same real-world calibrated profiles as init_db.py
"""
import sqlite3, random, os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.db')

STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
    "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
    "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh"
]

# Identical profiles to init_db — single source of truth kept here for fetcher
AQI_PROFILE = {
    "Delhi":             {"pm25":(120,280),"pm10":(180,400),"so2":(15,55), "co":(2.0,6.5),"no2":(60,120)},
    "Uttar Pradesh":     {"pm25":(90, 220),"pm10":(140,320),"so2":(12,45), "co":(1.5,5.5),"no2":(50,100)},
    "Bihar":             {"pm25":(80, 190),"pm10":(120,280),"so2":(10,40), "co":(1.2,4.5),"no2":(40, 90)},
    "Haryana":           {"pm25":(85, 200),"pm10":(130,300),"so2":(12,42), "co":(1.3,5.0),"no2":(45, 95)},
    "Punjab":            {"pm25":(75, 180),"pm10":(110,260),"so2":(10,38), "co":(1.2,4.5),"no2":(40, 85)},
    "Chandigarh":        {"pm25":(65, 160),"pm10":(100,240),"so2":(8, 32), "co":(1.0,4.0),"no2":(38, 80)},
    "Rajasthan":         {"pm25":(60, 150),"pm10":(100,220),"so2":(8, 30), "co":(0.8,3.5),"no2":(30, 75)},
    "West Bengal":       {"pm25":(65, 160),"pm10":(100,240),"so2":(10,38), "co":(1.0,4.0),"no2":(35, 80)},
    "Jharkhand":         {"pm25":(65, 155),"pm10":(100,230),"so2":(15,50), "co":(1.0,4.0),"no2":(35, 78)},
    "Maharashtra":       {"pm25":(45, 120),"pm10":(75, 180),"so2":(8, 30), "co":(0.7,3.0),"no2":(28, 68)},
    "Gujarat":           {"pm25":(50, 130),"pm10":(80, 190),"so2":(12,40), "co":(0.8,3.5),"no2":(30, 72)},
    "Madhya Pradesh":    {"pm25":(50, 130),"pm10":(80, 190),"so2":(8, 32), "co":(0.7,3.2),"no2":(28, 68)},
    "Chhattisgarh":      {"pm25":(55, 140),"pm10":(85, 200),"so2":(15,50), "co":(0.8,3.5),"no2":(30, 70)},
    "Odisha":            {"pm25":(50, 130),"pm10":(80, 190),"so2":(14,48), "co":(0.7,3.2),"no2":(28, 68)},
    "Andhra Pradesh":    {"pm25":(40, 110),"pm10":(65, 165),"so2":(8, 28), "co":(0.6,2.8),"no2":(25, 62)},
    "Telangana":         {"pm25":(42, 115),"pm10":(68, 170),"so2":(9, 30), "co":(0.6,2.8),"no2":(26, 64)},
    "Tamil Nadu":        {"pm25":(38, 100),"pm10":(60, 155),"so2":(7, 26), "co":(0.5,2.5),"no2":(22, 58)},
    "Karnataka":         {"pm25":(32,  95),"pm10":(52, 145),"so2":(6, 24), "co":(0.5,2.2),"no2":(20, 55)},
    "Kerala":            {"pm25":(18,  55),"pm10":(30,  85),"so2":(4, 16), "co":(0.3,1.5),"no2":(12, 38)},
    "Goa":               {"pm25":(22,  65),"pm10":(38,  95),"so2":(5, 18), "co":(0.3,1.6),"no2":(14, 40)},
    "Himachal Pradesh":  {"pm25":(18,  50),"pm10":(28,  78),"so2":(3, 14), "co":(0.2,1.2),"no2":(10, 32)},
    "Uttarakhand":       {"pm25":(22,  60),"pm10":(35,  90),"so2":(4, 16), "co":(0.3,1.4),"no2":(12, 35)},
    "Jammu and Kashmir": {"pm25":(25,  70),"pm10":(40, 105),"so2":(4, 18), "co":(0.3,1.5),"no2":(14, 38)},
    "Ladakh":            {"pm25":(10,  30),"pm10":(18,  50),"so2":(2,  8), "co":(0.1,0.6),"no2":(6,  20)},
    "Assam":             {"pm25":(30,  85),"pm10":(48, 128),"so2":(5, 20), "co":(0.4,1.8),"no2":(16, 45)},
    "Puducherry":        {"pm25":(28,  80),"pm10":(45, 120),"so2":(5, 20), "co":(0.4,1.8),"no2":(15, 42)},
    "Arunachal Pradesh": {"pm25":(12,  35),"pm10":(20,  58),"so2":(2,  9), "co":(0.1,0.7),"no2":(7,  22)},
    "Meghalaya":         {"pm25":(20,  55),"pm10":(32,  85),"so2":(3, 14), "co":(0.2,1.2),"no2":(12, 32)},
    "Manipur":           {"pm25":(18,  50),"pm10":(28,  78),"so2":(3, 12), "co":(0.2,1.1),"no2":(10, 30)},
    "Mizoram":           {"pm25":(14,  40),"pm10":(22,  62),"so2":(2, 10), "co":(0.1,0.8),"no2":(8,  25)},
    "Nagaland":          {"pm25":(14,  38),"pm10":(22,  60),"so2":(2,  9), "co":(0.1,0.7),"no2":(7,  22)},
    "Tripura":           {"pm25":(22,  62),"pm10":(35,  95),"so2":(3, 14), "co":(0.3,1.3),"no2":(13, 36)},
    "Sikkim":            {"pm25":(10,  28),"pm10":(16,  45),"so2":(2,  7), "co":(0.1,0.5),"no2":(5,  18)},
}
WATER_PROFILE = {
    "Rajasthan":         {"ph":(7.2,8.8),"tds":(600,2200),"fluoride":(0.5,4.5),"arsenic":(0.001,0.005),"iron":(0.1,0.5)},
    "West Bengal":       {"ph":(6.5,7.8),"tds":(200, 900),"fluoride":(0.1,0.8),"arsenic":(0.01, 0.08),"iron":(0.3,3.0)},
    "Bihar":             {"ph":(6.6,7.9),"tds":(250, 950),"fluoride":(0.1,0.9),"arsenic":(0.008,0.06),"iron":(0.2,2.5)},
    "Uttar Pradesh":     {"ph":(6.8,8.2),"tds":(300,1100),"fluoride":(0.2,2.0),"arsenic":(0.005,0.04),"iron":(0.2,2.0)},
    "Assam":             {"ph":(6.4,7.5),"tds":(150, 600),"fluoride":(0.1,0.6),"arsenic":(0.008,0.05),"iron":(0.3,2.5)},
    "Haryana":           {"ph":(7.0,8.9),"tds":(500,2000),"fluoride":(0.4,3.5),"arsenic":(0.001,0.01),"iron":(0.1,0.6)},
    "Punjab":            {"ph":(7.0,8.8),"tds":(400,1800),"fluoride":(0.3,2.8),"arsenic":(0.003,0.02),"iron":(0.1,0.5)},
    "Gujarat":           {"ph":(7.2,9.0),"tds":(500,2500),"fluoride":(0.4,4.0),"arsenic":(0.001,0.006),"iron":(0.1,0.5)},
    "Karnataka":         {"ph":(6.8,8.5),"tds":(250, 900),"fluoride":(0.3,2.5),"arsenic":(0.001,0.005),"iron":(0.1,0.4)},
    "Andhra Pradesh":    {"ph":(6.9,8.6),"tds":(300,1000),"fluoride":(0.4,3.0),"arsenic":(0.001,0.006),"iron":(0.1,0.5)},
    "Telangana":         {"ph":(6.9,8.6),"tds":(300,1000),"fluoride":(0.4,2.8),"arsenic":(0.001,0.006),"iron":(0.1,0.4)},
    "Kerala":            {"ph":(6.5,7.5),"tds":(100, 400),"fluoride":(0.1,0.5),"arsenic":(0.001,0.005),"iron":(0.1,0.8)},
    "Himachal Pradesh":  {"ph":(6.8,7.8),"tds":(100, 350),"fluoride":(0.1,0.4),"arsenic":(0.001,0.003),"iron":(0.1,0.3)},
    "Uttarakhand":       {"ph":(6.8,7.8),"tds":(100, 380),"fluoride":(0.1,0.5),"arsenic":(0.001,0.003),"iron":(0.1,0.3)},
    "Goa":               {"ph":(6.6,7.6),"tds":(100, 380),"fluoride":(0.1,0.5),"arsenic":(0.001,0.004),"iron":(0.1,0.6)},
    "Arunachal Pradesh": {"ph":(6.5,7.5),"tds":(50,  200),"fluoride":(0.05,0.3),"arsenic":(0.001,0.002),"iron":(0.05,0.2)},
    "Mizoram":           {"ph":(6.5,7.4),"tds":(50,  200),"fluoride":(0.05,0.3),"arsenic":(0.001,0.002),"iron":(0.05,0.2)},
    "Meghalaya":         {"ph":(6.5,7.5),"tds":(60,  220),"fluoride":(0.05,0.3),"arsenic":(0.001,0.002),"iron":(0.05,0.2)},
    "Manipur":           {"ph":(6.5,7.5),"tds":(60,  220),"fluoride":(0.05,0.4),"arsenic":(0.001,0.003),"iron":(0.05,0.3)},
    "Nagaland":          {"ph":(6.5,7.4),"tds":(50,  200),"fluoride":(0.05,0.3),"arsenic":(0.001,0.002),"iron":(0.05,0.2)},
    "Sikkim":            {"ph":(6.4,7.3),"tds":(40,  180),"fluoride":(0.05,0.2),"arsenic":(0.001,0.002),"iron":(0.05,0.2)},
    "Tripura":           {"ph":(6.5,7.5),"tds":(80,  280),"fluoride":(0.05,0.4),"arsenic":(0.002,0.01),"iron":(0.1,0.5)},
    "Jammu and Kashmir": {"ph":(6.8,7.8),"tds":(80,  320),"fluoride":(0.1,0.5),"arsenic":(0.001,0.004),"iron":(0.1,0.3)},
    "Ladakh":            {"ph":(7.0,8.0),"tds":(80,  300),"fluoride":(0.1,0.4),"arsenic":(0.001,0.003),"iron":(0.05,0.2)},
    "default":           {"ph":(6.8,8.0),"tds":(200, 800),"fluoride":(0.2,1.5),"arsenic":(0.001,0.01),"iron":(0.1,0.5)},
}
NOISE_PROFILE = {
    "Delhi":         {"residential":(64,76),"commercial":(72,84),"industrial":(78,90)},
    "Maharashtra":   {"residential":(60,72),"commercial":(70,82),"industrial":(76,88)},
    "West Bengal":   {"residential":(62,74),"commercial":(72,84),"industrial":(76,88)},
    "Karnataka":     {"residential":(58,70),"commercial":(68,80),"industrial":(74,86)},
    "Tamil Nadu":    {"residential":(58,70),"commercial":(68,80),"industrial":(74,86)},
    "Uttar Pradesh": {"residential":(60,72),"commercial":(70,82),"industrial":(76,88)},
    "Telangana":     {"residential":(58,70),"commercial":(68,80),"industrial":(74,86)},
    "Gujarat":       {"residential":(58,70),"commercial":(68,80),"industrial":(75,87)},
    "Haryana":       {"residential":(58,70),"commercial":(67,79),"industrial":(74,86)},
    "Punjab":        {"residential":(57,69),"commercial":(66,78),"industrial":(73,85)},
    "Chandigarh":    {"residential":(56,68),"commercial":(66,78),"industrial":(72,84)},
    "Bihar":         {"residential":(57,69),"commercial":(67,79),"industrial":(73,85)},
    "Rajasthan":     {"residential":(56,68),"commercial":(65,77),"industrial":(72,84)},
    "Andhra Pradesh":{"residential":(56,68),"commercial":(65,77),"industrial":(72,84)},
    "Madhya Pradesh":{"residential":(56,68),"commercial":(65,77),"industrial":(72,84)},
    "Chhattisgarh":  {"residential":(55,68),"commercial":(65,77),"industrial":(72,85)},
    "Odisha":        {"residential":(55,67),"commercial":(65,77),"industrial":(72,84)},
    "Jharkhand":     {"residential":(55,67),"commercial":(64,76),"industrial":(72,84)},
    "Kerala":        {"residential":(52,64),"commercial":(62,74),"industrial":(68,80)},
    "Goa":           {"residential":(50,62),"commercial":(60,72),"industrial":(66,78)},
    "Assam":         {"residential":(52,64),"commercial":(62,74),"industrial":(68,80)},
    "Puducherry":    {"residential":(54,66),"commercial":(64,76),"industrial":(70,82)},
    "Uttarakhand":   {"residential":(48,60),"commercial":(58,70),"industrial":(65,77)},
    "Himachal Pradesh":{"residential":(45,57),"commercial":(54,66),"industrial":(62,74)},
    "Jammu and Kashmir":{"residential":(46,58),"commercial":(55,67),"industrial":(63,75)},
    "Ladakh":        {"residential":(38,50),"commercial":(46,58),"industrial":(55,65)},
    "Sikkim":        {"residential":(40,52),"commercial":(48,60),"industrial":(56,68)},
    "Arunachal Pradesh":{"residential":(40,52),"commercial":(48,60),"industrial":(55,67)},
    "Mizoram":       {"residential":(42,54),"commercial":(50,62),"industrial":(57,69)},
    "Meghalaya":     {"residential":(43,55),"commercial":(52,64),"industrial":(58,70)},
    "Manipur":       {"residential":(44,56),"commercial":(53,65),"industrial":(60,72)},
    "Nagaland":      {"residential":(42,54),"commercial":(50,62),"industrial":(57,69)},
    "Tripura":       {"residential":(46,58),"commercial":(55,67),"industrial":(62,74)},
}
EMISSIONS_PROFILE = {
    "Gujarat":           {"co2":(245,280),"methane":(8.5,11.5),"n2o":(2.8,3.8)},
    "Maharashtra":       {"co2":(200,240),"methane":(10.0,13.5),"n2o":(4.5,6.0)},
    "Uttar Pradesh":     {"co2":(235,265),"methane":(22.0,28.0),"n2o":(9.0,12.0)},
    "Rajasthan":         {"co2":(145,175),"methane":(12.0,16.0),"n2o":(4.0,5.5)},
    "Madhya Pradesh":    {"co2":(135,165),"methane":(11.0,15.0),"n2o":(3.8,5.2)},
    "Chhattisgarh":      {"co2":(130,160),"methane":(4.5, 6.5),"n2o":(1.8,2.6)},
    "Andhra Pradesh":    {"co2":(125,155),"methane":(10.0,13.5),"n2o":(3.8,5.2)},
    "Tamil Nadu":        {"co2":(120,150),"methane":(9.0,12.5),"n2o":(3.5,4.8)},
    "Karnataka":         {"co2":(105,135),"methane":(8.0,11.0),"n2o":(3.2,4.4)},
    "West Bengal":       {"co2":(115,145),"methane":(10.5,14.0),"n2o":(4.0,5.5)},
    "Jharkhand":         {"co2":(120,150),"methane":(5.5, 7.5),"n2o":(1.5,2.2)},
    "Odisha":            {"co2":(125,155),"methane":(5.0, 7.0),"n2o":(1.6,2.4)},
    "Punjab":            {"co2":(82, 102),"methane":(6.0, 8.5),"n2o":(3.0,4.2)},
    "Haryana":           {"co2":(78,  98),"methane":(5.5, 7.5),"n2o":(2.8,3.8)},
    "Bihar":             {"co2":(88, 110),"methane":(14.0,18.0),"n2o":(5.5,7.5)},
    "Telangana":         {"co2":(95, 120),"methane":(7.5,10.5),"n2o":(3.0,4.2)},
    "Delhi":             {"co2":(38,  48),"methane":(1.5, 2.2),"n2o":(0.5,0.8)},
    "Assam":             {"co2":(46,  60),"methane":(4.5, 6.5),"n2o":(1.8,2.6)},
    "Kerala":            {"co2":(17,  24),"methane":(2.5, 3.8),"n2o":(0.9,1.4)},
    "Uttarakhand":       {"co2":(22,  30),"methane":(2.2, 3.2),"n2o":(0.8,1.2)},
    "Himachal Pradesh":  {"co2":(18,  26),"methane":(2.0, 3.0),"n2o":(0.7,1.1)},
    "Goa":               {"co2":(8,   13),"methane":(0.4, 0.7),"n2o":(0.15,0.25)},
    "Chandigarh":        {"co2":(1.4, 2.0),"methane":(0.08,0.14),"n2o":(0.03,0.06)},
    "Puducherry":        {"co2":(0.5, 0.9),"methane":(0.03,0.06),"n2o":(0.01,0.02)},
    "Jammu and Kashmir": {"co2":(8,   13),"methane":(1.2, 1.8),"n2o":(0.4,0.7)},
    "Ladakh":            {"co2":(0.2, 0.4),"methane":(0.02,0.04),"n2o":(0.01,0.02)},
    "Tripura":           {"co2":(3.0, 5.0),"methane":(0.5, 0.8),"n2o":(0.2,0.3)},
    "Meghalaya":         {"co2":(4.0, 6.5),"methane":(0.4, 0.7),"n2o":(0.15,0.25)},
    "Manipur":           {"co2":(2.0, 3.5),"methane":(0.3, 0.5),"n2o":(0.1,0.18)},
    "Mizoram":           {"co2":(1.5, 2.5),"methane":(0.2, 0.35),"n2o":(0.08,0.14)},
    "Nagaland":          {"co2":(2.0, 3.2),"methane":(0.25,0.4),"n2o":(0.09,0.15)},
    "Arunachal Pradesh": {"co2":(1.5, 2.8),"methane":(0.2, 0.35),"n2o":(0.08,0.14)},
    "Sikkim":            {"co2":(0.6, 1.0),"methane":(0.06,0.1),"n2o":(0.02,0.04)},
}

def aqi_from_pm25(pm25):
    for lo, hi, ilo, ihi in [(0,30,0,50),(30,60,51,100),(60,90,101,200),(90,120,201,300),(120,250,301,400),(250,500,401,500)]:
        if lo <= pm25 <= hi:
            return int(ilo + (pm25-lo)/(hi-lo)*(ihi-ilo))
    return 500

def rnd(lo, hi, dec=1):
    return round(random.uniform(lo, hi), dec)

def fetch_and_store():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    ts = datetime.now()
    for state in STATES:
        ap  = AQI_PROFILE.get(state, {"pm25":(40,130),"pm10":(65,190),"so2":(6,28),"co":(0.5,2.8),"no2":(22,68)})
        wp  = WATER_PROFILE.get(state, WATER_PROFILE["default"])
        np_ = NOISE_PROFILE.get(state, {"residential":(52,64),"commercial":(62,74),"industrial":(68,80)})
        ep  = EMISSIONS_PROFILE.get(state, {"co2":(30,80),"methane":(3,6),"n2o":(1,2)})

        pm25 = rnd(*ap["pm25"]); pm10 = rnd(*ap["pm10"])
        so2  = rnd(*ap["so2"],1); co = rnd(*ap["co"],2); no2 = rnd(*ap["no2"],1)
        c.execute("INSERT INTO aqi_data (state,pm25,pm10,so2,co,no2,aqi,timestamp) VALUES (?,?,?,?,?,?,?,?)",
                  (state, pm25, pm10, so2, co, no2, aqi_from_pm25(pm25), ts))
        c.execute("INSERT INTO water_quality (state,ph,tds,fluoride,arsenic,iron,timestamp) VALUES (?,?,?,?,?,?,?)",
                  (state, rnd(*wp["ph"],2), rnd(*wp["tds"],0), rnd(*wp["fluoride"],2),
                   rnd(*wp["arsenic"],4), rnd(*wp["iron"],2), ts))
        for zone, key in [("Residential","residential"),("Commercial","commercial"),("Industrial","industrial")]:
            c.execute("INSERT INTO noise_data (state,decibel_level,zone_type,timestamp) VALUES (?,?,?,?)",
                      (state, rnd(*np_[key],1), zone, ts))
        c.execute("INSERT INTO emissions_data (state,co2,methane,nitrous_oxide,timestamp) VALUES (?,?,?,?,?)",
                  (state, rnd(*ep["co2"],1), rnd(*ep["methane"],2), rnd(*ep["n2o"],2), ts))
    conn.commit()
    conn.close()
    print(f"[{ts}] Data refreshed for {len(STATES)} states.")
