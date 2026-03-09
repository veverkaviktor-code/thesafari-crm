# Suggested Commands

## Development (on VPS with PHP)
- `php artisan serve` — start dev server
- `npm run dev` — start Vite dev server
- `composer dev` — run all dev services (server, queue, logs, vite)

## Build
- `npm run build` — build frontend assets
- `composer install --optimize-autoloader --no-dev` — install prod PHP deps

## Database
- `php artisan migrate` — run migrations
- `php artisan migrate:rollback` — rollback last migration
- `php artisan tinker` — interactive REPL

## Testing
- `php artisan test` — run PHPUnit tests
- `composer test` — same via script

## Code Quality
- `./vendor/bin/pint` — Laravel Pint (PHP code style fixer)

## Deploy (to VPS)
- Build frontend locally: `npm run build`
- Rsync to VPS or use SSH deploy script
- On VPS: `composer install --no-dev`, `php artisan migrate --force`

## Utilities (macOS/Darwin)
- `git`, `ls`, `cd`, `grep`, `find` — standard unix commands
- Node.js available locally (v25), PHP NOT available locally
