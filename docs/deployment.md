# Deployment — albumflow

## Hosting

- **Platform:** Vercel
- **Domain:** (configure via Vercel)

## Environment Variables

| Variable | Source | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard | Yes |
| `VITE_APP_URL` | Your app URL | Yes |

## Build Command

```bash
npm run build
```

Output directory: `dist/`

## Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Database Migrations

Run via Supabase dashboard or CLI:

```bash
supabase db push
```

## Rollback

1. Vercel: Go to Deployment → Select previous deployment → Promote to Production
2. Database: Run rollback migration or restore from backup
