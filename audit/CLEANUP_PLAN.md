# AlbumFlow — Cleanup Plan

---

## Safe to Delete Immediately

These files/folders appear orphaned, unused, or superseded:

| File | Reason | Notes |
|------|--------|-------|
| `src/components/ui/ContainerAnimationWrapper.tsx` | Unused — never imported | Remove |
| `src/components/ui/Typography.tsx` | Unused — never imported | Remove |
| `src/pages/ReviewFeedbackPage.tsx` | Routed but no nav link, incomplete | Remove or implement |
| `src/pages/ReviewManagementPage.tsx` | Routed but no nav link, incomplete | Remove or implement |
| `src/pages/ForgotPasswordPage.tsx` | Duplicated by auth UI | Verify vs `ResetPasswordPage` |
| `src/components/review/WeddingSpecificViewer.tsx` | Alternative viewer, never imported | Remove |
| `src/components/albums/AlbumsList.tsx` | Superseded by album-card based Grid/List | Verify usage |
| `supabase/functions/validate-token/index.ts` | Not called from frontend | Remove or hook up |
| `supabase/functions/approve-album/index.ts` | Not called from frontend | Remove or hook up |
| `supabase/functions/request-changes/index.ts` | Not called from frontend | Remove or hook up |
| `supabase/combined.sql` | Duplicates individual migrations | Remove (keep migrations as source of truth) |
| `supabase/seed.sql` | Sample data may be stale | Review before removing |
| Any file matching `**/*.bak`, `**/*.orig` | Artifacts of merge/file operations | Find and remove |

---

## Safe to Delete After Migration

These depend on specific functionality that should be migrated first:

| File | Depends On | Target |
|------|-----------|--------|
| `src/store/reviewStore.ts` | Server-side review persistence | After server storage |
| `src/store/reviewCycleStore.ts` | Server-side review cycle | After server storage |
| `src/store/requestStore.ts` | Server-side change requests | After server storage |
| `src/store/voiceStore.ts` | Server-side audio storage | After server storage |
| `src/store/updateStore.ts` | Server-side update tracking | After server storage |
| `src/utils/image.ts` | Server-side image processing | After OffscreenCanvas/Worker |

---

## Consolidation Opportunities

### 1. Duplicate API Functions
The `src/services/supabase/` folder has services that could be consolidated:
- `uploads.ts` and `pages.ts` overlap in functionality
- `albums.ts` has inline image fetching logic that could live in `images.ts`

### 2. Duplicate Viewers
- `WeddingAlbumViewer.tsx` (580 lines) has multiple concerns: zoom, navigation, pins, voice, flip
- Extract: zoom controls, pin system, voice recorder, thumbnail bar into separate components

### 3. Route Cleanup
- Remove or implement the 3 incomplete pages (ReviewFeedback, ReviewManagement, AlbumUpdate)
- Consolidate route definition into a central route config (currently scattered in App.tsx)

### 4. Service Worker / PWA Manifests
- `public/manifest.json`, `public/service-worker.js` exist but never registered
- Either implement PWA or remove these files

---

## Files to Keep But Rename

| Current Name | Suggested Name | Reason |
|-------------|---------------|--------|
| `WeddingAlbumViewer.tsx` | `AlbumViewer.tsx` | Not wedding-specific |
| `WeddingSpecificViewer.tsx` | (delete instead) | Obsolete |
| Various `*.css` files | Use CSS modules or Tailwind | Several CSS files suggest partial Tailwind migration |

---

## File Inventory Summary

| Category | Count | Notes |
|----------|-------|-------|
| Pages | 20 | 3 incomplete, 17 functional |
| Components | ~35 | Many small, well-encapsulated |
| Stores | 8 | 5 localStorage-only, 1 auth, 1 ui, 1 media |
| Services | 10 | Well-factored Supabase wrappers |
| Migrations | 11 | Linear, sequential |
| Edge Functions | 3 | Unused from frontend |
| Config files | ~15 | Standard Vite/TS/ESLint setup |
| CSS files | ~8 | Mix of global, component, and utility CSS |
| Types files | ~3 | Centralized in `src/types/index.ts` |
| Utils | ~5 | image.ts is a performance hotspot |
