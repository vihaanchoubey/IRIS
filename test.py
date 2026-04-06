import os
import requests

MAILGUN_API_KEY = "cf1124d94025e3569833f22d2e449e93-c6620443-b52ed355"
MAILGUN_DOMAIN = "sandbox58c36e53d5684cd598381d484b37238c.mailgun.org"

response = requests.post(
    f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
    auth=("api", MAILGUN_API_KEY),
    data={
        "from": f"Mailgun <postmaster@{MAILGUN_DOMAIN}>",
        "to": "himanshushahni2208@gmail.com",  # Change to YOUR email
        "subject": "Mailgun Test",
        "text": "This is a test email from Mailgun!"
    }
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")