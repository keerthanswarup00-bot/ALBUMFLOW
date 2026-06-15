# AlbumFlow

**Wedding album proofing made simple.**

A production-grade SaaS application for wedding album designers to upload, proof, review, and approve albums with their clients.

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State | Zustand |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Auth | Supabase Auth (email/password, designer-only) |
| Hosting | Vercel |

### Key Design Decisions

- **Designer-only auth**: Clients never log in. They receive shareable proofing links.
- **No ORM**: Raw Supabase JS client with typed queries for full control.
- **Feature-based folders**: Domain logic grouped by feature (albums, auth) under `components/`, not by technical role.
- **Versioned albums**: Every album iteration is a separate version (v1, v2...) with immutable pages for audit trail.
- **Mobile-first**: Bottom navigation on mobile, sidebar on desktop. All UI components responsive by default.

## Folder Structure

```
src/
├── components/
│   ├── ui/           # Reusable primitives (Button, Input, Modal, Card, Spinner, Toast)
│   ├── layout/       # App shell (Header, Sidebar, BottomNav, Overlay)
│   ├── auth/         # Auth guards (ProtectedRoute, PublicRoute)
│   └── albums/       # Album & image management components
│       ├── AlbumCard.tsx          # Album card for list view
│       ├── AlbumForm.tsx          # Create/edit album form
│       ├── DeleteAlbumModal.tsx   # Delete confirmation
│       ├── ImageDropZone.tsx      # Drag & drop file input
│       ├── UploadProgress.tsx     # Per-file upload progress
│       └── ImageUploadSection.tsx # Full upload UI
├── pages/            # Route-level page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── AlbumsPage.tsx            # Album list with search/filter/sort
│   ├── CreateAlbumPage.tsx       # New album form
│   ├── AlbumDetailPage.tsx       # Detail view + image upload
│   ├── EditAlbumPage.tsx         # Edit album form
│   ├── SettingsPage.tsx
│   └── ProfilePage.tsx
├── layouts/          # Page layout wrappers
│   ├── AuthLayout.tsx      # Centered card layout for login
│   └── AppLayout.tsx       # Header + Sidebar + BottomNav shell
├── hooks/            # Custom React hooks
│   └── useAuth.ts
├── services/         # External service integrations
│   └── supabase/
│       ├── client.ts       # Supabase client initialization
│       ├── auth.ts         # Auth functions (login, logout, session)
│       ├── albums.ts       # Album CRUD service
│       ├── versions.ts     # Album version management
│       ├── pages.ts        # Album page metadata service
│       ├── storage.ts      # Storage upload/delete (single + variant batch)
│       └── uploads.ts      # Upload pipeline (process → variants → save)
├── store/            # Zustand state management
│   ├── authStore.ts
│   ├── albumStore.ts        # Albums + versions + pages state
│   └── uiStore.ts
├── types/            # TypeScript interfaces
│   ├── index.ts      # User, Album, AlbumVersion, AlbumPage, RequestChange etc.
│   └── supabase.ts   # Table mapping types
├── utils/            # Pure utility functions
│   ├── cn.ts         # Class name merge utility
│   ├── errors.ts     # Error class hierarchy (AppError, AuthError, ApiError, StorageError)
│   ├── formatters.ts # Date, file size, pluralization formatters
│   └── image.ts      # Canvas-based image processing (resize to thumbnail/medium/original)
├── constants/        # Application constants
│   ├── routes.ts     # Route path definitions
│   └── config.ts     # App-wide configuration
├── assets/           # Static assets
├── App.tsx           # Root component with router configuration
├── main.tsx          # Entry point
├── index.css         # Tailwind imports + global styles
└── vite-env.d.ts     # Environment variable type declarations

supabase/
├── schema.sql              # Full PostgreSQL schema
└── migrations/
    └── 001_album_management.sql  # Event type, statuses, storage fields
```

### Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Designer sign-in |
| `/dashboard` | Protected | Overview stats and recent activity |
| `/albums` | Protected | Album list with search/filter/sort |
| `/albums/new` | Protected | Create new album form |
| `/albums/:id` | Protected | Album detail + image upload |
| `/albums/:id/edit` | Protected | Edit album form |
| `/albums/:id/viewer` | Protected | Album proofing viewer (placeholder) |
| `/settings` | Protected | Studio preferences |
| `/profile` | Protected | User profile |

## Supabase Database Design

### Entity Relationships

```
users 1──* albums 1──* album_versions 1──* album_pages
         │                                       │
         │ 1──* requests ─────────> album_pages  │
         │                                       │
         │ 1──* page_reviews ──────> album_pages  │
         │                                       │
         └ 1──* approvals ──── album_versions
```

### Storage Architecture

```
albums/{album_id}/
├── v1/
│   ├── thumbnails/    # 300px wide, ~70% quality (fast grid loading)
│   ├── medium/        # 1200px wide, ~85% quality (detail view)
│   └── originals/     # Full resolution, ~92% quality (proofing)
└── v2/
    └── ...
```

**Why this structure:**
- **Per-album folders**: Isolates each project's assets completely.
- **Version subfolders (`v1/`, `v2/`)**: Makes version rollback simple — delete a version's folder, the DB references are gone.
- **Three size variants**: Thumbnails for grid views, medium for detail, originals for full-res proofing. Each variant has its own folder for separate CDN caching policies.
- **Timestamps in filenames**: Prevents name collisions and provides implicit ordering.

### Upload Pipeline

1. User drops/selects files in `ImageDropZone`.
2. Browser-side canvas processes each image into 3 variants (thumbnail, medium, original).
3. All 3 variants upload in parallel to Supabase Storage.
4. A row is inserted into `album_pages` with URLs for all variants.
5. The album version's `page_count` is updated.
6. `UploadProgress` component shows per-file stage and overall progress.

## Setup Instructions

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

In the Supabase SQL Editor:

1. First run `supabase/schema.sql` — creates all tables, RLS policies, triggers.
2. Then run `supabase/migrations/001_album_management.sql` — adds `event_type`, `medium_url`, `original_url` columns and new status values.

### 4. Create a test user

In Supabase Authentication panel, create a user with email/password. This automatically creates a matching row in `public.users` via the database trigger.

### 5. Start development

```bash
npm run dev
```

Open `http://localhost:5173` and sign in.

## Development Workflow

### Commands

```bash
npm run dev       # Start dev server
npm run build     # Type-check + production build
npm run lint      # Lint all files
npm run preview   # Preview production build locally
```

### Adding a new page

1. Create the page under `src/pages/`.
2. Add the route path to `src/constants/routes.ts`.
3. Add the route to `src/App.tsx`.

### Adding a new API service

Create a new file under `src/services/` (e.g. `src/services/albums.ts`). Use the Supabase client from `src/services/supabase/client.ts`.

### State management pattern

- **Global UI state** (sidebar, modals, toasts): `uiStore`
- **Auth state** (user, session): `authStore`
- **Domain data** (albums, versions): `albumStore`

Stores hold state and expose actions. Data fetching happens in components/hooks, which call services and update stores.

## Album Submission

### For designers:
1. Create an album in the dashboard.
2. Upload images — these become version 1.
3. Share the proofing link with the client.
4. Receive feedback and make revisions (version 2, 3...).
5. Get final approval.

### For clients (future):
- Receive a shareable link (no login required).
- View album pages in a full-screen viewer.
- Leave comments on individual pages.
- Approve or reject the final version.

## Album Management Module

### Services

| Service | File | Functions |
|---------|------|-----------|
| Albums | `services/supabase/albums.ts` | `getAlbums`, `getAlbumById`, `createAlbum`, `updateAlbum`, `deleteAlbum`, `getActiveAlbums` |
| Versions | `services/supabase/versions.ts` | `ensureVersion`, `updateVersionPageCount`, `getVersions` |
| Pages | `services/supabase/pages.ts` | `createPage`, `getPagesByVersion`, `deletePage`, `getNextPageNumber` |
| Storage | `services/supabase/storage.ts` | `uploadImage`, `uploadImageVariant`, `uploadAllVariants`, `deleteImage`, `deleteImages` |
| Uploads | `services/supabase/uploads.ts` | `uploadImagesToAlbum` — full pipeline: process → variants → save |

### Components

| Component | Purpose |
|-----------|---------|
| `AlbumCard` | Responsive card showing title, client, status, event type, actions |
| `AlbumForm` | Reusable form for create/edit with validation |
| `DeleteAlbumModal` | Confirmation dialog with soft-delete |
| `ImageDropZone` | Drag & drop or click-to-browse file selector |
| `UploadProgress` | Per-file progress bars with stage labels |
| `ImageUploadSection` | Full upload UI integrated into album detail |

### Album List Features

- **Instant search** by album name or client name
- **Status filters**: All, Draft, Awaiting Review, Changes Requested, Approved
- **Sorting**: Newest First, Oldest First, Alphabetical
- **Empty state** with prompt to create first album
- **Responsive grid**: 1 col mobile, 2 col tablet, 3 col desktop

### Image Upload System

- **Browser-side processing**: Uses HTML Canvas to generate 3 size variants per image without a server.
- **Parallel uploads**: All 3 variants upload simultaneously to Supabase Storage.
- **Progress tracking**: Per-file stages (processing → uploading → saving → done) with percentage.
- **Automatic versioning**: First upload creates `v1` version. Subsequent uploads append pages.
- **Error handling**: Per-file error capture, toast notifications, rollback-safe.
- **Large file support**: Validates type (JPEG/PNG/WebP) and size (up to 50MB) before processing.

### Soft Delete

Albums are soft-deleted by setting `status = 'archived'`. The `getActiveAlbums` service filters out archived albums. Archived albums remain in the database for recovery.

## Page Review & Approval Module

### Review Flow (Client Side)

1. Client opens a public `/review/:albumId` link and views the album in full-screen viewer.
2. **Auto-tracking**: Each page is automatically marked as **Viewed** when the client navigates to it.
3. Client presses **"This Page Looks Good"** on each page they're happy with — marks it as **Reviewed**.
4. **Undo** is available: replaces "Page Reviewed" state back to viewed.
5. The **Review Summary** screen shows:
   - Pages Reviewed / Remaining / Viewed
   - Completion percentage
   - Grid of all pages with reviewed status indicators
   - Quick-jump list to unreviewed pages

### Data Model

```typescript
type PageReviewStatus = 'viewed' | 'reviewed';

interface AlbumReviewEntry {
  page_number: number;    // 1-based
  status: PageReviewStatus;
  updated_at: number;
}

interface AlbumReviewData {
  album_id: string;
  total_pages: number;
  pages: Record<number, AlbumReviewEntry>;
  updated_at: number;
}
```

### Persistence (Client-Side)

Review data is stored in `localStorage` under key `albumflow_review_{albumId}`. The `reviewStore` is architected for future DB-backed storage — the store interface is identical regardless of backend. To migrate to Supabase:

1. Create a `page_reviews` table with columns `album_id`, `page_number`, `status`, `updated_at`.
2. Replace `saveToStorage`/`loadFromStorage` calls with Supabase RPC calls in `reviewStore.ts`.
3. No component changes needed — the Zustand store is the sole abstraction boundary.

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `PageReviewBar` | `components/viewer/PageReviewBar.tsx` | Sticky bottom bar: Previous, This Page Looks Good, Next. Shows "Page Reviewed ✓" state with Undo. |
| `ReviewProgressTracker` | `components/viewer/ReviewProgressTracker.tsx` | Top bar with "Album Review Progress", progress bar, % complete. Includes summary/layout/fullscreen/help actions. |
| `ReviewSummaryScreen` | `components/viewer/ReviewSummaryScreen.tsx` | Full-screen overlay with stats, progress bar, unreviewed page list, all-pages grid with status markers. |

### Store

| Store | File | Key State |
|-------|------|-----------|
| `reviewStore` | `store/reviewStore.ts` | `data: Record<string, AlbumReviewData>` — per-album review state |

**Actions:**
- `markPageViewed(albumId, pageNumber, totalPages)` — auto-track when navigating
- `markPageReviewed(albumId, pageNumber, totalPages)` — "This Page Looks Good"
- `undoReview(albumId, pageNumber, totalPages)` — revert review
- `getReviewedCount(albumId)` / `getViewedCount(albumId)` — stats
- `getCompletionPercent(albumId, totalPages)` — 0-100%
- `getUnreviewedPages(albumId, totalPages)` — for summary jump-list
- `getReviewedPages(albumId)` — for status indicators
- `getPageStatus(albumId, pageNumber)` — per-page lookup

### Designer Dashboard Integration

| Surface | What shows |
|---------|-----------|
| `DashboardPage` | Per-album review counts in Recent Albums list; overall progress bar summing all albums |
| `AlbumCard` | Green "X Pages Reviewed" indicator below client name |
| `AlbumDetailPage` | "Review Progress" card with bar + percentage + page count |

### Key Design Decisions

- **localStorage-first**: Zero infrastructure required; works offline. Migration path to DB is documented.
- **Spread-aware**: In spread mode, both pages in the spread are marked viewed/reviewed as a pair.
- **No setState-in-effect**: All review store actions are synchronous mutations — no cascading renders.
- **Mobile-optimized bottom bar**: Large 48px touch targets, sticky at bottom, accessible with one hand.
- **Language consistency**: Uses "This Page Looks Good", "Reviewed", "Remaining Pages", "Album Review Progress" — never "approve" or "annotation".

## Future Integration Points

- **Album Viewer**: Consumes `album_pages` with `original_url` for full-res proofing.
- **Change Requests**: UI links to `requests` table via `page_id` and `album_id`.
- **Approvals**: Consumes `approvals` table linked to `album_versions`.
- **Client Sharing**: Shareable links for clients (no auth) with secure token per album.
- **Database-backed reviews**: Migrate `reviewStore` from `localStorage` to Supabase `page_reviews` table.
- **Real-time sync**: Subscribe to review changes so designer sees client progress live.

## License

Private — All rights reserved.
