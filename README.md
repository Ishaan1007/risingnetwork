# Rising Network — Minimal Next.js + Supabase Auth Test

This small scaffold helps validate Google OAuth with Supabase and confirms `auth.users` → `public.profiles` mapping.

Quick start:

1. Copy `.env.local.example` to `.env.local` and fill values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

2. Install deps and run dev server:

```bash
npm install
npm run dev
```

3. Visit http://localhost:3000 and click "Sign in with Google".

4. After signing in, check Supabase Dashboard → Authentication → Users and Table Editor → public.profiles for the created profile row.

If you want me to start the dev server here and test the flow, tell me and I'll attempt to run it in the workspace terminal.
