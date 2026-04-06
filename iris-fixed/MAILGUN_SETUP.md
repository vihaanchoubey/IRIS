## Mailgun Email Configuration Guide

This app uses Mailgun to send OTP verification emails during signup.

### Getting Started with Mailgun

1. **Sign Up for Free Mailgun Account**
   - Go to https://www.mailgun.com/
   - Create a free account (5,000 emails/month included)
   - Complete email verification

2. **Get Your Credentials**
   - Log in to your Mailgun dashboard
   - Go to **Sending > Domain Settings**
   - Copy your **API Key** (looks like: `key-xxxxxxxxxxxxxxxxxxxxxxxx`)
   - Copy your **Domain Name** (looks like: `sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org`)

3. **Configure IRIS**
   - Open `config.py` in the iris-fixed folder
   - Replace the placeholder values:
     ```python
     MAILGUN_API_KEY = "your-actual-api-key-here"
     MAILGUN_DOMAIN = "your-actual-domain.mailgun.org"
     SENDER_EMAIL = "noreply@your-actual-domain.mailgun.org"
     ```

4. **Restart the App**
   - Restart the Flask development server
   - When users sign up, OTPs will now be sent via email

### Testing Without Mailgun

If you don't configure Mailgun, the app will print the OTP in the terminal/console instead of sending emails. This is useful for testing.

### Production Considerations

- Use **Mailgun's production domain** (not sandbox) for real users
- Add authorized email addresses in Mailgun if using sandbox domain
- Consider rate limiting on signup to prevent abuse
- Use environment variables for sensitive credentials in production

### Troubleshooting

If emails aren't being sent:
1. Check that API key and domain are correct in `config.py`
2. Look at terminal logs for error messages
3. Verify the recipient email is authorized (if using sandbox domain)
4. Check Mailgun dashboard for failed messages

### Alternative Email Services

You can also use:
- **SendGrid** - 100 emails/day free
- **AWS SES** - 62,000 emails/month free
- **Gmail SMTP** - Limited to 500 emails/day

Modify `backend/mailer.py` if you want to use a different service.
