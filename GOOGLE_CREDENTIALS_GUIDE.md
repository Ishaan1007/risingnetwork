# Google Meet API Credentials Guide

## 📍 Where to Find Your Credentials

You're seeing the API is enabled but credentials aren't visible. Here's how to find them:

### Step 1: Navigate to Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project (look for "RisingNetwork" in the project selector)

### Step 2: Find APIs & Services
1. In the left sidebar, click **"APIs & Services"**
2. Then click **"Library"** at the top
3. Search for "Google Meet API" and select it

### Step 3: Go to Credentials
1. In the left sidebar, click **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**
4. Choose **"Web application"**
5. Click **"CREATE"**

### Step 4: Configure OAuth Client
1. **Application name**: `RisingNetwork Google Meet`
2. **Authorized JavaScript origins**: `http://localhost:3000`
3. **Authorized redirect URIs**: `http://localhost:3000/api/auth/google/callback`

### Step 5: Get Your Credentials
After creating, you'll see:
- **Client ID** (starts with numbers like `123456789012-abc123def456`)
- **Client Secret** (long random string)

## 🔑 Copy These to Your `.env.local`

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## ⚠️ Important Notes

1. **Client ID**: Usually starts with numbers (e.g., `123456789012-abc123def456`)
2. **Client Secret**: Long random string - keep it secure!
3. **Never commit** `.env.local` to Git
4. Make sure redirect URI matches exactly

## 🚀 After Adding Credentials

1. Update your `.env.local` with real values
2. Restart your development server
3. Test Google Meet integration

## 🔍 Troubleshooting

If you still don't see credentials:
- Check you're in the correct Google Cloud project
- Verify the API is actually enabled (not just in library)
- Try refreshing the Google Cloud Console page
- Check if you have the right permissions

The credentials should appear in your console once you complete these steps!
