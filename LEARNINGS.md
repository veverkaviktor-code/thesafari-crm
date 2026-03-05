# CRM hq.thesafari.cz — Learnings

---

### 2026-03-03 — Team agents paralelizace backend + frontend
**Context**: CRM Round 3 — timer fix, UI polish, floating widget, activity feed. 12 dílčích změn across backend (PHP) + frontend (TSX).
**Learning**: Rozdělení na backend-dev + frontend-dev agenty fungovalo výborně. Frontend hotov za ~3 min, backend za ~7 min (víc práce: migrace, 4 modely, controller). Build prošel napoprvé bez chyb.
**Pattern**: Pro CRM změny vždy dělit na backend + frontend agenty. Frontend je rychlejší, backend má víc závislostí.
**Action**: Vždy nejdřív definovat shared interface (Inertia props) aby oba agenti pracovali proti stejnému kontraktu.

---

### 2026-03-03 — Timer jako horní lišta místo floating widgetu
**Context**: Plán měl floating widget (fixed bottom-right), uživatel navrhl interaktivní horní lištu.
**Learning**: Horní lišta (sticky bar pod navbarem) je lepší UX než floating widget — neblokuje obsah, víc prostoru pro info, profesionálnější (Toggl/Linear pattern). Amber barva = jasně viditelné.
**Pattern**: Pro persistentní stav (timer, notifikace) preferovat sticky bar, ne floating widget.
**Action**: Při návrhu UI s persistentním stavem vždy nabídnout variantu sticky bar.

---

### 2026-03-03 — Deploy workflow CRM (rsync + migrations)
**Context**: Deploy na VPS bez git remote. Rsync app/, database/, resources/, routes/, public/build/ + ssh migrations.
**Learning**: Dvoustupňový rsync funguje spolehlivě: (1) rsync PHP souborů, (2) rsync --delete buildnutých assets. Migrace + cache refresh přes ssh jedním příkazem.
**Pattern**: `rsync -avz --include='app/***' --include='database/***' ... ./ root@server:/path/` + `ssh server "cd /path && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache"`
**Action**: Vytvořit deploy skill pro CRM aby se nemusely příkazy pokaždé hledat.

---

### 2026-03-03 — PHP není na macOS, migrace jen na serveru
**Context**: `php artisan migrate` lokálně selhalo (command not found).
**Learning**: Na macOS není PHP nainstalované. Migrace se spouští pouze na VPS. Build (npm run build) běží lokálně OK.
**Pattern**: Lokální workflow = npm run build → rsync → ssh migrace. Nikdy nespouštět artisan lokálně.
**Action**: V deploy procesu přeskočit lokální migraci, vždy jen na serveru.

---

### 2026-03-03 — Auto-update ceny zakázky ze součtu položek
**Context**: Cena zakázky se neaktualizovala po přidání/editaci/smazání položek.
**Learning**: Pattern: po CRUD operaci na child modelu (OrderItem) přepočítat aggregát na parent modelu (Order.price). Jednoduchý `$order->update(['price' => $order->items()->sum(DB::raw('quantity * unit_price'))])`.
**Pattern**: Vždy po CRUD na child modelu s finanční hodnotou → přepočítat parent sum. Nikdy se nespoléhat na frontend kalkulaci.
**Action**: Při návrhu nových relací s cenami rovnou plánovat auto-update trigger.

---

### 2026-03-03 — LogsActivity na všech modelech pro activity feed
**Context**: Dashboard activity feed potřeboval reálná data místo placeholder.
**Learning**: spatie/activitylog trait `LogsActivity` + `$logFillable = true` + `$logOnlyDirty = true` stačí pro automatické logování. Pro dashboard pak stačí query na `activity_log` s mapping subject_type → icon + český text.
**Pattern**: Při přidání nového modelu vždy přidat LogsActivity trait. Dashboard activity feed = single query na activity_log.
**Action**: Zahrnout LogsActivity do checklistu pro nové modely.

---

### 2026-03-03 — Oprava starých dat migrací (ne seederem)
**Context**: Staré time entries měly duration_minutes=0 protože se nepočítaly.
**Learning**: Pro jednorázovou opravu existujících dat použít migraci (ne seeder). PostgreSQL `CEIL(EXTRACT(EPOCH FROM (stopped_at - started_at)) / 60)` pro výpočet minut z timestampů.
**Pattern**: Data fix = migrace. Testovací data = seeder. Nikdy nemíchat.
**Action**: Při bugfixu kde existují špatná data v DB → vždy vytvořit oprávnou migraci.

---

### 2026-03-06 — Kompletní audit odhalil chybějící auto-invoice command
**Context**: Scheduler v console.php registroval `subscriptions:auto-invoice`, ale command soubor neexistoval. Auto-fakturace tiše nefungovala.
**Learning**: Po vytvoření scheduler záznamu VŽDY ověřit, že command existuje. `php artisan schedule:list` na serveru ukáže registrované příkazy. Pokud command chybí, Laravel tiše ignoruje (ne error).
**Pattern**: Po přidání Schedule::command() → ověřit existenci command třídy + otestovat `php artisan {signature} --help`.
**Action**: Při auditu vždy cross-referencovat scheduler s existujícími command soubory.

---

### 2026-03-06 — Race condition v invoice numbering
**Context**: `getNextInvoiceNumber()` běžel ve vlastní transakci, ale `InvoiceController::store()` nebyl v transakci. Dva simultánní requesty mohly dostat stejné číslo.
**Learning**: `lockForUpdate()` chrání jen uvnitř transakce kde běží. Pokud volající kód není ve stejné (nebo obalující) transakci, lock se uvolní před INSERT.
**Pattern**: Pokud metoda používá `lockForUpdate()`, volající kód MUSÍ být ve stejné DB::transaction(). Nejlépe celý store() obalit.
**Action**: Při code review hledat `lockForUpdate()` volání a ověřit, že jsou v transakci s navazujícím zápisem.

---

### 2026-03-06 — PostgreSQL nevytváří indexy na FK sloupcích automaticky
**Context**: 5 FK sloupců bez indexů (order_items.order_id, subscription_payments.invoice_id, atd.). Seq scan při JOINech.
**Learning**: Na rozdíl od MySQL, PostgreSQL NEVYTVÁŘÍ automaticky index na cizím klíči. Každý FK sloupec potřebuje explicitní `$table->index()`.
**Pattern**: Při vytváření migrace s `foreignId()` nebo `constrained()` → vždy přidat `->index()` nebo separátní `$table->index('column')`.
**Action**: Při auditu DB → vždy kontrolovat FK sloupce vs indexy.

---

### 2026-03-06 — formatCurrency duplikace ve 21 souborech
**Context**: Identická Intl.NumberFormat funkce copy-pasted ve 23 souborech místo sdílené utility.
**Learning**: Utility funkce jako formatCurrency, formatDate, formatPhone patří do `lib/utils.ts` od začátku. Duplikace se šíří rychle když se copy-paste z jedné komponenty do další.
**Pattern**: Jakákoliv funkce použitá ve 2+ souborech → okamžitě extrahovat do utils. Při code review hledat duplicitní `const format*` definice.
**Action**: Nové utility funkce vždy definovat v lib/utils.ts, nikdy lokálně.
