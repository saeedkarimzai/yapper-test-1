# YAPPER — GitHub Pages + Supabase

A responsive Discord-inspired chat starter built with plain HTML, CSS and JavaScript. No terminal or Node.js required.

## Supabase setup
1. Replace the two placeholder values at the top of app.js with your Supabase Project URL and publishable key (legacy anon key also works).
2. Never place a service_role or secret key in browser code.
3. In Supabase SQL Editor, run supabase-join-policy-patch.sql once after the YAPPER schema/helper policy SQL.
4. Ensure Row Level Security is enabled on all four tables and messages is included in supabase_realtime.

## GitHub Pages
Open Settings → Pages → Deploy from a branch, choose main and /(root), then Save. The site will be published at https://YOUR-USERNAME.github.io/yapper-test-1/.

## Test with a friend
Sign up, confirm email if requested, sign in, create a server, copy its ID, and share it with a friend. They can create an account, join using that ID, and chat in #general.

GitHub Pages sites are public. The browser publishable key is visible by design; Supabase Row Level Security must protect the database. This starter does not include voice chat, image uploads, moderation tools, or end-to-end encryption.