# AlbumFlow — UX Review

---

## Overall UX Score: 50/100

---

## Mobile Experience

### What Works Well
- **BottomNav** — Mobile-first navigation with tab bar is a good pattern (similar to Instagram/Google Photos)
- **Safe area insets** — Proper handling of notches and home indicators
- **Touch-friendly sidebar** — Slide-out overlay for navigation
- **Pinch-to-zoom** — Works well in the viewer
- **Dark mode** — Full support with smooth transitions
- **Responsive grid** — Album grid adapts from 1 to 4 columns

### What Needs Improvement

#### 1. Touch Targets
- ❌ Page delete buttons in album detail are 28x28px — below the recommended 44x44pt minimum touch target
- ❌ Pin markers are small and hard to tap on mobile
- ❌ Filter buttons in AlbumsPage use `rounded-full px-3 py-1.5` — small touch targets
- ✅ Bottom nav items are well-sized

#### 2. Navigation
- ❌ **No swipe-to-go-back gesture** on mobile
- ❌ **No pull-to-refresh** on album lists
- ❌ **Back button placement** inconsistent (some pages use a top-left link, others have browser back)
- ❌ **Album detail page** has too much vertical scrolling; critical actions (upload, share) are below the fold

#### 3. Loading States
- ❌ Full-page spinners (`PageSpinner`) for all loading — should use skeleton screens
- ❌ Image upload shows no progress during processing phase (just "processing" text)
- ❌ No progressive image loading (blur-up technique)

#### 4. Empty States
- ✅ Good empty states on Dashboard and AlbumsPage
- ❌ Album detail page empty state is a dashed border with icon — could be more helpful with guidance text
- ❌ No empty state for client viewing an album with no pages — shows a good message but could suggest contacting the studio

---

## Accessibility (a11y)

### What's Missing
- ❌ **No ARIA labels** on many interactive elements (icons, buttons without text)
- ❌ **No skip-to-content link**
- ❌ **No focus indicators** visible on all elements (some have `focus:ring-2` but not all)
- ❌ **Color contrast** — Dark theme text on `#161F2E` background may fail WCAG AA for smaller text
- ❌ **No reduced motion support** — Page flip animation doesn't check `prefers-reduced-motion`
- ❌ **Form inputs** lack error announcements for screen readers
- ✅ Some inputs have `aria-label` attributes

### Recommendations
- Add `aria-labels` to all icon-only buttons
- Implement keyboard navigation for the flipbook viewer
- Add focus trap in modals
- Add screen reader announcements for toast messages
- Use correct heading hierarchy (h1 → h2 → h3)

---

## Design Patterns to Adopt

### From Apple Photos
- **Grid view with pinch-to-zoom-out** — Allow users to zoom out to see thumbnail grid
- **Smooth transitions** — Page flips should be buttery smooth
- **Bottom toolbar** — Contextual actions at the bottom (Apple Photos' share/edit/favorites bar)
- **Moment-based grouping** — Group photos by date/event

### From Google Photos
- **Automatic backup/upload progress** — Show upload progress in a persistent notification-like bar
- **Search by face/object** — Future feature
- **Sharing with link** — Clean share sheet with expiration options
- **Memory timeline** — Show what happened "on this day"

### From Pixieset
- **Client gallery view** — Clean, minimalist grid with lightbox
- **Download all** — Single-click download option
- **Favorites** — Let clients mark favorites
- **Password-protected galleries** — Simple password entry before viewing

### From Pic-Time
- **Sales integration** — Print ordering directly from proofing gallery
- **Side-by-side comparison** — Show original vs edited images
- **Client questionnaire** — Collect preferences before shooting

### From Notion
- **Smooth optimistic UI** — Updates appear instantly, sync in background
- **Command palette (Cmd+K)** — Quick navigation
- **Drag and drop everywhere** — Reorder pages, move between albums

### From Linear
- **Keyboard-first navigation** — All actions available via keyboard
- **Clean empty states** — Illustrated empty states with clear next steps
- **Loading skeletons** — Animated placeholder content instead of spinners
- **Undo support** — Toast with undo action for destructive operations

---

## Specific UX Issues

### Issue 1: Welcome Screen → Viewer Flow
**Problem**: Welcome screen requires click to start, then viewer loads. This adds friction.
**Solution**: Auto-dismiss welcome screen after 3 seconds or have a "skip" button. Show viewer loading behind the welcome screen.

### Issue 2: Upload Experience
**Problem**: Upload section is at the bottom of a long album detail page. After selecting files, there's no way to see uploads in progress without scrolling.
**Solution**: 
- Move upload section to a more prominent position
- Show a persistent upload progress bar at the top of the page
- Allow background uploads with a floating progress indicator

### Issue 3: No Visual Hierarchy in Album Detail
**Problem**: Album Info, Studio Info, Client Info, Images, and Upload sections all have equal visual weight.
**Solution**: Make the image grid primary, collapse info sections into expandable panels.

### Issue 4: Client Viewer Lacks Context
**Problem**: Client opens a link and sees a welcome screen with their name, but no instructions on what to do.
**Solution**: Add a brief tutorial overlay on first visit: "Tap to zoom, long-press to add a comment, swipe to turn pages."

### Issue 5: No Undo
**Problem**: Deleting a page, changing status, or modifying album settings has no undo option.
**Solution**: Implement toast-based undo for destructive actions.

### Issue 6: Form Validation Feedback
**Problem**: Forms (CreateAlbum, EditAlbum, Profile) show errors only after submission, not inline.
**Solution**: Add real-time field validation with inline error messages.

---

## Priority UX Fixes

| Issue | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Upload progress visibility | High | Low | P1 |
| Welcome screen → viewer flow | Medium | Low | P1 |
| Pin touch targets on mobile | High | Low | P1 |
| Skeleton loading instead of spinners | Medium | Medium | P2 |
| Form validation feedback | Medium | Low | P1 |
| Undo for destructive actions | Medium | Low | P2 |
| ARIA labels + keyboard nav | High | Medium | P1 |
| Image lazy loading | Medium | Low | P2 |
| Reorder pages (drag & drop) | High | High | P1 |
| Client first-use tutorial | Medium | Low | P2 |
