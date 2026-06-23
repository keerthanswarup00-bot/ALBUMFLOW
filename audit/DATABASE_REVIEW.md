# AlbumFlow — Database Review

---

## Tables Analysis

### `users` → `profiles` (dual system)

**Status**: The original `public.users` table was removed in migration 008. The `profiles` table is now the source of studio data.

**Issue**: Migration 008 drops `public.users` and recreates FKs to point to `auth.users`. If migrations were not applied sequentially, the database could have a mix of both.

**Recommendation**: Verify that `public.users` table no longer exists in the production database.

### `albums`

| Column | Type | Issues |
|--------|------|--------|
| `designer_id` | uuid → auth.users | ✅ FK exists, indexed |
| `client_email` | text | ❌ No validation constraint |
| `slug` | text | ✅ Unique index on (designer_id, slug) |
| `status` | enum | ✅ Good, but `active` status unused |
| `phase` | enum | ✅ Good |

**Missing**: No `cover_image_url` auto-update trigger.
**Missing**: No `client_id` auto-association when client exists.

### `album_versions`

| Column | Type | Issues |
|--------|------|--------|
| `status` | enum | ✅ uploading/processing/ready/failed |
| `version_number` | integer | ✅ Unique with album_id |

**Missing**: No `version_label` auto-generation.
**Missing**: No trigger to set `ready` status when pages > 0.

### `album_pages`

**Issue**: `image_url`, `medium_url`, `original_url`, `thumbnail_url` — storing Supabase public URLs which don't change, but if bucket policy changes (e.g., adds CDN), these become stale.

**Missing**: `medium_url` and `original_url` were added in migration 001. Earlier pages may not have these.

### `share_links`

| Column | Type | Issues |
|--------|------|--------|
| `token` | text | ✅ Unique, indexed |
| `max_access_count` | integer | ✅ Good for limiting usage |
| `expires_at` | timestamptz | ✅ Good for time-limited links |

**Missing**: No `require_auth` flag for extra-secure albums.

### `requests`

**Missing**: No `page_number` column — all page references are through `page_id` FK.
**Missing**: No `resolution_notes` column for designer responses.
**Issue**: `request_album_changes` inserts with `page_id = null` — loses page context.

### `notifications`

**Good**: Properly indexed with partial index on unread.
**Missing**: No push notification integration (email, in-app).

### `activity_logs`

**Issue**: Has `ip_address` column but the application never populates it.
**Issue**: INSERT was unrestricted before migration 011.

---

## Index Analysis

### Existing Indexes
All critical query paths are indexed:
- `albums`: designer_id, status, phase, created_at, event_type, (designer_id, slug)
- `album_versions`: album_id, status
- `album_pages`: album_version_id, (album_version_id, spread_number)
- `requests`: album_id, page_id, status
- `share_links`: token, album_id, created_by
- `notifications`: user_id, (user_id, is_read)
- `review_analytics`: album_id (unique)
- `profiles`: user_id

### Missing Indexes
- `albums`: `(designer_id, status)` — composite for designer dashboard query
- `albums`: `(designer_id, created_at)` — for "my albums sorted by date"
- `album_pages`: `(album_version_id, page_number)` — already has unique constraint which creates index

### Redundant Indexes
- `idx_revisions_album` and `idx_revisions_type` — `idx_revisions_type` already covers album filtering

---

## Relationships

```
auth.users
  ├── profiles (1:1, user_id → auth.users.id)
  ├── albums (1:N, designer_id → auth.users.id)
  ├── share_links (1:N, created_by → auth.users.id)
  ├── comments (1:N, author_id → auth.users.id)
  ├── notifications (1:N, user_id → auth.users.id)
  └── activity_logs (1:N, actor_id → auth.users.id)

albums
  ├── clients (N:1, client_id → clients.id) — ON DELETE SET NULL
  ├── album_versions (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── requests (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── approvals (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── comments (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── revisions (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── activity_logs (1:N, album_id → albums.id) — ON DELETE CASCADE
  ├── album_settings (1:1, album_id → albums.id) — ON DELETE CASCADE
  ├── review_analytics (1:1, album_id → albums.id) — ON DELETE CASCADE
  └── share_links (1:N, album_id → albums.id) — ON DELETE CASCADE

album_versions
  └── album_pages (1:N, album_version_id → album_versions.id) — ON DELETE CASCADE

album_pages
  └── requests (1:N, page_id → album_pages.id) — ON DELETE SET NULL
```

---

## Scalability Assessment

### 100 Studios
- ✅ No issues — all queries use indexed columns
- ✅ Storage: ~50GB assuming 500MB per studio
- ✅ RLS performance: no measurable overhead

### 1,000 Studios
- ⚠️ `DashboardPage` serial loop fetching versions per album becomes slow (N+1 problem)
- ⚠️ `getActiveAlbums` fetches all non-archived albums without pagination
- ⚠️ Notifications query limited to 50 but no user filter in query (RLS applies after)
- ⚠️ `review_analytics` query uses `IN (subquery)` pattern which may be slow at scale

### 10,000 Studios
- ❌ `albums.ts:getActiveAlbums` — no pagination, would return 10,000+ rows
- ❌ `DashboardPage` — serial fetch per album is O(n) and will timeout
- ❌ `getAllAnalytics` — uses nested query that could be optimized with a join
- ❌ Storage: 5TB+ — needs CDN for image delivery
- ❌ No connection pooling configuration visible
- ❌ Supabase free tier has limits (100MB database, 1GB storage, 50,000 rows)

### Recommendations for Scale
1. Add pagination to all list queries
2. Replace serial loops with batch queries or join-based queries
3. Add connection pooling (PgBouncer)
4. Move image processing to server-side (Supabase Image Transformation or CDN)
5. Implement database query timeout handling
6. Add read replicas for analytics queries
