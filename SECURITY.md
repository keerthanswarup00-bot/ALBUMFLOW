# Security — albumflow

## Authentication

- Supabase Auth for designer login
- Email/password authentication
- Password reset flow implemented
- Protected routes via `ProtectedRoute` component

## Authorization

- Row Level Security (RLS) on all Supabase tables
- Multi-tenant isolation by `designer_id`
- Share links use 32-byte cryptographically secure random tokens
- Edge Functions validate tokens server-side

## Checklist

- [x] Login required for dashboard
- [x] Session validation via Supabase
- [x] Protected routes implemented
- [x] Logout works
- [x] RLS enabled on all tables
- [x] RLS policies tested
- [x] Storage buckets use private access
- [x] Signed URLs for image access
- [ ] Content Security Policy headers
- [ ] Rate limiting on API endpoints
- [ ] Automated security scanning

## Known Issues

- `.env` file tracked in git — rotate keys, add to `.gitignore`
- No CSP headers implemented
- Review Supabase anon key exposure

## Reporting

Report security issues to the project maintainer.
