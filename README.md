# GitmeRiz Web

A React single-page application for uploading, organizing, and sharing images — with a private gallery, a pinned Bento grid, background upload processing, and a full-screen image viewer.

## Features

- **Authentication** — register, login, session restore, protected routes
- **Public Gallery** — browse all public images (`/gallery`)
- **My Gallery** — private per-user workspace with upload, rename, visibility toggle, and delete
- **Pinned Bento Grid** — up to 8 pinned images, vertical images span two rows, drag-and-drop reordering (persisted)
- **Uploads** — multi-file drag & drop, browse, and paste (Ctrl+V); client-side thumbnails; parallel upload with progress; minimize-to-background
- **Background Processing** — async upload status polling with per-item states (processing / failed / active)
- **Image Viewer** — zoom (buttons, wheel, double-click), grab-to-pan, and authenticated raw download
- **Dark / Light Mode** — class-based theme with system-preference detection and flash prevention

## Tech Stack

- **React 19** + **Vite 8**
- **React Router DOM 7**
- **Tailwind CSS 3.4** (class-based dark mode)
- **@dnd-kit** (core, sortable, modifiers, utilities) for drag-and-drop
- **oxlint** for linting
- JavaScript (ES modules), no TypeScript

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure the backend URL
echo VITE_API_BASE_URL=http://localhost:3000 > .env

# 3. Start the dev server
npm run dev
```

Other scripts:

```bash
npm run build     # production build → dist/
npm run preview   # serve the production build
npm run lint      # run oxlint
```

The frontend talks to the GitmeRiz REST backend (default `http://localhost:3000`). See [`api-docs.md`](./api-docs.md) for backend endpoints.

## Documentation

Full frontend documentation lives in [`frontend-docs/`](./frontend-docs/README.md):

| Document | Description |
| --- | --- |
| [Getting Started](./frontend-docs/getting-started.md) | Install, configure, and run |
| [Architecture](./frontend-docs/architecture.md) | Structure, entry point, routing, providers |
| [State Management](./frontend-docs/state-management.md) | `AuthContext` and `ThemeContext` |
| [API Integration](./frontend-docs/api-integration.md) | The `api.js` client, envelope, auth, polling |
| [Components](./frontend-docs/components.md) | Reusable component reference |
| [Pages](./frontend-docs/pages.md) | Route-level page components |
| [Styling & Theming](./frontend-docs/styling-theming.md) | Tailwind config, dark mode, color tokens |
| [Features](./frontend-docs/features.md) | Deep dives: Bento grid, upload, viewer, polling, paste |

Project coding standards and conventions are in [`AGENTS.md`](./AGENTS.md).

## Project Structure

```
src/
├── components/      # Reusable UI (Navbar, modals, dock, cards)
├── contexts/        # AuthContext, ThemeContext
├── lib/             # api.js, pollStatus.js, shortId.js
├── pages/           # Home, Blog, Login, Register, Dashboard, Gallery, MyGallery
├── assets/          # Static assets
├── App.jsx          # Providers + routing
├── main.jsx         # Entry point
└── index.css        # Tailwind directives + global styles
```

## Routes

| Path | Page | Access |
| --- | --- | --- |
| `/` | Home | Public |
| `/blog` | Blog | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/dashboard` | Dashboard | Protected |
| `/gallery` | Gallery (public images) | Public |
| `/:username/gallery` | My Gallery | Protected (owner-only) |

## Color Scheme

Custom Tailwind tokens (see [Styling & Theming](./frontend-docs/styling-theming.md) for the full table):

| | Body | Navbar/Surface | Text |
| --- | --- | --- | --- |
| **Dark** | `#19161D` | `#211D27` | `#FAFAFA` |
| **Light** | `#F4F3F6` | `#dfdee6` | `#0F0F0F` |
