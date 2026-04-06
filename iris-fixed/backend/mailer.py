"""
Mailgun Email Service
Handles sending transactional emails like OTPs
"""
import requests
import os, sys

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from config import MAILGUN_API_KEY, MAILGUN_DOMAIN, SENDER_EMAIL

def send_otp_email(recipient_email, otp, user_name='User'):
    """
    Send OTP via email using Mailgun
    
    Args:
        recipient_email: Email address to send OTP to
        otp: 6-digit OTP code
        user_name: Name of the user (for personalization)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not MAILGUN_API_KEY or MAILGUN_API_KEY == "your-mailgun-api-key-here":
        print(f"⚠️  Mailgun not configured. OTP for {recipient_email}: {otp}")
        return True  # For testing, return True but print the OTP
    
    try:
        url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
        
        data = {
            "from": SENDER_EMAIL,
            "to": recipient_email,
            "subject": "IRIS Email Verification - Your OTP Code",
            "html": f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h2 style="color: #0969da; margin-bottom: 10px;">🌍 IRIS Email Verification</h2>
                        <p style="color: #666; font-size: 16px;">Hi {user_name},</p>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            Thank you for signing up with IRIS - Environmental Intelligence System. 
                            To complete your account setup and start monitoring environmental data, 
                            please verify your email by entering the OTP code below.
                        </p>
                        
                        <div style="background-color: #f0f0f0; border: 2px solid #0969da; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">Your Verification Code</p>
                            <p style="color: #0969da; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 3px;">{otp}</p>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            <strong>⏱️ Valid for 10 minutes</strong> - This code will expire after 10 minutes.
                        </p>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                            If you didn't sign up for this account, please ignore this email.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            IRIS - Integrated Regional Intelligence System<br>
                            Environmental Monitoring & Compliance
                        </p>
                    </div>
                </body>
            </html>
            """
        }
        
        response = requests.post(
            url,
            auth=("api", MAILGUN_API_KEY),
            data=data
        )
        
        if response.status_code == 200:
            print(f"✅ OTP email sent to {recipient_email}")
            return True
        else:
            print(f"❌ Failed to send OTP email: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Email error: {e}")
        return False
