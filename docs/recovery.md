# Recovery — albumflow

## Accounts Required

| Service | Purpose |
|---|---|
| GitHub | Source control |
| Supabase | Database, Auth, Storage |
| Vercel | Hosting |

## Restore Steps

### 1. Clone Repository
```bash
git clone <repo-url>
cd albumflow
```

### 2. Restore Environment Variables
Create `.env`:
```
VITE_SUPABASE_URL=<from-supabase-dashboard>
VITE_SUPABASE_ANON_KEY=<from-supabase-dashboard>
VITE_APP_URL=<your-production-url>
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Restore Database
Run migrations:
```bash
# Via Supabase CLI
supabase db push
# OR import combined.sql
```

### 5. Build & Verify
```bash
npm run build
npm run lint
```

### 6. Deploy
```bash
vercel --prod
```
