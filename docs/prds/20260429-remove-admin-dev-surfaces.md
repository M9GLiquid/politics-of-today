# Remove Admin and Developer Surfaces

Status: Ready for issue slicing

## Source Conversation Summary

The user wants all admin/developer-related app surfaces removed. The visible trigger is a floating `DEVELOPER` overlay with tabs for Lens, Game admin, World, and Engineering. Controls shown include Refresh JWT, Clear vote cookie, CRON_SECRET rollover, Create bot, and localStorage/flag references such as `ADMIN_PREVIEW_ENABLED` and `GAME_ADMIN_UI_ENABLED`.

The requested behavior is removal, not replacement. The current admin/dev URL should become nonexistent and fall through to the framework default handling.

## Problem

The app currently exposes internal admin/developer UI and supporting code paths that are no longer wanted. These paths include floating overlays, admin pages, gated server actions, dev bootstrap behavior, flags, cookies/localStorage state, and database utilities tied to this surface. Keeping them creates product noise and ongoing maintenance/security risk.

## Goals

- Remove the full floating developer/admin window from all pages.
- Remove routes, links, actions, endpoints, helpers, flags, storage keys, test helpers, seed data, and database/admin utilities that exist only to support this admin/dev surface.
- Ensure direct visits to the current admin/dev URLs receive the framework default nonexistent-route response.
- Preserve normal player-facing gameplay, auth, party, nation, news, wiki, leaderboard, and profile flows.

## Non-Goals

- Do not preserve, hide, or rebuild an alternate admin/dev UI.
- Do not refactor unrelated gameplay, auth, moderation, or data code.
- Do not introduce a replacement support workflow.
- Do not change normal production cron behavior unless an endpoint exists only for the removed admin/dev UI.

## User Stories

- As a player, I never see admin/developer floating panels, controls, tabs, labels, or links while using the app.
- As a maintainer, I can remove admin/dev-only flags and code paths without changing normal player behavior.
- As someone manually visiting an old admin/dev route, I get the app/framework default not-found behavior.

## Scope

Known repo anchors from initial discovery include:

- Layout hosts: `src/app/layout.tsx`, `src/components/admin-preview-host.tsx`, `src/components/game-admin-host.tsx`.
- Floating/admin UI components: `src/components/admin-preview-dock.tsx`, `src/components/game-admin-dock.tsx`, `src/components/game-admin-lookup-panel.tsx`, `src/components/game-admin-delete-party-button.tsx`, `src/components/world-event-tick-button.tsx`.
- Admin route: `src/app/admin/player/[userId]/page.tsx`.
- Server actions and gates: `src/app/actions/admin-preview.ts`, `src/app/actions/admin-party.ts`, `src/app/actions/game-admin.ts`, `src/app/actions/game-admin-moderation.ts`, `src/app/actions/world-events.ts`, `src/lib/admin-preview.ts`, `src/lib/admin-dock.ts`, `src/lib/admin-dock-gate.ts`, `src/lib/game-admin-gate.ts`, `src/lib/game-admin-viewer.ts`.
- Session/auth hooks: `src/lib/auth-session.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/components/header-auth.tsx`, `src/types/game.ts`.
- Data/schema/seed references: `prisma/schema.prisma`, `prisma/seed.ts`, migrations and generated Prisma references involving `isAdministrator` or `isGameAdministrator`.
- Environment/storage references: `ADMIN_PREVIEW_ENABLED`, `GAME_ADMIN_UI_ENABLED`, `ADMIN_EMAILS`, `pot_admin_preview`, `politics-of-today.adminDock.v1`, `politics-of-today.devDockTab`.
- Admin/dev links embedded in player pages, including party owner/member links to `/admin/player/...`.

Implementation should verify the full reference graph before deletion.

## Functional Requirements

1. Remove admin/developer floating surfaces from the global app shell.
2. Remove the `/admin/player/[userId]` route and any navigation or links to `/admin/...`.
3. Remove client components that exist only for admin/dev panels, including lookup, moderation, create-bot, preview-lens, JWT refresh, vote-cookie clearing, and manual rollover controls.
4. Remove server actions and gate helpers that exist only to power removed admin/dev UI.
5. Remove admin preview behavior from effective session resolution so regular sessions come only from the real login/session path.
6. Remove admin preview cookies/localStorage usage and cleanup hooks where they are no longer needed.
7. Remove environment flag checks for removed surfaces from application code and docs.
8. Remove dev/admin seed behavior that creates or promotes an admin/developer account solely for this surface.
9. Remove or simplify database fields/utilities used only by this surface, subject to the open question on whether schema migration cleanup is in scope for the implementation pass.
10. Keep player-facing moderation effects that are already part of normal gameplay only if they are used independently of the removed admin/dev surface; otherwise remove the dead UI/action path.

## Data, Auth, Security, and Privacy Considerations

- Removing admin/dev paths should reduce privileged account lookups, impersonation/session-lens behavior, bot creation, and manual support actions exposed through the app.
- Verify no remaining production code grants behavior based on removed flags or `User.isAdministrator` / `User.isGameAdministrator` unless a non-admin product requirement still needs it.
- Avoid leaving orphaned privileged endpoints reachable without UI.
- If database fields are removed, include an intentional Prisma migration and seed update.

## Edge Cases

- Direct request to `/admin/player/[userId]` should not render a custom admin page and should use default nonexistent-route handling.
- Existing browsers may still have admin/dev localStorage values or the preview cookie; these should become inert.
- Existing seeded or real users may have admin boolean fields set; after removal, those values should not affect runtime behavior.
- Removing game-admin delete controls must not break normal party listing/profile pages.

## Acceptance Criteria

- No floating admin/developer/game-admin overlay appears on any page.
- Searching the app source shows no active references to the removed UI labels and controls: `DEVELOPER`, `Game admin`, `Refresh JWT`, `Clear vote cookie`, `Create bot`, admin preview lens controls, or `/admin/player` links, except in historical docs/migrations where retained intentionally.
- Searching active app code shows no runtime use of `ADMIN_PREVIEW_ENABLED`, `GAME_ADMIN_UI_ENABLED`, admin preview localStorage keys, or `pot_admin_preview`.
- `/admin/player/[userId]` no longer exists as an app route.
- Normal login, logout, registration, nation selection, party pages, news pages, voting, and leaderboards continue to work.
- Seed scripts no longer create/promote a special admin/developer user for this surface.
- Tests, linting, and type checks pass.

## Validation Notes

- Run static search after implementation for admin/dev strings, flags, routes, actions, imports, cookies, and localStorage keys.
- Run the project validation suite available in `package.json`, at minimum lint/type/test commands if present.
- Manually verify representative player pages do not import removed admin components and do not show admin-only controls.
- Manually visit the former admin route and confirm default not-found behavior.

## Open Questions

- Should `User.isAdministrator` and `User.isGameAdministrator` be removed from the Prisma schema via migration, or left as inert legacy columns for a later data cleanup?
- Should moderation state such as `bannedAt`, `banReason`, and `mutedUntil` remain because it may support future/player-facing enforcement, or be removed if only the admin/dev surface used it?
- Is the cron party rollover endpoint itself a production feature, or was it only reachable/needed through the developer panel control?
