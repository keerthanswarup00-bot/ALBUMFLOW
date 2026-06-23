# AlbumFlow — Execution Plan

---

## Phase 0: Emergency Security Patch (Week 1 — 8h)

```
1. Apply migration 011 (security_hardening.sql)           [1h]
2. Storage bucket RLS policies for photos bucket          [2h]
3. Fix share_links SELECT policy — restrict columns       [1h]
4. Fix get_album_by_slug RPC                              [1h]
5. Profile data merge from profiles table                 [2h]
6. Remove unused files (see CLEANUP_PLAN)                 [1h]
```

**Verification**: All CRITICAL severity bugs closed. Verify with `supabase db diff`.

---

## Phase 1: Data Integrity Foundation (Week 2-3 — 50h)

```
1. Server-side review persistence:
   a. Design review_data table (album_id, user_id, pins JSON, comments JSON, approval JSON)
   b. Create CRUD service in src/services/supabase/
   c. Refactor reviewStore to sync with server (with localStorage fallback)
   d. Refactor reviewCycleStore, requestStore, voiceStore, updateStore similarly
   e. Migration to create tables
                                                          [40h]
2. Storage cleanup on page/album delete                   [4h]
3. Email notification for new share links (Resend)        [6h]
```

**Verification**: Reviews persist across browser clears. Delete cascades to storage.

---

## Phase 2: Core UX (Week 4-5 — 60h)

```
1. Image reordering (drag & drop)                         [20h]
2. Cover image selection                                  [4h]
3. Image replacement                                      [8h]
4. Page organization UI (remove/replace/rearrange)        [16h]
5. Client management page                                 [12h]
```

**Verification**: Studio can fully organize an album before sharing.

---

## Phase 3: Client Experience (Week 6 — 40h)

```
1. Share link management UI (revoke, expire, history)     [12h]
2. Thumbnail grid navigation in viewer                    [8h]
3. Pin/comment editing                                    [8h]
4. Client-first-use tutorial overlay                      [4h]
5. Pin color-coding                                       [4h]
6. Pin zoom stability across page flips                   [4h]
```

**Verification**: Client workflow is smooth, intuitive, and feature-complete.

---

## Phase 4: Performance & Polish (Week 7-8 — 60h)

```
1. Web Worker for image processing                        [12h]
2. OffscreenCanvas for image processing                   [8h]
3. Pagination for album lists                             [4h]
4. Skeleton loading states                                [8h]
5. Inline form validation                                 [8h]
6. ARIA labels + keyboard navigation                      [12h]
7. Lazy loading (IntersectionObserver)                    [4h]
8. Undo toast for destructive actions                     [4h]
```

**Verification**: Lighthouse score > 90. No main-thread blocking on upload.

---

## Phase 5: Growth Features (Week 9-10 — 60h)

```
1. Multi-designer team support (roles + invitations)      [30h]
2. In-app notification center                             [15h]
3. Client portal (all albums view)                        [15h]
```

**Verification**: Multiple designers can work on same album.

---

## Phase 6: SaaS Ready (Week 11-12 — 60h)

```
1. Stripe payment integration                             [20h]
2. Plan tiers with feature flags                          [15h]
3. Custom domain support                                  [15h]
4. Password-protected galleries                           [10h]
```

**Verification**: Full SaaS flow — signup → trial → subscribe → use.

---

## Phase 7: Testing & Launch (Week 13 — 80h)

```
1. Unit tests for services/stores                         [30h]
2. Integration tests for API flows                        [30h]
3. E2E tests for critical paths                           [20h]
```

**Verification**: Test coverage > 60%. All P0-P2 bugs closed.

---

## What NOT To Do (Postpone indefinitely)

| Feature | Reason |
|---------|--------|
| Mobile app (iOS/Android) | Web app serves MVP; native can wait until PMF |
| AI album sorting | Premature optimization |
| Public API | No demand; internal use only |
| Face detection | Privacy concerns, regulatory complexity |
| Progressive Web App | requires full service worker architecture |
| Full-text search | Supabase pgroonga may be overkill now |
| Real-time collaboration | Requires WebSocket infra |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage serverside migration breaks existing reviews | Medium | High | Two-phase: write to both, read from server, fallback to localStorage |
| Supabase project limits exceeded | Low | High | Monitor usage; optimize queries; enable tier upgrade |
| React 19 library compatibility | Medium | Medium | Pin dependency versions; test in CI |
| Browser audio recording format differences | Low | Medium | Normalize to WebM/OGG; provide fallback |
| Users resist new workflow | Medium | Low | Ship as optional; provide migration guide |

---

## Quick Wins (Do in Sprint 1, before everything else)

| Task | Time | Impact |
|------|------|--------|
| Remove duplicate Toast | 10min | Eliminates double-toast bug |
| Remove unused files | 1h | Cleaner codebase |
| Fix profile data merge | 2h | Complete user profile display |
| Fix get_album_by_slug RPC | 1h | Fixes potential broken URLs |
| Apply migration 011 | 1h | Closes 2 critical security holes |
| Add storage bucket RLS | 2h | Closes 1 critical security hole |
| **Total** | **~7h** | **3 critical/2 high/1 low bugs fixed** |
