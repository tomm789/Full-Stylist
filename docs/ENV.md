# Environment Variables

This document defines all environment variables used by the app.
Cursor must NOT invent additional variables without updating this file.

---

## 1. Client (Expo: iOS / Android / Web)

These variables are safe to expose to the client.
They must be prefixed with `EXPO_PUBLIC_`.

### Required
- EXPO_PUBLIC_SUPABASE_URL
  - Value: https://earlhvpckbcpvppvmxsd.supabase.co
  - Used by: Supabase client initialization in the Expo app

- EXPO_PUBLIC_SUPABASE_ANON_KEY
  - Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhcmxodnBja2JjcHZwcHZteHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MTkzMTQsImV4cCI6MjA4NDI5NTMxNH0.RqC4r6055mC143bC0nH_POU2lpitvlQMepg4ZkhiFSQ
  - Used by: Supabase client in Expo app
  - Scope: public, subject to RLS

### Optional
- EXPO_PUBLIC_NETLIFY_URL
  - Value: Your Netlify site URL (e.g., https://your-site.netlify.app)
  - Used by: `lib/ai-jobs.ts` to call Netlify functions in production
  - Required for: Triggering AI job execution in production
  - Note: If not set, the app will attempt to use `window.location.origin` as fallback (web only)

- EXPO_PUBLIC_NETLIFY_DEV_URL
  - Value: Local Netlify dev server URL (e.g., http://localhost:8888 or http://192.168.1.100:8888 for physical devices)
  - Used by: `lib/ai-jobs.ts` to call Netlify functions in development
  - Default: http://localhost:8888
  - Note: Set to your network IP (e.g., http://192.168.1.100:8888) when testing on physical devices

### Optional (future)
- EXPO_PUBLIC_APP_ENV
  - Values: development | staging | production
  - Used for logging/feature flags

---

## 2. Netlify Functions (Server-side ONLY)

These variables must NEVER be exposed to the client.
They are used only in Netlify Functions.

### Required
- SUPABASE_URL
  - Value: https://earlhvpckbcpvppvmxsd.supabase.co
  - Used by: Supabase admin client in Netlify functions

- SUPABASE_SERVICE_ROLE_KEY
  - Value: Supabase service role key
  - Used by: Netlify functions for:
    - Writing AI-generated images
    - Bypassing RLS for server-side writes
    - Running privileged DB operations

- GEMINI_API_KEY
  - Value: Gemini API key
  - Used by: netlify/functions/ai-job-runner.ts only

### Optional
- GEMINI_3_PASSWORD
  - Value: Shared password string required to unlock Gemini Pro usage
  - Used by: netlify/functions/ai-job-runner.js to validate `ai_model_password`

- GEMINI_3_DISABLED
  - Values: true | false
  - Used by: netlify/functions/ai-job-runner.js to disable all Gemini Pro usage
  - Default: false

- GEMINI_3_BODY_SHOTS_DISABLED
  - Values: true | false
  - Used by: netlify/functions/ai-job-runner.js to force body-shot generation to use `gemini-2.5-flash-image`
  - Default: false

### Optional (future)
- STRIPE_SECRET_KEY
  - Used by: payments / checkout (not MVP)

---

## 3. Local Development Notes

### Expo
- Environment variables are loaded via:
  - app.config.ts or app.json
  - or `.env` with babel plugin
- EXPO_PUBLIC_* variables must be available at build time.

### Netlify
- Environment variables are configured in Netlify dashboard.
- Netlify automatically injects them into function runtime.

---

## 4. Rules for Cursor (Important)

- Do NOT use SUPABASE_SERVICE_ROLE_KEY in the Expo app.
- Do NOT reference GEMINI_API_KEY in client code.
- All Gemini calls must originate from Netlify functions.
- Any database write that requires bypassing RLS must occur in Netlify functions.
- Client code must assume RLS is enforced at all times.

If Cursor needs additional environment variables, it must:
1) Add them to this file
2) Explain why they are needed
3) Specify client vs server usage
