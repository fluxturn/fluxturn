# Instagram OAuth Setup Guide

## Overview

Instagram OAuth has been fully implemented! This guide will walk you through setting up one-click OAuth authentication for Instagram, just like Twitter, Facebook, and other connectors.

## Step 1: Create a Facebook App

Since Instagram uses Facebook's OAuth system, you need a Facebook App.

### 1.1 Go to Facebook Developers

1. Visit https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Select "Business" type
4. Fill in the app details:
   - **App Name**: `Fluxturn Instagram`
   - **App Contact Email**: Your email
   - **Business Account**: Select or create one

### 1.2 Configure Instagram Basic Display

1. In your app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Click "Create New App" (Instagram App)
4. Fill in:
   - **Display Name**: `Fluxturn`
   - **Valid OAuth Redirect URIs**: `http://localhost:5005/api/v1/oauth/instagram/callback`
   - **Deauthorize Callback URL**: `http://localhost:5005/api/v1/oauth/instagram/deauthorize`
   - **Data Deletion Request URL**: `http://localhost:5005/api/v1/oauth/instagram/delete`

5. Save Changes

### 1.3 Get Your Credentials

1. Go to "Basic Display" → "Basic Display" tab
2. You'll see:
   - **Instagram App ID** (this is your Client ID)
   - **Instagram App Secret** (this is your Client Secret)
3. Copy both values

## Step 2: Update Environment Variables

Add these to your `.env` file:

```env
# Instagram OAuth Configuration
INSTAGRAM_OAUTH_CLIENT_ID=your_instagram_app_id_here
INSTAGRAM_OAUTH_CLIENT_SECRET=your_instagram_app_secret_here
INSTAGRAM_OAUTH_REDIRECT_URI=http://localhost:5005/api/v1/oauth/instagram/callback

# Alternative: You can also use Facebook App credentials
# FACEBOOK_APP_ID=your_facebook_app_id
# FACEBOOK_APP_SECRET=your_facebook_app_secret

# Frontend URL (if different from default)
FRONTEND_URL=http://localhost:5173
```

**Example:**
```env
INSTAGRAM_OAUTH_CLIENT_ID=1234567890123456
INSTAGRAM_OAUTH_CLIENT_SECRET=abcdef1234567890abcdef1234567890
INSTAGRAM_OAUTH_REDIRECT_URI=http://localhost:5005/api/v1/oauth/instagram/callback
FRONTEND_URL=http://localhost:5173
```

## Step 3: Connect Instagram Business Account

### 3.1 Requirements

- A Facebook Page
- An Instagram Business or Creator Account
- The Instagram account must be connected to the Facebook Page

### 3.2 Connect Instagram to Facebook Page

1. Go to your Facebook Page Settings
2. Click "Instagram" in the left sidebar
3. Click "Connect Account"
4. Log in to your Instagram account
5. Follow the prompts to connect

**Guide**: https://www.facebook.com/business/help/898752960195806

## Step 4: Test the OAuth Flow

### 4.1 Restart Backend

```bash
cd /Users/user/Desktop/fluxturn/backend
npm run start:dev
```

### 4.2 Test in Fluxturn

1. Open Fluxturn UI: `http://localhost:5173`
2. Go to **Connectors**
3. Click **"Add Instagram"**
4. You should now see **"Connect with OAuth"** button
5. Click the button
6. You'll be redirected to Facebook OAuth
7. Grant permissions
8. You'll be redirected back with credentials saved!

## Step 5: Verify Setup

After successful OAuth:

- ✅ Access token is saved (encrypted)
- ✅ Instagram Account ID is auto-detected
- ✅ Username is displayed (@yourusername)
- ✅ Token is long-lived (60 days)
- ✅ Ready to publish!

## OAuth Flow Diagram

```
User clicks "Connect with OAuth"
         ↓
Redirect to Facebook OAuth
(https://www.facebook.com/v18.0/dialog/oauth)
         ↓
User grants permissions:
- instagram_basic
- instagram_content_publish
- instagram_manage_comments
- instagram_manage_insights
- pages_show_list
- pages_read_engagement
         ↓
Facebook redirects to callback
(http://localhost:5005/api/v1/oauth/instagram/callback?code=...)
         ↓
Backend exchanges code for access token
         ↓
Backend converts to long-lived token (60 days)
         ↓
Backend fetches Instagram Business Account ID
         ↓
Backend saves encrypted credentials to database
         ↓
Success popup shows: "Instagram Connected! @yourusername"
         ↓
Popup closes automatically
         ↓
Ready to use Instagram actions!
```

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `instagram_basic` | Basic profile info and media |
| `instagram_content_publish` | Publish posts, reels, and stories |
| `instagram_manage_comments` | Read and respond to comments |
| `instagram_manage_insights` | Access analytics and insights |
| `pages_show_list` | List Facebook Pages |
| `pages_read_engagement` | Read page engagement data |

## Troubleshooting

### Error: "OAuth is not configured"

**Solution:** Check that you've added the environment variables to `.env`:
```bash
# Verify they're set
echo $INSTAGRAM_OAUTH_CLIENT_ID
echo $INSTAGRAM_OAUTH_CLIENT_SECRET
echo $INSTAGRAM_OAUTH_REDIRECT_URI
```

If empty, add them to `.env` and restart the backend.

### Error: "No Instagram Business Account found"

**Solution:** Your Instagram account must be:
1. A Business or Creator account (not Personal)
2. Connected to a Facebook Page

Convert to Business: Instagram App → Settings → Account → Switch to Professional Account

### Error: "redirect_uri_mismatch"

**Solution:** The redirect URI must match exactly:

In Facebook App Settings:
```
http://localhost:5005/api/v1/oauth/instagram/callback
```

In your `.env`:
```
INSTAGRAM_OAUTH_REDIRECT_URI=http://localhost:5005/api/v1/oauth/instagram/callback
```

Make sure there are no trailing slashes or extra characters!

### Error: "Invalid OAuth token"

**Solution:** Token may have expired. Long-lived tokens last 60 days. Just re-authenticate:
1. Delete the old connector
2. Add new connector with OAuth
3. Click "Connect with OAuth" again

### OAuth popup blocked

**Solution:** Allow popups for your Fluxturn domain:
1. Look for blocked popup icon in browser address bar
2. Click it and select "Always allow popups"
3. Try again

### Can't find App ID/Secret

1. Go to https://developers.facebook.com/apps/
2. Select your app
3. Go to Settings → Basic
4. Scroll down to find App ID and App Secret
5. For Instagram-specific: Products → Instagram Basic Display

## Production Deployment

When deploying to production, update:

### 1. Update Redirect URI

In Facebook App Settings, add production URL:
```
https://yourdomain.com/api/v1/oauth/instagram/callback
```

### 2. Update Environment Variables

```env
INSTAGRAM_OAUTH_CLIENT_ID=your_production_app_id
INSTAGRAM_OAUTH_CLIENT_SECRET=your_production_app_secret
INSTAGRAM_OAUTH_REDIRECT_URI=https://yourdomain.com/api/v1/oauth/instagram/callback
FRONTEND_URL=https://yourdomain.com
```

### 3. Make App Public

1. Go to your Facebook App
2. Settings → Basic
3. Toggle "App Mode" from Development to Live

## API Endpoints

The following OAuth endpoints are now available:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/oauth/instagram/authorize` | GET | Initiate OAuth flow |
| `/api/v1/oauth/instagram/callback` | GET | Handle OAuth callback |

## Testing the Integration

### Test Image Post

After connecting:

1. Create a new workflow
2. Add Instagram connector
3. Select "Publish Image" action
4. Configure:
   ```json
   {
     "image_url": "https://picsum.photos/1080/1080",
     "caption": "Test post from Fluxturn! 🚀 #automation"
   }
   ```
5. Run workflow
6. Check your Instagram account!

### Test Reel

```json
{
  "video_url": "https://example.com/video.mp4",
  "caption": "My first automated reel! 🎥",
  "share_to_feed": true
}
```

### Test Story

```json
{
  "content_type": "photo",
  "image_url": "https://picsum.photos/1080/1920"
}
```

## Comparison: Manual vs OAuth

| Feature | Manual Setup | OAuth Setup |
|---------|--------------|-------------|
| User experience | Paste tokens manually | One-click "Connect" button |
| Account detection | Manual ID entry | Auto-detected |
| Token management | Manual refresh | Auto long-lived (60 days) |
| Setup time | ~5 minutes | ~30 seconds |
| Error-prone | Yes (wrong ID/token) | No (all automatic) |

## Security Notes

- ✅ Tokens are encrypted before storage
- ✅ CSRF protection with state parameter
- ✅ Tokens auto-refresh before expiry
- ✅ Secure callback validation
- ✅ No credentials in URLs (only in POST body)

## Support

If you encounter issues:

1. Check backend logs: `npm run start:dev` (watch console)
2. Check browser console for frontend errors
3. Verify Instagram account is Business/Creator
4. Verify Instagram is connected to Facebook Page
5. Ensure `.env` variables are set correctly

## Next Steps

After setup:

1. ✅ Publish your first Instagram post
2. ✅ Create automated posting workflows
3. ✅ Schedule posts with timers
4. ✅ Cross-post to multiple platforms
5. ✅ Build engagement automations

---

**Congratulations!** You now have full OAuth support for Instagram, just like other professional connectors! 🎉
