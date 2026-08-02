---
Task ID: 1-6
Agent: Main Agent
Task: Add route persistence, login, rate limiting, blacklist, backup/restore features

Work Log:
- Created Edge-compatible middleware.ts with auth guard (JWT validation via getToken) and in-memory rate limiting
- Created separate Node.js security lib (src/lib/security.ts) for blacklist/config persistence to JSON files
- Fixed mock OAuth provider: added absolute URLs, profile() function, and NEXTAUTH_URL env var
- Persisted activeView in URL search params (?view=dashboard) so reload preserves current page
- Upgraded login page with email/password form, validation, and show/hide password toggle
- Added Security tab to Settings: rate limit config (enable/disable, max requests per minute), blacklist management (add/remove IP/email entries)
- Added Backup tab to Settings: create backup, list backups with size/date, restore from backup, delete backup
- Created API routes: /api/security/config, /api/security/blacklist, /api/backup, /api/backup/restore
- Added ~40 i18n keys per locale (vi, en, zh) for login, security, and backup features
- All tests pass: auth guard, login flow, security API, blacklist CRUD, backup CRUD, URL view persistence

Stage Summary:
- New files: src/middleware.ts, src/lib/security.ts, src/app/api/security/blacklist/route.ts, src/app/api/security/config/route.ts, src/app/api/backup/route.ts, src/app/api/backup/restore/route.ts, scripts/start-dev.sh
- Modified files: src/app/page.tsx (URL sync), src/app/login/page.tsx (email/password form), src/app/settings/page.tsx (Security + Backup tabs), src/lib/auth.ts (mock OAuth fix), src/i18n/translations.ts (new keys), .env (NEXTAUTH_URL)
- Auth flow verified end-to-end via curl tests
- Data directory (data/backups, data/blacklist.json, data/security-config.json) created at runtime
