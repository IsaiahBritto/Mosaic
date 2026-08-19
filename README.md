# Mosaic

Mobile-first shared calendar app built with Next.js, Supabase, and Vercel.

## Local development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in `.env.local` with your Supabase project URL and anon key from **Settings → API**.

4. Apply the database migration (Supabase SQL editor or CLI):

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

5. Generate TypeScript types from your schema:

   ```bash
   npm run db:types
   ```

6. Start the dev server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to sign in.

### Supabase Auth

Enable **Email** provider under Authentication → Providers. Add redirect URL:

```
http://localhost:3000/auth/callback
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run db:types` | Regenerate Supabase TypeScript types |

## Project structure

- `src/app/(auth)/` — Login and signup
- `src/app/(app)/` — Protected calendar views (day, month, year)
- `src/lib/` — Domain logic, repositories, services, Supabase clients
- `supabase/migrations/` — Database schema

## Phase 1 status

Foundation includes auth, design tokens, mobile app shell, and database schema. Calendar CRUD and event views come in later phases.
