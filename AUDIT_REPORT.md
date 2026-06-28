# AlbumFlow - Enterprise Production Audit Report

**Date:** June 29, 2026
**Auditor:** OpenCode Forensic Audit
**Scope:** Full-stack: React 19.2.6 · Supabase · Vercel · page-flip 2.0.7

---

## Executive Summary

AlbumFlow has **substantial architectural, security, and operational issues** that must be resolved before it can be considered production-ready for photographers and clients.

**Overall Health: POOR** — 5/10

The application has strong foundations (well-structured code, TypeScript throughout, clean build) but suffers from:
- **No Supabase storage bucket exists** (all image URLs return 404 → all viewers are blank)
- **Anonymous users can read ALL albums' review data** (P0 security breach)
- **Fire-and-forget async cause silent data loss** in all review operations
- **Auth state changes never enrich user profiles** → missing studio name/phone/logo
- **Migration 015 never applied** — security fixes from June 26 are not deployed
- **620 lines of dead code** from the removed PreviewViewer remain in the tree
- **Rapid navigation clicks cause page state desync** in the flip viewer

---

## Scores

| Category | Score | Key Issues |
|----------|-------|------------|
| **Security** | **25/100** | anon reads all review_data, get_album_review_data callable by anon, sequence of profile creation, TOCTOU slug race, no rate limiting |
| **Performance** | **55/100** | Zustand destructuring causes full re-renders on any store update, HTMLFlipBook React.memo defeated by inline style, resolution effect iterates all pages |
| **Architecture** | **40/100** | localStorage as sole offline data bus, no versioning/migration, duplicate profile creation, dead code directory |
| **Code Quality** | **60/100** | TypeScript throughout, clean build, but fire-and-forget promises, O(n²) indexOf, momentum velocity broken |
| **Mobile UX** | **45/100** | touch-action:none blocks OS gestures, containerSize never updated on resize/orientation, pin placement broken when zoomed, voice draft audio never persisted |
| **Viewer** | **30/100** | No images load (bucket missing), no flip debouncing, aspect ratio from page[0] only, re-render on every store update |
| **Infrastructure** | **35/100** | Bucket not created, no storage setup script, combined.sql stale, migration 015 not applied, no monitoring/logging |
| **Deployment** | **50/100** | Vercel auto-deploy from main, SPA rewrites exist, but image transform endpoint doesn't work |
| **Developer Experience** | **55/100** | Good build tooling, type safety, but dead code confusing, stale docs |
| **Production Readiness** | **20/100** | Two P0 data leaks, one P0 data loss, completely blank viewers, no error monitoring, no rate limiting, no backup/disaster recovery |

---

## Critical Issues (P0)

### P0-1: `albums` storage bucket does NOT exist in Supabase project
**Severity:** BLOCKER — all viewers are blank, all uploads fail
**Root cause:** No `createBucket` call exists anywhere in the codebase or migrations. Migration 012 assumes the bucket exists and only adds RLS. No setup script.
**Evidence:**
- `GET /storage/v1/bucket/albums` → 404 "Bucket not found"
- `GET /storage/v1/object/public/albums/ANY_PATH` → 404 "Bucket not found"
- Every image URL returns JSON 404 → Chrome blocks with `ERR_BLOCKED_BY_ORB`
**Impact:** Every image request fails. 7 albums with 42+ pages each are stored as dead URLs in the database. All viewers, dashboards, and share links show blank pages.
**Fix:** Go to Supabase Dashboard → Storage → Create bucket `albums` → Make public. Then re-upload all images or restore from backup.
**Files:** `src/services/supabase/storage.ts:5` (BUCKET_NAME), `supabase/migrations/012_storage_rls_and_security.sql`
**Risk if ignored:** Application is completely non-functional for all users.

### P0-2: anon can read ALL `review_data` records via REST API
**Severity:** CRITICAL — full review data of all albums accessible to any visitor
**Root cause:** RLS policy on `review_data` uses `album_has_valid_share_link()` (SECURITY DEFINER), which checks `share_links` table. Since share links exist for albums, the policy evaluates to TRUE for ALL records. There is no additional filter for the correct album.
**Evidence:**
```sql
SELECT * FROM review_data; -- Returns ALL 7 records to unauthenticated user
```
Response includes: page-by-page review status, pin placements (x%, y%), client messages, review timeline entries, approval status.
**Impact:** Any visitor to the site (including competitors) can read every album's review progress, client feedback, pin annotations, and approval timeline.
**Fix:** Fix `album_has_valid_share_link()` to accept an `album_id` parameter and check it against the row's `album_id`, or add RLS policy that compares `album_id = auth.uid()` for authenticated and uses token-based check for anon.
**Files:** `supabase/migrations/014_review_data_and_security.sql`, `supabase/migrations/012_storage_rls_and_security.sql`

### P0-3: get_album_review_data RPC callable by anon (bypasses RLS)
**Severity:** CRITICAL — anon can read any album's full metadata and all page URLs
**Root cause:** Migration 008 issued blanket GRANT EXECUTE ON ALL FUNCTIONS to anon. Migration 015 attempts to revoke and re-grant selectively, but was never applied.
**Evidence:**
```bash
curl -X POST ... -d '{"p_album_id": "3fa77fe8-..."}' /rpc/get_album_review_data
→ Returns full album metadata + 42 pages with image URLs + version info
```
**Impact:** Any visitor can enumerate album UUIDs (obtained from review_data) and read any album's complete metadata and image URLs.
**Fix:** Apply migration 015 (which correctly grants only to `authenticated`), OR add `auth.role() = 'authenticated'` check inside the function.
**Files:** `supabase/migrations/015_security_lint_fixes.sql`

### P0-4: Fire-and-forget sync causes silent data loss in review stores
**Severity:** CRITICAL — page reviews, pin placements, and approvals silently lost
**Root cause:** Every Zustand store's sync function (`syncToServer` in reviewStore, `syncRequestsToServer` in requestStore, `syncVoiceToServer` in voiceStore, `syncCycleData` in reviewCycleStore) calls `saveReviewData()` WITHOUT `await`. Concurrent rapid calls race: the second call reads stale localStorage state, merges with stale server snapshot, and overwrites the first mutation.
**Evidence:** `src/store/reviewStore.ts:42-44`, `src/store/requestStore.ts:57-59`, `src/store/voiceStore.ts:52-54`, `src/store/reviewCycleStore.ts:27-29`
**Impact:** When a reviewer rapidly marks multiple pages as viewed or places multiple pins, some records are silently overwritten and lost. The final server state is non-deterministic.
**Fix:** Queue sync operations:
```ts
let syncQueue: Promise<void> = Promise.resolve();
function enqueueSync(albumId: string, data: AlbumReviewData) {
  syncQueue = syncQueue.then(() => saveReviewData(albumId, { review: data }));
}
```
**Files:** `src/store/reviewStore.ts`, `src/store/requestStore.ts`, `src/store/voiceStore.ts`, `src/store/reviewCycleStore.ts`

### P0-5: Auth state change never enriches user profile
**Severity:** HIGH — studio_name, phone, and studio_logo_url always null after token refresh
**Root cause:** `onAuthStateChange` callback in `src/services/supabase/auth.ts:228-236` returns `mapSupabaseUserToAppUser(session.user)` directly, WITHOUT calling `enrichUserWithProfile()`. Profile enrichment (which queries/creates `profiles` table) only runs in `signInWithEmail` and `getCurrentSession`.
**Evidence:** 
```ts
// src/services/supabase/auth.ts:232
callback(mapSupabaseUserToAppUser(session.user)); // No enrichUserWithProfile!
```
vs
```ts
// src/services/supabase/auth.ts:94
const { user: enriched } = await enrichUserWithProfile(mapSupabaseUserToAppUser(data.user));
```
**Impact:** After any auth state change (token refresh, email verification, OAuth redirect), the user object in the app has empty `studio_name`, `phone`, and `studio_logo_url`. The profile creation code path in the callback (which would have created a missing profile) is entirely bypassed.
**Fix:**
```ts
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) { callback(null); return; }
    const { user: enriched } = await enrichUserWithProfile(mapSupabaseUserToAppUser(session.user));
    callback(enriched);
  });
}
```
**Files:** `src/services/supabase/auth.ts:228-236`

---

## High Priority (P1)

### P1-1: Migration 015 never applied to production
**Severity:** HIGH — all P0 security fixes held back
**Files:** `supabase/migrations/015_security_lint_fixes.sql`
**Impact:** Anon can still execute ALL functions (including `delete_account`). Storage bucket still public. Default function grants still open.
**Fix:** Apply `supabase/migrations/015_security_lint_fixes.sql` via Supabase SQL editor.

### P1-2: Zustand store destructuring causes full re-renders
**Severity:** HIGH — viewer re-renders on every toast, every voice upload progress, every store mutation
**Files:** `src/components/review/WeddingAlbumViewer.tsx:67-70`
**Impact:** Every state change in 4 Zustand stores triggers a full re-render of the viewer, including all derived state recomputation.
**Fix:** Use selector functions instead of destructuring:
```tsx
const markPageViewed = useReviewStore((s) => s.markPageViewed);
```

### P1-3: HTMLFlipBook React.memo defeated by inline style object
**Severity:** HIGH — every state change re-renders HTMLFlipBook, triggering internal ref resets
**Files:** `src/components/review/WeddingAlbumViewer.tsx:286`
**Impact:** Every zoom change, spread change, or store update forces HTMLFlipBook to re-render. The `renderOnlyPageLengthChange` guard prevents PageFlip library re-initialization, but React still diffs and clones children.
**Fix:** Extract to module-level constant: `const BOOK_STYLE = { backgroundColor: 'transparent' as const };`

### P1-4: Dead code — entire ViewerCore/ directory and 2 components (620 lines)
**Severity:** HIGH — developer confusion, maintenance debt
**Files:**
- `src/components/review/ViewerCore/ViewerLayout.tsx`
- `src/components/review/ViewerCore/ViewerToolbar.tsx`
- `src/components/review/ViewerCore/fullscreenManager.ts`
- `src/components/review/ViewerCore/navigationController.ts`
- `src/components/review/ViewerCore/safeAreaManager.ts`
- `src/components/review/ViewerCore/viewportManager.ts`
- `src/components/review/ZoomableImage.tsx`
- `src/components/review/PageImage.tsx`
**Impact:** 8 files, ~620 lines that serve no purpose. Any developer reading the code will waste time understanding these vestiges.
**Fix:** Delete all 8 files.

### P1-5: No debouncing on flip navigation — rapid clicks cause page counter desync
**Severity:** HIGH — user sees wrong page counter, navigation breaks
**Files:** `src/components/review/WeddingAlbumViewer.tsx:186-187`
**Impact:** Queueing 5 `flipNext()` calls in 800ms causes the book's internal page state and `currentSpread` to desync. Counter jumps erratically.
**Fix:** Add a `isFlipping` ref guard with `setTimeout` reset after `flippingTime + 100ms`.

### P1-6: Voice draft audio never persisted to storage
**Severity:** HIGH — voice draft feature is broken
**Files:** `src/store/voiceStore.ts:112-131`
**Impact:** Recording a voice note then navigating away loses the audio. Only metadata stub (duration, timestamp) is saved. The "draft" label is misleading.
**Fix:** Persist audio blob to IndexedDB or as base64 data URL in localStorage.

### P1-7: PinchZoomWrapper containerSize captured once on mount — never updated
**Severity:** HIGH — pan constraints incorrect after orientation change, keyboard open, or split screen
**Files:** `src/components/review/PinchZoomWrapper.tsx:63-68`
**Impact:** On orientation change (mobile landscape ↔ portrait), the pan boundaries use stale dimensions. User can pan beyond visible area or not far enough.
**Fix:** Add ResizeObserver to keep `containerSize.current` synchronized.

### P1-8: Pin placement broken when zoomed
**Severity:** HIGH — pins placed while zoomed in appear at wrong locations
**Files:** `src/components/review/WeddingAlbumViewer.tsx:341-348`
**Root cause:** Pin overlay captures clicks in screen coordinates, but the book content is scaled. Pin x%/y% are wrong.
**Fix:** Either force `resetZoom()` on pin mode entry, or transform screen coordinates through current zoom transform.

### P1-9: momentum velocity incorrectly computed
**Severity:** HIGH — momentum scroll feels broken (never triggers for slow pans, wildly overshoots for fast flicks)
**Files:** `src/components/review/PinchZoomWrapper.tsx:244-246`
**Root cause:** Velocity = (currentPosition - initialPinchCenter) / totalDuration × 16. Should be (lastFrame - previousFrame) / frameDelta × 16.
**Fix:** Track last 2-3 move positions and compute from most recent delta.

### P1-10: 7 orphaned review_data records (FK violation)
**Severity:** HIGH — referential integrity broken
**Evidence:** All 7 `review_data` records reference album_ids that fail FK constraints (albums may have been deleted).
**Fix:** Delete orphaned records or restore referenced albums.

### P1-11: combined.sql is stale — includes dropped tables and old function definitions
**Severity:** HIGH — bootstrapping a new Supabase project from combined.sql would create an insecure, outdated database
**Fix:** Regenerate combined.sql from all 15 migrations in order.

---

## Medium Priority (P2)

### P2-1: `pageAspect` from `pages[0]` only — mixed layouts have alignment shifts
**Files:** `src/components/review/WeddingAlbumViewer.tsx:99`

### P2-2: `reportPdf.ts` generates .html, not .pdf (misleading name)
**Files:** `src/services/reportPdf.ts:83-93`

### P2-3: Three duplicate profile-creation implementations
**Files:** `src/services/supabase/auth.ts:46-63`, `auth.ts:160-189`, `profiles.ts:12-44`

### P2-4: TOCTOU race condition in slug uniqueness check
**Files:** `src/services/supabase/albums.ts:61-72`

### P2-5: `syncCycleData` double-writes on submitApproval
**Files:** `src/store/reviewCycleStore.ts:142-148`

### P2-6: `overscroll-behavior: none` blocks OS swipe gestures on outer shell
**Files:** `src/components/review/WeddingAlbumViewer.tsx:254`

### P2-7: `total_pages` stored value inconsistent with usage
**Files:** `src/store/reviewStore.ts:64-96`, `WeddingAlbumViewer.tsx:72-76`

### P2-8: Empty string `client_email` stored instead of null
**Files:** `src/services/supabase/albums.ts:81`

### P2-9: `splitImageIntoHalves` creates 6 canvases sequentially
**Files:** `src/utils/image.ts:133-171`

### P2-10: Resolution effect iterates ALL pages on every zoom change
**Files:** `src/components/review/WeddingAlbumViewer.tsx:145-153`

### P2-11: localStorage quota errors silently ignored in updateStore
**Files:** `src/store/updateStore.ts:25`

### P2-12: Storage cleanup errors cause orphaned objects
**Files:** `src/services/supabase/pages.ts:93-102`

---

## Low Priority (P3)

- Theme initialization as module side-effect may flash white
- Keyboard handler stale closure guard is fragile
- `StorageError.originalError` double-declared (TypeScript)
- `scaleRef`/`positionRef` sync uses useEffect instead of useLayoutEffect
- `reviewedHalves` derived value computed on every render
- Keyboard handler stale closure guard fragile
- Unused error-dismissal in `getExistingData`
- `AlbumViewer.tsx` passes `ref={null}` misleadingly
- `notify_review_submitted` trigger function exists but has no trigger

---

## Regression Timeline

| Date | Commit | Change | Regression | Root Cause | Fix |
|------|--------|--------|------------|------------|-----|
| Jun 15 | `b9d5a9c` | Replace slideshow with StPageFlip | Introduced page-flip library, initial storage.ts created with BUCKET_NAME='albums' | No createBucket call, bucket never created | Create bucket manually in Supabase dashboard |
| Jun 17 | `c3c06f4` | Restore public schema grants | Blanket GRANT EXECUTE ON ALL FUNCTIONS to anon | Oversized grant to fix permission errors | Migration 015 issued selective grants, needs applying |
| Jun 17 | `fcbe4e3` | Server-side review data persistence | review_data RLS policy uses album_has_valid_share_link() which is too permissive | Policy checks share link existence, not which album | Fix album_has_valid_share_link to accept album_id param |
| Jun 23 | `ba548c8` | Auto-create profile on first login | Profile creation only in explicit sign-in, not in onAuthStateChange callback | Code duplication, missing enrichment path | Add enrichUserWithProfile to onAuthStateChange |
| Jun 25 | `dcb90de` | Mobile preview mode (landscape-first) | Introduced PreviewViewer with its own set of navigation bugs | Separate viewer diverged from main WeddingAlbumViewer | Removed in commit 4eb8786 |
| Jun 25 | `ca9c437` | Extract PreviewViewer | ViewerCore/ directory and 5 utility files became dead code | Refactor left old files behind | Delete ViewerCore/ directory |
| Jun 25-26 | `aa8fb12` → `4eb8786` | Debug overlay cascade (7 commits) | 7 debug commits for navigation diagnosis that didn't identify root cause | Root cause was missing bucket (images never loaded) | Fixed in this audit |
| Jun 26 | `2dd3377` | renderOnlyPageLengthChange | Prevents constant re-init but React.memo still defeated by inline style | Partial fix | Add BOOK_STYLE constant |
| Jun 29 | `961ee50` | renderImageUrl transform | Transform doesn't work because bucket doesn't exist | Fix addressed symptom, not root cause | Create bucket |

---

## Action Plan (Prioritized)

### Immediate (Before Any User Access)

1. **Create `albums` storage bucket** in Supabase Dashboard
   - ⏱ 5 min | 🔴 Risk: app completely non-functional
   - Verify: hard refresh viewer, images load

2. **Fix `review_data` RLS policy**
   - ⏱ 30 min | 🔴 Risk: all client review data exposed
   - Files: Update `album_has_valid_share_link()` function to accept `p_album_id` parameter
   - Verify: `curl -X GET /rest/v1/review_data` with anon key returns 0 rows

3. **Apply migration 015** in Supabase SQL Editor
   - ⏱ 5 min | 🔴 Risk: anon can execute delete_account, all functions open
   - Verify: `curl -X POST /rpc/delete_account` with anon key → 401

4. **Fix fire-and-forget sync in all 4 stores**
   - ⏱ 2 hours | 🔴 Risk: silent data loss during concurrent review operations
   - Files: `reviewStore.ts`, `requestStore.ts`, `voiceStore.ts`, `reviewCycleStore.ts`
   - Verify: rapidly mark 10 pages → all 10 sync'd to server

5. **Fix auth state change enrichment**
   - ⏱ 30 min | 🔴 Risk: studio_name/phone/logo null after token refresh
   - File: `src/services/supabase/auth.ts:232`
   - Verify: navigate to settings page → studio_name, phone, logo_url all populated

### Today (Before Beta Launch)

6. Delete dead code (ViewerCore/, ZoomableImage.tsx, PageImage.tsx) — 30 min
7. Add flip navigation debounce — 30 min
8. Fix voice draft audio persistence — 1 hour
9. Add ResizeObserver to PinchZoomWrapper — 30 min
10. Fix pin placement when zoomed — 1 hour
11. Fix momentum velocity computation — 30 min
12. Add Zustand selector functions to WeddingAlbumViewer — 1 hour
13. Extract BOOK_STYLE constant — 5 min
14. Clean up orphaned review_data records — 10 min
15. Regenerate combined.sql — 15 min

### This Week (Before Production)

16. Fix TOCTOU slug race with partial unique index
17. Unify 3 profile-creation implementations into 1
18. Add rate limiting on share link access
19. Add ResizeObserver to WeddingAlbumViewer for orientation changes
20. Fix generated .html vs .pdf naming
21. Add localStorage quota error surfacing
22. Fix empty string client_email type

### This Sprint (Quality)

23. Add immer middleware to all Zustand stores
24. Optimize splitImageIntoHalves with parallel canvas
25. Optimize resolution effect to only update visible pages
26. Add monitoring/error reporting (Sentry)
27. Add storage cleanup validation
28. Document architecture in ARCHITECTURE.md
29. Add CI/CD pipeline with lint → typecheck → test → deploy
30. Set up database backups

---

## Key Data Points

```
Database:    15/15 migrations, 15 active tables, 11 RPCs, 7 enums, 34 indexes
Storage:     0 buckets (albums bucket missing)
Albums:      7 total (all draft except 1 awaiting_review)
Pages:       78 total across all albums
Review Data: 7 records (all orphaned — FK violations to albums table)
Storage:     12 orphaned album folders with images, no DB records
Security:    Anon can read ALL review_data, call SECURITY DEFINER RPCs
```

---

## Appendix A: Verified anon REST API Access

```bash
# These ALL work without authentication:

# 1. Read ALL review_data (review status, pins, messages, approvals)
GET /rest/v1/review_data?select=*

# 2. Read any album's full data via RPC (bypasses RLS)
POST /rest/v1/rpc/get_album_review_data
Body: {"p_album_id": "KNOWN-UUID"}

# 3. Read album by share token
POST /rest/v1/rpc/get_album_by_token
Body: {"p_token": "64CHARHEX"}

# 4. Read album by slug
POST /rest/v1/rpc/get_album_by_slug
Body: {"p_slug": "album-slug"}

# 5. Submit review approval
POST /rest/v1/rpc/approve_album
Body: {"p_album_id": "UUID", "p_approved_by": "anyone"}

# 6. Request album changes
POST /rest/v1/rpc/request_album_changes
Body: {"p_album_id": "UUID", "p_message": "any message", ...}
```

---

## Appendix B: Vercel Deployment Configuration

- Auto-deploys from GitHub `main` branch
- SPA rewrites configured in `vercel.json`
- Build: `npm run build`, Output: `dist/`
- Install: `npm ci`
- No preview environment configured
- No environment variable validation
- No deployment hooks or rollback automation

---

## Appendix C: Recomended Security Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; img-src 'self' https://zxbgwhcpdocupaovsoyy.supabase.co; connect-src 'self' https://zxbgwhcpdocupaovsoyy.supabase.co wss://zxbgwhcpdocupaovsoyy.supabase.co" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

*Report generated by OpenCode Forensic Audit · June 29, 2026*
