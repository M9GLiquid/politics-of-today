# Remove Admin/Dev Surfaces 01: Remove Developer Dock and Session Preview

Parent PRD: `docs/prds/20260429-remove-admin-dev-surfaces.md`

Type: AFK

Blocked by: None

## What to build

Remove the global developer/admin preview dock from the app shell and remove the session-preview behavior that lets a real login become a guest, developer, or impersonated user through admin preview cookies.

This slice should leave normal signed-in player sessions intact and should make existing admin-preview cookies/localStorage values inert.

## Acceptance criteria

- `src/app/layout.tsx` no longer imports or renders the developer/admin preview host.
- The `DEVELOPER` floating dock, Lens tab, Engineering tab, JWT refresh control, vote-cookie clearing control, CRON secret rollover control, and create-bot panel are no longer reachable in the running app.
- Admin preview session-lens behavior is removed from effective session resolution; `getSession()` resolves from the real signed login/session path only.
- Login no longer auto-creates or promotes a development/admin user.
- Logout no longer depends on admin-preview cookie helpers.
- Active app code no longer uses `ADMIN_PREVIEW_ENABLED`, `ADMIN_EMAILS`, `pot_admin_preview`, `politics-of-today.adminDock.v1`, or `politics-of-today.devDockTab`.
- Normal login, logout, registration-adjacent auth behavior, nation selection, voting eligibility checks, and player page rendering continue to work.

## User stories addressed

- As a player, I never see admin/developer floating panels, controls, tabs, labels, or links while using the app.
- As a maintainer, I can remove admin/dev-only flags and code paths without changing normal player behavior.

## Likely files or areas

- `src/app/layout.tsx`
- `src/components/admin-preview-host.tsx`
- `src/components/admin-preview-dock.tsx`
- `src/app/actions/admin-preview.ts`
- `src/app/actions/admin-party.ts`
- `src/lib/admin-preview.ts`
- `src/lib/admin-dock.ts`
- `src/lib/admin-dock-gate.ts`
- `src/lib/ensure-dev-user.ts`
- `src/lib/auth-session.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/types/game.ts`

## Validation

- Run `npm run lint`.
- Run `npm run build`.
- Search active app code with `rg -n "DEVELOPER|Refresh JWT|Clear vote cookie|Create bot|ADMIN_PREVIEW_ENABLED|ADMIN_EMAILS|pot_admin_preview|adminDock|devDockTab" src`.
- Manually load a representative player page and confirm no developer/admin preview dock renders.
- Manually log in and log out and confirm the normal auth flow still works.

## User test

1. Start the app.
2. Visit the home page and at least one player-facing page while logged out.
3. Log in as a normal seeded/player account.
4. Confirm no developer dock or preview-lens controls appear in either state.
5. Log out and confirm the user returns to a logged-out player experience.

## Notes or risks

- Do not remove the game-admin route/panel in this slice unless needed to detach the developer dock import graph. That is handled in issue 02.
- Existing browsers may retain old admin preview localStorage/cookie values. This issue makes them inert rather than adding a cleanup UI.
