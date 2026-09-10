# ListingAgent Frontend

Next.js frontend for the Circle listing agent. Lets a seller submit raw listing data, watch the agent generate a listing, and review the verification verdict.

See the [root README](../README.md) for the full project overview and how this fits with the backend.

## Setup

```bash
npm install
cp .env.example .env.local
```

## Run

```bash
npm run dev      # dev server with hot-reload, http://localhost:3001
npm run build     # production build
npm run start      # run production build
npm run lint         # eslint
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the `ListingAgent` backend (default `http://localhost:3000`) |

See [.env.example](./.env.example).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- **TypeScript** — all source files are `.ts`/`.tsx`, strict mode on ([tsconfig.json](./tsconfig.json))
- **Tailwind CSS v4** — via `@tailwindcss/postcss` ([postcss.config.mjs](./postcss.config.mjs))
- ESLint (`eslint-config-next`)

## Project Structure

```
app/
├── layout.tsx      # root layout
├── page.tsx         # home page
└── globals.css       # Tailwind entrypoint
public/                # static assets
```

> Note: this is the initial scaffold — the listing submission form, results view, and verification dashboard described in the root README are not yet built.
