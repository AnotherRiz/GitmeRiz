# Styling & Theming

The UI is built entirely with **Tailwind CSS** utility classes. There are no inline styles for layout/appearance (a few dynamic transforms in the image viewer are the exception).

---

## Tailwind Configuration

**File:** `tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: { dark: { ... }, light: { ... } },
    },
  },
  plugins: [],
}
```

- **`darkMode: 'class'`** — dark mode is driven by a `dark` class on `<html>`, managed by `ThemeContext`.
- **`content`** — scans `index.html` and everything under `src/`.
- **Font** — Inter with system fallbacks.

PostCSS is configured in `postcss.config.js` (Tailwind + Autoprefixer). Global Tailwind directives live in `src/index.css`.

---

## Color Tokens

Custom semantic colors are defined for both themes. Use these instead of raw hex values so components adapt automatically.

### Dark

| Token | Hex | Usage |
| --- | --- | --- |
| `dark-body` | `#19161D` | Page background |
| `dark-navbar` | `#211D27` | Navbar / modal surfaces |
| `dark-text` | `#FAFAFA` | Text |
| `dark-card` | `#211D27` | Cards |
| `dark-card-border` | `#292430` | Card borders |
| `dark-input` | `#19161D` | Inputs |

### Light

| Token | Hex | Usage |
| --- | --- | --- |
| `light-body` | `#F4F3F6` | Page background |
| `light-navbar` | `#dfdee6` | Navbar / modal surfaces |
| `light-text` | `#0F0F0F` | Text |
| `light-card` | `#FFFFFF` | Cards |
| `light-card-border` | `#dfdee6` | Card borders |
| `light-input` | `#F4F3F6` | Inputs |

---

## Dark Mode Usage Pattern

Every color-bearing element should pair a light token with its `dark:` counterpart:

```jsx
<div className="bg-light-body dark:bg-dark-body text-light-text dark:text-dark-text">
  <div className="bg-light-card dark:bg-dark-card border border-light-card-border dark:border-dark-card-border">
    ...
  </div>
</div>
```

The app root in `App.jsx` sets the base background and text colors this way.

---

## Flash Prevention

Two mechanisms prevent a flash of the wrong theme:

1. **Inline script in `index.html`** — reads the saved/system theme and applies the class to `<html>` before React mounts.
2. **`ThemeContext` effect** — on every change, sets the `<html>` class, persists to `localStorage`, and applies matching inline `backgroundColor`/`color`.

---

## Common UI Patterns

- **Cards:** `rounded-2xl` surfaces with `shadow-sm` → `hover:shadow-md`, using card + card-border tokens.
- **Modals:** fixed overlay `bg-black/60 backdrop-blur-sm`, centered panel with `rounded-2xl shadow-2xl`; fade/scale transitions via `transition-opacity` / `transition-all` and an `isOpen`/`isClosing` state pair.
- **Buttons:** primary actions use `bg-blue-600 hover:bg-blue-700` (or `indigo-600` on auth pages); disabled states use `disabled:opacity-50 disabled:cursor-not-allowed`.
- **Masonry grids:** CSS columns (`columns-1 sm:columns-2 md:columns-3 lg:columns-4`) with `break-inside-avoid` on items.
- **Bento grid:** CSS grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`, `auto-rows-[11rem]`, `grid-flow-row-dense`) with `row-span-2` for vertical items.
- **Transitions:** prefer Tailwind's `transition-*` + `duration-*` utilities for hover/scale/opacity effects.

---

## Accessibility Notes

- Semantic elements (`<nav>`, `<button>`, `<label>`) are used throughout.
- Icon-only buttons include `aria-label`.
- Dropdowns use `aria-haspopup` / `aria-expanded` and close on outside click / Esc.
