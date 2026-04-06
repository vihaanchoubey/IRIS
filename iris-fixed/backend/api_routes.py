from flask import Blueprint, jsonify, request, session
import sqlite3, os, sys, hashlib, json, random, string, requests
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from ai.aqi_predictor import predict_aqi
from ai.water_predictor import predict_water
from ai.emission_predictor import predict_emissions
from backend.mailer import send_otp_email

api = Blueprint('api', __name__)
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'database.db')

def query_db(sql, args=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor(); c.execute(sql, args)
    rows = [dict(r) for r in c.fetchall()]
    conn.close(); return rows

def exec_db(sql, args=()):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor(); c.execute(sql, args)
    last_id = c.lastrowid; conn.commit(); conn.close(); return last_id

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()

# ── CHATBOT ENDPOINT ──────────────────────────────────────────────────────────
@api.route('/api/chatbot', methods=['POST'])
def chatbot():
    """Environmental AI Chatbot - Backend proxy for Google Gemini API"""
    try:
        import os
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Google Gemini API configuration
        GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
        API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
        
        def local_chat_response(text):
            t = text.lower()
            if 'aqi' in t:
                return 'AQI is the Air Quality Index. In India, NAAQS defines categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) based on PM2.5 and PM10.'
            if 'water' in t or 'ph' in t or 'tds' in t:
                return 'Water quality is measured by pH, TDS, dissolved oxygen, etc. Acceptable pH is 6.5-8.5 and TDS below 500 mg/L for drinking.'
            if 'emissions' in t or 'co2' in t or 'no2' in t:
                return 'Industrial emissions are regulated under CPCB standards; CO2/NO2 limits depend on industry category and stack height.'
            if 'noise' in t or 'db' in t:
                return 'Ambient noise standards in India are 55 dB (day) and 45 dB (night) in residential areas.'
            if 'compliance' in t or 'regulation' in t:
                return 'Compliance depends on location and pollution category. Reports should include state-specific readings and corrective actions.'
            return 'Sorry, I need API access to answer that fully. Set GEMINI_API_KEY in environment, or ask a different question about AQI/water/emissions/noise.'

        if not GEMINI_API_KEY:
            return jsonify({'response': local_chat_response(user_message), 'fallback': True}), 200

        system_prompt = """You are an expert environmental AI assistant for the IRIS platform. You help users understand environmental data including:
- Air Quality Index (AQI) and pollutants (PM2.5, PM10, NO2, SO2, CO)
- Water quality (pH, TDS, arsenic, fluoride)
- Noise pollution levels
- Emissions data
- Compliance and regulatory standards
- Environmental health impacts

Provide concise, accurate responses based on environmental science and Indian environmental standards (NAAQS, BIS). Be helpful, accurate, and informative."""
        
        # Gemini API payload format
        payload = {
            'contents': [
                {
                    'parts': [
                        {'text': system_prompt},
                        {'text': user_message}
                    ]
                }
            ],
            'generationConfig': {
                'temperature': 0.4,
                'maxOutputTokens': 500,
            }
        }
        
        url = f"{API_ENDPOINT}?key={GEMINI_API_KEY}"
        headers = {
            'Content-Type': 'application/json',
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', f'API request failed (Status: {response.status_code})')
            print(f"[Chatbot Error] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
        data = response.json()
        bot_response = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'No response received')
        
        return jsonify({'response': bot_response}), 200
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout. Please try again.'}), 408
    except Exception as e:
        print(f"[Chatbot Exception] {str(e)}")
        return jsonify({'error': f'Chatbot error: {str(e)}'}), 500

# ── HIERARCHY & CONFIGURATION ─────────────────────────────────────────────────
@api.route('/api/role-hierarchy')
def get_role_hierarchy():
    """Get the organizational hierarchy: roles and their relationship"""
    hierarchy = {
        "citizen": {
            "description": "Individual citizen",
            "permissions": ["submit_report", "view_data_public"],
            "requires_region": False
        },
        "industry_user": {
            "description": "Industry representative",
            "permissions": ["submit_reports", "view_industry_data"],
            "requires_region": True,
            "region_level": "district"
        },
        "monitoring_team": {
            "description": "Environmental monitoring team",
            "permissions": ["submit_monitoring_data", "view_state_data"],
            "requires_region": True,
            "region_level": "district"
        },
        "regional_officer": {
            "description": "District regional officer",
            "permissions": ["manage_reports", "approve_data", "manage_monitoring"],
            "requires_region": True,
            "region_level": "district",
            "hierarchy_level": "district_head"
        },
        "super_admin": {
            "description": "State-level super admin",
            "permissions": ["full_access", "manage_users", "manage_officers"],
            "requires_region": True,
            "region_level": "state",
            "hierarchy_level": "state_head"
        }
    }
    return jsonify(hierarchy)

@api.route('/api/state-district-hierarchy')
def get_state_district_hierarchy():
    """Get the state-district hierarchy for India"""
    try:
        hierarchy_file = os.path.join(os.path.dirname(__file__), '..', 'static', 'data', 'state-district-hierarchy.json')
        with open(hierarchy_file, 'r') as f:
            hierarchy = json.load(f)
        return jsonify(hierarchy)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/users/by-region')
def get_users_by_region():
    """Get users by state and/or district - organized by hierarchy"""
    state = request.args.get('state')
    district = request.args.get('district')
    role = request.args.get('role')
    
    query = "SELECT id,username,full_name,email,role,state,district,created_at FROM users WHERE is_active=1"
    args = []
    
    if state:
        query += " AND state=?"
        args.append(state)
    if district:
        query += " AND district=?"
        args.append(district)
    if role:
        query += " AND role=?"
        args.append(role)
    
    query += " ORDER BY state, district, role DESC"
    rows = query_db(query, tuple(args))
    return jsonify(rows)

# ── ORIGINAL ENDPOINTS ────────────────────────────────────────────────────────
@api.route('/api/aqi')
def get_aqi():
    state = request.args.get('state')
    if state:
        rows = query_db("SELECT * FROM aqi_data WHERE state=? ORDER BY timestamp DESC LIMIT 7",(state,))
    else:
        rows = query_db("SELECT * FROM aqi_data WHERE id IN (SELECT MAX(id) FROM aqi_data GROUP BY state) ORDER BY state")
    return jsonify(rows)

@api.route('/api/water')
def get_water():
    state = request.args.get('state')
    if state:
        rows = query_db("SELECT * FROM water_quality WHERE state=? ORDER BY timestamp DESC LIMIT 7",(state,))
    else:
        rows = query_db("SELECT * FROM water_quality WHERE id IN (SELECT MAX(id) FROM water_quality GROUP BY state) ORDER BY state")
    return jsonify(rows)

@api.route('/api/noise')
def get_noise():
    state = request.args.get('state')
    if state:
        rows = query_db("SELECT * FROM noise_data WHERE state=? ORDER BY timestamp DESC LIMIT 21",(state,))
    else:
        rows = query_db("SELECT * FROM noise_data WHERE id IN (SELECT MAX(id) FROM noise_data GROUP BY state, zone_type) ORDER BY state")
    return jsonify(rows)

@api.route('/api/emissions')
def get_emissions():
    state = request.args.get('state')
    if state:
        rows = query_db("SELECT * FROM emissions_data WHERE state=? ORDER BY timestamp DESC LIMIT 7",(state,))
    else:
        rows = query_db("SELECT * FROM emissions_data WHERE id IN (SELECT MAX(id) FROM emissions_data GROUP BY state) ORDER BY state")
    return jsonify(rows)

@api.route('/api/predict/aqi')
def pred_aqi():
    state = request.args.get('state','Delhi'); days = int(request.args.get('days',3))
    return jsonify(predict_aqi(state,days))

@api.route('/api/predict/water')
def pred_water():
    state = request.args.get('state','Delhi'); weeks = int(request.args.get('weeks',3))
    return jsonify(predict_water(state,weeks))

@api.route('/api/predict/emissions')
def pred_emissions():
    state = request.args.get('state','Delhi'); weeks = int(request.args.get('weeks',3))
    return jsonify(predict_emissions(state,weeks))

@api.route('/api/states')
def get_states():
    rows = query_db("SELECT DISTINCT state FROM aqi_data ORDER BY state")
    return jsonify([r['state'] for r in rows])

@api.route('/api/summary')
def get_summary():
    aqi  = query_db("SELECT AVG(aqi) as avg_aqi,MAX(aqi) as max_aqi,MIN(aqi) as min_aqi FROM aqi_data WHERE timestamp >= datetime('now','-7 days')")
    water= query_db("SELECT AVG(ph) as avg_ph,AVG(tds) as avg_tds FROM water_quality WHERE timestamp >= datetime('now','-7 days')")
    noise= query_db("SELECT AVG(decibel_level) as avg_db FROM noise_data WHERE timestamp >= datetime('now','-7 days')")
    emiss= query_db("SELECT AVG(co2) as avg_co2 FROM emissions_data WHERE timestamp >= datetime('now','-7 days')")
    # fallback to all data if nothing in 7 days
    if not aqi or aqi[0]['avg_aqi'] is None:
        aqi  = query_db("SELECT AVG(aqi) as avg_aqi,MAX(aqi) as max_aqi,MIN(aqi) as min_aqi FROM aqi_data")
        water= query_db("SELECT AVG(ph) as avg_ph,AVG(tds) as avg_tds FROM water_quality")
        noise= query_db("SELECT AVG(decibel_level) as avg_db FROM noise_data")
        emiss= query_db("SELECT AVG(co2) as avg_co2 FROM emissions_data")
    return jsonify({"aqi":aqi[0] if aqi else {},"water":water[0] if water else {},"noise":noise[0] if noise else {},"emissions":emiss[0] if emiss else {}})

# ── AUTH ──────────────────────────────────────────────────────────────────────
@api.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    username = data.get('username','').strip()
    password = data.get('password','')
    full_name = data.get('full_name','').strip()
    email = data.get('email','').strip()
    role = data.get('role','citizen').strip()
    state = data.get('state','').strip()
    district = data.get('district','').strip()
    
    if not username or not password:
        return jsonify({'error':'Username and password required'}),400
    if not email or '@' not in email:
        return jsonify({'error':'Valid email is required'}),400
    if len(password) < 6:
        return jsonify({'error':'Password must be at least 6 characters'}),400
    
    # Validate state and district for non-citizen roles
    if role != 'citizen':
        if not state:
            return jsonify({'error':'State is required for this role'}),400
        # District is only required for non-super-admin roles
        if role != 'super_admin' and not district:
            return jsonify({'error':'District is required for this role'}),400
    
    existing_user = query_db("SELECT id FROM users WHERE username=?", (username,))
    if existing_user:
        return jsonify({'error':'Username already taken. Please choose another.'}),409
    
    existing_email = query_db("SELECT id FROM users WHERE email=?", (email,))
    if existing_email:
        return jsonify({'error':'Email already registered. Please use another email.'}),409
    
    try:
        otp = ''.join(random.choices(string.digits, k=6))
        otp_expires = datetime.now() + timedelta(minutes=10)
        
        uid = exec_db(
            "INSERT INTO users (username,password_hash,full_name,email,role,state,district,is_active,email_verified,otp,otp_expires) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (username, hash_pw(password), full_name or username, email, role, state, district, 0, 0, otp, otp_expires)
        )
        
        # Send OTP email
        user_display_name = full_name.split()[0] if full_name else username
        send_otp_email(email, otp, user_display_name)
        
        user = {'id':uid,'username':username,'full_name':full_name or username,'email':email,'role':role,'state':state,'district':district}
        return jsonify({'success':True,'user':user,'message':'Account created! OTP sent to your email. Please verify to activate your account.'}),201
    except Exception as e:
        return jsonify({'error':str(e)}),400

@api.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    otp = data.get('otp','').strip()
    
    if not user_id or not otp:
        return jsonify({'error':'User ID and OTP required'}),400
    
    user = query_db("SELECT * FROM users WHERE id=?", (user_id,))
    if not user:
        return jsonify({'error':'User not found'}),404
    
    user = user[0]
    if user['email_verified']:
        return jsonify({'error':'Email already verified'}),400
    
    if not user['otp']:
        return jsonify({'error':'No OTP found. Please sign up again.'}),400
    
    if user['otp'] != otp:
        return jsonify({'error':'Invalid OTP'}),400
    
    otp_expires = datetime.fromisoformat(user['otp_expires'])
    if datetime.now() > otp_expires:
        return jsonify({'error':'OTP has expired. Please sign up again.'}),400
    
    try:
        exec_db(
            "UPDATE users SET email_verified=1, is_active=1, otp=NULL, otp_expires=NULL WHERE id=?",
            (user_id,)
        )
        return jsonify({'success':True,'message':'Email verified successfully! You can now log in.'}),200
    except Exception as e:
        return jsonify({'error':str(e)}),400

@api.route('/api/auth/resend-otp', methods=['POST'])
def resend_otp():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'error':'User ID required'}),400
    
    user = query_db("SELECT * FROM users WHERE id=?", (user_id,))
    if not user:
        return jsonify({'error':'User not found'}),404
    
    user = user[0]
    if user['email_verified']:
        return jsonify({'error':'Email already verified'}),400
    
    try:
        otp = ''.join(random.choices(string.digits, k=6))
        otp_expires = datetime.now() + timedelta(minutes=10)
        
        exec_db(
            "UPDATE users SET otp=?, otp_expires=? WHERE id=?",
            (otp, otp_expires, user_id)
        )
        
        # Send OTP email
        user_display_name = user['full_name'].split()[0] if user['full_name'] else user['username']
        send_otp_email(user['email'], otp, user_display_name)
        
        return jsonify({'success':True,'message':'New OTP sent to your email'}),200
    except Exception as e:
        return jsonify({'error':str(e)}),400

@api.route('/api/auth/login', methods=['POST'])
def do_login():
    data = request.get_json() or {}
    username = data.get('username','').strip()
    password = data.get('password','')
    if not username or not password:
        return jsonify({'error':'Username and password required'}),400
    rows = query_db("SELECT * FROM users WHERE username=? AND is_active=1",(username,))
    if not rows or rows[0]['password_hash'] != hash_pw(password):
        return jsonify({'error':'Invalid credentials'}),401
    u = rows[0]
    if not u['email_verified']:
        return jsonify({'error':'Please verify your email first. Check your inbox for the OTP.','user_id':u['id'],'email':u['email']}),403
    u.pop('password_hash',None)
    return jsonify({'success':True,'user':u})

@api.route('/api/auth/users')
def get_users():
    rows = query_db("SELECT id,username,full_name,email,role,state,is_active,created_at FROM users ORDER BY created_at DESC")
    return jsonify(rows)

@api.route('/api/auth/users', methods=['POST'])
def create_user():
    data = request.get_json() or {}
    required = ['username','password','role']
    for f in required:
        if not data.get(f): return jsonify({'error':f'{f} is required'}),400
    try:
        uid = exec_db("INSERT INTO users (username,password_hash,full_name,email,role,state,regional_office_id) VALUES (?,?,?,?,?,?,?)",
            (data['username'],hash_pw(data['password']),data.get('full_name',''),data.get('email',''),
             data['role'],data.get('state'),data.get('regional_office_id')))
        return jsonify({'success':True,'id':uid}),201
    except Exception as e:
        return jsonify({'error':str(e)}),400

# ── REGIONAL OFFICES ──────────────────────────────────────────────────────────
@api.route('/api/regional-offices')
def get_offices():
    return jsonify(query_db("SELECT * FROM regional_offices ORDER BY state"))

@api.route('/api/regional-offices', methods=['POST'])
def create_office():
    d = request.get_json() or {}
    if not d.get('name') or not d.get('state'): return jsonify({'error':'name and state required'}),400
    uid = exec_db("INSERT INTO regional_offices (name,state,city,address,phone,email,officer_name) VALUES (?,?,?,?,?,?,?)",
        (d['name'],d['state'],d.get('city',''),d.get('address',''),d.get('phone',''),d.get('email',''),d.get('officer_name','')))
    return jsonify({'success':True,'id':uid}),201

@api.route('/api/regional-offices/<int:oid>', methods=['PUT'])
def update_office(oid):
    d = request.get_json() or {}
    exec_db("UPDATE regional_offices SET name=?,state=?,city=?,address=?,phone=?,email=?,officer_name=?,is_active=? WHERE id=?",
        (d.get('name'),d.get('state'),d.get('city'),d.get('address'),d.get('phone'),d.get('email'),d.get('officer_name'),d.get('is_active',1),oid))
    return jsonify({'success':True})

# ── INDUSTRIES ────────────────────────────────────────────────────────────────
@api.route('/api/industries')
def get_industries():
    state = request.args.get('state')
    if state:
        return jsonify(query_db("SELECT i.*,ro.name as office_name FROM industries i LEFT JOIN regional_offices ro ON i.regional_office_id=ro.id WHERE i.state=? ORDER BY i.name",(state,)))
    return jsonify(query_db("SELECT i.*,ro.name as office_name FROM industries i LEFT JOIN regional_offices ro ON i.regional_office_id=ro.id ORDER BY i.state,i.name"))

@api.route('/api/industries', methods=['POST'])
def create_industry():
    d = request.get_json() or {}
    if not d.get('name'): return jsonify({'error':'name required'}),400
    uid = exec_db("INSERT INTO industries (name,industry_type,state,city,latitude,longitude,consent_number,category,regional_office_id) VALUES (?,?,?,?,?,?,?,?,?)",
        (d['name'],d.get('industry_type'),d.get('state'),d.get('city'),d.get('latitude'),d.get('longitude'),d.get('consent_number'),d.get('category'),d.get('regional_office_id')))
    return jsonify({'success':True,'id':uid}),201

@api.route('/api/industries/<int:iid>', methods=['PUT'])
def update_industry(iid):
    d = request.get_json() or {}
    exec_db("UPDATE industries SET name=?,industry_type=?,state=?,city=?,latitude=?,longitude=?,consent_number=?,category=?,regional_office_id=?,is_active=? WHERE id=?",
        (d.get('name'),d.get('industry_type'),d.get('state'),d.get('city'),d.get('latitude'),d.get('longitude'),d.get('consent_number'),d.get('category'),d.get('regional_office_id'),d.get('is_active',1),iid))
    return jsonify({'success':True})

# ── WATER SOURCES ─────────────────────────────────────────────────────────────
@api.route('/api/water-sources')
def get_water_sources():
    return jsonify(query_db("SELECT * FROM water_sources ORDER BY state"))

@api.route('/api/water-sources', methods=['POST'])
def create_water_source():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO water_sources (name,source_type,state,city,latitude,longitude) VALUES (?,?,?,?,?,?)",
        (d.get('name'),d.get('source_type'),d.get('state'),d.get('city'),d.get('latitude'),d.get('longitude')))
    return jsonify({'success':True,'id':uid}),201

# ── MONITORING LOCATIONS ──────────────────────────────────────────────────────
@api.route('/api/monitoring-locations')
def get_monitoring_locations():
    state = request.args.get('state')
    if state:
        return jsonify(query_db("SELECT ml.*,i.name as industry_name,ws.name as water_source_name FROM monitoring_locations ml LEFT JOIN industries i ON ml.industry_id=i.id LEFT JOIN water_sources ws ON ml.water_source_id=ws.id WHERE ml.state=? ORDER BY ml.name",(state,)))
    return jsonify(query_db("SELECT ml.*,i.name as industry_name,ws.name as water_source_name FROM monitoring_locations ml LEFT JOIN industries i ON ml.industry_id=i.id LEFT JOIN water_sources ws ON ml.water_source_id=ws.id ORDER BY ml.state,ml.name"))

@api.route('/api/monitoring-locations', methods=['POST'])
def create_monitoring_location():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO monitoring_locations (name,location_type,state,city,latitude,longitude,industry_id,water_source_id,regional_office_id) VALUES (?,?,?,?,?,?,?,?,?)",
        (d.get('name'),d.get('location_type'),d.get('state'),d.get('city'),d.get('latitude'),d.get('longitude'),d.get('industry_id'),d.get('water_source_id'),d.get('regional_office_id')))
    return jsonify({'success':True,'id':uid}),201

# ── MONITORING UNITS ──────────────────────────────────────────────────────────
@api.route('/api/monitoring-units')
def get_units():
    cat = request.args.get('category')
    if cat:
        return jsonify(query_db("SELECT * FROM monitoring_units WHERE category=? ORDER BY parameter",(cat,)))
    return jsonify(query_db("SELECT * FROM monitoring_units ORDER BY category,parameter"))

@api.route('/api/monitoring-units', methods=['POST'])
def create_unit():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO monitoring_units (parameter,unit_symbol,unit_name,category) VALUES (?,?,?,?)",
        (d.get('parameter'),d.get('unit_symbol'),d.get('unit_name'),d.get('category')))
    return jsonify({'success':True,'id':uid}),201

# ── PRESCRIBED LIMITS ─────────────────────────────────────────────────────────
@api.route('/api/prescribed-limits')
def get_limits():
    cat = request.args.get('category')
    if cat:
        return jsonify(query_db("SELECT pl.*,mu.unit_symbol FROM prescribed_limits pl LEFT JOIN monitoring_units mu ON pl.unit_id=mu.id WHERE pl.category=? ORDER BY pl.parameter",(cat,)))
    return jsonify(query_db("SELECT pl.*,mu.unit_symbol FROM prescribed_limits pl LEFT JOIN monitoring_units mu ON pl.unit_id=mu.id ORDER BY pl.category,pl.parameter"))

@api.route('/api/prescribed-limits', methods=['POST'])
def create_limit():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO prescribed_limits (parameter,unit_id,limit_value,limit_type,category,standard_name) VALUES (?,?,?,?,?,?)",
        (d.get('parameter'),d.get('unit_id'),d.get('limit_value'),d.get('limit_type','max'),d.get('category'),d.get('standard_name')))
    return jsonify({'success':True,'id':uid}),201

# ── MONITORING TEAMS ──────────────────────────────────────────────────────────
@api.route('/api/monitoring-teams')
def get_teams():
    return jsonify(query_db("SELECT mt.*,ro.name as office_name,u.full_name as lead_name FROM monitoring_teams mt LEFT JOIN regional_offices ro ON mt.regional_office_id=ro.id LEFT JOIN users u ON mt.team_lead_id=u.id ORDER BY mt.state"))

@api.route('/api/monitoring-teams', methods=['POST'])
def create_team():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO monitoring_teams (team_name,state,regional_office_id,team_lead_id) VALUES (?,?,?,?)",
        (d.get('team_name'),d.get('state'),d.get('regional_office_id'),d.get('team_lead_id')))
    return jsonify({'success':True,'id':uid}),201

# ── MONITORING LOGS ───────────────────────────────────────────────────────────
@api.route('/api/monitoring-logs')
def get_logs():
    industry = request.args.get('industry_id')
    state    = request.args.get('state')
    limit    = request.args.get('limit',50)
    if industry:
        rows = query_db("SELECT ml.*,i.name as industry_name FROM monitoring_logs ml LEFT JOIN industries i ON ml.industry_id=i.id WHERE ml.industry_id=? ORDER BY ml.created_at DESC LIMIT ?",(industry,limit))
    elif state:
        rows = query_db("SELECT ml.*,i.name as industry_name FROM monitoring_logs ml LEFT JOIN industries i ON ml.industry_id=i.id WHERE i.state=? ORDER BY ml.created_at DESC LIMIT ?",(state,limit))
    else:
        rows = query_db("SELECT ml.*,i.name as industry_name FROM monitoring_logs ml LEFT JOIN industries i ON ml.industry_id=i.id ORDER BY ml.created_at DESC LIMIT ?",(limit,))
    return jsonify(rows)

@api.route('/api/monitoring-logs', methods=['POST'])
def submit_log():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO monitoring_logs (industry_id,location_id,team_id,submitted_by,monitoring_type,parameter,value,unit,reading_timestamp,remarks,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (d.get('industry_id'),d.get('location_id'),d.get('team_id'),d.get('submitted_by'),
         d.get('monitoring_type'),d.get('parameter'),d.get('value'),d.get('unit'),
         d.get('reading_timestamp',datetime.now().isoformat()),d.get('remarks'),'submitted'))
    # Auto-check against prescribed limits and create alert if exceeded
    _check_and_alert(d)
    return jsonify({'success':True,'id':uid}),201

def _check_and_alert(d):
    param = d.get('parameter'); val = d.get('value')
    if not param or val is None: return
    limits = query_db("SELECT * FROM prescribed_limits WHERE parameter=? AND limit_type='max'",(param,))
    for lim in limits:
        if float(val) > lim['limit_value']:
            severity = 'critical' if float(val) > lim['limit_value']*1.5 else 'high'
            ind = query_db("SELECT state FROM industries WHERE id=?",(d.get('industry_id'),))
            state = ind[0]['state'] if ind else None
            exec_db("INSERT INTO alerts (alert_type,severity,state,industry_id,parameter,measured_value,prescribed_limit,message,status) VALUES (?,?,?,?,?,?,?,?,?)",
                ('limit_exceeded',severity,state,d.get('industry_id'),param,float(val),lim['limit_value'],
                 f'{param} reading of {val} {d.get("unit","")} exceeds prescribed limit of {lim["limit_value"]}','active'))

# ── ALERTS ────────────────────────────────────────────────────────────────────
@api.route('/api/alerts')
def get_alerts():
    status   = request.args.get('status','active')
    severity = request.args.get('severity')
    state    = request.args.get('state')
    sql = "SELECT a.*,i.name as industry_name FROM alerts a LEFT JOIN industries i ON a.industry_id=i.id WHERE 1=1"
    args = []
    if status  != 'all': sql+=" AND a.status=?"; args.append(status)
    if severity: sql+=" AND a.severity=?"; args.append(severity)
    if state:    sql+=" AND a.state=?"; args.append(state)
    sql += " ORDER BY CASE a.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, a.created_at DESC LIMIT 100"
    return jsonify(query_db(sql,args))

@api.route('/api/alerts/<int:aid>', methods=['PUT'])
def update_alert(aid):
    d = request.get_json() or {}
    resolved = d.get('resolved_at')
    if d.get('status') == 'resolved' and not resolved:
        resolved = datetime.now().isoformat()
    exec_db("UPDATE alerts SET status=?,assigned_to=?,escalated=?,resolved_at=? WHERE id=?",
        (d.get('status'),d.get('assigned_to'),d.get('escalated',0),resolved,aid))
    return jsonify({'success':True})

@api.route('/api/alerts/summary')
def alerts_summary():
    total   = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='active'")[0]['n']
    crit    = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='active' AND severity='critical'")[0]['n']
    high    = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='active' AND severity='high'")[0]['n']
    esc     = query_db("SELECT COUNT(*) as n FROM alerts WHERE escalated=1")[0]['n']
    by_state= query_db("SELECT state,COUNT(*) as n FROM alerts WHERE status='active' GROUP BY state ORDER BY n DESC LIMIT 10")
    return jsonify({'total':total,'critical':crit,'high':high,'escalated':esc,'by_state':by_state})

# ── PERIODIC REPORTS ──────────────────────────────────────────────────────────
@api.route('/api/reports')
def get_reports():
    rtype = request.args.get('type')
    state = request.args.get('state')
    sql = "SELECT r.*,u.full_name as generated_by_name FROM periodic_reports r LEFT JOIN users u ON r.generated_by=u.id WHERE 1=1"
    args=[]
    if rtype: sql+=" AND r.report_type=?"; args.append(rtype)
    if state: sql+=" AND r.state=?"; args.append(state)
    sql+=" ORDER BY r.created_at DESC LIMIT 50"
    return jsonify(query_db(sql,args))

@api.route('/api/reports', methods=['POST'])
def create_report():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO periodic_reports (report_type,period_start,period_end,state,industry_id,generated_by,status,summary) VALUES (?,?,?,?,?,?,?,?)",
        (d.get('report_type'),d.get('period_start'),d.get('period_end'),d.get('state'),
         d.get('industry_id'),d.get('generated_by',1),d.get('status','draft'),d.get('summary','')))
    return jsonify({'success':True,'id':uid}),201

# ── MONITORING CAMPAIGNS ──────────────────────────────────────────────────────
@api.route('/api/campaigns')
def get_campaigns():
    return jsonify(query_db("SELECT mc.*,mt.team_name FROM monitoring_campaigns mc LEFT JOIN monitoring_teams mt ON mc.team_id=mt.id ORDER BY mc.start_date DESC"))

@api.route('/api/campaigns', methods=['POST'])
def create_campaign():
    d = request.get_json() or {}
    uid = exec_db("INSERT INTO monitoring_campaigns (campaign_name,campaign_type,state,start_date,end_date,team_id,description,status) VALUES (?,?,?,?,?,?,?,?)",
        (d.get('campaign_name'),d.get('campaign_type'),d.get('state'),d.get('start_date'),d.get('end_date'),d.get('team_id'),d.get('description'),d.get('status','planned')))
    return jsonify({'success':True,'id':uid}),201

# ── COMPLIANCE DASHBOARD ──────────────────────────────────────────────────────
@api.route('/api/compliance/dashboard')
def compliance_dashboard():
    active_alerts = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='active'")[0]['n']
    critical      = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='active' AND severity='critical'")[0]['n']
    resolved_7d   = query_db("SELECT COUNT(*) as n FROM alerts WHERE status='resolved' AND resolved_at > datetime('now','-7 days')"  )[0]['n']
    industries    = query_db("SELECT COUNT(*) as n FROM industries WHERE is_active=1")[0]['n']
    # Non-compliant (have active critical/high alert)
    non_compliant = query_db("SELECT COUNT(DISTINCT industry_id) as n FROM alerts WHERE status='active' AND severity IN ('critical','high') AND industry_id IS NOT NULL")[0]['n']
    recent_alerts = query_db("SELECT * FROM alerts WHERE status='active' ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, created_at DESC LIMIT 8")
    top_states    = query_db("SELECT state,COUNT(*) as alerts FROM alerts WHERE status='active' GROUP BY state ORDER BY alerts DESC LIMIT 5")
    return jsonify({'active_alerts':active_alerts,'critical':critical,'resolved_7d':resolved_7d,'industries':industries,'non_compliant':non_compliant,'recent_alerts':recent_alerts,'top_states':top_states})

# ── ANOMALY DETECTION API ─────────────────────────────────────────────────────
@api.route('/api/anomalies')
def get_anomalies():
    anomalies = []
    # AQI anomalies
    aqi_rows = query_db("SELECT state,aqi,pm25,pm10 FROM aqi_data WHERE id IN (SELECT MAX(id) FROM aqi_data GROUP BY state) ORDER BY aqi DESC")
    aqi_vals = [r['aqi'] for r in aqi_rows if r['aqi']]
    aqi_mean = sum(aqi_vals)/len(aqi_vals) if aqi_vals else 100
    aqi_std  = (sum((x-aqi_mean)**2 for x in aqi_vals)/max(len(aqi_vals),1))**0.5
    for r in aqi_rows:
        if r['aqi'] and r['aqi'] > 200:
            z = round((r['aqi'] - aqi_mean) / max(aqi_std, 1), 2)
            sev = 'critical' if r['aqi'] > 300 else 'high'
            anomalies.append({'type':'AQI','state':r['state'],'parameter':'AQI','value':r['aqi'],'threshold':200,'unit':'','z_score':z,'severity':sev,'message':f"{r['state']}: AQI {r['aqi']} — {'Severe' if r['aqi']>300 else 'Very Poor'} air quality"})
    # Water anomalies
    water_rows = query_db("SELECT state,ph,tds,fluoride,arsenic FROM water_quality WHERE id IN (SELECT MAX(id) FROM water_quality GROUP BY state)")
    for r in water_rows:
        ph = r.get('ph')
        if ph and (ph < 6.5 or ph > 8.5):
            anomalies.append({'type':'Water','state':r['state'],'parameter':'pH','value':round(ph,2),'threshold':'6.5-8.5','unit':'','z_score':None,'severity':'high','message':f"{r['state']}: pH {round(ph,2)} — outside safe range 6.5-8.5"})
        arsenic = r.get('arsenic')
        if arsenic and arsenic > 0.01:
            sev = 'critical' if arsenic > 0.05 else 'high'
            anomalies.append({'type':'Water','state':r['state'],'parameter':'Arsenic','value':arsenic,'threshold':0.01,'unit':'mg/L','z_score':None,'severity':sev,'message':f"{r['state']}: Arsenic {arsenic} mg/L — exceeds WHO limit 0.01 mg/L"})
        fluoride = r.get('fluoride')
        if fluoride and fluoride > 1.5:
            anomalies.append({'type':'Water','state':r['state'],'parameter':'Fluoride','value':round(fluoride,2),'threshold':1.5,'unit':'mg/L','z_score':None,'severity':'high','message':f"{r['state']}: Fluoride {round(fluoride,2)} mg/L — exceeds BIS limit 1.5 mg/L"})
        tds = r.get('tds')
        if tds and tds > 500:
            anomalies.append({'type':'Water','state':r['state'],'parameter':'TDS','value':int(tds),'threshold':500,'unit':'mg/L','z_score':None,'severity':'medium','message':f"{r['state']}: TDS {int(tds)} mg/L — exceeds BIS limit 500 mg/L"})
    # Noise anomalies
    noise_rows = query_db("SELECT state,decibel_level,zone_type FROM noise_data WHERE id IN (SELECT MAX(id) FROM noise_data GROUP BY state,zone_type)")
    for r in noise_rows:
        limit = {'Residential':55,'Commercial':65,'Industrial':75}.get(r.get('zone_type','Residential'),55)
        db = r.get('decibel_level')
        if db and db > limit:
            excess = round(db - limit, 1)
            anomalies.append({'type':'Noise','state':r['state'],'parameter':f"Noise ({r.get('zone_type','?')})","value":db,'threshold':limit,'unit':'dB','z_score':None,'severity':'high' if excess>10 else 'medium','message':f"{r['state']} ({r.get('zone_type','?')}): {db} dB — {excess} dB above safe limit {limit} dB"})
    # Emissions anomalies
    emiss_rows = query_db("SELECT state,co2 FROM emissions_data WHERE id IN (SELECT MAX(id) FROM emissions_data GROUP BY state)")
    co2_vals = [r['co2'] for r in emiss_rows if r['co2']]
    co2_mean = sum(co2_vals)/len(co2_vals) if co2_vals else 50
    co2_std  = (sum((x-co2_mean)**2 for x in co2_vals)/max(len(co2_vals),1))**0.5
    for r in emiss_rows:
        if r['co2'] and r['co2'] > co2_mean + co2_std:
            z = round((r['co2'] - co2_mean)/max(co2_std,1), 2)
            anomalies.append({'type':'Emissions','state':r['state'],'parameter':'CO2','value':r['co2'],'threshold':round(co2_mean,1),'unit':'Mt','z_score':z,'severity':'medium','message':f"{r['state']}: CO2 {r['co2']} Mt — {z}σ above national mean {round(co2_mean,1)} Mt"})
    order = {'critical':0,'high':1,'medium':2}
    anomalies.sort(key=lambda x: order.get(x['severity'],3))
    return jsonify({'anomalies':anomalies,'total':len(anomalies),'critical':sum(1 for a in anomalies if a['severity']=='critical'),'high':sum(1 for a in anomalies if a['severity']=='high'),'medium':sum(1 for a in anomalies if a['severity']=='medium')})

# ── FEEDBACK & USER REPORTS ──────────────────────────────────────────────────
@api.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json() or {}
    feedback_type = data.get('type', 'general')  # 'report', 'suggestion', 'bug', 'general'
    message = data.get('message', '').strip()
    contact = data.get('contact', '').strip()
    state = data.get('state', '').strip()
    
    if not message or len(message) < 10:
        return jsonify({'error': 'Feedback message must be at least 10 characters'}), 400
    
    try:
        feedback_id = exec_db(
            "INSERT INTO feedback (feedback_type, message, contact_email, state, submitted_at, status) VALUES (?, ?, ?, ?, ?, ?)",
            (feedback_type, message, contact, state, datetime.now().isoformat(), 'new')
        )
        return jsonify({'success': True, 'id': feedback_id, 'message': 'Feedback submitted successfully. Thank you!'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/feedback')
def get_feedback():
    # For admin/officers only
    feedback_type = request.args.get('type')
    status = request.args.get('status', 'new')
    limit = request.args.get('limit', 50)
    
    sql = "SELECT * FROM feedback WHERE 1=1"
    args = []
    if feedback_type:
        sql += " AND feedback_type = ?"
        args.append(feedback_type)
    if status != 'all':
        sql += " AND status = ?"
        args.append(status)
    sql += " ORDER BY submitted_at DESC LIMIT ?"
    args.append(int(limit))
    
    return jsonify(query_db(sql, tuple(args)))

@api.route('/api/feedback/<int:fid>', methods=['PUT'])
def update_feedback(fid):
    data = request.get_json() or {}
    try:
        exec_db(
            "UPDATE feedback SET status=?, reviewed_by=?, notes=? WHERE id=?",
            (data.get('status'), data.get('reviewed_by'), data.get('notes'), fid)
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ── CITIZEN REPORT & EMERGENCY SYSTEM ─────────────────────────────────────────
@api.route('/api/report', methods=['POST'])
def submit_report():
    data = request.get_json() or {}
    message = data.get('description', '').strip()
    if len(message) < 10:
        return jsonify({'error': 'Description must be at least 10 characters'}), 400
    
    report_type = data.get('report_type', 'concern')  # concern, pollution, incident, emergency
    severity = data.get('severity', 'medium')  # low, medium, high, critical
    location = data.get('location', '').strip()
    state = data.get('state', '').strip()
    email = data.get('contact_email', '').strip()
    phone = data.get('contact_phone', '').strip()
    
    try:
        priority = 'urgent' if severity in ['high', 'critical'] else 'normal'
        report_id = exec_db(
            """INSERT INTO reports 
            (report_type, severity, location, description, contact_email, contact_phone, state, priority, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')""",
            (report_type, severity, location, message, email, phone, state, priority)
        )
        
        # Auto-assign emergency reports to regional offices
        if severity == 'critical':
            # Trigger notification (could be email, SMS, etc)
            pass
        
        return jsonify({'success': True, 'message': 'Report submitted successfully', 'report_id': report_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/report')
def get_citizen_reports():
    try:
        report_type = request.args.get('type')
        status = request.args.get('status')
        state = request.args.get('state')
        limit = request.args.get('limit', 50, type=int)
        
        query = "SELECT * FROM reports WHERE 1=1"
        params = []
        
        if report_type:
            query += " AND report_type=?"
            params.append(report_type)
        if status:
            query += " AND status=?"
            params.append(status)
        if state:
            query += " AND state=?"
            params.append(state)
        
        query += " ORDER BY submitted_at DESC LIMIT ?"
        params.append(limit)
        
        rows = query_db(query, tuple(params))
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/report/<int:rid>', methods=['PUT'])
def update_report(rid):
    data = request.get_json() or {}
    try:
        exec_db(
            """UPDATE reports SET status=?, priority=?, assigned_to=?, reviewed_by=?, notes=? WHERE id=?""",
            (data.get('status'), data.get('priority'), data.get('assigned_to'), 
             data.get('reviewed_by'), data.get('notes'), rid)
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ── INDUSTRY MONTHLY REPORTS ──────────────────────────────────────────────────
@api.route('/api/reports/submit', methods=['POST'])
def submit_industry_report():
    try:
        # Check authentication
        user_id = request.form.get('user_id')
        if not user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        # Verify user is industry_user role
        user = query_db("SELECT role FROM users WHERE id=?", (user_id,))
        if not user or user[0]['role'] != 'industry_user':
            return jsonify({'error': 'Only industry users can submit reports'}), 403
        
        # Get form data
        industry_name = request.form.get('industry_name', '').strip()
        report_month = request.form.get('report_month', '').strip()
        report_category = request.form.get('report_category', '').strip()
        description = request.form.get('description', '').strip()
        contact_email = request.form.get('contact_email', '').strip()
        state = request.form.get('state', '').strip()
        
        # Validate inputs
        if not all([industry_name, report_month, report_category, description, contact_email, state]):
            return jsonify({'error': 'All required fields must be filled'}), 400
        
        # Handle file upload
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        allowed_extensions = {'pdf', 'xlsx', 'xls', 'csv'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'error': 'Only PDF, Excel, and CSV files are allowed'}), 400
        
        # Check file size (max 10 MB)
        max_size = 10 * 1024 * 1024
        file.seek(0, 2)
        if file.tell() > max_size:
            return jsonify({'error': 'File size must be less than 10 MB'}), 400
        file.seek(0)
        
        # Create reports directory if it doesn't exist
        reports_dir = os.path.join(os.path.dirname(__file__), '..', 'reports')
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)
        
        # Save file with timestamp and user ID
        import time
        timestamp = int(time.time())
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        safe_filename = f"industry_report_{user_id}_{timestamp}.{file_ext}"
        file_path = os.path.join(reports_dir, safe_filename)
        file.save(file_path)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Store report metadata in database
        report_id = exec_db(
            """INSERT INTO industry_reports 
            (user_id, industry_name, report_month, report_category, description, 
             contact_email, state, file_name, file_path, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')""",
            (user_id, industry_name, report_month, report_category, description,
             contact_email, state, file.filename, safe_filename, file_size)
        )
        
        # TODO: Send confirmation email using Mailgun
        # from backend.mailer import send_email
        # send_email(contact_email, "Report Submission Confirmed", ...)
        
        return jsonify({
            'success': True,
            'message': 'Report submitted successfully',
            'report_id': report_id
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Report submission failed: {str(e)}'}), 500

@api.route('/api/reports/industry')
def get_industry_reports():
    """Get industry reports - accessible to super_admin and regional_officer"""
    try:
        # Check authentication
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        # Verify user role
        user = query_db("SELECT role FROM users WHERE id=?", (user_id,))
        if not user or user[0]['role'] not in ['super_admin', 'regional_officer']:
            return jsonify({'error': 'Access denied. Only Super Admin and Regional Officers can view reports.'}), 403
        
        status = request.args.get('status')  # pending, approved, rejected
        sql = "SELECT * FROM industry_reports WHERE 1=1"
        args = []
        
        if status:
            sql += " AND status=?"
            args.append(status)
        
        sql += " ORDER BY submitted_at DESC LIMIT 100"
        rows = query_db(sql, tuple(args))
        return jsonify(rows), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch reports: {str(e)}'}), 500

@api.route('/api/satellite/heatmap')
def get_heatmap_data():
    """Get geospatial heatmap data with coordinates for globe visualization"""
    try:
        # Get latest AQI data with state info for coordinate mapping
        rows = query_db("""
            SELECT DISTINCT state, 
                   aqi, pm25, pm10, so2, co, no2,
                   timestamp
            FROM aqi_data 
            WHERE id IN (SELECT MAX(id) FROM aqi_data GROUP BY state)
            ORDER BY aqi DESC
        """)
        
        # Map states to approximate coordinates (center of state)
        state_coords = {
            "Delhi": [28.6139, 77.2090], "Andhra Pradesh": [15.9129, 78.6675],
            "Arunachal Pradesh": [28.2180, 94.7278], "Assam": [26.2006, 92.9376],
            "Bihar": [25.0961, 85.3131], "Chhattisgarh": [21.2787, 81.8661],
            "Goa": [15.2993, 73.8243], "Gujarat": [22.2587, 71.1924],
            "Haryana": [29.0588, 77.0745], "Himachal Pradesh": [31.7433, 77.1205],
            "Jharkhand": [23.6102, 85.2799], "Karnataka": [15.3173, 75.7139],
            "Kerala": [10.8505, 76.2711], "Madhya Pradesh": [22.9375, 78.6553],
            "Maharashtra": [19.7515, 75.7139], "Manipur": [24.6637, 93.9063],
            "Meghalaya": [25.4670, 91.3662], "Mizoram": [23.8103, 93.3287],
            "Nagaland": [26.1584, 94.5624], "Odisha": [20.9517, 85.0985],
            "Punjab": [31.1471, 75.3412], "Rajasthan": [27.0238, 74.2179],
            "Sikkim": [27.5330, 88.5122], "Tamil Nadu": [11.1271, 79.2787],
            "Telangana": [18.1124, 79.0193], "Tripura": [23.9408, 91.9882],
            "Uttar Pradesh": [26.8467, 80.9462], "Uttarakhand": [30.0668, 79.0193],
            "West Bengal": [24.5155, 88.2289], "Jammu and Kashmir": [33.7782, 76.5769],
            "Ladakh": [34.1526, 77.5771], "Puducherry": [12.0043, 79.8068],
            "Chandigarh": [30.7333, 76.7794]
        }
        
        heatmap_points = []
        for row in rows:
            state = row['state']
            coords = state_coords.get(state, [20.0, 78.0])
            aqi_value = row['aqi'] or 0
            
            # Determine color based on AQI value
            if aqi_value <= 50:
                color = [0, 200, 100]  # Green
            elif aqi_value <= 100:
                color = [200, 200, 0]  # Yellow
            elif aqi_value <= 200:
                color = [255, 165, 0]  # Orange
            elif aqi_value <= 300:
                color = [255, 100, 0]  # Dark Orange
            else:
                color = [200, 0, 0]  # Red
                
            heatmap_points.append({
                'state': state,
                'lat': coords[0],
                'lng': coords[1],
                'aqi': aqi_value,
                'pm25': row['pm25'],
                'pm10': row['pm10'],
                'so2': row['so2'] or 0,
                'co': row['co'] or 0,
                'no2': row['no2'] or 0,
                'color': color,
                'intensity': min(aqi_value / 500.0, 1.0),
                'timestamp': row['timestamp']
            })
        
        return jsonify(heatmap_points)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/satellite/aqi-rankings')
def get_aqi_rankings():
    """Get overall AQI standings by state/region"""
    try:
        rows = query_db("""
            SELECT state, aqi, pm25, pm10, timestamp
            FROM aqi_data 
            WHERE id IN (SELECT MAX(id) FROM aqi_data GROUP BY state)
            ORDER BY aqi DESC
        """)
        
        rankings = []
        for idx, row in enumerate(rows, 1):
            aqi_value = row['aqi'] or 0
            if aqi_value <= 50:
                category = "Good"
            elif aqi_value <= 100:
                category = "Satisfactory"
            elif aqi_value <= 200:
                category = "Moderately Polluted"
            elif aqi_value <= 300:
                category = "Heavily Polluted"
            else:
                category = "Severe"
                
            rankings.append({
                'rank': idx,
                'state': row['state'],
                'aqi': aqi_value,
                'category': category,
                'pm25': row['pm25'],
                'pm10': row['pm10'],
                'timestamp': row['timestamp']
            })
        
        return jsonify(rankings)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/satellite/wind-flow')
def get_wind_flow():
    """Get simulated wind flow data for visualization"""
    try:
        # Get emission data to simulate wind flow patterns
        rows = query_db("""
            SELECT state, co2, methane, nitrous_oxide, timestamp
            FROM emissions_data 
            WHERE id IN (SELECT MAX(id) FROM emissions_data GROUP BY state)
        """)
        
        state_coords = {
            "Delhi": [28.6139, 77.2090], "Andhra Pradesh": [15.9129, 78.6675],
            "Arunachal Pradesh": [28.2180, 94.7278], "Assam": [26.2006, 92.9376],
            "Bihar": [25.0961, 85.3131], "Chhattisgarh": [21.2787, 81.8661],
            "Goa": [15.2993, 73.8243], "Gujarat": [22.2587, 71.1924],
            "Haryana": [29.0588, 77.0745], "Himachal Pradesh": [31.7433, 77.1205],
            "Jharkhand": [23.6102, 85.2799], "Karnataka": [15.3173, 75.7139],
            "Kerala": [10.8505, 76.2711], "Madhya Pradesh": [22.9375, 78.6553],
            "Maharashtra": [19.7515, 75.7139], "Manipur": [24.6637, 93.9063],
            "Meghalaya": [25.4670, 91.3662], "Mizoram": [23.8103, 93.3287],
            "Nagaland": [26.1584, 94.5624], "Odisha": [20.9517, 85.0985],
            "Punjab": [31.1471, 75.3412], "Rajasthan": [27.0238, 74.2179],
            "Sikkim": [27.5330, 88.5122], "Tamil Nadu": [11.1271, 79.2787],
            "Telangana": [18.1124, 79.0193], "Tripura": [23.9408, 91.9882],
            "Uttar Pradesh": [26.8467, 80.9462], "Uttarakhand": [30.0668, 79.0193],
            "West Bengal": [24.5155, 88.2289], "Jammu and Kashmir": [33.7782, 76.5769],
            "Ladakh": [34.1526, 77.5771], "Puducherry": [12.0043, 79.8068],
            "Chandigarh": [30.7333, 76.7794]
        }
        
        wind_vectors = []
        for row in rows:
            state = row['state']
            coords = state_coords.get(state, [20.0, 78.0])
            emission_level = (row['co2'] or 0) + (row['methane'] or 0)
            
            # Simulate wind direction and speed based on emission levels
            wind_direction = (emission_level * 5) % 360  # Angle in degrees
            wind_speed = min(emission_level / 50.0, 10)  # Km/h equivalent
            
            wind_vectors.append({
                'state': state,
                'lat': coords[0],
                'lng': coords[1],
                'direction': wind_direction,
                'speed': wind_speed,
                'co2': row['co2'],
                'methane': row['methane'],
                'timestamp': row['timestamp']
            })
        
        return jsonify(wind_vectors)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/satellite/river-flow')
def get_river_flow():
    """Get river flow and water quality data"""
    try:
        # Get water sources with quality data
        water_sources = query_db("""
            SELECT ws.*, wq.ph, wq.tds, wq.fluoride, wq.arsenic, wq.iron, wq.timestamp
            FROM water_sources ws
            LEFT JOIN water_quality wq ON ws.state = wq.state
            WHERE wq.id IN (SELECT MAX(id) FROM water_quality GROUP BY state)
            ORDER BY ws.state
        """)
        
        river_data = []
        for source in water_sources:
            quality_status = "Good"
            ph_value = source['ph'] or 7.0
            tds_value = source['tds'] or 500
            
            if source['fluoride'] and source['fluoride'] > 1.5:
                quality_status = "Warning"
            elif source['arsenic'] and source['arsenic'] > 0.01:
                quality_status = "Alert"
            elif ph_value < 6.5 or ph_value > 8.5 or tds_value > 2000:
                quality_status = "Caution"
            
            river_data.append({
                'name': source['name'],
                'state': source['state'],
                'type': source['source_type'],
                'lat': source['latitude'],
                'lng': source['longitude'],
                'ph': ph_value,
                'tds': tds_value,
                'fluoride': source['fluoride'],
                'arsenic': source['arsenic'],
                'iron': source['iron'],
                'status': quality_status,
                'timestamp': source['timestamp']
            })
        
        return jsonify(river_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 400
        
        sql = "SELECT ir.*,u.full_name,u.role FROM industry_reports ir LEFT JOIN users u ON ir.user_id=u.id WHERE 1=1"
        args = []
        
        if status and status != 'all':
            sql += " AND ir.status=?"
            args.append(status)
        
        sql += " ORDER BY ir.submitted_at DESC LIMIT 100"
        
        rows = query_db(sql, tuple(args))
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/reports/industry/<int:rid>', methods=['PUT'])
def review_industry_report(rid):
    """Review industry report - accessible to super_admin and regional_officer"""
    try:
        data = request.get_json() or {}
        
        # Check authentication
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'User authentication required'}), 401
        
        # Verify user role
        user = query_db("SELECT role FROM users WHERE id=?", (user_id,))
        if not user or user[0]['role'] not in ['super_admin', 'regional_officer']:
            return jsonify({'error': 'Access denied'}), 403
        
        exec_db(
            """UPDATE industry_reports 
            SET status=?, reviewed_by=?, review_notes=?, reviewed_at=? 
            WHERE id=?""",
            (data.get('status'), user_id, data.get('review_notes'), 
             datetime.now().isoformat(), rid)
        )
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@api.route('/api/compare/aqi')
def compare_aqi():
    states = request.args.getlist('states') or request.args.get('states','').split(',')
    states = [s.strip() for s in states if s.strip()]
    if not states: return jsonify({'error':'provide states param'}),400
    results = {}
    for st in states:
        rows = query_db("SELECT aqi,pm25,pm10,timestamp FROM aqi_data WHERE state=? ORDER BY timestamp DESC LIMIT 7",(st,))
        results[st] = rows
    return jsonify(results)

@api.route('/api/trend/<metric>')
def trend(metric):
    state = request.args.get('state','Delhi')
    days  = int(request.args.get('days',30))
    table_map = {'aqi':'aqi_data','water':'water_quality','noise':'noise_data','emissions':'emissions_data'}
    col_map   = {'aqi':'aqi','water':'ph','noise':'decibel_level','emissions':'co2'}
    if metric not in table_map: return jsonify({'error':'invalid metric'}),400
    rows = query_db(f"SELECT {col_map[metric]} as value,timestamp FROM {table_map[metric]} WHERE state=? ORDER BY timestamp DESC LIMIT ?",(state,days))
    return jsonify(rows)

