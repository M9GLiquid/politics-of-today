# Remove Admin/Dev Surfaces 04: Remove Admin Flag Columns from Prisma

Parent PRD: `docs/prds/20260429-remove-admin-dev-surfaces.md`

Type: HITL

Blocked by:

- `docs/issues/20260429-remove-admin-dev-surfaces-01-remove-developer-dock.md`
- `docs/issues/20260429-remove-admin-dev-surfaces-02-remove-game-admin-surfaces.md`
- Ellie/user approval on whether `User.isAdministrator` and `User.isGameAdministrator` should be removed now or left as inert legacy columns

## What to build

If approved, remove the `User.isAdministrator` and `User.isGameAdministrator` fields from the Prisma schema and add an intentional migration that drops the corresponding database columns.

This should happen only after runtime code no longer reads or writes the flags.

## Acceptance criteria

- `prisma/schema.prisma` no longer defines `User.isAdministrator` or `User.isGameAdministrator`.
- A new Prisma migration intentionally drops both columns.
- Seed data and runtime code do not read or write either field.
- Generated Prisma client types are refreshed if the repo workflow requires generated artifacts to change.
- Searches show no active runtime references to `isAdministrator` or `isGameAdministrator`.
- Normal player-facing flows and seed data still work.

## User stories addressed

- As a maintainer, I can remove admin/dev-only flags and code paths without changing normal player behavior.

## Likely files or areas

- `prisma/schema.prisma`
- New migration under `prisma/migrations/`
- `prisma/seed.ts`
- Generated Prisma client artifacts only if this repository tracks them

## Validation

- Run `npm run db:generate`.
- Run the repo's migration command against a local development database, likely `npm run db:migrate`, after confirming the local DB can accept schema changes.
- Run `npm run lint`.
- Run `npm run build`.
- Search with `rg -n "isAdministrator|isGameAdministrator" src prisma/schema.prisma prisma/seed.ts`.

## User test

No direct user test is required. This schema cleanup is verified through migration execution, Prisma generation, build/type checks, and the player smoke tests from issues 01 and 02.

## Notes or risks

- This is HITL because Sarah's PRD explicitly left schema migration cleanup open.
- Existing databases may contain true values in these columns. Dropping them is intentionally destructive to that metadata, even though the product decision says the admin/dev surface is removed.
- Do not remove moderation fields such as `bannedAt`, `banReason`, or `mutedUntil` in this issue unless Ellie separately approves that scope. Sarah called out that their independent gameplay value is ambiguous.
