# Spec: Vylepšené přílohy (Attachments Redesign)

**Datum**: 2026-03-20
**Projekt**: hq.thesafari.cz (CRM)
**Účel**: Opravit a vylepšit systém příloh — drag & drop, multiple upload, náhledy PDF/SVG, přehledná organizace souborů na VPS, zákaznický agregátní pohled.

---

## 1. Problém

- Upload na zakázkách funguje, ale je primitivní (single file, žádný D&D, žádný náhled)
- Zákazníci nemají žádný přehled souborů z jejich zakázek
- Soubory na VPS nemají čitelnou strukturu (jen `attachments/order/42/file.pdf`)
- Tisková data (PDF, SVG) potřebují náhled přímo v CRM

## 2. Architektura

### Princip: soubory patří k zakázce, zákazník agreguje

```
Zákazník (CUBAGARÁŽ)
├── Zakázka #42 "Bannery"
│   ├── banner-281x150.pdf
│   └── banner-450x170.pdf
├── Zakázka #55 "Polep dodávky"
│   └── design-v2.svg
└── Tab "Soubory" → vidí vše z #42 + #55, seskupené
```

- Žádná duplicita — soubory existují jen na `attachments` tabulce s `attachable_type=order`
- Přeřazení zakázky jinému zákazníkovi → soubory jdou s ní automaticky
- Zákazník má read-only agregátní pohled

### Budoucí rozšíření (NEIMPLEMENTUJE SE NYNÍ)
- Odeslání vybraných souborů e-mailem (tiskárně apod.)

## 3. Storage — organizace na VPS/FTP

### Nová struktura
```
storage/app/attachments/
  orders/
    {id}-{slug}/
      {original_filename}
```

Příklad:
```
storage/app/attachments/orders/42-bannery/tiskoviny-A4.pdf
storage/app/attachments/orders/42-bannery/logo-final.svg
storage/app/attachments/orders/55-polep-dodavky/design-v2.pdf
```

- Slug generovaný z názvu zakázky (Str::slug)
- Na FTP okamžitě čitelné co kde je
- Stávající soubory v `attachments/order/{id}/` budou fungovat dál (controller čte `path` z DB, ne z konvence)

### Migrace starých souborů
- Není nutná — stávající `path` v DB ukazuje na správné místo
- Nové soubory půjdou do nové struktury

## 4. Backend změny

### AttachmentController — rozšíření `store()`

```php
// Aktuálně: jeden soubor
$request->validate(['file' => 'required|file|max:10240|mimes:...']);

// Nově: pole souborů
$request->validate([
    'files' => 'required|array|min:1|max:20',
    'files.*' => 'file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,zip,txt,svg',
    'descriptions' => 'nullable|array',
    'descriptions.*' => 'nullable|string|max:500',
    'attachable_type' => 'required|in:order',
    'attachable_id' => 'required|integer',
]);
```

- Iterace přes `$request->file('files')`, každý soubor uložit zvlášť
- Storage path: `attachments/orders/{id}-{slug}/{filename}`
- Deduplikace filename: pokud soubor se stejným názvem existuje, append `_{timestamp}_{uniqid}` před příponu
- Validace `attachable_type` zůstává `in:customer,order,ticket` (zachovat zpětnou kompatibilitu), nový multiple upload funguje pro všechny typy

### AttachmentController — nový `preview()` endpoint

```php
Route::get('attachments/{attachment}/preview', [AttachmentController::class, 'preview'])
    ->name('attachments.preview');
```

- Vrátí soubor jako inline response (ne download) pro PDF/SVG/obrázky
- `Content-Disposition: inline` + správný `Content-Type`
- Pro nepodporované typy → redirect na download

### CustomerController — eager load příloh přes zakázky

```php
// V show() metodě — přidat:
$customer->load(['orders.attachments']);
```

Předat do Inertia jako `orderAttachments` — flat list s order info:
```php
'orderAttachments' => $customer->orders->flatMap(function ($order) {
    return $order->attachments->map(fn ($att) => array_merge(
        $att->only(['id', 'filename', 'description', 'mime_type', 'size', 'created_at']),
        ['order_id' => $order->id, 'order_name' => $order->title]
    ));
})->values(),
```

## 5. Frontend změny

### Nová komponenta: `FileUploader.tsx`

Nahradí stávající upload sekci v `OrderAttachments.tsx`.

**Funkce:**
- Drag & drop zóna (vizuální feedback při hover)
- Tlačítko "Vybrat soubory" (input `multiple`)
- Seznam vybraných souborů před uploade (s možností odebrat)
- Volitelný popis (jeden pro celý batch, nebo per-file — jednodušší: jeden globální)
- Upload tlačítko → POST s FormData (pole `files[]`)
- Progress indikátor (Inertia `progress` event)

**Styling:**
- Přerušovaný border, ikona upload, text "Přetáhněte soubory sem"
- Hover/drag-over: amber border + pozadí
- Konzistentní s CRM dark theme

### Vylepšená komponenta: `AttachmentList.tsx`

Nahradí seznam v `OrderAttachments.tsx`.

**Náhled podle typu:**
- **PDF**: `<iframe src="/attachments/{id}/preview" />` — max-height 300px, scrollovatelný
- **SVG**: `<img src="/attachments/{id}/preview" />` — max-height 200px
- **JPG/PNG/GIF/WEBP**: `<img src="/attachments/{id}/preview" />` — thumbnail
- **Ostatní**: ikona typu (FileText, FileSpreadsheet, Archive) + název

**Akce na každém souboru:**
- Stáhnout (Download ikona → `/attachments/{id}/download`)
- Smazat (Trash ikona → DELETE s potvrzením)
- Klik na náhled → otevře v novém tabu (plná velikost)

**Zobrazení:**
- Grid layout (2-3 sloupce na desktopu, 1 na mobilu)
- Karta: náhled nahoře, metadata + akce dole
- Metadata: název, velikost, datum

### Zákazník — nový tab "Soubory"

V `Customers/Show.tsx` přidat tab vedle existujících (Zakázky, Faktury, Služby).

**Obsah:**
- Přílohy seskupené podle zakázky
- Nadpis sekce: název zakázky (klikací → navigace na detail zakázky)
- Pod nadpisem: `AttachmentList` (read-only, bez uploadu, bez mazání)
- Prázdný stav: "Žádné soubory" s ikonou

## 6. Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `app/Http/Controllers/AttachmentController.php` | Multiple upload, preview endpoint, nová storage cesta |
| `routes/web.php` | Přidat preview route |
| `resources/js/components/FileUploader.tsx` | **NOVÝ** — D&D + multiple upload |
| `resources/js/components/AttachmentList.tsx` | **NOVÝ** — grid s náhledy |
| `resources/js/Pages/Admin/Orders/Show.tsx` | Nahradit OrderAttachments za FileUploader + AttachmentList |
| `resources/js/components/orders/OrderAttachments.tsx` | **SMAZAT** (nahrazeno novými komponentami) |
| `app/Http/Controllers/OrderController.php` | Ověřit že loaduje attachments |
| `app/Http/Controllers/CustomerController.php` | Eager load orders.attachments, předat do Inertia |
| `resources/js/Pages/Admin/Customers/Show.tsx` | Přidat tab "Soubory" |

## 7. Omezení a infrastruktura

- Max 10 MB na soubor (stávající)
- Max 5 souborů v jednom uploadu (PHP `post_max_size` limit)
- Povolené typy: PDF, SVG, JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, ZIP, TXT
- PDF náhled závisí na browser PDF vieweru (funguje ve všech moderních prohlížečích)
- VPS: ověřit `upload_max_filesize=10M` a `post_max_size=60M` v php.ini
- Nginx: ověřit `client_max_body_size 60m;` v server bloku
- PDF iframe: ověřit že nginx neblokuje `X-Frame-Options` pro same-origin requesty
- `formatFileSize` přesunout z lokální utility do `lib/utils.ts` (DRY pravidlo)

## 7.1 Soft delete a forceDelete zakázek

- Soft deleted zakázky: přílohy se v zákaznickém pohledu NEZOBRAZUJÍ (standardní Eloquent filtr)
- ForceDelete zakázky: MUSÍ nejprve smazat přílohy z disku + DB (cascade přes Order::deleting event nebo explicitně v controlleru)
- Orphan cleanup: při forceDelete volat `$order->attachments->each(fn($a) => Storage::delete($a->path) && $a->delete())`

## 8. Co se NEDĚLÁ

- Email odesílání souborů (budoucí feature)
- Upload přímo na zákazníka (vždy přes zakázku)
- Ticket přílohy (mimo scope)
- Migrace starých souborů do nové adresářové struktury
