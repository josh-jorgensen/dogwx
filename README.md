# Dogwalk Index

Dogwalk Index is a lightweight Next.js app that compares dog-walking conditions over the next hour in 30-minute increments. It fetches live weather data from [Open-Meteo](https://open-meteo.com/) and calculates a suitability score that considers precipitation, temperature, wind, and humidity proxies. You can also trigger an email summary (powered by [Resend](https://resend.com/)) and schedule it via Vercel Cron for a daily reminder.

## Features

- Default location: Central Park, NYC; search any city/neighborhood that Open-Meteo can geocode.
- Timeline cards for now / +30m / +60m with a scored suitability badge and supporting weather metrics.
- One-click email endpoint that sends the current snapshot.
- Optional bearer token guard for the email endpoint, so you can safely let Vercel Cron trigger it.

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Environment variables

For forecast fetching, no keys are needed. Email delivery requires a Resend API key:

```
RESEND_API_KEY=your_resend_key
# The from address must live on a Resend-verified domain.
RESEND_FROM="Dogwalk Index <updates@example.com>"
# Optional. When set, /api/email requires this bearer token in prod + cron jobs.
DOGWALK_EMAIL_TOKEN=super-secret-token
```

Create a `.env.local` file with these values when running locally. The email endpoint remains disabled until `RESEND_API_KEY` is present.

## Email automation

1. **Manual test** – with `npm run dev`, type your email in the UI and click “Send me email”.
2. **Deploy on Vercel** – add the same env vars in Vercel → Project Settings → Environment Variables.
3. **Secure the endpoint (recommended)** – set `DOGWALK_EMAIL_TOKEN` and send requests with `Authorization: Bearer <token>` or include `"token": "<token>"` in the JSON payload.
4. **Schedule daily reminders** – add a Vercel Cron job that POSTs to `/api/email` with the payload below:

```json
{
  "email": "you@example.com",
  "location": "Central Park, NYC",
  "token": "super-secret-token"
}
```

The endpoint accepts optional `latitude`/`longitude` numbers when you want to bypass geocoding.

### Hands-free cron emails

If you prefer Vercel Cron to hit a GET endpoint automatically, configure the bundled `/api/cron-email` route:

1. Add these environment variables in Vercel (or `.env.local` for local tests):
   - `DOGWALK_CRON_EMAIL` – required recipient address.
   - `DOGWALK_CRON_LOCATION` – optional location query string.
   - `DOGWALK_CRON_LATITUDE` / `DOGWALK_CRON_LONGITUDE` – optional numeric overrides when you want to bypass geocoding entirely.
2. Adjust `vercel.json` if you want a different schedule or path, then commit the changes.
3. After deploying, Vercel Cron will hit `/api/cron-email` on the configured cadence and the function will send the latest forecast snapshot via Resend.

## Deployment notes

- Vercel’s free tier comfortably runs this project (Next.js App Router, no databases).
- Add a Cron job such as `0 11 * * *` (7 AM EDT) to trigger the email every morning.
- The app only uses serverless fetches, so there’s no background worker requirement.

## Future enhancements

- Persist favorite locations and send multi-city digests.
- Allow user-specific comfort preferences (temperature range, rain tolerance).
- Cache Open-Meteo responses for a few minutes to reduce API calls if traffic grows.
