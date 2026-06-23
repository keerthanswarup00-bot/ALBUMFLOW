# AlbumFlow — Health Report

## Overall Scores

| Metric | Score | Assessment |
|--------|-------|------------|
| **Code Quality** | 65/100 | Functional but has significant architectural debt |
| **Performance** | 55/100 | Client-side image processing, no caching, localStorage abuse |
| **Maintainability** | 50/100 | Monolithic components, dual schema, no tests |
| **Production Readiness** | 35/100 | Missing error handling, no monitoring, critical RLS gaps |
| **Security** | 40/100 | Major RLS issues, exposed service role, weak client isolation |

---

## Code Quality (65/100)

### Dead Code
- **`src/types/index.ts:14-23`** — `Profile` type is defined but `profiles.ts` service uses a different data shape. The `User` type overlaps significantly with `Profile`.
- **`supabase/migrations/002_review_functions.sql`** — `get_album_review_data(uuid)` is superseded by `get_album_by_token(text)`. The migration 011 partially revokes anon grant but the function remains.
- **`supabase/migrations/001_album_management.sql`** — This was superseded by later combined migrations (003). Should be consolidated.
- **`supabase/schema.sql`** — Completely superseded by `combined.sql` and migrations. Appears to be an outdated reference.
- **`src/pages/ReviewFeedbackPage.tsx`** and **`src/pages/ReviewManagementPage.tsx`** — Routed but not linked from the main navigation. Appear incomplete or unused.
- **`src/pages/AlbumUpdatePage.tsx`** — Routed but may not be fully integrated into the workflow.

### Duplicate Code
- **`combined.sql`** duplicates `schema.sql` entirely with additional content. These files should be consolidated.
- **`src/store/updateStore.ts`**, **`requestStore.ts`**, **`voiceStore.ts`** — All share identical localStorage load/save/generateId patterns. ~40 lines of duplicated boilerplate each.
- **Migration 003 vs 004 vs 005 vs 006** — Each redefines `get_album_by_token` and `get_album_review_data` completely, duplicating hundreds of lines of SQL. Should use `CREATE OR REPLACE` without full redefinition.
- **Album status enums** — Defined in both TypeScript (`types/index.ts:35`, `types/index.ts:51`) and PostgreSQL (every migration). Drift risk is high.

### Unused Files
- `supabase/schema.sql` — Superseded by `combined.sql` + migrations
- `docs/recovery.md` — Empty/unused documentation
- `SECURITY.md` — Stub file with no security policy
- `CHANGELOG.md` — Empty changelog

### Unused Components
- **`ReviewProgressTracker`** — Defined but not imported in `WeddingAlbumViewer.tsx` (review store is used directly)
- **`ProgressTracker`** — Similar, appears replaced by `ReviewProgressTracker`
- **`FloatingFeedbackCard`** — May be unused or deprecated in favor of bottom sheet pattern

### Unused Routes
- `ROUTES.REVIEW_MANAGEMENT` (`/review-management`) — Page exists but no nav link
- `ROUTES.REVIEW_FEEDBACK` (`/albums/:albumId/review-feedback`) — No nav link
- `ROUTES.ALBUM_UPDATE` (`/albums/:albumId/update`) — No nav link

### Unused Hooks
- `useLocalStorage.ts` — Defined but all stores use direct localStorage access instead

### Unused Assets
- `public/icons.svg` — Referenced in `useMetaTags.ts` as fallback OG image but may not be used elsewhere
- `public/favicon.svg` — Used

---

## Performance (55/100)

### Large Bundles
- **`WeddingAlbumViewer.tsx`** — 580+ lines, imports 15+ components, directly imports from 6 different stores. Major re-render risk.
- **`AlbumDetailPage.tsx`** — 400+ lines with complex state management, multiple useEffect hooks.

### Re-render Issues
- **`useAuth` called at App level** — `useAuth` uses `onAuthStateChange` which triggers on every auth event. This re-renders the entire app.
- **No memoization on album lists** — `AlbumsPage` computes filtered list in `useMemo` but album components (`AlbumCard`) don't use `React.memo`.
- **`WeddingAlbumViewer`** — Re-renders all pages when any state changes (current spread, pin mode, etc.)

### Expensive Queries
- **`DashboardPage`** — Fetches versions and share links for every album in a serial loop (`Promise.all` would help).
- **`albums.ts:getActiveAlbums`** — No RLS filtering in query itself; relies entirely on RLS to filter.
- **Notification queries** — No limit/pagination on fetching 50 notifications without a WHERE clause for the current user (relies on RLS).

### Image Handling Issues
- **Client-side image processing** (`src/utils/image.ts`) — All image resizing happens in the browser before upload. For large albums (100+ photos at 50MB each), this will:
  - Freeze the browser tab
  - Consume massive amounts of memory
  - Fail on mobile devices
- **No progressive loading** — Large images loaded as full-resolution immediately, not progressive JPEG or blur-up technique.
- **No CDN or image optimization** — Images served directly from Supabase storage without any optimization layer.

### Memory Leaks
- **`DashboardPage`** uses a `cancelled` flag pattern — correct but inconsistent across the codebase.
- **`ViewAlbumPage`** — Uses cancelled flag correctly.
- **`ClientViewPage`** — Uses cancelled flag correctly.
- **Many pages/effects do NOT clean up** async operations.

### Infinite Loop Risks
- **`AlbumDetailPage.tsx:108-117`** — `useEffect` that calls `updateAlbum` when pages change, which triggers re-render, which could re-trigger. Mitigated by the `if (!currentAlbum.cover_image_url)` check.

---

## Maintainability (50/100)

### Code Complexity
- **`WeddingAlbumViewer.tsx`** — 580+ lines of monolithic component with flipbook logic, pin management, voice recording, approval flow, and analytics. Should be split into smaller focused components.
- **`AlbumDetailPage.tsx`** — 400+ lines with upload, share link management, review workflow, page deletion, and status management. Too many responsibilities.
- **`src/services/supabase/pages.ts`** — Contains `createPage`, `getPagesByVersion`, `deletePage`, `getNextPageNumber`. The `getNextPageNumber` query is O(n) — could use SELECT MAX.

### Technical Debt
- **Dual user system** — The `public.users` table was created initially, then migration 008 removed it. The code (`authStore.ts:6`, `profiles.ts:1`) still references `public.users` pattern vs `auth.users`. The `mapSupabaseUserToAppUser` function in `auth.ts` creates a synthetic `User` object from auth metadata rather than querying the `profiles` table.
- **localStorage as primary storage** — `reviewStore`, `reviewCycleStore`, `requestStore`, `voiceStore`, `updateStore` all use localStorage as the sole persistence mechanism. This means:
  - Data is device-specific (no cross-device sync)
  - Data is lost on browser clear
  - No server-side record of reviews
  - Storage limits (~5-10MB) will be hit with voice recordings
  - No backup or recovery
- **Duplicate schema definitions** — Types defined in both TypeScript and PostgreSQL SQL with no single source of truth.

### Architecture Violations
- **Stores calling services directly** — `albumStore.ts` imports and calls service functions directly, which is fine, but some pages also call services independently, bypassing stores.
- **`AlbumDetailPage.tsx`** directly calls `pageService.deletePage()`, `shareLinkService.createShareLink()`, and `supabase.rpc()` — bypassing the store abstraction.
- **Dead RPC functions** — `get_album_review_data(uuid)` is kept for backward compatibility but its anon access was removed. The function itself is dead code.

### Tight Coupling
- **`WeddingAlbumViewer.tsx`** imports from 6 different stores directly + multiple services + Supabase client.
- **`ViewAlbumPage.tsx`** imports from supabase client directly instead of using service abstractions.

### Poor Abstractions
- **No repository pattern** — Services are thin wrappers around Supabase queries.
- **No data layer caching** — Every page mount re-fetches from Supabase.
- **Error handling is inconsistent** — Some places use `try/catch`, others use `.catch()`, some just ignore errors.

---

## Detailed Issue Breakdown by Page

### DashboardPage.tsx
- Serial album loading (should use Promise.all)
- No pagination for large album counts
- Empty state is good but loading state is just a spinner
- No error state per-album (entire dashboard fails if one album fetch errors)

### AlbumsPage.tsx
- Search/filter/sort works only on already-fetched data
- Delete modal works well
- No batch operations

### AlbumDetailPage.tsx
- **CRITICAL**: `cover_image_url` update effect could cause loops
- No version management UI (can't switch or compare versions)
- Upload section shows after pages — should be prominent
- No drag-to-reorder pages

### ViewAlbumPage.tsx (Public)
- Handles token and slug paths
- Welcome screen is clean
- Error states are good
- No loading states for profile fetch
- **Potentially crashes** if `get_album_by_slug` RPC doesn't exist (migration 009 must be applied)

### ClientViewPage.tsx
- Same as ViewAlbumPage but uses Designer auth directly
- Only accessible when logged in as the album designer
- Bypasses share token validation
