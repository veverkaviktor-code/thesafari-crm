# Code Style & Conventions

## PHP (Laravel)
- PSR-12 style, enforced by Laravel Pint
- Models use: `$fillable`, `casts()`, relationship methods, `scopeSearch`
- Activity logging via `LogsActivity` trait (Spatie)
- Soft deletes on: customers, orders, invoices, subscriptions
- JSONB fields for: addresses, tags, settings
- VARCHAR + CHECK constraints instead of ENUM
- Czech route names: `zakaznici`, `zakazky`, `faktury`, `pozadavky`, `neniweb`, `nastaveni`
- Invoice auto-numbering with `lockForUpdate()`
- CompanySetting: singleton pattern

## TypeScript/React (Frontend)
- React 19 + TypeScript strict
- Inertia.js v2 for SPA-like navigation
- Shadcn/UI components in `resources/js/components/ui/`
- Domain components in `resources/js/components/{module}/`
- Pages in `resources/js/pages/{Module}/`
- Layouts in `resources/js/layouts/`
- Utility: `clsx` + `tailwind-merge` via `cn()` helper in `resources/js/lib/utils.ts`

## Naming
- PHP: PascalCase classes, camelCase methods, snake_case DB columns
- TS/React: PascalCase components, camelCase functions/variables
- Files: PascalCase for components/pages, camelCase for utilities

## Design Patterns
- Controller: standard Laravel resource controllers (index, show, create, store, edit, update, destroy)
- Inertia: controllers return `Inertia::render('Page', $props)`
- Frontend: component composition, no global state management (Inertia handles it)
