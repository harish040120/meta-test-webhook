# Meta Test Webhook Endpoint

A test webhook endpoint for Meta WhatsApp API testing, deployable on Render.com.

## What This Does

This app accepts webhook verification (GET) and webhook events (POST) from Meta's WhatsApp API. It logs the received payloads to Render's console for debugging.

## Quick Deploy

1. Push this repo to GitHub
2. Connect to Render.com
3. Set `VERIFY_TOKEN` environment variable
4. Deploy

See [DEPLOY.md](DEPLOY.md) for detailed instructions.
