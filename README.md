# YAPPER

**Live site:** https://saeedkarimzai.github.io/yapper-test-1/


A Discord-inspired browser chat app built with HTML, CSS, JavaScript, and Supabase. No Node.js or build step is required.

## Features in this repository

- Email/password sign-up and login
- Profiles, usernames, avatar uploads, and online presence
- Servers, text channels, and real-time messages
- Friend requests and accepted-friend lists
- Private direct messages between accepted friends
- Message search, emoji, reactions, and searchable GIPHY GIFs in server chat and private DMs

## One-time Supabase setup

1. Open the Supabase project configured in `app.js`.
2. If the project is paused, restore it in the Supabase dashboard first. Database setup and live chat cannot work while it is inactive.
3. Open **SQL Editor**.
4. Run the complete `COMPLETE-SETUP.sql` file from top to bottom. It creates the tables, indexes, profile trigger, storage bucket, Realtime publication entries, and row-level security policies required by the current client. Its security-definer helper functions live in the non-exposed `private` schema. Keep `private` out of Supabase's exposed Data API schemas. The older partial SQL files are deprecated; do not run them.
5. In **Authentication → URL Configuration**, add your GitHub Pages URL to the allowed redirect URLs.
6. Enable email/password authentication. Email confirmation can remain enabled.
7. In **Storage**, confirm the `yapper-avatars` bucket exists. The setup script creates it.
8. In **Database → Replication**, confirm the app's Realtime tables are enabled if your project does not apply publication changes automatically.

The browser uses a Supabase publishable key. That key is designed to be public; never put a `service_role` key or any secret in `app.js`. The database is protected by RLS, not by hiding the publishable key.

## Deploy with GitHub Pages

In GitHub, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save. The site is static and does not need Node.js.

## Invite friends to a server

Create a server, then click **Invite** beside its name. YAPPER creates a random invite code and copies a link. Friends can open the link after signing in, or paste the code into **Join**. Only server owners can create invites; ordinary users cannot join by guessing a server ID.

## Troubleshooting

- **Site loads but login/chat fails:** check that the Supabase project is active and that the URL/key in `app.js` match it.
- **Database table or policy errors:** rerun `COMPLETE-SETUP.sql` in SQL Editor.
- **Realtime is not updating:** enable the listed tables in the Supabase Realtime publication.
- **Avatar upload fails:** confirm the `yapper-avatars` bucket and storage policies exist.

GitHub Pages is public. Never commit passwords, service-role keys, private TURN credentials, or other secrets.


## Domain note

The old `yapper.chat` custom-domain mapping was removed because that domain resolves to an unrelated Yapper business. Use the GitHub Pages URL above unless you configure a domain you own with the required DNS records.


**Important:** GitHub commits do not apply SQL to your live Supabase project. Back up an existing database, then review and run `COMPLETE-SETUP.sql` in Supabase SQL Editor. Keep the `private` schema out of the exposed Data API schemas.


Group-chat and voice-call features were removed from the current YAPPER interface. Existing legacy group/voice tables are not dropped by the setup script, but direct client access is revoked; private one-to-one messages remain available between accepted friends.


## GIF search

The GIF picker uses a Supabase Edge Function named `giphy-proxy`. The GIPHY API key stays on the server and is never stored in browser local storage or committed to this repository.

One-time setup:
1. Create a GIPHY Web API key at https://developers.giphy.com/dashboard/.
2. In the Supabase project, open **Edge Functions → Secrets**.
3. Add a secret named `GIPHY_API_KEY` and set its value to the GIPHY key.
4. Refresh YAPPER. The GIF buttons in server chat and private DMs use the same server-side key.

The Edge Function requires a signed-in Supabase session and requests PG-13-rated GIFs. If the secret is missing, GIF search returns a setup error. Selected GIF URLs are stored in the existing message content, so no database migration is required.

## YAPPER Test Bot

The **🤖 Test bot** button adds a dedicated authenticated bot account (`yapper_test_bot`) to the selected server. It is created automatically on first use by the `yapper-test-bot` Edge Function; the browser never receives the service-role key.

Commands in a channel:
- Mention `@yapper_test_bot` for a reply.
- `!testbot help` shows available commands.
- `!testbot ping` checks request/reply delivery.
- `!testbot test` sends three real database messages with short pauses to exercise Realtime delivery.

The function requires a signed-in user who is already a member of the selected server. It uses the Supabase Edge Function's server-side `SUPABASE_SERVICE_ROLE_KEY` environment variable to create and manage the dedicated bot identity. No SQL migration or manually created bot password is required.
