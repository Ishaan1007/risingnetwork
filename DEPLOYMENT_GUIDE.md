# Google Meet Deployment Guide

## 🌐 Development vs Production URLs

### Development (Local Testing)
```env
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Production (Live Domain)
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## 🔧 When to Use Each

### **Development Phase**
- ✅ **localhost** for local testing
- ✅ **No HTTPS** required
- ✅ **Quick iteration**
- ✅ **No domain setup**

### **Production Phase**
- ✅ **Real domain** for users
- ✅ **HTTPS required**
- ✅ **Live authentication**
- ✅ **User access**

## 📋 Deployment Steps

### 1. **Google Cloud Console - Multiple URIs**
You can add **both** redirect URIs to your OAuth client:

1. Go to **Credentials** in Google Cloud Console
2. Click on your OAuth client ID
3. Add both URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://yourdomain.com/api/auth/google/callback`

### 2. **Environment Variables**
```env
# Development
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Production (when deployed)
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### 3. **Deployment Platforms**

#### **Vercel**
```env
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
```

#### **Netlify**
```env
GOOGLE_REDIRECT_URI=https://your-app.netlify.app/api/auth/google/callback
```

#### **Custom Domain**
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

## 🚀 Best Practices

### **For Development**
- Use `localhost:3000`
- Test locally first
- Ensure API works before deployment

### **For Production**
- Always use HTTPS
- Update Google Cloud Console with production URL
- Test authentication flow after deployment

### **Both Environments**
- Keep same Client ID and Secret
- Update only the redirect URI
- Test both environments

## ⚠️ Important Notes

1. **Google OAuth requires exact URI match**
2. **HTTPS mandatory for production**
3. **Update Google Cloud Console** when changing domain
4. **Test authentication** after deployment

## 🔄 Switching Between Environments

```bash
# Development
npm run dev

# Production (after deployment)
# Update .env.local with production URI
# Deploy to your platform
```

This setup allows seamless development and production deployment!
