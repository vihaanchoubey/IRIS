# Gemini API Setup Guide for IRIS AI Copilot

## Overview
The IRIS AI Copilot has been updated to use **Google Gemini 2.0 Flash** instead of Claude AI. This document provides instructions for setting up your Gemini API key.

## Step 1: Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Create API Key"** or **"+ Create new secret key"**
3. Select your project (or create a new one)
4. Copy the generated API key

> **Note:** Keep your API key secure. Do NOT commit it to version control.

## Step 2: Configure the Backend

### Option A: Environment Variable (Recommended)
Set the `GEMINI_API_KEY` environment variable:

**Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY = "your-api-key-here"
python app.py
```

**Linux/Mac:**
```bash
export GEMINI_API_KEY="your-api-key-here"
python app.py
```

**Windows (CMD):**
```cmd
set GEMINI_API_KEY=your-api-key-here
python app.py
```

### Option B: Direct Configuration
Edit `iris-fixed/backend/api_routes.py`:
```python
GEMINI_API_KEY = 'paste-your-api-key-here'  # Replace with your actual key
```

## Step 3: Configure the Frontend (Floating Widget)

Edit `iris-fixed/static/js/iris-ai.js`:
```javascript
const IRIS_GEMINI_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your actual key
```

**Or** update the HTML element if using a data attribute approach (optional).

## Step 4: Verify Installation

1. Start the IRIS application:
   ```bash
   python app.py
   ```

2. Open http://127.0.0.1:5000/copilot in your browser

3. Test the Copilot:
   - **Main Page**: Type a question in the input field and click "Ask Copilot"
   - **Floating Widget**: Click the brain icon (🧠) in bottom-right corner and ask a question

4. Expected output should indicate **"Powered by Gemini 2.0 Flash"** in the response footer

## API Features Enabled

✅ **Real-time Environmental Intelligence**
- Live AQI predictions and analysis
- Water quality risk assessment
- Industrial emissions scenarios
- Compliance risk analysis
- Anomaly detection insights

✅ **Conversational AI**
- Multi-turn conversation history
- Context-aware responses
- Scenario-based analysis
- What-if simulations

## Fallback Logic

If the Gemini API key is not configured or unavailable:
- The system automatically falls back to **IRIS Logic** (local smart analysis)
- All responses remain accurate but are less conversational
- No API calls are made - fully offline capable

## Pricing & Quotas

- **Free Tier**: 60 requests per minute, limited monthly quota
- **Paid Plans**: Higher quotas and priority support available
- Check [Google AI Pricing](https://ai.google.dev/pricing) for latest details

## Troubleshooting

### "No response from Gemini" error
- Verify API key is correct and active
- Check internet connectivity
- Ensure API key has sufficient quota remaining

### "Connection error" on copilot page
- Restart the Flask server: `python app.py`
- Check that backend is running on http://127.0.0.1:5000

### Key showing as invalid in console
- Copy-paste errors are common - verify the full key was copied
- Re-generate a new key if unsure
- Ensure no extra spaces or line breaks

## Security Notes

🔐 **Do NOT:**
- Commit API keys to git/GitHub
- Share keys in public channels
- Hardcode keys in production code

✅ **Instead:**
- Use environment variables
- Store in `.env` files (add to `.gitignore`)
- Use secure secrets management in production

## Updating to Latest Gemini Model

Google regularly releases new models. To update:

1. Check available models: https://ai.google.dev/models
2. Update the model name in:
   - Backend: `api_routes.py` - change `gemini-2.0-flash` to new model name
   - Frontend: `iris-ai.js` - update in `callGemini()` function's ENDPOINT

Example:
```python
# Old
f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}'

# New (updated model)
f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent?key={GEMINI_API_KEY}'
```

## Support

- **Google AI Forum**: https://discuss.ai.google.dev
- **Gemini API Docs**: https://ai.google.dev/docs
- **IRIS GitHub Issues**: (your repository URL)

---

**Last Updated**: March 14, 2026
**IRIS Version**: 2.0 with Gemini Integration
