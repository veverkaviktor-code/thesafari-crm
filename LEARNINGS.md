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

---

### 2026-03-06 — PostgreSQL notifications.data je text, ne jsonb
**Context**: `notifications:generate` command padal s `operator does not exist: text ->> unknown`. Laravel notifications tabulka má `data` jako `text`, ne `jsonb`.
**Learning**: PostgreSQL vyžaduje explicitní cast `data::jsonb->>'key'` pokud sloupec je `text` ale obsahuje JSON. MySQL toto toleruje, PostgreSQL ne.
**Pattern**: Při práci s JSON operátory v PostgreSQL vždy ověřit typ sloupce. Pokud je `text`, použít `::jsonb` cast. Platí pro notifications, activity_log a další tabulky s JSON v text sloupcích.
**Action**: Při psaní `whereRaw` s JSON operátory → vždy `column::jsonb->>'key'`, nikdy `column->>'key'` (pokud sloupec není nativně jsonb).

---

### 2026-03-06 — Playwright walkthrough jako verifikační standard
**Context**: Po deployi 54 souborů potřeba ověřit, že vše funguje. Manuální kontrola by trvala dlouho.
**Learning**: Playwright browser automation (navigate + snapshot + fill + click + wait) umožňuje systematický walkthrough všech stránek za ~5 minut. Accessibility snapshot je lepší než screenshot — obsahuje text, role, stavy, refs pro interakci.
**Pattern**: Po větším deployi → Playwright walkthrough: (1) login, (2) každá stránka v navigaci, (3) interaktivní testy (search, form submit, modal open), (4) console error check.
**Action**: Pro CRM audit/deploy vždy zahrnout browser verifikaci jako poslední krok.

---

### 2026-03-07 — alerts_ignored_at pattern pro ignorování alertů
**Context**: "Věnujte pozornost" zobrazovalo expirované služby, které uživatel nemůže vyřešit (např. doména po expiraci). Potřeba ignorovat bez smazání.
**Learning**: Nullable timestamp `alerts_ignored_at` je jednoduchý a efektivní pattern — `whereNull('alerts_ignored_at')` filtruje, toggle nastaví/odstaví now(). Lepší než boolean (timestamp zachycuje kdy bylo ignorováno). Frontend optimisticky odebere alert ze seznamu + zobrazí v sekci "Ignorované" s možností obnovení.
**Pattern**: Pro "dismiss" funkci na recurring alertech → nullable timestamp (ne boolean, ne soft delete). Frontend = lokální state + router.post pro okamžitou odezvu.
**Action**: Pro jakékoliv budoucí "ignoruj/dismiss" funkce použít tento pattern.

---

### 2026-03-07 — Expand/collapse pattern pro dashboard komponenty
**Context**: Dashboard komponenty (Pohledávky, Věnujte pozornost) zobrazovaly buď všechno nebo nic. Potřeba kompaktního zobrazení s možností rozbalit.
**Learning**: `defaultVisible` prop + `expanded` state + `items.slice(0, defaultVisible)` = jednoduchý a znovupoužitelný pattern. Ke každé dashboard komponentě přidat link na plnou stránku. Dashboard = přehled (3 záznamy), detail stránka = plný seznam.
**Pattern**: Dashboard komponenty vždy s `defaultVisible` prop. Zobrazit N + "Zobrazit vše (total)" tlačítko + link na detail stránku.
**Action**: Při vytváření dashboard komponent vždy myslet na kompaktní vs. full zobrazení.

---

### 2026-03-07 — Automatické emaily musí mít podmínku sent_at
**Context**: Payment-thanks email se posílá po markAsPaid. Ale faktura nemusela být nikdy odeslána zákazníkovi (interní, draft).
**Learning**: Automatické follow-up emaily (poděkování, remindery) posílat JEN pokud předchozí komunikace proběhla (`sent_at` existuje). Jinak zákazník dostane email o faktuře, o které neví.
**Pattern**: `if (!$invoice->sent_at) return;` na začátku každého follow-up emailu. Try/catch kolem Mail::html() — email nesmí shodit hlavní flow.
**Action**: Při přidávání automatických emailů vždy ověřit předchozí stav komunikace.

---

### 2026-03-20 — PHP-FPM verze na VPS ≠ CLI verze
**Context**: Upload souborů na zakázkách selhával s "file failed to upload" i přesto, že PHP limity byly nastavené na 12M.
**Learning**: VPS má PHP 8.3, 8.4 i 8.5. CLI (`php`) = 8.4, ale nginx reverse proxy používá PHP 8.4-FPM specifický socket. Editoval jsem `php.ini` pro PHP 8.3, ale web běžel na 8.4 s původními limity 2M. `php -i` zobrazí CLI konfiguraci, NE FPM.
**Pattern/Anti-pattern**: Anti-pattern: editovat `php.ini` podle CLI verze. Vždy ověřit `grep fastcgi_pass /etc/nginx/scripts/php-version.conf` pro zjištění skutečné PHP-FPM verze, pak editovat správný `/etc/php/{verze}/fpm/php.ini`.
**Action**: Před úpravou PHP limitů VŽDY: (1) zjistit PHP verzi z nginx config, (2) editovat správný fpm/php.ini, (3) restartovat správný `php{verze}-fpm`.

---

### 2026-03-20 — Inertia.js + FormData s file upload
**Context**: Multiple file upload přes `router.post('/attachments', formData)` nefungoval — soubory se neposlaly.
**Learning**: Inertia `router.post()` s hotovým `FormData` objektem interně data reserializuje a ztratí File objekty. S polem souborů `files: [File, File]` a `forceFormData: true` taky nefunguje — Inertia konvertuje pole ale PHP nedostane platné UploadedFile. Jediné spolehlivé řešení: posílat jeden soubor per request (`file: File` + `forceFormData: true`), pro multiple soubory uploadovat sekvenčně.
**Pattern/Anti-pattern**: Anti-pattern: posílat pole File objektů přes Inertia. Pattern: jeden soubor per request, sekvenční upload z frontendu.
**Action**: Pro file upload v Inertia vždy single file per request. Multiple = sekvenční loop na frontendu.

---

### 2026-03-20 — Theme-aware CSS třídy vs hardcoded barvy
**Context**: FileUploader a AttachmentList komponenty měly `text-white/60`, `border-white/20` — neviditelné na světlém pozadí CRM karet.
**Learning**: CRM má Shadcn/UI theme s CSS proměnnými. Sidebar je tmavý ale `bg-card` je světlý. Komponenty MUSÍ používat theme-aware třídy: `text-foreground`, `text-muted-foreground`, `border-border`, `bg-accent` — nikdy hardcoded `white/XX` nebo `black/XX`.
**Pattern/Anti-pattern**: Anti-pattern: `text-white/60` na komponentě která může být na světlém i tmavém pozadí. Pattern: vždy `text-foreground`, `text-muted-foreground`, `border-border`, `bg-accent`.
**Action**: V CRM projektu NIKDY `text-white/*` ani `text-black/*` — vždy Shadcn theme třídy.

---

### 2026-03-20 — Lucide React `FileIcon` vs `File as FileIcon`
**Context**: FileUploader se nerendroval — prázdný box pod "Přílohy" nadpisem.
**Learning**: `import { FileIcon } from 'lucide-react'` importuje TypeScript TYPE, ne komponentu. Správně: `import { File as FileIcon } from 'lucide-react'`. Lucide exportuje ikony jako pojmenované komponenty (`File`, `Download`...) a typy jako `*Icon` sufixed (`FileIcon`, `DownloadIcon`). Runtime error = celá React subtree se nezobrazí.
**Pattern/Anti-pattern**: Anti-pattern: `import { XxxIcon } from 'lucide-react'`. Pattern: `import { Xxx as XxxIcon } from 'lucide-react'` pokud potřebuješ alias.
**Action**: Při importu z lucide-react NIKDY `*Icon` — vždy base name nebo explicit alias.

---

### 2026-03-20 — Semantic versioning — kdy měnit verzi CRM
**Context**: Uživatel se ptal kdy měnit verzi (v1.0.1 je hardcoded v footer).
**Learning**: Verzování podle semver: PATCH (v1.0.x) = bugfixy a drobné opravy. MINOR (v1.x.0) = nové features (přílohy, admin credentials, přejmenování). MAJOR (vx.0.0) = breaking changes (multi-user, nová architektura). Dnešní session = v1.1.0 (nové features: přílohy, admin credentials, přejmenování Webové služby).
**Pattern**: Po každé session kde přidáme novou funkčnost → bump MINOR. Po bugfixech → bump PATCH. Verze v footeru + git tag.
**Action**: Na konci každé session s novými features: (1) bump verze v AuthenticatedLayout.tsx, (2) git tag, (3) update CHANGELOG.md.

---

### 2026-03-20 — Encrypted password storage v Laravel
**Context**: Ukládání admin/client hesel k webům v subscriptions.
**Learning**: Laravel `encrypted` cast automaticky šifruje při zápisu a dešifruje při čtení. Kombinace s `$hidden` zajistí, že heslo se neserializuje do JSON responses — explicitně zobrazit přes `makeVisible(['admin_password'])` jen tam kde je potřeba (show, edit). Frontend: eye toggle + copy button s checkmark feedback.
**Pattern**: Pro citlivá data: `encrypted` cast + `$hidden` + `makeVisible()` v konkrétních controller metodách.
**Action**: Pro jakékoliv credentials/secrets v DB vždy tento pattern.

---

### 2026-03-07 — Activity log pruning — 7 dní stačí
**Context**: activity_log tabulka by neomezeně rostla. Dashboard zobrazuje jen poslední aktivitu.
**Learning**: Pro CRM s jedním adminem stačí 7 dní activity logu. Scheduler `Activity::where('created_at', '<', now()->subDays(7))->delete()` v 03:30. Dashboard query filtruje `->where('created_at', '>=', now()->subDays(7))` pro konzistenci.
**Pattern**: Vždy nastavit retenci na log tabulky. Activity log = 7 dní, notifications = ponechat (user-facing).
**Action**: Při přidávání log/audit tabulek vždy definovat retenci + cleanup schedule.

---

### 2026-03-21 — Rsync deploy nemaže staré soubory
**Context**: Po rename Subscription→Website zůstaly staré .php soubory na VPS (Subscription.php, SubscriptionPayment.php, SubscriptionController.php). Autoloader je stále načítal → 500 error.
**Learning**: `rsync --include='app/***' --exclude='*'` PŘIDÁVÁ nové soubory ale NEMAŽE staré. Po přejmenování/smazání souborů je nutné explicitně smazat staré na VPS + `composer dump-autoload`.
**Pattern**: Po rename/delete souborů v deployi: (1) rsync nového kódu, (2) `ssh rm` starých souborů, (3) `composer dump-autoload`, (4) cache clear.
**Action**: Zvážit deploy script s `--delete` na app/ directory, nebo whitelist přístup.

---

### 2026-03-21 — activity_log subject_type po rename modelu
**Context**: Po rename `Subscription` → `Website` spadl dashboard — activity_log záznamy měly `subject_type = 'App\Models\Subscription'`, autoloader hledal smazaný soubor.
**Learning**: spatie/activitylog ukládá plný namespace do `subject_type`. Po rename modelu je nutné UPDATE existujících záznamů v `activity_log` tabulce.
**Pattern**: Při rename modelu vždy: `UPDATE activity_log SET subject_type = 'App\Models\NewName' WHERE subject_type = 'App\Models\OldName'`.
**Action**: Přidat do migrace nebo post-deploy skriptu.

---

### 2026-03-21 — BelongsToMany pivot withTimestamps() vyžaduje oba sloupce
**Context**: `invoice_website` pivot měl jen `created_at` (ne `updated_at`). Model s `withTimestamps()` selhal s "column updated_at does not exist".
**Learning**: Laravel `withTimestamps()` na BelongsToMany vyžaduje OBA sloupce (`created_at` + `updated_at`). Pokud pivot nemá `updated_at`, použít `withPivot('created_at')` místo `withTimestamps()`.
**Pattern**: U pivot tabulek bez `updated_at` nikdy `withTimestamps()`.
**Action**: Při vytváření pivot tabulky rozhodnout: potřebuji updated_at? Pokud ne, nepřidávat a nepoužívat withTimestamps().

---

### 2026-03-21 — Split pricing: oddělené ceny doména/hosting
**Context**: Uživatel chtěl vidět náklad a prodej zvlášť pro doménu a hosting na jedné kartě.
**Learning**: Kombinovaný `sell_yearly`/`cost_yearly` nestačí pro transparentní fakturaci. Split na `domain_sell_yearly`/`domain_cost_yearly` + `hosting_sell_yearly`/`hosting_cost_yearly` s computed totals v `sell_yearly`/`cost_yearly` (zachovává zpětnou kompatibilitu s MRR, dashboard, finance).
**Pattern**: Když máš víc cenových složek, raději separátní pole + computed total než jeden kombinovaný. Nový kód čte split pole, starý kód čte total = zpětná kompatibilita.
**Action**: Při store/update vždy přepočítat `sell_yearly = totalSellYearly()` a `cost_yearly = totalCostYearly()`.

---

### 2026-03-22 — Paralelní audit agenti: 4 specializace efektivnější než 1 velký audit
**Context**: Kompletní audit CRM — backend, frontend, DB/security, business logika. Spuštěny 4 agenti paralelně.
**Learning**: Specializovaní agenti (backend-audit, frontend-audit, security-audit, business-logic-audit) najdou více issues než jeden generický agent. Každý pracuje 2-4 minuty, celkem 45+ issues nalezeno. Klíčové je dát agentům kontext starého auditu pro cross-referenci (co je opraveno vs. co zůstává).
**Pattern**: Pro audit vždy rozdělit na 4 specializace: (1) kód/modely/controllery, (2) frontend/UX/accessibility, (3) DB/security/OWASP, (4) business logika/data flow. Každému dát findings z předchozích auditů.
**Action**: Po každém větším release spustit 4-agent audit. Uložit výsledky do `docs/audit/`.

---

### 2026-03-22 — is_free filtr musí být na VŠECH místech kde se počítají finance
**Context**: Dashboard MRR počítal free weby (braco, neniweb, thesafari) → inflace 638 Kč. FinanceController měl filtr, DashboardController ne.
**Learning**: Filtr `is_free` musí být konzistentně aplikován VŠUDE kde se agregují ceny: DashboardController (MRR, stats), FinanceController (revenue, costs, MRR detail), AutoInvoice (fakturace). Stačí jedno chybějící místo a finance nesedí.
**Pattern**: Při přidání nového "exclude" flagu (is_free, is_external) → grep VŠECHNY controllery/commands kde se počítá s cenami a přidat filtr. Nejlépe scope na modelu: `Website::billable()`.
**Action**: Zvážit přidání `scopeBillable()` na Website model (aktivní + ne-free + ne-external) aby se filtr nedupllikoval.

---

### 2026-03-22 — Free weby nesmí mít sell_yearly > 0
**Context**: 5 free webů mělo sell_yearly (300–2350 Kč) — artifact z migrace. I s is_free filtrem to matlo.
**Learning**: Datová konzistence > kódový filtr. Pokud web je zdarma, sell prices musí být 0. Nespoléhat jen na `WHERE is_free = false` v queries — opravit data.
**Pattern**: Při nastavení `is_free = true` na webu automaticky vynulovat sell ceny (model observer nebo controller logika).
**Action**: Přidat do WebsiteController store/update: `if (is_free) { sell_yearly = 0, hosting_sell = 0, domain_sell = 0 }`.

---

### 2026-03-22 — Aliasy jsou čistě doménové záznamy — ne hosting
**Context**: Aliasy měly hosting ceny (250/222 nebo 2050/0) z migrace split pricingu. Zobrazovaly hosting expiraci a storage v seznamu.
**Learning**: Alias = doména přidělená k parentu. NEMÁ vlastní hosting, storage, ani hosting expiraci. V DB: hosting_sell = 0, hosting_cost = 0. V UI: hosting exp a storage sloupce zobrazují "—". V query: aliasy vyloučeny z hlavního dotazu, vkládány pod parenta po paginaci.
**Pattern**: Alias řádek v seznamu: zobrazit jen název, zákazníka, registrátora, doménovou expiraci, cenu domény. Vše hostingové = "—".
**Action**: Při vytváření aliasu automaticky nastavit hosting_sell/cost = 0.

---

### 2026-03-22 — Konzistence fakturačních metod: createInvoice, createCustomerInvoice, AutoInvoice
**Context**: 3 metody generovaly faktury v různém formátu — split vs. combined pricing, s/bez aliasů, různé splatnosti, různé formáty období.
**Learning**: Všechny fakturační cesty MUSÍ generovat identický formát: split pricing (hosting + doména oddělené), alias domény zahrnuty, budoucí období (expiry → expiry+1rok), splatnost = datum expirace. Při přidání nové fakturační metody vždy cross-check se stávajícími.
**Pattern**: Faktura = vždy oddělené řádky hosting/doména/alias s obdobím. Nikdy combined "Hosting + doména X" jako jedna položka. Period = budoucí (fakturujeme obnovu). Splatnost = expirace.
**Action**: Při jakékoliv změně v jedné fakturační metodě → grep ostatní a sjednotit.

---

### 2026-03-22 — VPS fakturace: FK místo LIKE na notes
**Context**: VPS auto-invoice kontroloval duplicity přes `WHERE notes LIKE '%VPS name%'` — křehké, manuální faktura bez tohoto textu by vytvořila duplikát.
**Learning**: Pro vztah Invoice ↔ VpsServer je potřeba proper FK (`vps_server_id` na invoices). Pak kontrola i prodloužení expirace v processPayment() jsou robustní.
**Pattern**: Nikdy nepoužívat LIKE na textovém poli pro business logiku. Vždy FK nebo pivot tabulka.
**Action**: Pro jakýkoliv nový fakturovatelný typ entity → přidat FK na Invoice (nebo generický polymorphic vztah).

---

### 2026-03-22 — SendInvoiceReminders: vždy kontrolovat sent_at
**Context**: Upomínky se posílaly i fakturám které zákazník nikdy nedostal (sent_at = NULL).
**Learning**: Automatické follow-up emaily (upomínky, poděkování) smí jít JEN pokud předchozí komunikace proběhla. `whereNotNull('sent_at')` je povinná podmínka.
**Pattern**: U všech automatických follow-up emailů: `if (!$record->sent_at) skip`.
**Action**: Při přidání nového automatického emailu vždy přidat sent_at guard.

---

### 2026-03-22 — Float porovnání v Fio auto-match: nikdy ===
**Context**: `(float) $invoice->total === $amount` může selhat při drobné floating point nepřesnosti.
**Learning**: PostgreSQL decimal(10,2) → PHP float konverze může mít drobné odchylky. `===` je příliš striktní.
**Pattern**: Pro finanční porovnání vždy `abs($a - $b) < 0.01`, nikdy `===` nebo `==`.
**Action**: Grep pro `=== $amount` nebo `== $amount` v kontextu financí → nahradit abs() < epsilon.

---

### 2026-04-02 — PostgreSQL CHECK constrainty blokují záporné hodnoty
**Context**: Povolení záporných cen na fakturách (kompenzace -520 Kč). Laravel validace opravena, ale INSERT stále padal.
**Learning**: PostgreSQL CHECK constrainty (`invoice_items_total_price_check`, `invoice_items_unit_price_check`) fungují nezávisle na Laravel validaci. Tři vrstvy blokace: (1) HTML `<input min="0">`, (2) Laravel `'numeric|min:0'`, (3) DB CHECK constraint.
**Pattern**: Při změně validačních pravidel VŽDY kontrolovat 3 vrstvy. `SELECT conname FROM pg_constraint WHERE conrelid = 'tabulka'::regclass AND contype = 'c'`.
**Action**: Před povolením nových hodnot ověřit DB constrainty. Po změně: test INSERT přes tinker.

---

### 2026-04-02 — DataTable selectable bez getItemId → posunuté sloupce
**Context**: Zakázky index — header měl checkbox ale data řádky ne → sloupce posunuté o 1.
**Learning**: DataTable s `selectable` přidá checkbox do headeru vždy, ale data řádky renderují checkbox jen když `getItemId` vrátí hodnotu. Bez prop = `undefined` = žádný checkbox v řádku.
**Pattern**: `selectable` + `selectedIds` + `onSelectionChange` VŽDY vyžadují i `getItemId={(o) => o.id}`.
**Action**: Přidat runtime warning do DataTable pokud je selectable bez getItemId.

---

### 2026-04-02 — Invoice sloupec `total` (ne `total_amount`)
**Context**: Ruční update celkové částky faktury přes tinker — `$inv->total_amount = X` → update šel do prázdna.
**Learning**: Sloupec se jmenuje `total`, cast `decimal:2`. Vždy ověřit přes model casts nebo schema, nikdy hádat.
**Pattern**: Před ručním DB updatem přes tinker: `\Schema::getColumnListing('table')` nebo zkontrolovat `$casts` v modelu.
**Action**: V CLAUDE.md je to zaznamenáno jako gotcha.

---

### 2026-04-02 — Divize VARCHAR → JSONB multi-select
**Context**: Přestrukturace z 5 jednoduchých divizí na 4 skupiny s multi-selectem.
**Learning**: `ALTER COLUMN division TYPE jsonb USING jsonb_build_array(division)` konvertuje string na JSON pole v jednom kroku. Scope `whereJsonContains` pro filtrování. Dashboard agregace vyžaduje PHP loop místo SQL GROUP BY (JSONB pole nelze jednoduše groupovat).
**Pattern**: JSONB pole v PostgreSQL = flexibilní multi-select bez pivot tabulky. Pro jednoduché tagy/kategorie lepší než M:N.
**Action**: Pro budoucí multi-select fieldy zvážit JSONB pole jako první volbu.

---

### 2026-04-02 — Fakturační řady: sjednocení a oddělení převodem/hotově
**Context**: Staré řady 1XXX (zakázky) a 6XXX (hosting) → sjednoceno na převodem 0XXX + hotově 9XXX.
**Learning**: Sequence tabulka s `prefix` + `last_number` je flexibilní. Při změně řad: (1) nastavit last_number aby nové číslo nekolidovalo, (2) ověřit VŠECHNA volání `getNextInvoiceNumber()` v codebase. `grep -r "getNextInvoiceNumber" app/` = 8 míst (controllers + commands).
**Pattern**: Při změně číslování vždy grep celý codebase pro volání. Staré faktury nechat beze změny.
**Action**: Při jakékoliv změně invoice numbering → otestovat přes tinker: `Invoice::getNextInvoiceNumber('banka')` a `Invoice::getNextInvoiceNumber('hotove')`.

---

### 2026-04-01 — Reusable CustomerCombobox pattern
**Context**: 6+ formulářů s plain Select pro zákazníka — uživatel chtěl vyhledávání.
**Learning**: Shadcn Command + Popover = searchable combobox. `value` prop na CommandItem musí obsahovat searchable text (jméno + firma), ne ID. `w-[--radix-popover-trigger-width]` pro šířku odpovídající triggeru.
**Pattern**: Když se Select používá na 3+ místech se stejnými daty → extrahovat do reusable Combobox.
**Action**: Pro další entity (hosting, doména) stejný pattern pokud seznam naroste.

---

### 2026-04-01 — Fio API obsahuje balance v response info
**Context**: Stávající parser zahazoval `accountStatement.info` — četl jen `transactionList`.
**Learning**: Fio API response obsahuje `closingBalance`, `openingBalance`, `currency`, `iban` v `accountStatement.info`. Cache 5 min kvůli rate limitu.
**Pattern**: Při práci s API parsery vždy zkontrolovat celou raw response — může obsahovat užitečná data.
**Action**: Dashboard StatCard "Stav účtu" z FioApiService::getBalance().
