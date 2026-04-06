# IRIS 
Working link
https://drive.google.com/file/d/1-NNWj_gPqVx4kaMZSGkgnd0MiuTXlnJA/view?usp=drive_link

Integrated Regional Intelligence System (IRIS) is an environmental monitoring and compliance dashboard built with Python and Flask. It includes air quality, water quality, noise monitoring, emissions tracking, compliance reporting, and an AI Copilot powered by Google Gemini.

## 📌 What this repo contains

- `iris-fixed/` — main Flask application source
- `GEMINI_INTEGRATION_SUMMARY.md` — Gemini migration attachment and status report
- `iris-fixed/GEMINI_SETUP.md` — Gemini API setup guide
- `iris-fixed/README.md` — app-specific project summary and usage notes
- `test.py` — helper/test script

## 🚀 Key features

- Environmental monitoring dashboards for air, water, noise, and emissions
- Compliance management and alert generation
- AI Copilot integration using Google Gemini 2.0 Flash
- Monitoring team and regional officer user roles
- Admin management for offices, industries, teams, users, and monitoring units

## 📁 Recommended files to review

- `iris-fixed/README.md` — full project overview and quick start instructions
- `GEMINI_INTEGRATION_SUMMARY.md` — attachment summarizing Gemini integration changes
- `iris-fixed/GEMINI_SETUP.md` — setup instructions for Gemini API keys

## 🧩 Setup

From the repository root:

```bash
cd iris-fixed
pip install -r requirements.txt
python app.py
```

Open the app in your browser:

```text
http://127.0.0.1:5000
```

## 📎 Attachments

These docs are included as attachments in the repository:

- `GEMINI_INTEGRATION_SUMMARY.md`
- `iris-fixed/GEMINI_SETUP.md`
- `iris-fixed/README.md`

## 💡 Notes

- Keep API keys out of version control
- Use environment variables or `.env` files for secrets
- The AI Copilot is configured on `/copilot`

---

If you want, I can also update `iris-fixed/README.md` with a more detailed setup sequence or add a root `.env.example` file.
