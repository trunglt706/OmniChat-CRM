# Work Log

---
Task ID: 1
Agent: Main
Task: Performance optimization — fix excessive re-rendering & redundant API calls

Work Log:
- Audited all components for broad Zustand subscriptions (no selectors)
- Fixed ProfileTab: `useCRMStore()` → individual selectors for `currentUser`, `setCurrentUser`
- Fixed SystemTab: broad sub → individual selectors + `notifCount` derived selector instead of full `notifications` array
- Fixed StaffTab: removed duplicated `staffList` local state, now uses global `agents` directly with fetch-if-empty guard
- Fixed Header: `unreadNotifCount` now computed via optimized for-loop selector (no array allocation)
- Fixed AutomationPanel: removed local `agents` state, reads from global store; added `useMemo` for `filteredRules`/`enabledCount`/`disabledCount`
- Eliminated redundant `/api/agents` fetch in AutomationPanel (now checks store first)
- Eliminated redundant `/api/auth/me` fetch in settings page (checks store first)
- Removed dead `useEffect` in settings page
- Added `useMemo` for `pinnedNotes`/`regularNotes` filtering in customer-panel
- Removed unused `index` prop from `PlatformBadge`
- Added `useCallback` for `handleSheetClose` in CRMPage (stable ref for 3 Sheet components)
- Fixed Suspense boundary issues on `/` and `/settings` pages (Next.js 16 requirement for `useSearchParams`)

Stage Summary:
- ~8 components optimized with proper Zustand selectors
- 3 redundant API calls eliminated (agents x2, auth/me x1)
- Build passes successfully

---
Task ID: 2
Agent: Main
Task: Security monitoring, logging, brute-force protection, auto-blacklist

Work Log:
- Created `src/lib/request-logger.ts`: request logging with memory ring buffer + Redis analytics
- Created `src/lib/api-logger.ts`: `withLogging` wrapper + `logBlockedRequest` for middleware
- Integrated logging into proxy.ts for all blocked requests (blacklist, rate-limit, CSRF)
- Created `src/app/api/monitoring/route.ts`: admin-only endpoint (summary/logs/alerts/memory views)
- Added brute-force detection to login route (`checkBruteForce` — 10 attempts per 15min per IP+email)
- Added auto-blacklist: IPs with 5+ rate-limit violations in 10min get auto-blacklisted
- Added `addToBlacklist()` function to security.ts
- Added slow-query logging to Prisma client (`SLOW_QUERY_MS` env var, default 1000ms)
- Added `/api/monitoring` to rate-limited API prefixes

Stage Summary:
- Full request logging pipeline operational (memory buffer + Redis analytics)
- Monitoring API: GET /api/monitoring?view=summary|logs|alerts|memory
- Brute-force protection active on login endpoint
- Auto-blacklist protects against sustained DDoS attacks
- Slow query warnings in server console
---
Task ID: 1
Agent: main
Task: Fix CSRF 403 on POST /api/security/blacklist and audit all raw fetch() calls

Work Log:
- Investigated CSRF 403 error: SecurityTab, ChannelsTab, BackupTab in settings/page.tsx all used raw fetch() without CSRF token
- Improved api-client.ts: replaced window.location.reload() with automatic retry (refreshes token via lightweight GET, then retries once)
- Fixed SecurityTab: saveConfig (PUT /api/security/config) → apiPut, addToBlacklist (POST /api/security/blacklist) → apiPost, removeFromBlacklist (DELETE) → apiFetch
- Fixed ChannelsTab: toggleChannel (PUT /api/channels) → apiPut, saveChannel (PUT /api/channels) → apiPut, testConnection (POST /api/channels/test) → apiPost
- Fixed BackupTab: createBackup (POST /api/backup) → apiPost, restoreBackup (POST /api/backup/restore) → apiPost, deleteBackup (DELETE) → apiFetch
- Fixed page.tsx: toggleSimulation (POST /api/simulation) → apiPost
- Audited all components: only remaining raw fetch with mutating method is settings-panel.tsx PUT /api/auth/me/settings which is CSRF-exempt
- Investigated ChatArea hooks order error (line 543): all 28 hooks are called unconditionally before conditional return at line 559; error is stale/HMR artifact
- Build passes successfully

Stage Summary:
- Root cause: raw fetch() calls bypassing api-client CSRF token injection
- 11 raw fetch() calls replaced with apiFetch/apiPost/apiPut across 3 files
- api-client.ts now auto-retries on CSRF failure instead of reloading page
- ChatArea hooks order verified correct — no code changes needed
---
Task ID: 2-a
Agent: main
Task: Persist notifications to database + fix channel filter horizontal scroll

Work Log:
- Added `Notification` model to Prisma schema (id, userId, type, title, body, conversationId, read, createdAt, updatedAt) with index on [userId, read, createdAt]
- Added `notifications Notification[]` relation to User model
- Created 3 API routes: GET/POST/DELETE /api/notifications, PATCH /api/notifications/[id]/read, PATCH /api/notifications/read-all
- Updated Zustand store: added `setNotifications`, `loadNotifications` actions
- Implemented background flush queue (`_notifPersistQueue` + `flushNotifToDB`) that batches notification changes and syncs to DB with 300ms debounce
- `addNotification` now persists to DB optimistically (UI updates immediately, DB write in background)
- `markNotificationRead` and `clearNotification` skip DB write for client-generated IDs (starting with `notif_`)
- `markAllNotificationsRead` and `clearAllNotifications` always persist to DB
- Added `loadNotifications()` call in page.tsx after login (loads from DB and merges with any local-only notifications)
- Ran `prisma db push` to sync schema
- Fixed channel filter horizontal scroll: added `max-w-full` to scroll containers, `scroll-fade-x` CSS class with gradient fade indicator via `ResizeObserver`
- Removed unused `addNotification` import from conversation-list.tsx

Stage Summary:
- Notifications now persist to SQLite via 3 new API routes
- Optimistic UI with 300ms batched background sync
- Notifications loaded on login and survive page refresh
- Channel/status filter tabs scroll horizontally with fade indicator when sidebar is resized narrow
- Build passes successfully
---
Task ID: 1
Agent: main
Task: Fix duplicate API call on /settings?tab=profile save

Work Log:
- Investigated root cause: two issues found
  1. Dual component mount: `renderContent()` was called in BOTH desktop (`hidden md:flex`) and mobile (`md:hidden`) wrapper divs, creating 2 instances of each tab component. Each instance had its own `useEffect` hooks, causing double API calls on mount.
  2. Race condition on double-click: `setSaving(true)` is async (React batches state updates), so rapid double-clicks could trigger `handleSave` twice before `disabled={saving}` takes effect.
- Fix 1: Refactored responsive layout from 2 wrapper divs (each with `{renderContent()}`) to a single flex container with desktop nav (`hidden md:flex`) + mobile nav (`md:hidden`) + shared `<main>` with `{renderContent()}` rendered ONCE.
- Fix 2: Added `savingRef = useRef(false)` guard to `ProfileTab.handleSave` — checked synchronously before any async work, preventing concurrent executions.
- Note: `SystemTab` already had success/failure modal from previous session. ProfileTab also already had it.
- Build verified: passes cleanly.

Stage Summary:
- /settings page now renders tab content only once (was twice before)
- Profile save button has double-click protection via ref guard
- All useEffect API calls in tabs (stats, channels, agents, security config, backups) no longer duplicate
