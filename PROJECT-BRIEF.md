# PROJECT BRIEF — CRM hq.thesafari.cz

## Přehled
Interní CRM pro thesafari.cz — kreativní studio (tisk, reklama, polepy, montáže, weby via neniweb.cz).
Single admin, role-ready struktura. Neplátce DPH. Air Bank (budoucí API integrace).

## Tech Stack
Laravel 12 + Inertia.js + React 19 + TypeScript + Tailwind 4 + Shadcn/UI + PostgreSQL

## Moduly (stav k 2026-03-03)

### Dokončené (MVP + Round 1-3)
- **Dashboard** — stat cards, revenue chart, division donut chart, MRR, financial summary bar, activity timeline (reálná data)
- **Zákazníci** — CRUD, glass modal, mini dashboard, tabs (kontakt, služby, faktury, tikety), ARES napojení
- **Zakázky** — CRUD, glass modal, divize, stavy, OrderItems (inline CRUD s auto-price), OrderCosts, TimeTracker s running timer, marže
- **Faktury** — CRUD, auto-numbering, SPD QR, PDF preview, stavy, položky editor
- **Neniweb** — domény + hosting management, tabs UI
- **Tikety** — email-based (n8n integrace), thread view, priority, stavy
- **Nastavení** — firma (singleton), profil
- **Running Timer Bar** — amber sticky lišta pod navbarem, viditelná na všech stránkách

### Opravy provedené (Round 1-3)
- Route mismatch fix (české URL)
- OrderItems CRUD + inline editing
- Marže kalkulace (příjmy - náklady)
- Timer duration_minutes fix (migrace pro staré záznamy)
- Auto-update order.price ze součtu položek
- Cena odstraněna z OrderForm (auto-kalkulace)
- Čeština s diakritikou v OrderItems
- LogsActivity na OrderItem, OrderCost, TimeEntry
- Dashboard activity feed s reálnými daty
- Floating timer → amber sticky bar

### Budoucí (backlog)
- [ ] Air Bank API integrace (bankovní výpisy, párování plateb)
- [ ] Email notifikace (faktury, tikety)
- [ ] Subscriptions management (měsíční služby neniweb)
- [ ] Multi-user + role-based access
- [ ] PDF export faktur (dompdf/browsershot)
- [ ] Statistiky a reporty (filtry, export)
- [ ] thajskydotek integrace (WooCommerce sync)
- [ ] Mobilní responsivita vylepšení

## Design
Safari Dark paleta — warm dark backgrounds (#0a0a08, #16140f), amber accent (#D97706), warm white (#F5F0E8).
Shadcn/UI komponenty customizované na dark theme.

## Server
- VPS: 37.235.108.29 (sss06.vas-server.cz)
- Nginx + PHP 8.3-FPM + PostgreSQL
- SSL: Let's Encrypt
- Deploy: rsync + ssh (viz CLAUDE.md)
