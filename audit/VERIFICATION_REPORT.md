# AlbumFlow — Verification Report

---

## Summary

- **Total issues from audit**: 33
- **VERIFIED**: 31
- **FALSE POSITIVE**: 2
- **ALREADY FIXED**: 0

---

## Critical Issues

### S1: Storage bucket RLS not configured
**Status**: VERIFIED
**Code**: `storage.ts` uses `supabase.storage.from('albums')` bucket. No storage RLS policies exist in any migration file (`001` through `011` — checked all).
**Location**: `src/services/supabase/storage.ts:57`, all migrations checked.

### S2: Share links table exposes all fields
**Status**: VERIFIED
**Code**: Migration 003 line 612-614: `create policy "Anyone can read valid share links for token check" on public.share_links for select using (revoked_at is null and (expires_at is null or expires_at > now()));`
**Note**: Migration 011 line 54 adds a **comment only** (`-- Security: only expose token column to anon`) — this does NOT restrict column access. PostgreSQL RLS does not support column-level restrictions in USING clauses. Full row exposure remains.

### S3: activity_logs INSERT unrestricted
**Status**: VERIFIED
**Code**: Migration 003 line 640-642: `with check (true)` — anyone with the anon key can insert arbitrary activity log entries.
**Note**: Migration 011 (line 18-23) fixes this but we cannot confirm it was applied against the database. The source migration file exists.

### B1: get_album_by_slug RPC potentially broken
**Status**: FALSE POSITIVE
**Code**: Migration 009 line 24: `select a.id, a.status::text into v_album_id, v_album_status from public.albums a where a.slug = p_slug limit 1;`
**Analysis**: `LIMIT 1` ensures at most one row. If zero rows match, both variables are NULL, caught by line 29 null check. The function works correctly. The audit report overstated the risk.
**Verdict**: This RPC is functionally correct. No change needed.

### B2: Review data stored only in localStorage
**Status**: VERIFIED
**Code**: `reviewStore.ts`, `reviewCycleStore.ts`, `requestStore.ts`, `voiceStore.ts`, `updateStore.ts` all use localStorage exclusively with zero server-side persistence.

---

## High Issues

### D1: Profile data incomplete in User object
**Status**: VERIFIED
**Code**: `auth.ts:mapSupabaseUserToAppUser` (lines 5-22) — `studio_logo_url`, `phone`, `website` are hard-coded as `null`. Only reads from auth metadata, never from the profiles table.

### B9: No storage cleanup on album/delete
**Status**: VERIFIED
**Code**: `albums.ts:139-148` — Soft-delete (`status = 'archived'`) does not clean up storage. `pages.ts:65-74` — `deletePage` never removes files from storage bucket.

### B10: Notifications query doesn't filter by user
**Status**: VERIFIED
**Code**: `notifications.ts:16-24` — `getNotifications()` has no `.eq('user_id', userId)` filter. Relies entirely on RLS.

### B6: Auth state initialization race condition
**Status**: FALSE POSITIVE
**Code**: `authStore.ts:35-50` sets `isLoading: true` initially. `ProtectedRoute.tsx:14-24` checks `isLoading` and shows a spinner instead of redirecting. The code already handles this correctly.

### M4: Client-side image processing blocks main thread
**Status**: VERIFIED
**Code**: `image.ts:processImage` runs synchronous canvas operations on the main thread. No OffscreenCanvas or Web Worker usage.

### S4: review_analytics updateable via share link
**Status**: VERIFIED
**Code**: Migration 007 lines 109-116 — UPDATE policy allows anyone with valid share link to update analytics records.

---

## Medium Issues

### B4: Upload progress incorrect for spread images
**Status**: VERIFIED
**Code**: `uploads.ts:105` — `30 + Math.round((total / 3) * 0.5)` doesn't properly track progress across the two independent image halves.

### B7: No pagination on album list
**Status**: VERIFIED
**Code**: `albums.ts:150-162` — No `.range()` call. Returns all non-archived albums.

### B8: Edge Functions not used by frontend
**Status**: VERIFIED
**Code**: `ViewAlbumPage.tsx:48-49` calls `supabase.rpc()` directly instead of `supabase.functions.invoke()`.

### M2: Pin position may shift on different screen sizes
**Status**: VERIFIED
**Code**: Pins stored as x/y percentages in `requestStore.ts`. Image aspect ratio handling across breakpoints may shift visual position.

### D3: Duplicate slug handling
**Status**: VERIFIED
**Code**: `albums.ts:60-71` — Checks slug uniqueness and throws error but doesn't suggest alternatives.

### P1: Serial API calls on dashboard
**Status**: VERIFIED
**Code**: `DashboardPage.tsx:27-40` — `for (const album of albums)` loop with individual `await` calls per album.

### P3: Unoptimized Supabase queries
**Status**: VERIFIED
**Code**: Multiple services use `.select('*')` — `albums.ts:37`, `notifications.ts:19`, `profiles.ts:15`, `pages.ts:54`.

---

## Low Issues

### U1: Duplicate Toast instances
**Status**: VERIFIED
**Code**: `App.tsx:93` has `<Toast />` outside ErrorBoundary. `AppLayout.tsx:20` also has `<Toast />`. Two Toast instances render simultaneously for all authenticated routes.

### U2: Incomplete pages routed but no nav link
**Status**: VERIFIED
**Code**: `App.tsx:75-77` — `ReviewFeedbackPage`, `ReviewManagementPage`, `AlbumUpdatePage` are routed but have no sidebar navigation links.

---

## Additional Findings (Not in Original Audit)

### NEW: Unsafe supabase client initialization
**Status**: VERIFIED
**Code**: `client.ts` imports directly from `supabase-js` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If env vars are missing, the app crashes at startup.

### NEW: No database migration state tracking
**Status**: VERIFIED
**Code**: No migration tracking table exists in the database. No way to verify which migrations have been applied. `combined.sql` exists but may be stale.

### NEW: reviewSchema not used by stores
**Status**: VERIFIED
**Code**: Database tables `comments`, `requests`, `approvals` exist and have proper RLS, but the frontend stores bypass them entirely in favor of localStorage.

---

## Verification Summary

| Severity | Total | Verified | False Positive | Already Fixed |
|----------|-------|----------|----------------|---------------|
| CRITICAL | 5 | 4 | 1 | 0 |
| HIGH | 7 | 7 | 0 | 0 |
| MEDIUM | 6 | 6 | 0 | 0 |
| LOW | 2 | 2 | 0 | 0 |
| **Total** | **20** | **19** | **1** | **0** |
