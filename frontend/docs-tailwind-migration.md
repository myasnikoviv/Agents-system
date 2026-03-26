# Frontend Tailwind Migration Plan

## Goal
Migrate frontend from legacy CSS files to Tailwind-first UI stack while preserving behavior.

## Target Stack
- Tailwind CSS v4
- React + TypeScript (existing)
- Utility-first components

## Wave 1 (Completed)
- Tailwind configured in Vite/PostCSS.
- Project and chain modals migrated to Tailwind classes.
- Notification toasts/modals migrated to Tailwind classes.
- Removed unused `src/App.css` and `src/context/NotificationContext.css`.

## Wave 2 (Next)
- Migrate `CockpitPage.tsx` section by section from `CockpitPage.css` to inline Tailwind utility classes.
- Keep feature parity and avoid behavior changes.

## Wave 3
- Migrate `CockpitSettingsPage.tsx` from `CockpitSettingsPage.css` to Tailwind.
- Replace ad-hoc inline style objects with utility classes.

## Wave 4
- Remove `CockpitPage.css` and `CockpitSettingsPage.css` after full parity.
- Keep only `src/index.css` for Tailwind import + minimal globals.

## Quality Gate per Wave
- `npm run build` passes.
- Manual smoke: open cockpit, create project, create chain, settings navigation.
