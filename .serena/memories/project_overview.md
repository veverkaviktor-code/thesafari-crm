# Safari HQ CRM — Project Overview

## Purpose
Internal CRM system for thesafari.cz creative studio. Manages customers, orders, invoices, subscriptions (Neniweb hosting), tickets, and company settings.

## Tech Stack
- **Backend**: Laravel 12 (PHP 8.2+), PostgreSQL
- **Frontend**: React 19 + TypeScript + Inertia.js v2 + Tailwind CSS 4 + Shadcn/UI
- **Build**: Vite 7
- **Key packages**: DomPDF (invoices), QR codes (SPD payments), Spatie Activity Log, Laravel Sanctum

## Production
- URL: https://hq.thesafari.cz
- Deploy: VPS via SSH/rsync
- DB: PostgreSQL (`safari_crm`)

## Modules
| Module | Routes (Czech) | Models |
|--------|----------------|--------|
| Dashboard | `/` | — |
| Customers | `/zakaznici` | Customer |
| Orders | `/zakazky` | Order, TimeEntry, OrderCost |
| Invoices | `/faktury` | Invoice, InvoiceItem |
| Neniweb | `/neniweb` | Subscription |
| Tickets | `/pozadavky` | Ticket, TicketMessage |
| Settings | `/nastaveni` | CompanySetting, User |
| Notifications | `/notifikace` | Notification (Laravel) |
| Attachments | `/attachments` | Attachment |
| Search | `/search` | — |
| Bank | — | BankTransaction |

## Design
- Safari Dark palette: warm blacks (#0a0a08/#16140f), amber accent (#D97706), warm white (#F5F0E8)
- Glass modal effects (GlassModal component)
- Apple-inspired, Mintix dark dashboard style
