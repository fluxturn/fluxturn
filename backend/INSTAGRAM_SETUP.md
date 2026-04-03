# Instagram Connector Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get Your Access Token

1. Go to [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your Facebook App (or create one)
3. Click "Permissions" and add these:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. Click "Generate Access Token"
5. Copy the token (starts with `EAAG...`)

### Step 2: Find Your Instagram Account ID

**Option A: Use the Test Script**
```bash
cd /Users/user/Desktop/fluxturn/backend
node test-instagram.js
```

**Option B: Manual Method**
```bash
# 1. Get your Facebook Pages
curl "https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account&access_token=YOUR_ACCESS_TOKEN"

# 2. Look for the page with instagram_business_account
# The ID will be in: instagram_business_account.id
```

**Option C: Graph API Explorer**
1. Go to https://developers.facebook.com/tools/explorer/
2. Run: `me/accounts?fields=instagram_business_account`
3. Copy the `instagram_business_account.id` value

### Step 3: Configure in Fluxturn

1. **Restart your backend server** (to load the updated connector):
   ```bash
   # Stop current server (Ctrl+C)
   npm run start:dev
   ```

2. **Open Fluxturn UI** → Connectors → Add Instagram

3. **Enter credentials** (NO OAuth button now):
   - **Access Token**: Paste your token from Step 1
   - **Instagram Account ID**: `925277150064489` (or your ID from Step 2)

4. **Save** the connector

### Step 4: Test the Connection

**Option A: Use the Test Script**
```bash
node test-instagram.js
```

**Option B: Create a Test Workflow**
1. Create a new workflow
2. Add Instagram connector
3. Select "Publish Image" action
4. Use a test image URL:
   ```
   https://picsum.photos/1080/1080
   ```
5. Add a caption: "Test post from Fluxturn 🚀"
6. Run the workflow

## Troubleshooting

### Error: "Token is invalid"
- Token expired (they last 60 days)
- Go back to Graph API Explorer and generate a new one

### Error: "Instagram account not found"
- Your Instagram account must be a **Business Account**
- It must be connected to a Facebook Page
- Guide: https://www.facebook.com/business/help/898752960195806

### Error: "Missing permissions"
- Go to Graph API Explorer
- Add the required permissions listed in Step 1
- Generate a new token

### Error: "Media URL not accessible"
- Instagram requires publicly accessible URLs
- URLs must use HTTPS
- Test your URL in a browser first

## How to Get a Long-Lived Token (60 days)

Short-lived tokens expire in ~1 hour. Convert to long-lived (60 days):

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

Replace:
- `YOUR_APP_ID`: Your Facebook App ID
- `YOUR_APP_SECRET`: Your Facebook App Secret
- `YOUR_SHORT_LIVED_TOKEN`: Token from Graph API Explorer

## Test Publishing

### Test Image Post
```json
{
  "image_url": "https://picsum.photos/1080/1080",
  "caption": "Test post from Fluxturn! #automation #instagram"
}
```

### Test Reel
```json
{
  "video_url": "https://example.com/video.mp4",
  "caption": "My first reel! 🎥",
  "share_to_feed": true
}
```

**Note**: Video must be:
- MP4 format, H.264 codec
- 4-90 seconds duration
- Max 1GB size
- Publicly accessible HTTPS URL

### Test Story
```json
{
  "content_type": "photo",
  "image_url": "https://picsum.photos/1080/1920"
}
```

**Note**: Stories expire after 24 hours

## API Limits

- **Rate Limit**: 200 requests per hour
- **Image Size**: Max 8MB (JPEG or PNG)
- **Video Size**: Max 1GB
- **Caption**: Max 2,200 characters
- **Carousel**: 2-10 images

## Your Current Credentials

Based on your screenshot:
- ✅ Access Token: `EAAGztKHoDSMBQHfA1Jr...` (valid)
- ✅ Instagram Account ID: `925277150064489`

You're ready to go! Just restart the backend and the connector should work without OAuth.

## Support

- Facebook Developer Docs: https://developers.facebook.com/docs/instagram-api
- Instagram Graph API: https://developers.facebook.com/docs/instagram-api/reference
- Fluxturn Issues: [Create an issue if you encounter problems]
