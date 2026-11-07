# English X-Ray · Sandbox Learning Center

Telegram Mini App for an English diagnostic, a personalized eight-week study plan, and course applications. Includes a Telegram registration bot, Supabase migrations, and a role-gated admin dashboard. Interface text is in Uzbek Latin.

## Run locally

Requires Node.js 24 and npm.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run e2e
```

Open the home URL in a browser and select the demo. Demo state stays in browser storage. The demo has its own question bank, uses sample progress data, and does not send real enrollments or bot messages. Set `XRAY_SCREENSHOTS` to an output folder to capture all 14 mobile screens in Playwright. `CHROMIUM_EXECUTABLE` can select a local headless Chromium binary.

## Supabase

1. Connect to the intended Supabase project. For an existing database, inspect its schema and take a backup before migrations.
2. Apply the migration in `supabase/migrations/` through the Supabase CLI or migration tooling. The migration creates the app tables, constrained server RPCs, two private Storage buckets, 32 diagnostic items and six study materials. It has been applied to the connected **English X-RAY** project. Confirm migration history before applying it again to that same database.
3. Set the project URL and server-only secret key using `.env.example`. The app uses the Supabase Data API on the server and does not require a PostgreSQL connection string or browser Supabase key.
4. Confirm `/api/health` reports `database: connected`. In a separate environment, apply the migration to a dedicated test Supabase project and keep test credentials separate.
5. For the first admin, complete Telegram registration then use the Supabase SQL Editor to grant a role. Confirm the verified Telegram ID first. Use `super_admin` for administrators who can fulfill deletion requests, `admin` for operations, and `mentor` for assigned students only.

```sql
insert into public.admin_users(user_id,role)
select id,'super_admin' from public.users where telegram_id = 123456789
on conflict(user_id) do update set role=excluded.role;
```

Application tables use RLS and deny direct access to the browser roles. The server checks a verified app session, row ownership, and administrator roles before using the server-only key. Private recordings and uploaded material assets use short-lived signed URLs. Administrators can attach private PDF, audio or video files by uploading them to `xray-materials` in Supabase and supplying the bucket-relative path in the admin panel.

## Vercel and Telegram

1. Create or select the Vercel project. Import a repository you control to enable automatic Preview builds and Production builds from the chosen branch. For a direct upload, run `vercel` from the project directory and link the correct team and project.
2. Set server-only environment variables in Vercel using `.env.example` and the production HTTPS URL. Generate separate random values for `SESSION_SECRET`, `TELEGRAM_WEBHOOK_SECRET`, and `CRON_SECRET`, each at least 32 characters. Set `ADMIN_TELEGRAM_IDS` to the comma-separated Telegram IDs of admins authorized to receive notifications. These admins must have previously opened a private chat with the bot.
3. Use BotFather to revoke the exposed token for the existing bot, then set the replacement as `TELEGRAM_BOT_TOKEN` only in the Vercel Production environment and your local secret store for initial setup. Set the bot username without @ as `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`. Do not give production bot credentials to preview deployments.
4. Deploy, check the build, open the app URL, and verify `/api/health`. The web preview is available without production credentials. The bot webhook responds only when it has the token and secret and its environment is not Vercel Preview.
5. Inspect the existing bot settings, then apply the verified production configuration. Export the production variables from a secure local environment and set `TELEGRAM_EXPECTED_BOT_USERNAME` to the existing bot username.

```sh
node scripts/telegram.mjs
node scripts/telegram.mjs --apply
```

If inspection reveals an older webhook, verify that you intend to replace it, then add `--replace-existing-webhook`. The script preserves pending Telegram updates and commands unrelated to the app, sets the private chat menu button, and confirms the endpoint. If using the named Main Mini App entry on the bot profile, also configure its production URL in BotFather.

6. Send `/start` from a real Telegram account, share that account’s contact, finish the consent flow, and open the Mini App from the bot. Verify Supabase rows, submit a diagnostic, check the plan, then review an enrollment from an authorized admin account. Verify a wrong webhook secret is rejected. The launch button and enrollment notification can only be confirmed against the real bot.

For rollback, restore the previous Vercel deployment first and verify that it can work with the current schema. Keep the migration forward-compatible and restore a database backup only when necessary for an approved recovery. Inspect the webhook before moving it to a different deployment.

## Diagnostics, learning and mentor

- Objective scores use exact answer keys after normalization. Multi-select requires the complete set. Objective item weights equal difficulty plus two. Measured communication skills have twice the overall weight of grammar or vocabulary. The estimated level is capped by answered difficulty and, for the quick scan, at B1. Thresholds are 40%, 60%, 78% and 92% for A2 through C1. The bank covers A1–C1; it does not have enough calibrated evidence to estimate C2 or map to an official IELTS band.
- The quick scan selects items near the latest estimated level or starting self-report. Full and certificate-oriented tests sample across item difficulties. Certificate mode records CEFR or IELTS track and uses longer open responses. The starter prompts are original practice material, with synthesized listening audio. The certificate track does not yet have separate IELTS and CEFR test banks.
- Writing and speaking scores stay pending until an authorized reviewer scores four dimensions on a 0–5 scale. Feedback and scoring evidence remain attached to the attempt. The plan is regenerated on new results and its unfinished tasks adjust after review. Completed tasks are preserved. Each award has an idempotency key. A study day uses the student's selected timezone.
- Set `AI_PROVIDER_API_KEY` and `AI_PROVIDER_MODEL` to enable AI Mentor. The default endpoint uses Vercel AI Gateway’s OpenAI-compatible API. Set `AI_PROVIDER_BASE_URL` for a compatible HTTPS provider. The assistant receives the learner’s skill summary and recent chat messages. It has no tools or ability to write to student records. Requests are queued in Supabase, rate-limited, and retried by the jobs route or user action.
- The jobs route retries pending notifications and AI jobs and sends opted-in study reminders at 08:00 Tashkent time. Vercel Cron uses `CRON_SECRET`. Account deletion requests close active sessions. A super admin can fulfill a request from the student list, including deletion of private voice recordings.
- `docs/design.md` lists the reference landmarks for every screen. The fox and its accessories are original SVGs. The wordmark is typeset from the reference. A vector brand asset can replace it when available.

## Verification boundaries

The test suite verifies Telegram signatures and the registration state machine, scoring, plan generation, local-day streaks, Postgres permissions, idempotent webhook processing, attempt ownership, and enrollment status authorization. Playwright exercises demo navigation, question submission, results, materials and application entry. Real Telegram, mobile microphone behavior, AI provider calls, admin alerts and the authenticated Vercel-to-Supabase flow require production configuration and end-to-end verification with the existing bot.
