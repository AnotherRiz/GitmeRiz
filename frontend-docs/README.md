# GitmeRiz Frontend Documentation

Welcome to the frontend documentation for **GitmeRiz Web** — a React 19 + Vite single-page application for uploading, organizing, and sharing images.

## Documentation Index

| Document | Description |
| --- | --- |
| [Getting Started](./getting-started.md) | Install, configure, and run the project |
| [Architecture](./architecture.md) | Project structure, entry point, routing, provider tree |
| [State Management](./state-management.md) | `AuthContext` and `ThemeContext` |
| [API Integration](./api-integration.md) | The `api.js` client, response envelope, auth, helpers |
| [Components](./components.md) | Reusable UI component reference |
| [Pages](./pages.md) | Route-level page components |
| [Styling & Theming](./styling-theming.md) | Tailwind config, dark mode, color tokens |
| [Features](./features.md) | Deep dives: Bento grid, upload, image viewer, polling, paste |

## Tech Stack

- **Framework**: React 19 with Vite 8
- **Routing**: React Router DOM 7
- **Styling**: Tailwind CSS 3.4 (class-based dark mode)
- **Drag & Drop**: `@dnd-kit` (core, sortable, modifiers, utilities)
- **Linting**: oxlint
- **Language**: JavaScript (ES modules), no TypeScript

## Quick Reference

```bash
npm install       # install dependencies
npm run dev       # start dev server (Vite)
npm run build     # production build
npm run preview   # preview production build
npm run lint      # run oxlint
```

The frontend talks to a REST backend (default `http://localhost:3000`). Backend API details live in [`../api-docs.md`](../api-docs.md).

## Conventions

Project-wide coding standards and conventions are defined in [`../AGENTS.md`](../AGENTS.md). Key points:

- Functional components with hooks, one component per file
- PascalCase for components/pages, camelCase for utilities
- All API calls go through `src/lib/api.js`
- Tailwind utility classes only (no inline styles), always support `dark:` variants
- Never hardcode the API base URL — use `VITE_API_BASE_URL`
