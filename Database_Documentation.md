# Database Documentation — albumflow

**Platform:** Supabase (PostgreSQL)

## Tables

### users
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| email | text | User email |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### clients
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Client name |
| email | text | Client email |
| phone | text | Client phone |
| designer_id | uuid | FK to users |
| created_at | timestamptz | |

### albums
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| title | text | Album title |
| description | text | Album description |
| designer_id | uuid | FK to users |
| studio_id | uuid | FK to studios |
| status | text | draft/active/archived |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### album_versions
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| album_id | uuid | FK to albums |
| version_number | int | Version number |
| status | text | active/archived |
| created_at | timestamptz | |

### album_pages
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| album_version_id | uuid | FK to album_versions |
| page_number | int | Page order |
| image_url | text | Image URL |
| thumbnail_url | text | Thumbnail URL |
| medium_url | text | Medium size URL |
| created_at | timestamptz | |

### requests
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| album_id | uuid | FK to albums |
| client_id | uuid | FK to clients |
| status | text | pending/approved/changes_requested |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### page_reviews
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| request_id | uuid | FK to requests |
| page_id | uuid | FK to album_pages |
| status | text | approved/rejected/pending |
| comment | text | Review comment |
| pin_x | float | X position of pin |
| pin_y | float | Y position of pin |
| created_at | timestamptz | |

### approvals
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| album_id | uuid | FK to albums |
| client_id | uuid | FK to clients |
| approved_at | timestamptz | |

## Relationships

- users 1→N clients
- users 1→N albums
- albums 1→N album_versions
- album_versions 1→N album_pages
- albums 1→N requests
- requests 1→N page_reviews
- albums 1→N approvals

## RLS Policies

- All tables have RLS enabled
- Designer-level isolation via `designer_id`
- Policies use `auth.uid()` for user identification
- Public access limited to token-based share links

## Migrations

11 migrations in `supabase/migrations/`:
001-011 incremental schema changes

## Edge Functions

3 Deno functions in `supabase/functions/`:
- `validate-token` — validate share tokens
- `approve-album` — approve via token
- `request-changes` — request changes via token
