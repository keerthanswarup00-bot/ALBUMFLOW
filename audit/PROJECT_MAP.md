# AlbumFlow — Project Map

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Client Browser                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React 19 SPA (Vite + TypeScript + Tailwind 4)    │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │  │
│  │  │  Pages   │  │  Stores  │  │   Components    │  │  │
│  │  │   (20)   │  │ (Zustand)│  │    (30+)        │  │  │
│  │  └──────────┘  └──────────┘  └─────────────────┘  │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │        Services Layer (Supabase SDK)          │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
│                          │                               │
│                   HTTPS  │  Anon Key + JWT               │
│                          ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Supabase Backend                      │  │
│  │                                                    │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐   │  │
│  │  │  PostgreSQL  │  │    Edge Functions (Deno)  │   │  │
│  │  │  + RLS       │  │    - validate-token       │   │  │
│  │  │  + Migrations│  │    - approve-album        │   │  │
│  │  │  (11 files)  │  │    - request-changes      │   │  │
│  │  └──────────────┘  └──────────────────────────┘   │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │        Storage Buckets                        │  │  │
│  │  │        - albums (originals, thumbnails)       │  │  │
│  │  │        - voice-notes                          │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Folder Hierarchy

```
albumflow/
├── src/
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Tailwind + theme variables
│   ├── env.ts                     # Environment config
│   ├── vite-env.d.ts
│   │
│   ├── pages/                     # 20 page components
│   │   ├── LoginPage.tsx
│   │   ├── CreateStudioPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── AlbumsPage.tsx
│   │   ├── CreateAlbumPage.tsx
│   │   ├── AlbumDetailPage.tsx
│   │   ├── EditAlbumPage.tsx
│   │   ├── ViewAlbumPage.tsx
│   │   ├── ClientViewPage.tsx
│   │   ├── ReviewManagementPage.tsx
│   │   ├── ReviewFeedbackPage.tsx
│   │   ├── AlbumUpdatePage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   ├── AlbumUnavailablePage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── PrivacyPolicyPage.tsx
│   │   ├── TermsPage.tsx
│   │   └── CookiePolicyPage.tsx
│   │
│   ├── components/
│   │   ├── layout/                # App chrome
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarOverlay.tsx
│   │   │   └── BottomNav.tsx
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PublicRoute.tsx
│   │   ├── album/
│   │   │   ├── AlbumForm.tsx
│   │   │   ├── AlbumCard.tsx
│   │   │   ├── ImageUploadSection.tsx
│   │   │   ├── ImageDropZone.tsx
│   │   │   ├── UploadProgress.tsx
│   │   │   └── DeleteAlbumModal.tsx
│   │   ├── review/                # Client-facing viewer
│   │   │   ├── WeddingAlbumViewer.tsx  (580+ lines)
│   │   │   ├── AlbumViewer.tsx
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── PageImage.tsx
│   │   │   ├── ZoomableImage.tsx
│   │   │   ├── PinchZoomWrapper.tsx
│   │   │   ├── PinMarker.tsx
│   │   │   ├── PinPopup.tsx
│   │   │   ├── NewPinEditor.tsx
│   │   │   ├── FeedbackBottomSheet.tsx
│   │   │   ├── StickyBottomBar.tsx
│   │   │   ├── ReviewProgressTracker.tsx
│   │   │   ├── ProgressTracker.tsx
│   │   │   ├── FloatingFeedbackCard.tsx
│   │   │   ├── ReviewCompletionModal.tsx
│   │   │   ├── HelpBottomSheet.tsx
│   │   │   └── VoiceMessageRecorder.tsx
│   │   ├── ui/                    # Design system primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── EnvBanner.tsx
│   │
│   ├── hooks/                     # React hooks
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useMetaTags.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── store/                     # Zustand stores
│   │   ├── authStore.ts           # Auth state
│   │   ├── albumStore.ts          # Album CRUD
│   │   ├── uiStore.ts             # UI state (sidebar, modal, toast)
│   │   ├── reviewStore.ts         # Client review progress (localStorage)
│   │   ├── reviewCycleStore.ts    # Review cycle workflow (localStorage)
│   │   ├── requestStore.ts        # Change requests (localStorage)
│   │   ├── voiceStore.ts          # Voice messages (localStorage)
│   │   └── updateStore.ts         # Album updates (localStorage)
│   │
│   ├── services/
│   │   ├── supabase/
│   │   │   ├── client.ts          # Supabase client init
│   │   │   ├── auth.ts            # Auth operations
│   │   │   ├── albums.ts          # Album CRUD
│   │   │   ├── profiles.ts        # Profile management
│   │   │   ├── versions.ts        # Version management
│   │   │   ├── pages.ts           # Page management
│   │   │   ├── uploads.ts         # Image upload pipeline
│   │   │   ├── storage.ts         # Storage operations
│   │   │   ├── shareLinks.ts      # Share link CRUD
│   │   │   ├── notifications.ts   # Notifications
│   │   │   └── analytics.ts       # Analytics queries
│   │   └── reportPdf.ts           # HTML-based PDF report
│   │
│   ├── constants/
│   │   ├── routes.ts              # Route definitions
│   │   ├── config.ts              # App configuration
│   │   └── review.ts              # Review constants
│   │
│   ├── types/
│   │   ├── index.ts               # Core domain types
│   │   ├── supabase.ts            # Table type registry
│   │   └── viewer.ts              # Viewer-specific types
│   │
│   └── utils/
│       ├── cn.ts                  # Classname utility
│       ├── errors.ts              # Error classes
│       ├── formatters.ts          # Date/size formatting
│       └── image.ts               # Client-side image processing
│
├── supabase/
│   ├── schema.sql                 # Base schema
│   ├── combined.sql               # Complete combined schema
│   ├── migrations/                # 11 sequential migrations
│   │   ├── 001_album_management.sql
│   │   ├── 002_review_functions.sql
│   │   ├── 003_share_links_and_missing_tables.sql
│   │   ├── 004_fix_ambiguous_columns.sql
│   │   ├── 005_album_review_workflow.sql
│   │   ├── 006_profiles_and_slugs.sql
│   │   ├── 007_multi_studio_and_branding.sql
│   │   ├── 008_remove_public_users.sql
│   │   ├── 009_album_slug_routes.sql
│   │   ├── 010_delete_account.sql
│   │   └── 011_security_hardening.sql
│   └── functions/                 # Deno Edge Functions
│       ├── deno.json
│       ├── validate-token/index.ts
│       ├── approve-album/index.ts
│       └── request-changes/index.ts
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── docs/
│   ├── deployment.md
│   └── recovery.md
│
├── .env                           # Live credentials (gitignored)
├── .env.example                   # Template
├── index.html                     # Vite entry
├── vite.config.ts
├── tsconfig*.json                 # TypeScript configs
├── eslint.config.js
├── vercel.json                    # SPA rewrites
├── package.json
├── README.md
├── ROADMAP.md
├── SECURITY.md
├── Database_Documentation.md
├── PRODUCTION_READINESS_REPORT.md
└── CHANGELOG.md
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19.2.6 |
| Build | Vite | 8.0.12 |
| Language | TypeScript | 6.0.2 |
| Styling | Tailwind CSS | 4.3.1 |
| Routing | React Router | 7.17.0 |
| State Mgmt | Zustand | 5.0.14 |
| Backend | Supabase | ^2.108.1 |
| Icons | Lucide React | 1.18.0 |
| Flipbook | react-pageflip | 2.0.3 |
| Linting | ESLint | 10.3.0 |

## Database Tables (PostgreSQL)

| Table | Purpose | RLS | Key Columns |
|-------|---------|-----|-------------|
| `users` | Photographer accounts | ✅ id = auth.uid() | id, email, full_name, studio_name |
| `profiles` | Studio profiles | ✅ user_id = auth.uid() | user_id, studio_name, owner_name, phone, logo |
| `clients` | Client records (no auth) | ✅ designer_id = auth.uid() | designer_id, name, email |
| `albums` | Core albums | ✅ designer_id = auth.uid() | designer_id, title, status, phase, slug |
| `album_versions` | Versioned iterations | ✅ via albums | album_id, version_number, status |
| `album_pages` | Individual pages/spreads | ✅ via albums | version_id, page_number, image_urls |
| `requests` | Change requests | ✅ via albums | album_id, page_id, description, status |
| `page_reviews` | Per-page ratings | ✅ via albums | page_id, album_id, rating, notes |
| `approvals` | Final album approval | ✅ via albums | album_id, version_id, status, signed_at |
| `share_links` | Token-based sharing | ✅ mixed | album_id, token, expires_at, access_count |
| `comments` | Client comments | ✅ via albums + share | album_id, page_number, body |
| `notifications` | Designer notifications | ✅ user_id = auth.uid() | user_id, type, title, message |
| `review_analytics` | Viewing analytics | ✅ via albums | album_id, pages_viewed, viewing_time |
| `revisions` | Album revision history | ✅ via albums | album_id, revision_type, description |
| `activity_logs` | Audit trail | ✅ via albums (insert: any) | album_id, actor_id, action |
| `album_settings` | Per-album settings | ✅ via albums | album_id, allow_download, watermark |

## Data Flow

### Upload Flow
```
Designer → AlbumDetailPage → ImageUploadSection → loadImage()
  → processImage() → thumbnail/medium/original variants
  → uploadAllVariants() → Supabase Storage (albums bucket)
  → createPage() → album_pages table
  → updateVersionPageCount()
```

### Review Flow
```
Client clicks share link → ViewAlbumPage
  → supabase.rpc('get_album_by_token') → album + version + pages JSON
  → AlbumViewer → WeddingAlbumViewer (react-pageflip flipbook)
  → User navigates pages, adds pin comments, voice messages
  → Data persisted in localStorage (reviewStore, requestStore, voiceStore)
  → Submit feedback → supabase.rpc('request_album_changes')
  → Approve → supabase.rpc('approve_album')
```

### Authentication Flow
```
LoginPage → auth.signInWithEmail() → Supabase Auth
  → onAuthStateChange() → authStore.setUser()
  → ProtectedRoute checks isAuthenticated
  → useAuth() hook initializes session on mount
```

## Routes

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | Public |
| `/signup` | CreateStudioPage | Public |
| `/dashboard` | DashboardPage | Protected |
| `/albums` | AlbumsPage | Protected |
| `/albums/new` | CreateAlbumPage | Protected |
| `/albums/:albumId` | AlbumDetailPage | Protected |
| `/albums/:albumId/edit` | EditAlbumPage | Protected |
| `/albums/:albumId/client-view` | ClientViewPage | Protected |
| `/albums/:albumId/review-feedback` | ReviewFeedbackPage | Protected |
| `/albums/:albumId/update` | AlbumUpdatePage | Protected |
| `/review-management` | ReviewManagementPage | Protected |
| `/settings` | SettingsPage | Protected |
| `/profile` | ProfilePage | Protected |
| `/view/:token` | ViewAlbumPage | Public (token) |
| `/review/:slug` | ViewAlbumPage | Public (slug) |
| `/reset-password` | ResetPasswordPage | Public |
| `/album-unavailable` | AlbumUnavailablePage | Public |
| `/privacy-policy` | PrivacyPolicyPage | Public |
| `/terms` | TermsPage | Public |
| `/cookie-policy` | CookiePolicyPage | Public |
