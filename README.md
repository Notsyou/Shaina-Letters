# Shai's Letters 🫶🤍

A private love-letter site. You write letters and schedule their release. Until the release time, Shai sees only a sealed envelope with a countdown.

- **Shai:** `/login` with the reader password → mailbox, envelope-opening, reactions, write back, email updates (`/settings`).
- **You:** `/admin/login` with the admin password → write (rich text + photos), schedule, preview, see opens and replies.

## Run locally
```bash
npm install
cp .env.example .env.local   # then fill in passwords + SESSION_SECRET
npm run dev                  # http://localhost:3000
```
With no `DATABASE_URL`, an embedded Postgres is stored in `.data/`. With no Gmail app password, emails are printed to the terminal instead of being sent.

## Deploy on Render (free)
1. **Database:** create a free project at https://neon.tech and copy the connection string (`postgresql://…?sslmode=require`).
2. **Photos:** create a free account at https://cloudinary.com and copy the `CLOUDINARY_URL` from the dashboard.
3. **Gmail app password:** Google Account → Security → turn on 2-Step Verification → "App passwords" → create one called "Shai's Letters". Copy the 16-letter code.
4. **Push this folder to GitHub**, then in Render: **New → Blueprint** → pick the repo. It reads `render.yaml`.
5. Fill in the values Render asks for: `READER_PASSWORD`, `ADMIN_PASSWORD`, `DATABASE_URL`, `GMAIL_APP_PASSWORD`, `CLOUDINARY_URL`, and `SITE_URL` (your `https://….onrender.com` address).
6. **Release emails and keeping the site awake:** at https://cron-job.org, add a job that opens
   `https://YOUR-SITE.onrender.com/api/cron/tick?key=CRON_SECRET` every 10 minutes
   (copy the `CRON_SECRET` value from Render → Environment).

The first time the site starts, it creates the welcome letter. Edit it in `/admin` before you send her the link.

## Notes
- A sealed letter's title, text and photos never leave the server before its release time.
- Release times are entered in your browser's time zone. The countdown is correct anywhere.
- "Release right now" in the editor unlocks a scheduled letter immediately.
