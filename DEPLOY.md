# Deploy to Render.com — Step-by-Step Guide

## Prerequisites

1. **Render account** — Sign up at [render.com](https://render.com) (free tier works)
2. **GitHub account** — Already have the repo at `https://github.com/harish040120/meta-test-webhook`
3. **Meta Developer account** — For configuring the webhook in Meta App Dashboard

---

## Step 1: Create a Render Account

1. Go to [render.com](https://render.com)
2. Click **Get Started for Free**
3. Sign up using your **GitHub account** (easiest option)
4. Authorize Render to access your GitHub repos

---

## Step 2: Create a New Web Service

1. From the Render Dashboard, click **New +** → **Web Service**
2. Connect your GitHub account if not already connected
3. Search for and select the repo: **`meta-test-webhook`**
4. Click **Connect**

---

## Step 3: Configure the Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `meta-test-webhook` (or any name you prefer) |
| **Region** | `Oregon` (or closest to you) |
| **Branch** | `master` |
| **Runtime** | `Node` |
| **Build Command** | `npm install express` |
| **Start Command** | `node app.js` |
| **Instance Type** | `Free` (or `Starter` if free tier is unavailable) |

---

## Step 4: Add Environment Variable

1. Scroll down to **Environment Variables** section
2. Click **Add Environment Variable**
3. Set:
   - **Key**: `VERIFY_TOKEN`
   - **Value**: Choose any string, e.g., `vibecode` or `my_secret_token_123`
4. Click **Save Changes**

> **Important**: Remember this `VERIFY_TOKEN` value — you'll need it when configuring the webhook in Meta App Dashboard.

---

## Step 5: Deploy

1. Click **Create Web Service** at the bottom
2. Render will start building your app — this takes 1-3 minutes
3. Watch the deploy log. You'll see:
   - `npm install express` running
   - `node app.js` starting
   - **"Your service is live"** when done

---

## Step 6: Get Your Webhook URL

1. At the top of the Render service page, you'll see your app URL:
   ```
   https://meta-test-webhook.onrender.com
   ```
2. Copy this URL — you'll need it for Meta App Dashboard
3. If you visit the URL in a browser, you'll get a **403 error** — this is expected (no verification parameters in the URL)

---

## Step 7: Configure in Meta App Dashboard

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Navigate to your app → **WhatsApp** → **Webhooks** → **Configuration**
3. In the **Callback URL** field, paste your Render URL:
   ```
   https://meta-test-webhook.onrender.com
   ```
4. In the **Verify Token** field, enter the same `VERIFY_TOKEN` value you set in Render
5. Click **Verify and save**

### If Verification Succeeds:
- The Meta dashboard refreshes and shows webhook fields to subscribe to
- In Render's logs, you'll see: **"WEBHOOK VERIFIED"**
- Subscribe to the **messages** webhook field

---

## Step 8: Send a Test Message

1. In Meta App Dashboard → **WhatsApp** → **Webhooks** → **Configuration**
2. Scroll to the **messages** webhook field
3. Click **Test** to send a test webhook
4. Check Render's logs — you should see:
   ```
   Webhook received 2026-05-21 12:34:56
   { ... test JSON payload ... }
   ```

---

## Troubleshooting

### "WEBHOOK VERIFIED" doesn't appear in Render logs
- Double-check the `VERIFY_TOKEN` in Render matches what you entered in Meta Dashboard
- Make sure there are no trailing spaces in the token

### Test webhook doesn't appear in Render logs
- Confirm you added the correct Callback URL in Meta Dashboard
- Make sure the app is subscribed to the **messages** webhook field
- Messages test webhooks work in both Development and Live modes

### Render deploy fails
- Check that the build command is exactly: `npm install express`
- Check that the start command is exactly: `node app.js`
- Ensure the `VERIFY_TOKEN` environment variable is set

### App shows "Application Error" on Render
- Check the Render logs for errors
- Ensure the `PORT` environment variable is set (Render sets this automatically)

---

## Your Deployed URLs

- **GitHub Repo**: https://github.com/harish040120/meta-test-webhook
- **Render URL** (after deploy): `https://meta-test-webhook.onrender.com`

---

## Environment Variables Summary

| Variable | Value | Where |
|----------|-------|-------|
| `VERIFY_TOKEN` | `vibecode` (or your choice) | Render Dashboard → Environment |
| `PORT` | Auto-set by Render | Set automatically |

---

## Next Steps

Once the test webhook is working:

1. **Build your own webhook handler** — Replace this test app with your actual business logic
2. **Add more webhook fields** — Subscribe to `message_status`, `template_status`, etc.
3. **Set up a proper database** — Store incoming messages instead of just logging them
4. **Go Live** — Submit your Meta app for review when ready
