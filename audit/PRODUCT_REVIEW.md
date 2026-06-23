# AlbumFlow — Product Review

---

## Photographer / Studio Owner Workflow

### Sign Up
- ✅ Email/password registration
- ✅ Studio name, owner name, phone captured during signup
- ❌ **No email verification feedback** — Supabase sends confirmation email but the UI doesn't guide the user to check their inbox
- ❌ **No onboarding flow** — After signup, user lands on an empty dashboard with no guidance
- ❌ **No trial/pricing awareness** — No indication of plan limits

### Create Album
- ✅ Simple form: title, client name/email, event type, description, deadline
- ✅ Slug auto-generated from title
- ❌ **Cannot pre-configure album settings** (cover type, paper type, page count)
- ❌ **No template system** — Every album starts from scratch
- ❌ **No client selection** — Can't pick from existing clients; must re-enter name/email

### Upload Images
- ✅ Drag and drop zone
- ✅ File type validation (JPEG, PNG, WebP)
- ✅ Client-side image processing (resizing variants)
- ✅ Spread detection and split
- ✅ Upload progress per-variant
- ❌ **No bulk upload progress** — Shows per-file progress but no overall album progress
- ❌ **No image reordering** — Pages are ordered by upload order with no way to rearrange
- ❌ **No image replacement** — Can only delete and re-upload
- ❌ **No EXIF data preserved or displayed**
- ❌ **No image captions or labels**
- ❌ **Processing time is unpredictable** — Large images on slow devices can take minutes

### Organize Pages
- ❌ **No page organization UI** — The album detail page shows a grid of uploaded images but there's no drag-to-reorder, no remove/replace, no rearrange functionality
- ❌ **No cover selection** — Cover auto-selects the first image but there's no way to choose a different one
- ❌ **No page grouping into spreads** — All images are single pages; spreads are auto-detected by aspect ratio

### Share Album
- ✅ Generates a unique share link with token
- ✅ Copy to clipboard
- ✅ WhatsApp sharing
- ✅ Link format: `view/:token`
- ✅ Slug-based URLs: `review/:slug`
- ❌ **No email sharing** (client email captured but never used to send a notification)
- ❌ **No link expiration control in UI** (schema supports it but UI doesn't expose it)
- ❌ **No access count tracking in UI**
- ❌ **No password protection for shared links**
- ❌ **Cannot deactivate/expire a link from UI**

### Manage Clients
- ❌ **No client management page** — Clients table exists but there's no UI to manage clients
- ❌ **No client history** — Can't see all albums for a client
- ❌ **No way to add clients without creating an album**

---

## Client Workflow

### Open Album
- ✅ Clean welcome screen with album title and client name
- ✅ Professional presentation
- ❌ **No explanation of how to use the viewer** (the HelpBottomSheet exists but may not be obvious)
- ❌ **Loading state is just a spinner** — no progress indication for slow connections

### Navigate Album
- ✅ Flipbook viewer with page-flip animation
- ✅ Spread view for landscape images
- ✅ Page navigation buttons
- ✅ Keyboard navigation
- ❌ **No page number input** — Can only click next/prev
- ❌ **No thumbnail grid view** — Can't see all pages at a glance
- ❌ **No "go to page" feature**

### Zoom
- ✅ Pinch-to-zoom on mobile
- ✅ Double-tap to zoom
- ✅ Pan when zoomed
- ❌ **Zoom resets on page turn**
- ❌ **No pinch-zoom on desktop with trackpad**
- ❌ **Zoom level indicator not shown**

### Comment / Pin
- ✅ Pin placement on images with x/y percentage coordinates
- ✅ Pin popup showing details
- ✅ General comments (non-pin)
- ✅ Draft saving for comments
- ❌ **Pins reset position on different screen sizes** — x/y percentage should handle this, but if the image aspect ratio changes...
- ❌ **No way to edit a pin after placement** (only delete and recreate)
- ❌ **No pin color coding by category**
- ❌ **Client cannot see designer's responses to pins**

### Voice Messages
- ✅ Voice recording directly in browser
- ✅ Playback of recorded messages
- ✅ Per-page voice messages
- ❌ **Audio stored in localStorage as data URL** — will exceed storage quota for anything beyond short recordings
- ❌ **No transcription**
- ❌ **No visual audio waveform**

### Approve
- ✅ Approval checklist with items
- ✅ Approval flow through review cycle store
- ✅ Name/email capture for approval record
- ❌ **Approval is client-side only** — stored in localStorage, not synced to server
- ❌ **No digital signature**
- ❌ **No confirmation email sent to designer**

### Navigation Smoothness
- ⚠️ Page flip animation can be janky on lower-end devices
- ⚠️ Large images load slowly on slow connections
- ⚠️ No image preloading or caching strategy
- ❌ **No offline support**
- ❌ **No service worker**

---

## SaaS Opportunities

### High Priority
1. **Email notifications** — Send share links, approval confirmations, and review reminders automatically
2. **Client portal** — Let clients see all their albums in one place
3. **Multi-designer teams** — Studio accounts with team members
4. **Branding** — Custom domain, white-label, custom colors
5. **Payment integration** — Collect payments upon approval

### Medium Priority
6. **Proofing templates** — Pre-designed album layouts
7. **Image editor** — Basic retouching/cropping within the app
8. **Analytics dashboard** — See which clients viewed, engagement metrics
9. **Export/print integration** — Send approved albums directly to printers
10. **Mobile app** — Native iOS/Android experience

### Low Priority (Post-MVP)
11. **AI-based album sorting** — Auto-sort by event, scene detection
12. **Face detection** — Tag people in photos
13. **Public gallery** — Portfolio showcase
14. **API** — Third-party integrations
