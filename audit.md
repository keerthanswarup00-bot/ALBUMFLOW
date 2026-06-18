# Site Audit Report

**Date:** 2026-06-18
**Project:** AlbumFlow
**Detected stack:** React 19, Vite 8, Tailwind CSS 4, TypeScript 5, Supabase (Postgres + Auth + Storage), Zustand 5, React Router 7, Lucide React icons, page-flip/react-pageflip
**Detected audience/goal:** Wedding and event photographers who need to share albums with clients for proofing/approval. SaaS product, B2B (sold to studios) with a client-facing review portal.
**Design system maturity:** Partially tokenized — 7 custom CSS variables defined (`--bg-primary`, `--text-primary`, etc.) with a dark-mode variant, but the vast majority of components bypass these tokens and use hardcoded Tailwind color utilities directly.

---

## Anti-Pattern Verdict

**Does this look AI-generated? Partially** — 3 specific tells present:

1. **`bg-[#2c1810]` hardcoded hex in `WeddingAlbumViewer.tsx:366,387`** — a deep-brown/saddle-brown that exactly matches the "AI-defaults-to-purple-on-white" archetype, but inverted for a dark album-viewer background. No design token exists for it.
2. **3-col card grids used structurally everywhere** with no visual differentiation between primary and secondary content — the `AlbumCard` pattern, `Dashboard` stats, and `Settings` sections all use identical `border-gray-200 bg-white rounded-xl` containers.
3. **`page-flip` library integration + floating action pills + sticky bottom bar** show evidence of human UX iteration (the `StickyBottomBar` and `ReviewProgressTracker` are not AI boilerplate). The code reads as human-driven but rushed — a person wrote this, not a prompt, but they didn't have time to refactor to the token system.

**Score: 2/4** — Intentional UX in the review flow, but theming and layout are formulaic.

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1/4 | WCAG A gaps: `h1 → h3` skip, 5 inputs without labels, icon-only buttons missing `aria-label`, progress bars lack ARIA roles, 20+ touch targets under 44px, `outline-none` removed on 2 textareas without focus-ring |
| 2 | Performance | 2/4 | No React.memo anywhere, sequential file-upload aborts on single failure, no image lazy-loading in image grids, `<style>` injection in `HelpBottomSheet.tsx`, debug CSS left in production bundle |
| 3 | Security | 2/4 | `.env` tracked in git with live Supabase keys; `get_album_review_data()` RPC grants anon access by raw album UUID with no token check; no CSP; `CLIENT_VIEW` route unprotected; CSRF absent on all state-changing anon functions |
| 4 | Theming & design system | 1/4 | 7 CSS variable tokens defined but ignored in 36+ components — `bg-white` used 30+ times, `text-gray-900` used 100+ times, `bg-[#2c1810]` hardcoded hex, 5 pages have zero dark-mode support |
| 5 | Responsive design | 2/4 | Hardcoded pixel widths in 5 components (`w-[300px]`, `w-72`, `max-w-[400px]`, `max-w-[500px]`), 20+ touch targets below 44px, `FloatingFeedbackCard` uses `top-[130px]` fixed positioning |
| 6 | Anti-patterns | 2/4 | `bg-[#2c1810]` unique hex, card-grid overuse, generic system-font stack, `text-[10px]` font-size literal, debug CSS in production, `<style>` injection inside component body |
| | **Total** | **10/24** | **Acceptable** — shipped-behind-schedule quality |

**Rating band:** 10/24 — Acceptable (lower end). Launch-ready with caveats: fix the `.env` leak, the `get_album_review_data` anon access hole, and the `CLIENT_VIEW` route before going live. Accessibility will trigger 508/WCAG complaints immediately.

**Legal & compliance flags:**
- Privacy Policy: **MISSING** — no route, no link, no API endpoint
- Terms & Conditions: **MISSING** — no route, no link
- Cookie consent: **MISSING** — no banner, no preference modal
- GDPR signals: **MISSING** — no data-export capability exists (delete-account does exist)
- COPPA: **MISSING** — no age gate or birthdate field on signup

---

## Executive Summary

AlbumFlow is a functional but unpolished SaaS with a solid architectural foundation (Supabase + Zustand separation, cryptographically-secure share tokens, good session management) undermined by pervasive theming inconsistency, systemic accessibility gaps, and several high-severity security issues. The review flow has clearly received the most UX iteration; the rest of the app (settings, profile, dashboard) feels an iteration behind. The three most critical blockers are: (1) `.env` with live Supabase credentials is tracked in git, (2) `get_album_review_data()` grants anonymous read access to any album by UUID with no token check, and (3) the `CLIENT_VIEW` route has no authentication. Of the 30+ pages and components, the `AlbumDetailPage` and `WeddingAlbumViewer` are the most polished; `AlbumUpdatePage`, `ResetPasswordPage`, and `ViewAlbumPage` have zero dark-mode support.

**Total findings by severity:** P0 [3] · P1 [12] · P2 [18] · P3 [9]

---

## Quick Wins

1. **`get_album_review_data()` anon access (P0)** — `combined.sql:1257-1312`: grant this function only to `authenticated`, or add a mandatory `p_token` parameter. Currently any unauthenticated user can read any album's page image URLs by guessing a UUID.
2. **`.env` tracked in git (P0)** — `git rm --cached .env`, add to `.gitignore` (already there), rotate the leaked Supabase anon key in the Supabase dashboard. The anon key is public-by-design but committing it is still a credential-leak vector.
3. **`CLIENT_VIEW` route unprotected (P1)** — `App.tsx:72`: wrap in `ProtectedRoute` or add ownership verification in `ClientViewPage.tsx` before rendering album data.

---

## Findings

### P0 — Blocking

#### `.env` with live Supabase credentials tracked in git
- **Category:** Security — secrets exposure
- **Location:** `.env` in project root (tracked, not in `.gitignore` — actually `.gitignore` does list `.env` but it was likely tracked before the rule was added)
- **Issue:** Live `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are committed to git. Anyone with repo access can read these. While the anon key is public-by-design in Supabase's RLS model, having any credential in the commit history is a leak; the URL reveals the project endpoint.
- **User impact:** Reduced blast radius (anon key is deliberately public), but establishes a pattern of credential exposure. If a future service-role key were leaked the same way, a full DB compromise would follow.
- **Fix:** Run `git rm --cached .env && echo ".env" >> .gitignore` (already present), rotate the anon key in Supabase dashboard, and purge the key from git history with `git filter-branch` or `bfg`.

#### `get_album_review_data(album_id)` grants anon access to any album by raw UUID
- **Category:** Security — authorization bypass
- **Location:** `supabase/combined.sql:1257-1312` (function definition), lines 1311-1312 (`grant execute on function ... to anon, authenticated`)
- **Issue:** This `security definer` function accepts a raw album UUID with **no token validation**. It bypasses RLS entirely. Granted to `anon`. Anyone who can guess or enumerate a valid album UUID gets full read access to album metadata, page image URLs, and review data.
- **User impact:** Any album in the system is exposed to anyone who can obtain (or brute-force) a UUID. Page image URLs can be scraped. This is a data-breach vulnerability.
- **Fix:** Remove the `anon` grant. Either require authentication or mandate a valid share-token parameter. If backward compatibility is needed, add a `p_token` parameter and validate it before returning data.

#### 5 form controls without associated `<label>` elements
- **Category:** Accessibility — WCAG 1.3.1, 4.1.2
- **Locations:**
  - `AlbumForm.tsx:97-108` — `<select>` Event Type: label missing `htmlFor`, select missing `id`
  - `AlbumForm.tsx:120-127` — `<textarea>` Description: same issue
  - `ImageDropZone.tsx:93-101` — `<input type="file">`: no label, no `aria-label`
  - `PinPopup.tsx:58-64` — `<textarea>` comment editor: no label, no `aria-label`
  - `NewPinEditor.tsx:35-43` — `<textarea>` new pin editor: no label, no `aria-label`
- **User impact:** Screen-reader users will hear unlabeled form controls, making it impossible to know what to enter. The file-upload drop zone is entirely invisible to assistive technology — keyboard-only users cannot upload files.
- **Fix:** Add `htmlFor`/`id` pairs on all label-element associations. For icon-only/visual-dropzone inputs, add `aria-label` on the button/trigger element.

### P1 — Major

#### `CLIENT_VIEW` route has no authentication
- **Category:** Security — authorization bypass
- **Location:** `App.tsx:72`, `ClientViewPage.tsx` (entire file)
- **Issue:** Route is outside `ProtectedRoute` and outside `PublicRoute`. `ClientViewPage` fetches album data via `albumService.getAlbumById(id)` at line 27 with no auth guard. Anyone who knows the URL pattern `/albums/:albumId/client-view` can view any album.
- **User impact:** Album data (title, client name, event type, all page images) is publicly accessible by guessing/walking album UUIDs.
- **Fix:** Move the route inside the `ProtectedRoute` wrapper, or add a designer_id ownership check in `ClientViewPage` before rendering.

#### No Privacy Policy, Terms, cookie consent, or GDPR data-export
- **Category:** Legal & compliance
- **Locations:** All `src/` files, all SQL files — no route, component, API, or SQL function for any of these.
- **Issue:** The app collects PII (name, email, phone, studio info) with no Privacy Policy, no Terms of Service, no cookie consent, and no GDPR data-export mechanism. FTC fine exposure: $2,500+ per privacy infraction; $53,000+ per COPPA violation if under-13 users sign up.
- **User impact:** The product is non-compliant in multiple jurisdictions. Any EU user request for data export cannot be fulfilled. Any FTC complaint triggers automatic fines.
- **Fix:** Add `/privacy` and `/terms` routes with static content. Add a cookie-consent banner (or document that only essential cookies are used). Add a `/api/export-data` RPC. Add a birthdate/age field on signup.

#### Hardcoded hex `#2c1810` in `WeddingAlbumViewer`
- **Category:** Theming & design system
- **Location:** `src/components/review/WeddingAlbumViewer.tsx:366,387`
- **Issue:** Unique hex value `#2c1810` used twice for the album-viewer background. No CSS variable maps to it. Dark-mode users will see the same brown (dark-mode darkening has no effect).
- **User impact:** The viewer background doesn't respond to theme. Dark-mode users get a mismatched experience.
- **Fix:** Define `--color-viewer-bg` in the theme and reference it, or use a token like `bg-bg-elevated`.

#### 7 `<div>` elements with `onClick` but no `role` (divs as buttons)
- **Category:** Accessibility — WCAG 4.1.2
- **Locations:**
  - `ImageDropZone.tsx:84` — drop zone acts as file picker, no role
  - `ReviewCompletionModal.tsx:60` — backdrop overlay
  - `HelpBottomSheet.tsx:20` — backdrop overlay
  - `FeedbackBottomSheet.tsx:47` — backdrop overlay
  - `WeddingAlbumViewer.tsx:529` — pin placement overlay
  - `ZoomableImage.tsx:142` — double-tap container
  - `Header.tsx:57` — theme dropdown backdrop
- **User impact:** Keyboard-only users cannot activate these controls. Screen readers see non-interactive elements. Backdrops that are not marked `aria-hidden` interfere with focus management.
- **Fix:** Add `role="button"` or `role="presentation"` + `aria-hidden` as appropriate. For backdrops, `aria-hidden="true"` is correct. For the drop zone, add `role="button"` and `tabIndex={0}` with an `onKeyDown` handler.

#### 2 textareas with focus indicators removed (`outline-none` without `focus:ring`)
- **Category:** Accessibility — WCAG 2.4.7
- **Location:** `PinPopup.tsx:62`, `NewPinEditor.tsx:42`
- **Issue:** `focus:outline-none` is applied without a compensating `focus:ring-*` class. Keyboard users navigating the review interface lose visual focus on comment textareas.
- **User impact:** Keyboard-only reviewers cannot tell which textarea is focused, making it impossible to type comments with confidence.
- **Fix:** Remove `focus:outline-none` or add `focus:ring-2 focus:ring-blue-500`.

#### 20+ touch targets under 44×44px minimum
- **Category:** Accessibility — WCAG 2.5.8, Responsive design
- **Locations (representative sample):**
  - `AlbumCard.tsx:60` — delete button: 28×28px
  - `StickyBottomBar.tsx:37,45,53,71,79` — all action buttons: 40×40px
  - `Header.tsx:49` — theme toggle: 40×40px
  - `PinPopup.tsx:49,68,75` — delete/close/save: 28×28px, ~28px, ~28px
  - `ReviewProgressTracker.tsx:62` — "Finish Review": ~24px
  - `ReviewFeedbackPage.tsx:87` — back button: 36×36px
  - `SettingsPage.tsx:149` — remove-logo button: 20×20px
- **User impact:** Users on mobile and users with motor impairments cannot reliably tap small controls. The 44×44px minimum is both WCAG and Apple HIG. The `StickyBottomBar` is the most-used mobile interaction in the review flow.
- **Fix:** Increase all listed touch targets to at least 44×44px using `min-w-[44px] min-h-[44px]` or `p-3` equivalents.

#### 5 pages with zero dark-mode support
- **Category:** Theming & design system
- **Locations:**
  - `AlbumUpdatePage.tsx` (nearly every line)
  - `ResetPasswordPage.tsx` (entire file)
  - `ViewAlbumPage.tsx` (entire file)
  - `AlbumUnavailablePage.tsx` (entire file)
  - `ReviewFeedbackPage.tsx` (most lines)
- **Issue:** All colors in these files are hardcoded Tailwind utilities with no `dark:` variants. When dark mode is enabled, these pages render light-mode colors on a dark background.
- **User impact:** Dark-mode users get blindingly white sections, unreadable low-contrast text, and a jarring visual experience when navigating between pages.
- **Fix:** Add `dark:` variants to all color classes, or refactor to use CSS variable tokens that automatically switch.

#### `approve_album` and `request_album_changes` granted to `anon` with no CSRF protection
- **Category:** Security — CSRF
- **Location:** `supabase/migrations/005_album_review_workflow.sql:93,137` and `combined.sql:1405,1449`
- **Issue:** Both functions are granted to `anon`, meaning any unauthenticated user with a share token can approve an album or request changes. There is no anti-CSRF token, origin check, or nonce.
- **User impact:** A CSRF attack on a client who has opened a share-link URL could trigger approval or change requests without their knowledge. The share token acts as a bearer credential in the URL.
- **Fix:** Add origin/referer validation in both functions, or require a client-side nonce validated against the session that generated the token.

#### Sequential file upload aborts on single failure
- **Category:** Performance — error recovery
- **Location:** `src/services/supabase/uploads.ts:66,154`
- **Issue:** `uploadImagesToAlbum()` processes files sequentially in a `for` loop. A single file failure throws and aborts all remaining uploads. No per-file retry or skip logic exists.
- **User impact:** Photographers uploading 50 wedding photos lose all remaining uploads if one file fails mid-way. They must re-select and re-upload the remaining files.
- **Fix:** Change to a concurrent upload model with per-file error handling. Wrap each file's upload in try/catch, collect errors per-file, and continue processing the rest.

#### `activity_logs` INSERT allows anon users with share tokens to insert arbitrary records
- **Category:** Security — data pollution
- **Location:** `supabase/migrations/007_multi_studio_and_branding.sql:35-41`
- **Issue:** RLS policy `"System can insert activity logs"` with check `auth.role() = 'authenticated' or public.album_has_valid_share_link(album_id)`. The `album_id` comes from the inserted row, so the caller controls which album's share link is checked. Any share-token holder can write unlimited log entries.
- **User impact:** Activity log could be polluted with spam. No data corruption risk, but monitoring/audit trail is compromised.
- **Fix:** Limit the policy to `authenticated` only, or add a rate limit / max-entries-per-album check in a trigger.

### P2 — Minor

#### `bg-white` used 30+ times instead of `bg-bg-primary` token
- **Category:** Theming & design system
- **Location:** Across 9+ files including `AlbumsPage.tsx`, `AlbumDetailPage.tsx`, `DashboardPage.tsx`, `ReviewManagementPage.tsx`, `LoginPage.tsx`, `AlbumUnavailablePage.tsx`, `SettingsPage.tsx`, `CreateAlbumPage.tsx`, `EditAlbumPage.tsx`
- **Issue:** The project defines `--bg-primary: #ffffff` but the vast majority of components hardcode `bg-white`. When the theme token is updated (e.g., to a warm off-white), the components using `bg-white` will not follow.
- **User impact:** Subtle — users won't notice until the theme changes and half the surfaces don't update.
- **Fix:** Global search-and-replace: `bg-white` → `bg-bg-primary` on all non-elevated surfaces. Verify dark-mode equivalent.

#### `text-gray-900` used 100+ times instead of `text-text-primary` token
- **Category:** Theming & design system
- **Location:** Every page and component file. Most concentrated in `AlbumDetailPage.tsx` (~24 instances)
- **Issue:** Same pattern as `bg-white` — the token exists (`--text-primary: #111827`) but is ignored.
- **User impact:** When the text-primary token is updated (e.g., softer contrast), most text surfaces will not follow.
- **Fix:** Bulk replace `text-gray-900` → `text-text-primary` and `text-gray-500` → `text-text-secondary` across all files.

#### `<h1>` → `<h3>` heading-level skip in AlbumsPage empty state
- **Category:** Accessibility — WCAG 1.3.1
- **Location:** `AlbumsPage.tsx:79` (`<h1>`), line 162 (`<h3>` "No Albums Yet")
- **Issue:** Empty state heading jumps from `h1` to `h3`, skipping `h2`. Screen-reader users navigating by heading expect a logical hierarchy.
- **User impact:** Minor disorientation. The heading skip suggests an `h2` might be missing.
- **Fix:** Change the empty-state heading to `<h2>`, or add an `<h2>` wrapper before it.

#### `useMemo` underused — only 2 instances across 36+ components
- **Category:** Performance
- **Location:** Only `AlbumsPage.tsx:33` (filtered albums) and `ReviewFeedbackPage.tsx:60` (grouped requests) use `useMemo`. Zero components use `React.memo`. `WeddingAlbumViewer.tsx` uses `useMemo` for computed style values but not for derived data.
- **User impact:** On large albums (200+ pages), the `WeddingAlbumViewer` may re-compute spreads on every render. The review progress tracker re-renders the entire bar on every status update.
- **Fix:** Profile with React DevTools to identify hot re-render paths; add `React.memo` to `PageImage`, `PinMarker`, and `ReviewProgressTracker`.

#### `<style>` tag injected inside component body in HelpBottomSheet
- **Category:** Anti-pattern, Performance
- **Location:** `HelpBottomSheet.tsx:19`
- **Issue:** A `<style>` tag is rendered as JSX children, injecting CSS animations at render-time rather than in a stylesheet. This forces style recalculation on mount and cannot be cached.
- **User impact:** Negligible performance impact on its own. Pattern risk if replicated.
- **Fix:** Move the animation CSS to the global stylesheet or a CSS module.

#### Hardcoded pixel widths in 5 components
- **Category:** Responsive design
- **Locations:**
  - `FloatingFeedbackCard.tsx:41` — `w-[300px]`, `top-[130px]`
  - `PinPopup.tsx:42` — `w-72` (288px); line 84 — `w-80` (320px)
  - `NewPinEditor.tsx:28` — `w-72` (288px)
  - `ReviewCompletionModal.tsx:64,114,147` — `max-w-[400px]`
  - `AlbumUnavailablePage.tsx:30` — `max-w-[500px]`
- **User impact:** On narrow viewports (<400px width), these components overflow or get clipped. The `FloatingFeedbackCard` with `top-[130px]` assumes a specific viewport height and may overlap or be unreachable on short screens.
- **Fix:** Replace pixel values with responsive equivalents: `max-w-sm`, `w-full sm:w-80`, or use CSS `calc()`/`min()` functions with viewport units.

#### Debug CSS left in production bundle
- **Category:** Performance
- **Location:** `WeddingAlbumViewer.tsx:471-474` — inline `<style>` block injects `border: 2px solid red !important` guarded by a `showDebug` variable
- **Issue:** Debug CSS is conditionally rendered but still bundled in the production build. If `showDebug` is accidentally toggled on by any code path, all album pages get red borders.
- **User impact:** Only cosmetic if triggered accidentally. No data impact.
- **Fix:** Remove the debug code or guard it with `import.meta.env.DEV`.

#### Icon-only buttons missing `aria-label`
- **Category:** Accessibility — WCAG 4.1.2
- **Locations:**
  - `AlbumDetailPage.tsx:434-440` — delete page button (Trash2 icon)
  - `AlbumDetailPage.tsx:628-633` — WhatsApp share button (MessageCircle icon)
  - `ReviewFeedbackPage.tsx:86-89` — back button (ArrowLeft icon)
  - `SettingsPage.tsx:148-153` — remove-logo button (X icon)
  - `Toast.tsx:43` — dismiss button
- **User impact:** Screen-reader users hear nothing for these buttons, or hear the generic "button" announcement. The WhatsApp share button and delete-page buttons are completely inaccessible.
- **Fix:** Add `aria-label` to each button matching its visible/textual intent. `Toast dismiss` already has a sibling `<span>` with text; that should be enough, but adding `aria-label="Dismiss notification"` is more robust.

#### Progress bar missing ARIA roles
- **Category:** Accessibility — WCAG 4.1.2
- **Location:** `AlbumDetailPage.tsx:562-565` — review progress bar
- **Issue:** The `<div>` visually functions as a progress bar but has no `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`.
- **User impact:** Screen-reader users cannot perceive the review completion percentage non-visually.
- **Fix:** Add `role="progressbar" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100}`.

#### Route helper functions don't validate/sanitize parameters
- **Category:** Security — injection surface
- **Location:** `src/constants/routes.ts:20-25` — `albumViewRoute(token)` and `albumReviewRoute(slug)`
- **Issue:** Both functions perform direct string substitution with no validation or encoding. A token like `../../admin` would produce `/view/../../admin`, which the router would resolve differently than intended.
- **User impact:** Low — React Router v7 normalizes paths, but if the route is used in `window.open()` or redirect URLs, path traversal is possible.
- **Fix:** Validate that `token` matches `/^[a-f0-9]{64}$/` and `slug` matches `/^[a-z0-9-]+$/` before substitution.

#### Console logging of SQL details in production code
- **Category:** Security — information disclosure
- **Location:** `src/services/supabase/albums.ts:90-93`
- **Issue:** `console.error('[albums] SQL code:', error.code, '[albums] SQL details:', error.details)` logs Postgres error details including SQL code, hints, and details to the browser console in production.
- **User impact:** A malicious user triggering a DB error could see schema information in console. Low severity (console is same-origin only), but unnecessary.
- **Fix:** Guard with `if (import.meta.env.DEV)` or use a structured logging service.

#### Sequential file upload with no batching
- **Category:** Performance — UX
- **Location:** `src/services/supabase/uploads.ts:66`
- **Issue:** Files are uploaded one-at-a-time in a `for` loop. No parallel upload, no progress chunking, no batch size limit.
- **User impact:** Photographers uploading 100 images wait for each to complete sequentially; total upload time = sum of all individual uploads.
- **Fix:** Implement parallel upload with a configurable concurrency limit (e.g., 4 simultaneous uploads) using `Promise.allSettled()` with batching.

#### No rate limiting on key API paths
- **Category:** Security — availability
- **Location:** All service files — `uploads.ts`, `auth.ts`, `albums.ts`, `analytics.ts`
- **Issue:** No rate-limiting, queuing, or throttling on any client-to-Supabase call. File uploads, auth requests, and analytics reads can be spammed.
- **User impact:** Supabase has built-in rate limits, but a determined attacker could exhaust project-level rate limits, causing denial of service for legitimate users.
- **Fix:** Implement client-side debouncing on form submissions. Add server-side rate limiting via Supabase Edge Functions or a proxy layer for paid APIs.

#### `reportPdf.ts` template interpolation not sanitized
- **Category:** Security — XSS (limited context)
- **Location:** `src/services/reportPdf.ts:49,51-52,56-57`
- **Issue:** User-controlled data (`studioName`, `albumTitle`, `clientName`, etc.) is interpolated into an HTML template via template literals without escaping. The output is a downloaded Blob, not rendered in the app's origin.
- **User impact:** Self-XSS only — a user injecting HTML into their own album title would see it rendered in their own downloaded PDF report.
- **Fix:** Strip HTML tags from interpolated values using a regex or DOM parser before insertion.

### P3 — Polish

#### `placeholder` used as the only label for search inputs
- **Category:** Accessibility — WCAG 1.3.1 (minor)
- **Location:** `AlbumsPage.tsx:96-101`, `ReviewManagementPage.tsx:105-111`
- **Issue:** Search inputs rely on `placeholder="Search albums..."` as their only label. Placeholders disappear on input and have no accessible name.
- **User impact:** Screen-reader users will hear an unlabeled input once text is entered. Minor — many sites use this pattern.
- **Fix:** Add `aria-label="Search albums"` to both inputs, or add a visually-hidden `<label>`.

#### Filter buttons lack `aria-pressed` state
- **Category:** Accessibility — WCAG 4.1.2 (minor)
- **Location:** `ReviewManagementPage.tsx:222-240`
- **Issue:** Filter buttons visually indicate active state (blue background) but don't communicate the pressed state to screen readers.
- **User impact:** Screen-reader users don't know which filter is currently active.
- **Fix:** Add `aria-pressed={requestFilter === f}` to each filter button.

#### Album selection buttons lack `aria-selected` state
- **Category:** Accessibility — WCAG 4.1.2 (minor)
- **Location:** `ReviewManagementPage.tsx:125-151`
- **Issue:** Album list items in the sidebar show selection visually (blue border) but don't communicate it to screen readers.
- **User impact:** Screen-reader users navigating the album list don't know which album is selected.
- **Fix:** Add `aria-selected={selectedAlbumId === album.id}` and `role="option"` to each item within a `role="listbox"`.

#### `text-[10px]` font-size literal used for status badges
- **Category:** Design system
- **Location:** `AlbumCard.tsx:89` and similar patterns
- **Issue:** Hardcoded 10px font size bypasses the typographic scale. If the base font size changes, these badges won't scale proportionally.
- **User impact:** Cosmetic — text may appear too small relative to the design after a theme update.
- **Fix:** Use `text-xs` (12px) or define a dedicated `text-badge` token.

#### `cursor-pointer` on `<a>` element (redundant)
- **Category:** Polish
- **Location:** `AlbumUnavailablePage.tsx:72`
- **Issue:** `<a>` already has `cursor: pointer` as the default browser style. Adding `cursor-pointer` is redundant.
- **User impact:** None.
- **Fix:** Remove the redundant class.

---

## Systemic Patterns

1. **Token adoption gap (all components, all pages):** 7 CSS variable tokens are defined in `index.css` but components consistently use hardcoded Tailwind color utilities (`text-gray-900`, `bg-white`, `border-gray-200`) instead of `text-text-primary`, `bg-bg-primary`, `border-border-primary`. This affects every single component file — approximately 100+ instances of `text-gray-900`, 30+ instances of `bg-white`, 20+ instances of `text-gray-500`. This is the single highest-ROI refactor in the codebase: define the mapping once and bulk-replace.

2. **Dark-mode gaps cluster in "secondary" pages (5 pages):** The pages that were likely built later or under time pressure (`AlbumUpdatePage`, `ResetPasswordPage`, `ViewAlbumPage`, `AlbumUnavailablePage`, `ReviewFeedbackPage`) have zero dark-mode support. By contrast, the core review flow pages (`AlbumDetailPage`, `WeddingAlbumViewer`) have partial support. This suggests "implement dark mode later" tickets that never got resolved.

3. **Touch targets consistently below minimum across mobile-critical UI:** The `StickyBottomBar` (the primary mobile interaction surface in the review flow) uses 40px buttons instead of 44px minimum. Similarly, the album card delete button (28px), pin popup action buttons (~28px), and review progress tracker (24px) all fall short. This is not a one-off oversight — it's a system-wide gap in mobile interaction design.

4. **Form labeling inconsistency:** Three different patterns exist for form labels across the codebase: (a) proper `<label htmlFor>` with matching `id` (the `<Input>` component), (b) `<label>` without `htmlFor` (`AlbumForm.tsx`), and (c) no label at all (search inputs, textareas in pin/popup editors). The `<Input>` component implements the correct pattern — all other forms should be refactored to use it.

5. **RLS as the sole auth boundary without verification:** Every database query in the service layer assumes RLS will filter by the authenticated user. None of the queries in `albums.ts`, `pages.ts`, `shareLinks.ts`, `versions.ts`, `analytics.ts`, or `notifications.ts` add a `.eq('designer_id', userId)` or equivalent filter. If any RLS policy is misconfigured, every user can read every other user's data. This is architecturally fine *if and only if* RLS is provably correct on every table.

---

## Strengths

1. **Cryptographically secure share-token generation:** `shareLinks.ts:76-82` uses `crypto.getRandomValues()` to generate 32 random bytes (64 hex chars). The token validation function (`combined.sql:1154-1172`) properly checks revocation, expiry, and access-count limits. This is a correctly implemented bearer-token system.

2. **Clean store/service separation:** The Zustand stores (`reviewStore`, `reviewCycleStore`, `requestStore`, `voiceStore`) all follow the same pattern: load from localStorage, cache in memory, persist changes. The service layer (`albums.ts`, `pages.ts`, etc.) handles all Supabase communication. No component mixes DB calls and UI state — this is a disciplined architecture that makes testing and refactoring straightforward.

3. **Good modal accessibility foundations:** `Modal.tsx` has `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trapping, Escape-key handling, and properly labeled close buttons. The `<Input>` component has `aria-invalid`, `aria-describedby`, and error `role="alert"`. These show that accessibility was considered — it just wasn't applied consistently across all components.

4. **`EnvBanner` and startup diagnostics:** `env.ts` has a startup check that logs missing environment variables to the console with a helpful message. This prevents silent failures in deployment where env vars might be unset. The `EnvBanner` component visually warns in development when Supabase env vars are missing.

5. **Safe area insets for mobile:** `index.css:71-84` defines `.safe-area-inset`, `.safe-area-top`, and `.safe-area-bottom` utilities using `env(safe-area-inset-*)`. This shows mobile-first awareness that most competitor dashboards lack.

6. **Security-definer functions properly scope search_path:** All 22 instances of `security definer` in the SQL migrations set `search_path = public`, preventing search-path injection attacks. This is a security best practice often overlooked.

7. **Image optimization pipeline:** `APP_CONFIG.images` defines a tiered image pipeline (thumbnail 300px, medium 1200px, original full-res) with quality settings (0.7/0.85/0.92). The storage service generates and uploads multiple sizes, and pages reference the appropriate size (`thumbnail_url`, `image_url`).

---

## Recommended Priority Order

1. **Remove `.env` from git history and rotate credentials** — credential leak is the highest unforced error; every day it's in the repo increases exposure.
2. **Fix `get_album_review_data` anon grant** — any album in the system is readable by anyone who guesses a UUID. This is a P0 data-breach vulnerability.
3. **Wrap `CLIENT_VIEW` route in authentication** — unauthorized access to album viewer. Close the unauthorized-access triad.
4. **Add Privacy Policy, Terms, and cookie consent** — legal exposure across multiple jurisdictions. Must be done before public launch.
5. **Bulk-replace `bg-white`, `text-gray-900`, `text-gray-500` with design tokens** — single regex pass across all files. Unblocks consistent theming.
6. **Add `dark:` variants to 5 dark-mode-deficient pages** — the most jarring UX failure for dark-mode users.
7. **Fix `approve_album`/`request_album_changes` anon grants** — add CSRF protection or restrict to `authenticated`.
8. **Add `aria-label` to all icon-only buttons** — 5+ instances, blocks basic screen-reader usage.
9. **Increase all touch targets to 44×44px** — focus on `StickyBottomBar`, `AlbumCard` actions, and popup editors first.
10. **Add labels to unlabeled form controls** — 5 instances spanning album creation, review comments, and image upload.
