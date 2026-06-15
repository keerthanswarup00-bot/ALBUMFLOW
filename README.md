# AlbumFlow

**Wedding album proofing made simple.**

A production-grade SaaS application for wedding album designers to upload, proof, review, and approve albums with their clients.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State | Zustand |
| Page Flip | StPageFlip (react-pageflip) |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Auth | Supabase Auth (email/password) |
| Hosting | Vercel |

## Features

- **Admin Dashboard** — Overview of all albums, review progress, request counts
- **Album Management** — Create, edit, soft-delete albums with client info
- **Image Upload** — Browser-side canvas processing to 3 variants (thumbnail/medium/original), parallel upload
- **Versioned Albums** — Every revision is a new version with immutable pages
- **Share Links** — Token-based public links for clients (no login required)
- **Album Viewer** — Realistic page-flip experience using StPageFlip library
- **Page Review** — Clients mark pages as "Looks Good" with undo support
- **Pin Requests** — Place a pin on any page location, then add a comment
- **General Requests** — Text-based change requests per page
- **Voice Notes** — Record and attach voice messages to pages
- **Review Summary** — Progress tracking, unreviewed pages, quick-jump
- **Approval Flow** — Clients can submit final approval with checklist
- **Review Management** — Admin view of all client feedback across albums

## Folder Structure

```
src/
├── components/
│   ├── album/        # Album & image management (AlbumCard, AlbumForm, ImageUploadSection)
│   ├── auth/         # Auth guards (ProtectedRoute, PublicRoute)
│   ├── layout/       # App shell (Header, Sidebar, BottomNav)
│   ├── review/       # Album viewer components (AlbumViewer, PageReviewBar, PinMarker, etc.)
│   └── ui/           # Reusable primitives (Button, Input, Modal, Card, Spinner, Toast)
├── pages/            # Route-level page components (flat, by route)
├── layouts/          # AuthLayout, AppLayout
├── hooks/            # useAuth, useLocalStorage
├── services/
│   └── supabase/     # client, auth, albums, versions, pages, storage, uploads, shareLinks
├── store/            # Zustand stores (auth, album, review, request, voice, reviewCycle, update, ui)
├── types/            # TypeScript interfaces (index, supabase, viewer)
├── utils/            # Pure utilities (cn, errors, formatters, image)
├── constants/        # routes.ts, config.ts, review.ts
├── App.tsx           # Root component with router
├── main.tsx          # Entry point
├── index.css         # Tailwind v4 + global styles
└── vite-env.d.ts

supabase/
├── schema.sql
├── migrations/       # 001-005 incremental migrations
└── functions/        # Database functions (get_album_by_token, etc.)
```

### Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Designer sign-in |
| `/reset-password` | Public | Password reset |
| `/dashboard` | Protected | Overview stats and recent activity |
| `/albums` | Protected | Album list with search/filter/sort |
| `/albums/new` | Protected | Create new album form |
| `/albums/:id` | Protected | Album detail + image upload + share links |
| `/albums/:id/edit` | Protected | Edit album form |
| `/albums/:id/viewer` | Protected | Album proofing viewer |
| `/settings` | Protected | Studio preferences |
| `/profile` | Protected | User profile |
| `/review-management` | Protected | All client feedback across albums |
| `/view/:token` | Public | Client share link (full album viewer) |

## Local Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone <repo-url> albumflow
cd albumflow
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173
```

### 3. Run database migrations

In the Supabase SQL Editor, run migrations in order:

1. `supabase/schema.sql` — base tables, RLS policies, triggers
2. `supabase/migrations/001_album_management.sql` — event types, storage fields
3. `supabase/migrations/002_review_functions.sql` — review cycle functions
4. `supabase/migrations/003_share_links_and_missing_tables.sql` — share links, requests, voice
5. `supabase/migrations/004_fix_ambiguous_columns.sql` — query fixes
6. `supabase/migrations/005_album_review_workflow.sql` — approval workflow

### 4. Create a test user

In Supabase Authentication panel, create a user with email/password. This automatically creates a matching row in `public.users` via the database trigger.

### 5. Start development

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

## Deployment (Vercel)

```bash
# Push to GitHub
git remote add origin <your-repo-url>
git push -u origin main

# Import in Vercel dashboard or use CLI
npx vercel
```

Set these environment variables in Vercel:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_APP_URL=<your-vercel-domain>
```

## Workflows

### Admin Workflow

1. Sign in at `/login`
2. Create an album with client details at `/albums/new`
3. Upload images via album detail page — browser processes 3 size variants
4. Generate a share link for the client
5. Monitor review progress from dashboard
6. View client requests in Review Management
7. Make revisions, create new version, share updated link

### Client Workflow

1. Receive a shareable link (no login required)
2. Welcome screen introduces the album
3. Browse pages using realistic page-flip animation
4. Mark pages as "Looks Good" to track progress
5. Place pin markers on specific locations with comments
6. Submit general text change requests
7. Record voice notes for complex feedback
8. Submit final approval with checklist

## Supabase Database

### Storage Architecture

```
albums/{album_id}/
├── v1/
│   ├── thumbnails/    # 300px wide
│   ├── medium/        # 1200px wide
│   └── originals/     # Full resolution
└── v2/
    └── ...
```

### Key Tables

- `users` — Designer accounts (synced with auth.users)
- `albums` — Album metadata, soft-deletable
- `album_versions` — Immutable version snapshots
- `album_pages` — Page metadata with image URLs
- `share_links` — Token-based client access
- `requests` — Pin and general change requests
- `voice_recordings` — Voice note messages
- `approvals` — Client approval records

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run lint      # ESLint check
npm run preview   # Preview production build locally
```

## License

Private — All rights reserved.
