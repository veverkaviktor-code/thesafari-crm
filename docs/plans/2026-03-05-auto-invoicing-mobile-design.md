# Design: Auto-fakturace subscriptions + Mobile zobrazeni

**Datum:** 2026-03-05
**Status:** Schvaleno
**Pristup:** B (po vrstvach - 4 releasy)

---

## Kontext

CRM hq.thesafari.cz ma 68 domen a 52 hostingu. Rucni fakturace za obnovy je neudrzitelna.
Potrebujeme automatickou tvorbu faktur pred expiraci a mobilni zobrazeni pro praci na cestach.

## Klicova pravidla

- Faktury se NIKDY automaticky neodesilaji - admin vzdy rucne zkontroluje a odesle
- Domena = zdroj pravdy je vas-hosting API (registrator), CRM sync prepisuje expires_at
- Hosting = CRM ridi expiraci, follows domena se stejnym name
- Domena + hosting se stejnym name u stejneho zakaznika = 1 spolecna faktura
- Po-expiracni subscriptions se nefakturuji automaticky (rucni rozhodnuti)

---

## Release 1: DB + backend zaklad

### Nova migrace: add_auto_invoice_to_subscriptions

```sql
ALTER TABLE subscriptions ADD COLUMN auto_invoice BOOLEAN NOT NULL DEFAULT true;
```

### Nova migrace: create_invoice_subscription_table

```sql
CREATE TABLE invoice_subscription (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_invoice_sub_unique ON invoice_subscription(invoice_id, subscription_id);
```

### Ciselne rady faktur

Zmena `Invoice::getNextInvoiceNumber($series = '1')`:

| Typ | Format | Priklad |
|-----|--------|---------|
| Zakazky | `{rok}1{seq}` | 20261001, 20261002 |
| Subscriptions | `{rok}6{seq}` | 20266001, 20266002 |
| Stavajici | Beze zmeny | 2026001-2026XXX zustanou |

Logika: `$prefix = $year . $series` -> hledej posledni s timto prefixem -> +1.
Fallback: `{prefix}001`.

### Sync fix (SubscriptionController::sync)

Zmena chovani pro DOMENY:
- PRED: "NEVER overwrite expires_at"
- PO: Sync PREPISUJE expires_at z vas-hosting API

Zmena chovani pro HOSTINGY:
- Sync NEPREPISUJE expires_at (CRM ridi)
- NOVA logika: kdyz se zmeni expires_at domeny, najdi hosting se stejnym `name`
  u stejneho `customer_id` -> aktualizuj expires_at hostingu

### Relace na modelu

- `Invoice` -> `subscriptions()` (belongsToMany pres invoice_subscription)
- `Subscription` -> `invoices()` (belongsToMany pres invoice_subscription)

---

## Release 2: Auto-fakturace

### Novy Artisan command: `subscriptions:auto-invoice`

Spousteni: denne cronem (schedule v `app/Console/Kernel.php`)

Logika:
1. Najdi subscriptions kde:
   - status = aktivni
   - auto_renew = true
   - auto_invoice = true
   - is_free = false
   - expires_at BETWEEN now() AND now()+30 dni
   - NEMA otevrenou fakturu (neexistuje invoice_subscription s fakturou ve stavu vystavena/odeslana)

2. Seskup podle customer_id + name:
   - Domena example.cz + hosting example.cz = 1 faktura
   - Pokud existuje jen domena nebo jen hosting = faktura za jednu sluzbu

3. Pro kazdou skupinu vytvor fakturu:
   - Ciselna rada 6XX
   - status = "vystavena" (NIKDY automaticky odesilat)
   - due_date = expires_at nejblizsi subscription
   - issue_date = today
   - payment_method = "banka"
   - Polozky z sell_yearly kazde subscription:
     - "Obnova domeny example.cz (1 rok)" - XXX Kc
     - "Hosting example.cz (1 rok)" - XXX Kc
   - Pivot zaznamy invoice_subscription

4. Notifikace admin (database notification)

### Bezpecnostni pojistky

| Situace | Chovani |
|---------|---------|
| Subscription uz ma otevrenou fakturu | Preskoc |
| auto_invoice = false | Preskoc |
| is_free = true | Preskoc |
| expires_at v minulosti | Preskoc |
| sell_yearly = 0 nebo NULL | Preskoc s warningem |

### Rozsireni InvoiceController::markAsPaid()

Po zaplaceni faktury s subscription vazbou:
- Pro kazdy hosting na fakture: expires_at += 1 rok
- Pro domeny: NEMENIT (ceka na sync z vas-hosting)
- Vytvorit SubscriptionPayment zaznamy (status=zaplaceno)

Budouci rozsireni (Uroven 2/3):
- Tlacitko "Obnovit u registratora" -> vas-hosting API call
- Automaticke obnoveni po zaplaceni -> API domain-register

---

## Release 3: UI zmeny

### Neniweb formular

Novy prepinac `auto_invoice` vedle `auto_renew`:
- Kdyz auto_renew = false -> auto_invoice disabled + false
- Kdyz auto_renew = true -> auto_invoice enabled, default true

### Faktura detail (Invoices/Show.tsx)

- Zakazkova faktura: zobrazuje "Zakazka: ..." (stavajici)
- Subscription faktura: zobrazuje "Sluzby:" se seznamem navazanych subscriptions
  vcetne typu (domena/hosting), nazvu, expirace, odkazu

### Tlacitko "Obnovit u registratora"

Na subscription fakture po zaplaceni:
- Uroven 1: odkaz na vas-hosting administraci (novy tab)
- Pripraveno na Uroven 2: API call z CRM

### Dashboard alert

Novy typ alertu: "X sluzeb k fakturaci do 30 dni"
Pro auto_renew=true + auto_invoice=false sluzby (rucni fakturace, ale expiruji brzy).

---

## Release 4: Mobilni zobrazeni

### Hamburger menu (< 768px)

- Sidebar defaultne skryty na mobilu
- Hamburger ikona vlevo v TopBaru
- Overlay s backdrop-blur pri otevreni (klik mimo = zavrit)
- Sidebar pouzije stejny obsah jako desktop verze

### Responsive tabulky

Hlavni tabulky (zakaznici, zakazky, faktury):
- Horizontalni scroll
- Sticky prvni sloupec (nazev/jmeno)

Neniweb tabulky:
- Card view na mobilu misto tabulky
- Kazda karta: nazev, typ badge, expirace, cena

### Ostatni mobilni upravy

| Element | Desktop | Mobil |
|---------|---------|-------|
| TopBar search | Cely input | Ikona -> klik rozbali |
| Breadcrumbs | Cela cesta | Jen aktualni stranka |
| Amber timer bar | Plny text | Zkraceny |
| Stat cards | 4 vedle sebe | 2x2 grid |
| Formulare | 2 sloupce | 1 sloupec |
| Akcni tlacitka | Vedle sebe | Vertikalni stack |

---

## Budouci rozsireni (mimo scope)

- Fio banka API: import transakci, auto-match pres VS, auto-zaplaceno
- Vas-hosting API Uroven 2: domain-register pro obnovu primo z CRM
- Vas-hosting API Uroven 3: plna automatizace (zaplaceni -> obnova -> sync)
- Sjednoceni cyklu domena+hosting (opt-in, az po stabilizaci)
- Upominky po splatnosti (auto-email 1./7./14. den)
- Duplikace zakazek
