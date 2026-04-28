# Remove Admin/Dev Surfaces 02: Remove Game Admin Routes, Panels, and Actions

Parent PRD: `docs/prds/20260429-remove-admin-dev-surfaces.md`

Type: AFK

Blocked by: `docs/issues/20260429-remove-admin-dev-surfaces-01-remove-developer-dock.md`

## What to build

Remove the game-admin support surface end to end: floating game-admin panel, direct admin player route, party delete controls, world-event tick button, `/admin/player/...` links, and the server actions/gates that only powered those removed controls.

The old `/admin/player/[userId]` URL should disappear as an app route and fall through to the framework default nonexistent-route handling.

## Acceptance criteria

- `src/app/layout.tsx` no longer imports or renders the game-admin host.
- `src/app/admin/player/[userId]/page.tsx` is removed, and direct visits to prior `/admin/player/...` URLs use default not-found behavior.
- Party pages no longer render admin-only delete buttons or links to `/admin/player/...`.
- World news no longer renders game-admin-only manual event tick controls or copy that tells game admins to run the tick.
- Removed game-admin UI labels such as `Game admin` no longer appear in active app code except where intentionally retained outside runtime code.
- Server actions and gate helpers used only by the removed game-admin UI are removed or made unreachable through deletion of their route/component import graph.
- Active app code no longer uses `GAME_ADMIN_UI_ENABLED`.
- Normal party listing, party detail, news/world page, voting, leaderboard, profile, and auth flows continue to work.

## User stories addressed

- As a player, I never see admin/developer floating panels, controls, tabs, labels, or links while using the app.
- As someone manually visiting an old admin/dev route, I get the app/framework default not-found behavior.
- As a maintainer, I can remove admin/dev-only flags and code paths without changing normal player behavior.

## Likely files or areas

- `src/app/layout.tsx`
- `src/components/game-admin-host.tsx`
- `src/components/game-admin-dock.tsx`
- `src/components/game-admin-lookup-panel.tsx`
- `src/components/game-admin-delete-party-button.tsx`
- `src/components/world-event-tick-button.tsx`
- `src/app/admin/player/[userId]/page.tsx`
- `src/app/actions/game-admin.ts`
- `src/app/actions/game-admin-moderation.ts`
- `src/app/actions/world-events.ts`
- `src/lib/game-admin-gate.ts`
- `src/lib/game-admin-viewer.ts`
- `src/app/parties/page.tsx`
- `src/app/parties/[slug]/page.tsx`
- `src/app/news/world/page.tsx`
- `src/app/api/cron/party-rollover/route.ts` only if investigation shows it exists solely for the removed manual admin control

## Validation

- Run `npm run lint`.
- Run `npm run build`.
- Search active app code with `rg -n "Game admin|GAME_ADMIN_UI_ENABLED|/admin/player|GameAdmin|game-admin|world-event-tick|runWorldEventTickAction|gameAdmin" src`.
- Manually visit `/admin/player/some-id` and confirm default nonexistent-route handling.
- Manually load `/parties`, a party detail page, and `/news/world` and confirm no admin controls or admin links render.

## User test

1. Start the app.
2. Visit `/parties`, open a party detail page, and visit `/news/world`.
3. Confirm all pages behave as normal player pages with no admin buttons, delete controls, lookup controls, or admin links.
4. Visit `/admin/player/example` and confirm the app shows its normal not-found behavior.

## Notes or risks

- Keep player-facing moderation enforcement only if it is independently used by normal gameplay. Do not delete `bannedAt`, `banReason`, or `mutedUntil` solely because the admin UI that edited them is removed.
- The cron party rollover endpoint needs a code-use check before deletion. Sarah's PRD says not to change normal production cron behavior unless the endpoint exists only for the removed developer-panel control.
