# IRIS — Integrated Regional Intelligence System
## India's Environmental Intelligence Dashboard

### What's New in This Version

**Entity & Master Management**
- Regional Offices management (CRUD) — `/admin` → Regional Offices tab
- Industries & Water Sources registry with geo-tagging
- Monitoring Locations with latitude/longitude
- Monitoring Units (dB, ppm, µg/m³, °C, etc.)
- Prescribed Limits per parameter (NAAQS, BIS 10500:2012, CPCB)
- Monitoring Teams and User Roles

**Monitoring & Reporting** — `/compliance`
- Air, water, and noise data submission (with auto-alert on limit breach)
- Industrial monitoring logs
- Special monitoring campaigns
- Periodic reports (monthly / quarterly / annual)
- Comparison charts and trend analysis

**AI Compliance Copilot** — `/copilot`
- Scenario queries: "If industry X reduces emissions by 30%, what is the regional risk change?"
- Festival shutdown simulation
- Causal modelling + surrogate model explanations
- Uncertainty estimates in all predictions
- Anomaly detection summary

**Alerts & Compliance** — `/compliance`
- Automatic alerts when prescribed limits exceeded
- Missing report reminders
- Non-compliance tracking dashboard
- Escalation workflow to authorities
- Alert severity: Critical / High / Medium

**User Roles** (login via `/api/auth/login`)
| Username    | Password      | Role              |
|-------------|---------------|-------------------|
| admin       | admin123      | Super Admin       |
| rofficer    | officer123    | Regional Officer  |
| mteam1      | team123       | Monitoring Team   |
| industry1   | industry123   | Industry User     |
| citizen1    | citizen123    | Citizen           |

### Running the App
```bash
pip install -r requirements.txt
python app.py
# Open http://127.0.0.1:5000
```

### New Pages
- `/admin`      — Master Management (offices, industries, teams, users)
- `/compliance` — Alerts, reports, monitoring logs
- `/copilot`    — AI Compliance Copilot

### Original Pages (unchanged)
- `/`           — Home dashboard
- `/aqi`        — Air Quality Index
- `/water`      — Water Quality
- `/noise`      — Noise Monitoring
- `/emissions`  — Greenhouse Gas Emissions
