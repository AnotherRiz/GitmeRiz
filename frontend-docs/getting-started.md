# Getting Started

This guide covers installing, configuring, and running the GitmeRiz frontend locally.

## Prerequisites

- **Node.js** 18+ (recommended: LTS)
- **npm** (ships with Node)
- A running instance of the **GitmeRiz backend** (default: `http://localhost:3000`)

## Installation

```bash
# from the project root (d:\Code\Riz\Web)
npm install
```

This installs all runtime and dev dependencies listed in `package.json`, including React 19, React Router 7, Tailwind, and the `@dnd-kit` packages used by the pinned Bento grid.

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:3000
```

- `VITE_API_BASE_URL` — base URL of the backend REST API.
- Any variable exposed to the client **must** be prefixed with `VITE_` (Vite requirement).
- Access it in code via `import.meta.env.VITE_API_BASE_URL`.
- If the variable is missing, the code falls back to `http://localhost:3000` (or `http://127.0.0.1:3000` in a few older modules).

> `.env` is gitignored and must not be committed.

## Available Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| Dev server | `npm run dev` | Start Vite with hot module replacement |
| Build | `npm run build` | Produce an optimized production bundle in `dist/` |
| Preview | `npm run preview` | Serve the built `dist/` locally to verify the production build |
| Lint | `npm run lint` | Run oxlint over the codebase |

> **Note:** `npm run dev` and `npm run preview` are long-running processes. Run them in your own terminal rather than through automated tooling.

## Running Locally

1. Start the backend (see backend docs).
2. Create the `.env` file as shown above.
3. Start the frontend:
   ```bash
   npm run dev
   ```
4. Open the URL Vite prints (typically `http://localhost:5173`).

## Verifying a Change

After editing code, verify with a production build:

```bash
npm run build
```

A successful build transforms all modules and writes hashed assets to `dist/`. Fix any reported errors before shipping.

## Project Entry Points

- `index.html` — HTML shell. Contains an inline script that sets the theme class before React mounts to prevent a flash of the wrong theme.
- `src/main.jsx` — React entry; mounts `<App />` inside `<StrictMode>`.
- `src/App.jsx` — Provider tree and route definitions.

See [Architecture](./architecture.md) for the full picture.
