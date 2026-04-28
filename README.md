# Politics of Today

A Next.js app backed by Prisma and SQLite.

## Setup

Install dependencies:

```sh
npm install
```

Create `.env` in the project root:

```sh
DATABASE_URL="file:./dev.db"
AUTH_SECRET="change-this-local-secret"
CRON_SECRET="change-this-local-cron-secret"
```

`AUTH_SECRET` is optional in development, but setting it keeps local behavior closer to production. `CRON_SECRET` is only needed when calling cron routes locally.

Set up the database:

```sh
npm run db:migrate
npm run db:seed
```

## Run The Server

Start the development server:

```sh
npm run dev
```

Then open http://localhost:3000.

If the Next.js cache or generated files get stale, start fresh with:

```sh
npm run dev:fresh
```

Seeded login examples:

- `alice@play.test` / `play`
- `bob@play.test` / `play`

## Useful Commands

```sh
npm run lint
npm run build
npm run start
npm run db:generate
npm run db:generate:clean
```

`npm run start` serves a production build, so run `npm run build` first.
