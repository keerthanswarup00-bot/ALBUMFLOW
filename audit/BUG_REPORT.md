# AlbumFlow — Bug Report

---

## Functional Bugs

### B1: get_album_by_slug RPC potentially broken
**Severity**: CRITICAL
**Impact**: Slug-based album URLs (`/review/:slug`) may not work
**Root cause**: In `migrations/009_album_slug_routes.sql:24`, the SQL statement `select a.id, a.status::text into v_album_id, v_album_status` may fail because `INTO` with multiple variables requires the query to return exactly one row and the columns must match the variable types. If the slug matches multiple albums (possible if unique constraint fails) this will error.
**Fix**: Use `SELECT a.id, a.status::text INTO ... FROM public.albums a WHERE a.slug = p_slug LIMIT 1` or use `SELECT ... INTO STRICT` with proper error handling.

### B2: Review data stored only in localStorage
**Severity**: CRITICAL
**Impact**: All review progress, approvals, change requests, and voice messages are lost if the user clears browser data or switches devices
**Root cause**: `reviewStore.ts`, `reviewCycleStore.ts`, `requestStore.ts`, `voiceStore.ts`, `updateStore.ts` all use localStorage exclusively with no server-side sync
**Fix**: Implement server-side persistence for review data using existing database tables

### B3: Cover image auto-set effect may cause infinite loop
**Severity**: HIGH
**Impact**: Potential re-render loop on AlbumDetailPage
**Root cause**: `AlbumDetailPage.tsx:108-117` — `useEffect` watches `[pages, currentAlbum, updateAlbum]`. When `updateAlbum` completes, it updates `currentAlbum` in the store, which triggers the effect again. The `if (!currentAlbum.cover_image_url)` check prevents infinite execution, but if the update fails silently, the effect runs every render.
**Fix**: Only trigger the effect once by using a ref to track if cover has been set.

### B4: Upload progress incorrect for spread images
**Severity**: MEDIUM
**Impact**: Upload progress shows incorrect percentage for spread (wide) images
**Root cause**: `uploads.ts:85-111` — The overallPercent calculation for spread images uses variant progress (`30 + Math.round((total / 3) * 0.5)`) but spread images process left/right halves independently, each reporting variant progress. The combined percentage doesn't account for the two-image workflow.
**Fix**: Track progress per-half and combine.

### B5: Album page deletion orphans storage files
**Severity**: HIGH
**Impact**: Deleted page images remain in Supabase Storage, wasting space
**Root cause**: `AlbumDetailPage.tsx:handleDeletePage` calls `pageService.deletePage(pageId)` which deletes the database row but never removes the files from storage
**Fix**: Add storage cleanup when deleting pages (delete original, medium, thumbnail from storage bucket).

### B6: Auth state initialization race condition
**Severity**: MEDIUM
**Impact**: Brief flash of login page before redirect for authenticated users
**Root cause**: `authStore.ts:35-49` — `initialize` sets `isLoading: true` initially, then fetches session. During this time, `ProtectedRoute` may briefly redirect to login before loading completes.
**Fix**: Add an initial loading state check in `ProtectedRoute`.

### B7: No pagination on album list
**Severity**: MEDIUM
**Impact**: As album count grows, `getActiveAlbums` returns ever-larger result sets, slowing down the app
**Root cause**: `albums.ts:150-162` — Queries all non-archived albums without limit/offset
**Fix**: Add pagination with Supabase `.range()`.

### B8: Edge Functions not used by frontend
**Severity**: MEDIUM
**Impact**: Three Edge Functions defined but never called from the frontend
**Root cause**: `ViewAlbumPage.tsx` calls `supabase.rpc()` directly instead of using `supabase.functions.invoke()`. The Edge Functions exist but the frontend bypasses them.
**Fix**: Route public API calls through Edge Functions for additional security layers.

### B9: No storage cleanup on album delete
**Severity**: HIGH
**Impact**: Soft-deleting an album (status = 'archived') leaves all images in storage
**Root cause**: `albums.ts:139-148` — Only sets status to 'archived', doesn't clean up storage
**Fix**: Add storage cleanup on album archive/delete.

### B10: notifications query doesn't filter by user
**Severity**: MEDIUM
**Impact**: Returns notifications from all users, relying only on RLS to filter
**Root cause**: `notifications.ts:16-24` — `getNotifications` selects all notifications without a `.eq('user_id', userId)` filter
**Fix**: Add user_id filter before RLS.

---

## UI Bugs

### U1: Toast appears outside ErrorBoundary
**Severity**: LOW
**Impact**: Toast component is rendered outside ErrorBoundary in App.tsx (line 93), but also inside AppLayout (line 20). Two Toast instances may render simultaneously.
**Root cause**: `App.tsx` has `<Toast />` at line 93, and `AppLayout.tsx` also has `<Toast />` at line 20.
**Fix**: Remove one of the Toast instances.

### U2: /review-management route accessible but no nav link
**Severity**: LOW
**Impact**: Route exists but users can't navigate to it
**Fix**: Add to sidebar navigation or remove route if not ready.

### U3: BottomNav missing on some protected pages
**Severity**: MEDIUM
**Impact**: Mobile navigation inconsistency
**Root cause**: `AppLayout.tsx` includes `BottomNav` but some routes are wrapped differently
**Fix**: Ensure consistent layout wrapping.

### U4: No loading state for album detail actions
**Severity**: LOW
**Impact**: Users may click buttons multiple times during async operations
**Root cause**: `AlbumDetailPage.tsx` doesn't disable buttons during async operations in several places
**Fix**: Add loading states to all async actions.

---

## Mobile Bugs

### M1: Zoom resets on page turn
**Severity**: HIGH
**Impact**: Users must re-zoom every time they turn a page in the flipbook viewer
**Root cause**: `WeddingAlbumViewer.tsx` resets zoom state on page change
**Fix**: Maintain zoom state across page changes or reset smoothly.

### M2: Pin position may shift on different screen sizes
**Severity**: MEDIUM
**Impact**: Pin comments placed on one device may appear in wrong position on another device
**Root cause**: Pin positions stored as x/y percentages but image aspect ratio handling across breakpoints may shift the visual position
**Fix**: Use viewport-independent coordinate system and ensure consistent image rendering.

### M3: Audio recording may fail on some browsers
**Severity**: MEDIUM
**Impact**: Voice message recording not available on all devices
**Root cause**: `VoiceMessageRecorder.tsx` uses MediaRecorder API which has varying support
**Fix**: Add fallback message or detect support before showing record button.

### M4: Client-side image processing blocks main thread
**Severity**: HIGH
**Impact**: Uploading large images freezes the browser, especially on mobile
**Root cause**: `image.ts:processImage` runs synchronous canvas operations on the main thread
**Fix**: Use OffscreenCanvas or Web Workers for image processing.

---

## Data Bugs

### D1: Profile data incomplete in User object
**Severity**: HIGH
**Impact**: `studio_logo_url`, `phone`, `website` are never populated from profile
**Root cause**: `auth.ts:mapSupabaseUserToAppUser` only reads from auth metadata, not the profiles table
**Fix**: Merge profile data into the User object after auth initialization.

### D2: Client email not validated
**Severity**: LOW
**Impact**: Invalid email addresses can be saved for clients
**Fix**: Add email validation to AlbumForm.

### D3: Duplicate slug handling not shown to user
**Severity**: MEDIUM
**Impact**: When slug is taken, error is shown but slug suggestion not offered
**Root cause**: `albums.ts:60-71` — Checks slug uniqueness and throws error but doesn't suggest alternatives
**Fix**: Auto-suggest alternative slug or allow user to choose.

---

## Security Bugs

### S1: Storage bucket RLS not configured
**Severity**: CRITICAL
**Impact**: Anyone with image URL can access any album's images
**Fix**: Add RLS policies to storage bucket (see SECURITY_AUDIT.md).

### S2: Share links table exposes all fields to anyone with valid token
**Severity**: CRITICAL
**Impact**: Anyone can enumerate share links and see album_id, access counts, creation metadata
**Fix**: Restrict columns exposed in SELECT policy or redesign the public access pattern.

### S3: activity_logs unrestricted insert
**Severity**: HIGH
**Impact**: Anyone can insert arbitrary activity log entries (fixed in migration 011, but must be applied)
**Fix**: Apply migration 011.

### S4: review_analytics updateable via share link
**Severity**: MEDIUM
**Impact**: Anyone with a share link can modify analytics data
**Fix**: Restrict analytics update policy to authenticated users only.

---

## Performance Bugs

### P1: Serial API calls on dashboard
**Severity**: HIGH
**Impact**: Dashboard loads slowly for users with many albums
**Root cause**: `DashboardPage.tsx` loops through albums serially with `for...of` and `await`
**Fix**: Use `Promise.allSettled()` for parallel requests.

### P2: No image lazy loading for album pages
**Severity**: MEDIUM
**Impact**: All page images load simultaneously on album detail page
**Fix**: Use IntersectionObserver-based lazy loading.

### P3: Unoptimized Supabase queries
**Severity**: MEDIUM
**Impact**: Queries fetch all columns when only a subset is needed
**Root cause**: Many services use `.select('*')` instead of specific column lists
**Fix**: Select only needed columns.

### P4: No image caching strategy
**Severity**: MEDIUM
**Impact**: Images re-download on every page load
**Fix**: Configure Supabase Storage cache headers or use CDN.
