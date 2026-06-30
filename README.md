# Riz - Personal Website

A personal website built with React, Vite, and Tailwind CSS.

## Features

- **React 19** with Vite for fast development
- **Tailwind CSS v3** for styling
- **React Router** for navigation
- **Dark/Light Mode** with system preference detection
- **Inter Font** from Google Fonts
- Responsive design

## Tech Stack

- React 19.2.7
- React DOM 19.2.7
- React Router DOM 7.1.3
- Tailwind CSS 3.4.0
- Vite 8.1.0

## Color Scheme

### Dark Mode
- Body: `#19161D`
- Navbar: `#211D27`
- Text: `#FAFAFA`

### Light Mode
- Body: `#F4F3F6`
- Navbar: `#dfdee6ff`
- Text: `#0F0F0F`

## Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm preview
```

## Project Structure

```
src/
├── components/     # Reusable components (Navbar, etc.)
├── contexts/       # React contexts (ThemeContext)
├── pages/          # Page components (Home, Blog)
├── assets/         # Static assets
├── App.jsx         # Main app component with routing
└── main.jsx        # Entry point
```

## Routes

- `/` - Home page with hero section
- `/blog` - Blog page (placeholder)
