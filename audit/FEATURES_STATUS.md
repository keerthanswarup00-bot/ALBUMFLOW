# AlbumFlow — Feature Inventory

---

## ✅ WORKING — Confirmed Functional

| Feature | Location | Notes |
|---------|----------|-------|
| User registration | `auth.ts:signUp`, `CreateStudioPage` | Creates auth user + profile |
| Email/password login | `auth.ts:signInWithEmail`, `LoginPage` | Standard Supabase Auth |
| Session persistence | `auth.ts:getCurrentSession` | Auto-restores on page load |
| Password reset | `auth.ts:resetPasswordForEmail` | Sends reset email |
| Create album | `albums.ts:createAlbum`, `CreateAlbumPage` | Validates slug uniqueness |
| Edit album | `albums.ts:updateAlbum`, `EditAlbumPage` | Updates all fields |
| Soft-delete album | `albums.ts:deleteAlbum` | Sets status to 'archived' |
| List active albums | `albums.ts:getActiveAlbums` | Excludes 'archived' |
| Image upload | `uploads.ts:uploadImagesToAlbum` | Variant generation + upload |
| Image processing | `image.ts:processImage` | Thumbnail/medium/original variants |
| Spread detection | `image.ts:isSpreadImage` | Splits wide images into two pages |
| Share link generation | `shareLinks.ts:createShareLink` | Creates 64-char hex token |
| Token-based album viewing | `ViewAlbumPage` | Fetches via `get_album_by_token` RPC |
| Slug-based album viewing | `ViewAlbumPage` | Fetches via `get_album_by_slug` RPC |
| Flipbook viewer | `WeddingAlbumViewer.tsx` | Page flip with react-pageflip |
| Pin placement on images | `PinMarker.tsx`, `PinPopup.tsx`, `NewPinEditor.tsx` | x/y percentage coordinates |
| Voice message recording | `VoiceMessageRecorder.tsx` | Browser MediaRecorder API |
| Welcome screen | `WelcomeScreen.tsx` | Client-facing intro |
| Dark mode | `useTheme.ts` | System/light/dark toggle |
| Responsive sidebar | `Sidebar.tsx`, `BottomNav.tsx` | Desktop sidebar, mobile bottom nav |
| Toast notifications | `Toast.tsx`, `uiStore.ts` | Success/error/info |
| Dashboard stats | `DashboardPage.tsx` | Total albums, active reviews, approved |
| Album search/filter/sort | `AlbumsPage.tsx` | Client-side filtering |
| Album card grid | `AlbumCard.tsx` | Cover image, title, status |
| Delete confirmation modal | `DeleteAlbumModal.tsx` | Confirm before delete |
| Error boundary | `ErrorBoundary.tsx` | Catches render errors |
| Loading spinner | `Spinner.tsx` | Page-level and inline spinners |
| Client view as designer | `ClientViewPage.tsx` | Designer can preview their album |
| WhatsApp share | `AlbumDetailPage.tsx` | Pre-formatted message |
| Password update | `auth.ts:updatePassword` | Authenticated user can change password |
| Account deletion | `auth.ts:deleteAccount` | Via `delete_account` RPC |
| Empty states | Various pages | Shown when no data exists |
| Meta tags | `useMetaTags.ts` | Dynamic OG tags for shared album links |
| Toast notifications | `uiStore.ts` | Managed via Zustand |
| Modal system | `Modal.tsx` | Reusable modal component |

---

## ⚠️ PARTIALLY WORKING — Needs Fixes

| Feature | Issue | Location |
|---------|-------|----------|
| **Review workflow** | All review cycle data stored in localStorage only — lost on browser clear or device change | `reviewCycleStore.ts`, `reviewStore.ts` |
| **Approval flow** | `approve_album` RPC works, but approval is also stored client-side only | `reviewCycleStore.ts:submitApproval` |
| **Change requests** | Created in localStorage AND server via RPC, but the two don't sync | `requestStore.ts`, `request-changes` Edge Function |
| **Album cover auto-set** | Sets cover to first page thumbnail, but runs in a `useEffect` that could cause update loops | `AlbumDetailPage.tsx:108-117` |
| **Profile loading** | Profile fetched but mapped user object from auth metadata doesn't include studio_logo_url, phone, website | `auth.ts:mapSupabaseUserToAppUser` |
| **Notifications** | Table exists with triggers but no in-app notification center UI | `notifications.ts`, `AlbumDetailPage.tsx` |
| **Analytics tracking** | Table exists but client-side analytics (viewing time, pages viewed) not implemented | `analytics.ts`, no tracking code in viewer |
| **Album page deletion** | Individual pages can be deleted but images remain in storage (orphaned) | `AlbumDetailPage.tsx:handleDeletePage` |
| **Share link management** | Only shows active link, cannot view/revoke history | `AlbumDetailPage.tsx` |
| **Upload during processing** | User can navigate away during upload — no warning | `ImageUploadSection.tsx` |
| **Edge Functions** | Defined but not called from frontend — frontend calls RPCs directly | `supabase/functions/` |

---

## ❌ BROKEN — Not Functional

| Feature | Issue | Location |
|---------|-------|----------|
| **`get_album_by_slug` RPC** | Uses `select a.id, a.status::text into v_album_id, v_album_status` — this syntax may fail because `INTO` with multiple variables from SELECT requires the columns to match variable order. **Bug**: `v_album_id` and `v_album_status` may not be populated correctly. | `migrations/009_album_slug_routes.sql:24` |
| **Review feedback page** | Routed but no navigation link; appears incomplete | `ReviewFeedbackPage.tsx` |
| **Album update page** | Routed but not integrated into workflow | `AlbumUpdatePage.tsx` |
| **Review management page** | Routed but no navigation link; appears incomplete | `ReviewManagementPage.tsx` |
| **Activity logs** | Table exists but never populated by application code | `activity_logs` table |
| **Revisions** | Table exists but never used | `revisions` table |
| **Album settings** | Table exists but no UI to configure settings | `album_settings` table |
| **Client management** | Table exists but no UI | `clients` table |
| **Upload progress for spread images** | The overallPercent calculation for spreads uses variant progress but the left/right halves independently report; the combined percentage may be incorrect | `uploads.ts:85-111` |
| **Voice recording storage** | Audio data stored as data URL in localStorage — will exceed quota for any recording > 1 minute | `voiceStore.ts` |

---

## 🔲 MISSING — Expected but Absent

| Feature | Rationale | Priority |
|---------|-----------|----------|
| **Email notifications** | Client email captured but never used to send share link | P0 |
| **Page reordering** | Essential for album organization | P1 |
| **Server-side review persistence** | Reviews lost on browser clear | P0 |
| **Image replacement** | Can't swap an image without deleting and re-uploading | P1 |
| **Cover image selection** | Auto-assigned from first page, no manual selection | P1 |
| **Client management UI** | clients table exists but no UI | P1 |
| **Share link management** | Cannot revoke, expire, or view all links | P1 |
| **In-app notifications** | Database supports, UI missing | P1 |
| **Multi-user / team support** | No role system or team accounts | P2 |
| **Pagination** | All list queries return unlimited results | P2 |
| **Image CDN optimization** | Images served raw from Supabase Storage | P2 |
| **Drag-and-drop page reorder** | Essential UX for designers | P1 |
| **Batch operations** | Delete all, move all actions | P2 |
| **Keyboard shortcuts** | Missing for power users | P2 |
| **Fullscreen mode toggle** | Schema supports but not exposed in viewer UI | P2 |
| **Zoom controls (buttons)** | Only pinch-to-zoom, no +/- buttons | P2 |
| **Thumbnail navigation grid** | No "view all pages" grid | P2 |
| **Client history** | Can't see client's past albums | P2 |
| **Onboarding flow** | No guided first-use experience | P3 |
| **Email designer on new comment** | No server-side notification sending | P1 |
| **Server-side image processing** | All processing is client-side | P2 |
| **Input validation feedback** | Form validation exists but no inline error messages | P2 |
| **Cookie consent banner** | Cookie policy page exists but no consent mechanism | P3 |
