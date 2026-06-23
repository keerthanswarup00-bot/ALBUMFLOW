# Changelog — albumflow

## [1.0.0] - 2026-06

### Added
- Initial release (Beta)
- User authentication with Supabase Auth
- Studio creation and management
- Album CRUD with image upload
- Three image variants (thumbnail/medium/original)
- Client share links with secure tokens
- Album viewer with page-flip interaction
- Pin feedback system
- Voice message recording for feedback
- Review cycle management (approve/reject/request)
- Multi-studio support with branding
- Dark mode
- Privacy policy, terms, cookie policy pages

### Security
- RLS policies on all database tables
- 32-byte random share tokens
- Input validation
- Edge Functions for token-based operations

### Known Issues
- `.env` file tracked in git (needs rotation)
- Mobile layout inconsistencies on some screens
- Accessibility gaps (WCAG A)
- No CSP headers
