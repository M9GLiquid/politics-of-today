# Remove Admin/Dev Surfaces 03: Clean Seed, Docs, and Environment References

Parent PRD: `docs/prds/20260429-remove-admin-dev-surfaces.md`

Type: AFK

Blocked by:

- `docs/issues/20260429-remove-admin-dev-surfaces-01-remove-developer-dock.md`
- `docs/issues/20260429-remove-admin-dev-surfaces-02-remove-game-admin-surfaces.md`

## What to build

Remove remaining seed/test helper and documentation references that exist only to support the removed admin/developer surfaces, without changing unrelated production setup.

This slice is the cleanup pass after the runtime surfaces are gone. It should make source searches clean for removed flags and controls while preserving valid non-admin operational documentation, such as production cron setup if still used.

## Acceptance criteria

- Seed data no longer creates or promotes a special admin/developer user solely for the removed surfaces.
- Runtime source and docs no longer instruct developers to enable `ADMIN_PREVIEW_ENABLED`, `GAME_ADMIN_UI_ENABLED`, `ADMIN_EMAILS`, admin preview cookies, or admin dock localStorage keys.
- README or docs references to `CRON_SECRET` are kept only if the cron endpoint remains a production feature; otherwise they are removed with the dead endpoint.
- Historical migrations may retain old admin-column names when changing them would rewrite history, but active docs and runtime code should not present them as current features.
- Normal seed behavior still creates usable non-admin player/demo accounts.
- Lint and build pass after cleanup.

## User stories addressed

- As a maintainer, I can remove admin/dev-only flags and code paths without changing normal player behavior.
- As a player, I never see admin/developer floating panels, controls, tabs, labels, or links while using the app.

## Likely files or areas

- `prisma/seed.ts`
- `README.md`
- Any active docs outside `docs/prds/` that mention removed admin/dev setup
- `src/lib/ensure-dev-user.ts` if not already removed in issue 01
- `src/types/game.ts` if comments still mention admin preview after issue 01
- `src/app/api/cron/party-rollover/route.ts` and cron docs only if issue 02 determines the endpoint is not a production feature

## Validation

- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run db:seed` against the normal local development database if the repo's local database setup is available.
- Search with `rg -n "ADMIN_PREVIEW_ENABLED|GAME_ADMIN_UI_ENABLED|ADMIN_EMAILS|pot_admin_preview|adminDock|devDockTab|DEVELOPER|Refresh JWT|Clear vote cookie|Create bot|/admin/player" README.md src prisma docs -g '!docs/prds/*' -g '!docs/issues/*'`.

## User test

No dedicated user test is required. This is an AFK cleanup slice verified through static search, seed execution where available, and normal app smoke testing from issues 01 and 02.

## Notes or risks

- Do not rewrite migration history just to remove old column names from historical SQL. Schema removal, if approved, belongs in issue 04.
- If `CRON_SECRET` still supports a production cron route, it is not an admin/dev reference and should remain documented.
