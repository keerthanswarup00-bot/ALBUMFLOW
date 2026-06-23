# AlbumFlow — Roadmap

---

## P0 — Safety & Data Integrity (Must fix immediately)

| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 1 | Apply migration 011 (security hardening) | 1h | DB access |
| 2 | Add storage bucket RLS policies | 2h | Supabase Storage admin |
| 3 | Fix share_links table RLS (restrict columns) | 1h | None |
| 4 | Server-side review data persistence | 40h | New DB tables + store refactor |
| 5 | Fix get_album_by_slug RPC | 1h | DB access |
| 6 | Add storage cleanup on page/album delete | 4h | None |
| 7 | Profile data merge from profiles table | 2h | None |
| 8 | Add email notification for new share links | 20h | Email service (Resend/SendGrid) |

**Total P0: ~71h**

---

## P1 — Essential Product Features (Within 2 weeks)

| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 1 | Image reordering (drag & drop) | 20h | None |
| 2 | Cover image selection UI | 4h | None |
| 3 | Page organization UI (remove, replace, rearrange) | 30h | None |
| 4 | Client management page | 16h | None |
| 5 | Share link management (revoke, expire, view history) | 12h | P0-1 |
| 6 | Image replacement | 8h | None |
| 7 | Client-side image processing → Web Worker | 16h | None |
| 8 | Pagination for album lists | 4h | None |
| 9 | Skeleton loading states | 8h | None |
| 10 | Inline form validation | 8h | None |
| 11 | ARIA labels + keyboard navigation | 16h | None |
| 12 | Upload progress visibility | 4h | None |

**Total P1: ~150h**

---

## P2 — Growth & Polish (Within 1 month)

| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 1 | Multi-designer team support (roles) | 40h | P0-7 (profile merge) |
| 2 | In-app notification center | 20h | None |
| 3 | Custom domain / white-label | 30h | P0-2 |
| 4 | Client portal (all albums in one place) | 40h | P1-4 (client management) |
| 5 | Thumbnail grid navigation in viewer | 8h | None |
| 6 | Keyboard shortcuts for power users | 8h | None |
| 7 | Pin color-coding by category | 4h | None |
| 8 | Pin/comment editing | 8h | None |
| 9 | Image lazy loading (IntersectionObserver) | 4h | None |
| 10 | Optimistic UI with background sync | 20h | None |
| 11 | Undo toast for destructive actions | 8h | None |
| 12 | OffscreenCanvas image processing | 8h | P1-7 |
| 13 | Pin zoom stability across page flips | 8h | None |
| 14 | Pull-to-refresh on mobile lists | 4h | None |
| 15 | Client-first-use tutorial overlay | 8h | None |
| 16 | Storage file orphan cleanup script | 4h | None |

**Total P2: ~222h**

---

## P3 — SaaS Monetization (Within 2 months)

| # | Task | Effort | Dependencies |
|---|------|--------|-------------|
| 1 | Payment integration (Stripe) | 40h | P2-2 |
| 2 | Plan tiers (limit albums/clients per tier) | 20h | P1-4 |
| 3 | Custom branding/theming | 24h | P2-3 |
| 4 | Proofing templates | 40h | P1-1 |
| 5 | Basic image editor (crop, retouch) | 60h | P1-7 |
| 6 | Analytics dashboard | 30h | None |
| 7 | Email notifications (designer upvote/downvote) | 16h | P0-8 |
| 8 | Album export to PDF | 20h | None |
| 9 | Public portfolio gallery | 24h | P1-4 |
| 10 | Password-protected galleries | 8h | P1-5 |

**Total P3: ~282h**

---

## Technical Debt (Continuous)

| # | Task | Effort | When |
|---|------|--------|------|
| 1 | Remove unused files | 2h | Sprint 1 |
| 2 | Consolidate duplicate viewers | 4h | After P1-1 |
| 3 | Remove incomplete pages | 1h | Sprint 1 |
| 4 | Unify Toast instances | 1h | Sprint 1 |
| 5 | Add automated tests | 80h | Ongoing |
| 6 | Edge Function integration | 8h | P0-1 |
| 7 | Route config centralization | 4h | Sprint 2 |

**Total Tech Debt: ~100h**

---

## Summary

| Priority | Hours | Key Deliverable |
|----------|-------|-----------------|
| P0 | 71 | Security + data integrity |
| P1 | 150 | Essential product features |
| P2 | 222 | Polish + team features |
| P3 | 282 | SaaS monetization |
| Tech | 100 | Code health |
| **Total** | **825h** | **~4 developer-months** |
