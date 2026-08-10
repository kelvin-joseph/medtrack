# Connecting MedTrack to Supabase

This covers getting the database live. It does **not** yet cover migrating
the app's service layer (`src/services/*.js`) off `localStorage` and onto
these tables — that's the next phase (see bottom of this file).

## 1. Create the project

1. [supabase.com](https://supabase.com) → New Project
2. Choose a name, a strong database password (save it in a password
   manager — you won't be shown it again), and a region close to the
   hospital.
3. Wait for provisioning (~2 minutes).

## 2. Run the schema

1. In the Supabase dashboard: **SQL Editor → New query**
2. Paste the entire contents of `supabase/schema.sql` from this repo
3. Run it. You should see tables under **Table Editor**: `profiles`,
   `equipment`, `maintenance_records`, `repair_records`,
   `equipment_documents`, `work_orders`, `fault_tickets`, `settings`,
   `audit_log`, `notification_reads`.

If it errors partway through, check whether you're re-running it on a
project that already has some of these objects — the script isn't
idempotent (re-running it from scratch on a _fresh_ project is safe; running
it twice on the same project is not).

## 3. Get your API credentials

**Project Settings → API**. You need two values:

- **Project URL**
- **anon / public key** (safe to expose client-side — this is what Row
  Level Security is for; never use the `service_role` key in frontend code)

## 4. Configure the app

```
cp .env.example .env
```

Edit `.env` and fill in the two values from step 3. `.env` is already
gitignored — never commit it.

## 5. Install the new dependency

```
npm install
```

(`@supabase/supabase-js` is already in `package.json`.)

## 6. Create your first real user

The schema's `handle_new_user()` trigger auto-creates a `profiles` row
whenever someone signs up via Supabase Auth, defaulting to the
`Department Staff` role. For your own admin account:

1. **Authentication → Users → Add user** in the Supabase dashboard — set
   your email and a temporary password.
2. **Table Editor → profiles** — find the row that was just created, and
   change `role` to `System Administrator` (or whichever role fits).

From there, that account can manage other users from the Users & Roles
screen instead of editing the table directly (see step 7).

## 7. Users & Roles screen — deploy the admin-create-user function

The Users & Roles screen is wired to Supabase (`src/services/userService.js`),
but adding a user needs one more piece: creating a real login requires the
`service_role` key, which must never run in the browser. That's handled by
a small Edge Function that lives server-side.

1. Run the extra migration: **SQL Editor → New query**, paste
   `supabase/migrations/002_users_migration.sql`, run it. (Adds
   `department` to the new-user trigger and a `toggle_user_active` RPC for
   the Disable/Activate button.)
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you
   don't have it, then from the project root:
   ```
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy admin-create-user
   ```
3. The function needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` as secrets. Supabase sets the first and
   third automatically for deployed functions; if you need to set them
   manually: **Edge Functions → admin-create-user → Secrets**, or
   `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...` (from Project
   Settings → API — this is the key that must never appear in frontend code).
4. **Authentication → URL Configuration** — set the Site URL (and any
   redirect URLs) to wherever the app is hosted. Invite emails link back
   here; the app's `SetPasswordScreen` picks up the one-time token
   automatically and prompts the new user to set a password.

Once deployed, a System Administrator can use "Add user" on the Users &
Roles screen: it sends the person an email invite (they set their own
password) rather than generating a temporary one.

## Migration status

All of `src/services/*.js` are Supabase-backed now: `equipmentService`,
`maintenanceService`, `faultService`, `workOrderService`, `settingsService`,
`userService`, and `auditService` (append-only, written to the `audit_log`
table, no client-side update/delete per its RLS policy). `AppDataContext.jsx`
awaits each of them.

## AI Center: deploying the hosted assistant

The AI Center's chat (`AICommandChat.jsx`) calls the `ai-assistant` Edge
Function, which forwards in-scope questions to a Gemini free-tier model.
If this function isn't deployed or its secrets aren't set, `aiAssistantService.ask()`
falls back to the local rule-based engine automatically — so this step is
optional to get the app running, but required for real LLM-backed answers
instead of the canned rule engine.

1. Get a Gemini API key (no credit card required) from
   [aistudio.google.com](https://aistudio.google.com) → **Get API key**.
2. Set it as a function secret:
   ```
   supabase secrets set GEMINI_API_KEY=your-key-here
   ```
3. (Optional) Google renames/retires free-tier model ids every few months.
   The function defaults to `gemini-2.5-flash`; to override without a code
   change:
   ```
   supabase secrets set GEMINI_MODEL=gemini-2.5-flash
   ```
   Check [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
   for the current free-tier model id if you start seeing 404s from Gemini
   in the function logs.
4. Deploy the function:
   ```
   supabase functions deploy ai-assistant
   ```
5. Ask the assistant something in the app. If it fails, check
   **Edge Functions → ai-assistant → Logs** in the Supabase dashboard —
   the function logs the Gemini API's error body on any non-2xx response,
   including free-tier rate-limit (429) hits.

## Note on the localStorage "demo data" toggle

`AppDataContext.jsx`'s "Load demo data" / "Start empty hospital" / "Clear
all local data" actions (Settings screen) are for the local
equipment/work-orders/tickets/settings sandbox only. They deliberately no
longer touch `users` — those are real Supabase Auth accounts, shared
across the hospital, and must never be wiped by a client-side "reset demo
data" button. Keep that separation as you migrate the remaining services:
anything backed by Supabase should come out of the demo-seed/clear
functions, the same way `userService` did here.
