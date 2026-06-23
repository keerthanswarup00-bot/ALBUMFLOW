# AlbumFlow — Security Audit

---

## Scoring

| Category | Score |
|----------|-------|
| Overall Security | 40/100 |
| Supabase RLS | 45/100 |
| Auth Implementation | 60/100 |
| OWASP Compliance | 35/100 |

---

## 1. Secrets Exposure

### ✅ .env is gitignored
The `.env` file is in `.gitignore` and not tracked.

### ⚠️ Live credentials in `.env` (Low risk)
The `.env` file contains live Supabase project credentials:
- `VITE_SUPABASE_URL=https://zxbgwhcpdocupaovsoyy.supabase.co`
- `VITE_SUPABASE_ANON_KEY=sb_publishable_WHbH8gBv1XTaAxyV8OVxuQ_aaOen43F`

The anon key is **designed to be public** (it's the client-side key with RLS enforcement). However, this `.env` file should never be shared or committed.

### ✅ No service_role key exposed
The service role key is not present in any code or `.env` file.

### ⚠️ Low-risk: Hardcoded URLs
- `VITE_APP_URL=http://localhost:5173` — dev only, not a security concern
- Edge Functions use hardcoded Deno/std URLs — fine

---

## 2. Supabase RLS Audit — CRITICAL FINDINGS

### CRITICAL: Public.users table was removed but code still references it

Migration 008 removed `public.users` and now references `auth.users` directly. However:
- **`supabase/migrations/003_share_links_and_missing_tables.sql`** and earlier schemas define FKs pointing to `public.users`
- Migration 008 tries to fix this by dropping and recreating FKs to `auth.users`
- If migration 008 was not applied in order, the database still has stale FK references

**Impact**: Potential orphaned records or failed inserts.

### CRITICAL: activity_logs INSERT unrestricted

In migration 003 (and the version in combined.sql):
```sql
create policy "System can insert activity logs"
  on public.activity_logs for insert
  with check (true);
```

This allows **anyone** (including unauthenticated users with the anon key) to insert into `activity_logs`. Migration 011 partially fixes this:
```sql
  to authenticated
  with check (auth.role() = 'authenticated');
```
But only if migration 011 was applied.

### CRITICAL: REVIEW ANALYTICS UPDATE allows anon access

In migration 007:
```sql
create policy "System can update analytics"
  on public.review_analytics for update
  using (exists (
    select 1 from public.albums a
    where a.id = review_analytics.album_id
    and (a.designer_id = auth.uid() or public.album_has_valid_share_link(a.id))
  ));
```

Anyone with a valid share link can **update** analytics records. While analytics data is low-sensitivity, this is still a violation of least privilege.

### CRITICAL: share_links public SELECT — exposes token data

In migration 007 (corrected in 011):
```sql
create policy "Anyone can read valid share links for token check"
  on public.share_links for select
  using (revoked_at is null and (expires_at is null or expires_at > now()));
```

Before migration 011, this policy existed without the `security` column restriction. Migration 011 adds `-- Security: only expose token column to anon` as a **comment only** — it does NOT actually restrict column access. PostgreSQL RLS doesn't support column-level restrictions in USING clauses.

**Impact**: Anyone with the anon key can enumerate all valid share links, their album_ids, access counts, and creation metadata.

### HIGH: No RLS on requests SELECT for anon

Review workflow functions (`approve_album`, `request_album_changes`) are security definer and work correctly. However, if a client discovers they can query `requests` table directly (via browser console), they might be able to read requests data.

Migration 007 adds a policy:
```sql
create policy "Clients can view requests via valid share link"
  on public.requests for select
  using (public.album_has_valid_share_link(album_id));
```
This is intentional for the client to see their own requests, but it means **anyone with a valid share link** can read all requests for that album, including requests made by other clients.

### HIGH: comments table allows anyone with share link to insert

Migration 007:
```sql
create policy "Clients can insert comments via valid share link"
  on public.comments for insert
  with check (public.album_has_valid_share_link(album_id));
```

Anyone with the share link can insert comments. No rate limiting, no CAPTCHA.

### HIGH: No user isolation for share link access

All share links are public URLs. Anyone who obtains the URL can:
1. View all album pages
2. Add comments (if the app implements comment insertion)
3. Request changes
4. View analytics data

**Mitigation**: Share links should be revokable and expirable — this functionality exists in the schema but is not exposed in the UI.

---

## 3. Multi-Tenant Isolation Check

### Can one studio access another studio's albums?
- **RLS on albums**: `designer_id = auth.uid()` — YES, properly isolated for authenticated requests.
- **Share links**: Anyone with a valid token can view the album regardless of studio. This is **by design** for client sharing, but the token should be treated as a password.
- **Direct table access**: RLS prevents cross-studio access when authenticated.

**Verdict**: Multi-tenant isolation is **partially implemented**:
- ✅ Authenticated designer access is properly isolated by `designer_id`
- ❌ Share link access treats the token as the sole authorization — no tenant boundary enforcement
- ❌ If a share token is leaked, anyone can access that album

### Can one studio access another studio's images?
- Storage bucket permissions were **not found** in the codebase. There are no storage RLS policies defined in any migration.
- **Impact**: If storage RLS is not configured at the bucket level, any authenticated user (or even anon users with a public bucket) can access any album's images if they know the path.

### Can one studio access another studio's comments/requests?
- RLS policies are scoped to `designer_id = auth.uid()` — yes, isolated for authenticated access.
- Share link-based access is scoped to the album — not isolated between tenants but that's by design for client access.

---

## 4. Authentication Review

### Login Flow
- ✅ Email/password authentication via Supabase Auth
- ✅ Session persistence with auto-refresh
- ✅ Password reset flow
- ❌ **No multi-factor authentication**
- ❌ **No social login** (Google, Apple, etc.)
- ❌ **No magic link / passwordless login**
- ❌ **No session timeout or idle timeout**

### Session Management
- ✅ `autoRefreshToken: true`
- ✅ `detectSessionInUrl: true` (handles OAuth redirects)
- ✅ `onAuthStateChange` listener
- ❌ No token refresh error handling
- ❌ No session revocation on password change

### Role Management
- ❌ **No role-based access control** — only designer vs. client (client has no auth account)
- ❌ No admin role
- ❌ No team/studio member roles
- ❌ No permission system

### Admin Privileges
- ❌ No admin panel
- ❌ No user management
- ❌ No audit log viewer
- ❌ No ability to impersonate or view as user

---

## 5. Authorization Checks

### Frontend
- ✅ `ProtectedRoute` component checks `isAuthenticated`
- ✅ `PublicRoute` redirects authenticated users away from login
- ❌ No route-level permission checks (e.g., "can edit album" vs "can view album")
- ❌ No API-level authorization on the client side (all checks rely on Supabase RLS)

### Backend (RLS)
- ✅ Albums: `designer_id = auth.uid()`
- ✅ Album versions: via albums join
- ✅ Album pages: via versions → albums join
- ✅ Requests: via albums join
- ✅ Reviews: via albums join
- ✅ Approvals: via albums join
- ✅ Users: `id = auth.uid()`
- ✅ Clients: `designer_id = auth.uid()`
- ✅ Profiles: `user_id = auth.uid()`
- ✅ Notifications: `user_id = auth.uid()`
- ❌ **Share links**: Full row access for anyone with valid token
- ❌ **Activity logs INSERT**: Was wide open (fixed in migration 011)

### Edge Functions
- Edge Functions use the anon key + Authorization header for authentication
- They rely on the RPC being `security definer` to bypass RLS
- ❌ No additional authorization checks in Edge Functions (they trust the RPC)

---

## 6. OWASP Top 10 Review

### A1: Broken Access Control — CRITICAL
- **Finding**: Storage bucket RLS not configured in any migration
- **Finding**: `share_links` table allows full row reads with valid token
- **Finding**: `activity_logs` INSERT was unrestricted
- **Finding**: `review_analytics` allows update via share link

### A2: Cryptographic Failures — MEDIUM
- **Finding**: Share tokens are 64-char hex strings from `crypto.getRandomValues` — strong
- **Finding**: No HTTPS enforcement (delegated to Supabase/Vercel)
- **Finding**: No content security policy headers

### A3: Injection — LOW
- **Finding**: Supabase client uses parameterized queries natively — safe from SQL injection
- **Finding**: No raw SQL queries in the frontend code

### A4: Insecure Design — HIGH
- **Finding**: localStorage used as primary storage for review data, requests, voice recordings
- **Finding**: No input sanitization shown for rich text
- **Finding**: Image upload accepts only JPEG/PNG/WebP — good, but no server-side re-validation

### A5: Security Misconfiguration — HIGH
- **Finding**: `activity_logs` INSERT was open to all (fixed in migration 011)
- **Finding**: Storage bucket likely public (no RLS policies found)
- **Finding**: CORS not explicitly configured in any file

### A6: Vulnerable Components — MEDIUM
- **Finding**: react-pageflip library (2.0.3) — need to verify known CVEs
- **Finding**: All dependencies via npm — standard risk

### A7: Auth Failures — HIGH
- **Finding**: No MFA
- **Finding**: No brute force protection on login
- **Finding**: No rate limiting on auth endpoints (Supabase provides some)
- **Finding**: Password reset flow uses email-only verification

### A8: Data Integrity Failures — MEDIUM
- **Finding**: No CSRF protection (SPA with JWT — generally not needed for API calls, but Supabase cookies could be vulnerable)
- **Finding**: No data validation on RPC inputs beyond type checks

### A9: Logging & Monitoring — HIGH
- **Finding**: No logging system
- **Finding**: No monitoring
- **Finding**: No alerting
- **Finding**: `activity_logs` table exists but never populated by the application code

### A10: SSRF — LOW
- **Finding**: No server-side request forgery vectors identified
- **Finding**: Edge Functions don't make external HTTP requests

---

## 7. Storage Security

### Bucket: `albums`
- **No RLS policies found** in any migration file
- If the bucket is public: anyone with the URL can access any image
- If the bucket is authenticated-only: only logged-in designers can access images
- **Recommendation**: Set bucket to public but use obfuscated paths, OR set to authenticated-only and serve images through Edge Functions

### Path Structure
```
albums/{albumId}/v{versionNumber}/{variant}/{timestamp}_{filename}
```
- Album IDs are UUIDs — reasonably unguessable
- Paths are predictable if album ID is known

---

## 8. Summary of Findings by Severity

### Critical
1. **Storage bucket RLS not configured** — No policies found for `albums` storage bucket
2. **`activity_logs` INSERT unrestricted** (before migration 011)
3. **`share_links` full row exposure** to anyone with valid token

### High
4. **No multi-tenant isolation for storage** — anyone with a path can access images
5. **localStorage as primary review data store** — no server-side persistence
6. **No input rate limiting** on public endpoints
7. **No MFA or social login**
8. **No admin/role system**

### Medium
9. **`review_analytics` allows share link-based updates**
10. **No Content Security Policy**
11. **Comments endpoint lacks anti-spam protection**
12. **Edge Functions don't validate beyond basic token check**

### Low
13. **`.env` file with live credentials** (gitignored, but present on disk)
14. **`combined.sql` may contain outdated schema if not re-run**
15. **No HTTPS enforcement headers**

---

## Immediate Actions Required

1. **Configure Storage RLS** — Set bucket policies to restrict access
2. **Review and apply migration 011** — It fixes several critical RLS issues
3. **Ensure all migrations are applied in order** — The dual `public.users`/`auth.users` issue could break the app
4. **Add server-side persistence for review data** — Don't rely on localStorage alone
5. **Add rate limiting to public endpoints** — Prevent abuse of share link endpoints
