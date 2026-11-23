# YAPPER

A Discord-inspired browser chat app built with HTML, CSS, JavaScript, and Supabase. No Node.js or build step is required.

## Features in this repository

- Email/password sign-up and login
- Profiles, usernames, avatar uploads, and online presence
- Servers, text channels, and real-time messages
- Friend requests and accepted-friend lists
- Group chats with invited friends
- Private direct messages between accepted friends
- One-to-one WebRTC voice calls
- Message search, emoji, and reactions

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

Create a server, then share its server ID with someone you trust. Joining by server ID is a bearer-invite design: anyone who has the ID can join, so do not post it publicly. A dedicated expiring invite-code flow can replace this later.

## Voice call notes

Voice calls require HTTPS, microphone permission, and both users to be online. The current one-to-one WebRTC implementation uses public STUN servers. Some school, corporate, or mobile networks block peer-to-peer connections and require a TURN relay; voice may not connect on every network.

## Troubleshooting

- **Site loads but login/chat fails:** check that the Supabase project is active and that the URL/key in `app.js` match it.
- **Database table or policy errors:** rerun `COMPLETE-SETUP.sql` in SQL Editor.
- **Realtime is not updating:** enable the listed tables in the Supabase Realtime publication.
- **Avatar upload fails:** confirm the `yapper-avatars` bucket and storage policies exist.
- **Voice does not connect:** verify microphone permission and test on a network that permits WebRTC. A TURN server may be required.

GitHub Pages is public. Never commit passwords, service-role keys, private TURN credentials, or other secrets.
