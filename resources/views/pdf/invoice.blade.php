<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9pt;
            color: #1a1a1a;
            line-height: 1.4;
        }
        .container { padding: 15mm 15mm; }

        /* Header */
        .header { display: table; width: 100%; margin-bottom: 6mm; }
        .header-left { display: table-cell; width: 50%; vertical-align: top; }
        .header-right { display: table-cell; width: 50%; vertical-align: top; text-align: right; }
        .invoice-title {
            font-size: 20pt;
            font-weight: bold;
            color: #D97706;
            margin-bottom: 1mm;
        }
        .invoice-number { font-size: 11pt; color: #666; }

        /* Parties */
        .parties { display: table; width: 100%; margin-bottom: 5mm; }
        .party { display: table-cell; width: 48%; vertical-align: top; }
        .party-spacer { display: table-cell; width: 4%; }
        .party-label {
            font-size: 7pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            color: #999;
            margin-bottom: 1mm;
            padding-bottom: 1mm;
            border-bottom: 1px solid #e5e5e5;
        }
        .party-name {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 1mm;
        }
        .party-detail { font-size: 8.5pt; color: #444; line-height: 1.5; }

        /* Meta info */
        .meta-table {
            width: 100%;
            margin-bottom: 5mm;
            border-collapse: collapse;
        }
        .meta-table td {
            padding: 1.5mm 2mm;
            font-size: 8.5pt;
            border-bottom: 1px solid #f0f0f0;
        }
        .meta-label { color: #888; width: 25%; }
        .meta-value { font-weight: bold; width: 25%; }

        /* Items table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4mm;
        }
        .items-table thead th {
            background: #f8f8f8;
            border-bottom: 2px solid #D97706;
            padding: 2mm 2mm;
            font-size: 7.5pt;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            color: #666;
            text-align: left;
            white-space: nowrap;
        }
        .items-table thead th.right { text-align: right; }
        .items-table tbody td {
            padding: 1.5mm 2mm;
            border-bottom: 1px solid #f0f0f0;
            font-size: 9pt;
            vertical-align: middle;
        }
        .items-table tbody td.right {
            text-align: right;
            white-space: nowrap;
        }
        .items-table tbody td.num {
            text-align: center;
            white-space: nowrap;
        }

        /* Total */
        .total-section {
            display: table;
            width: 100%;
            margin-bottom: 5mm;
        }
        .total-qr {
            display: table-cell;
            width: 30%;
            vertical-align: top;
        }
        .total-amounts {
            display: table-cell;
            width: 70%;
            vertical-align: top;
        }
        .total-row {
            display: table;
            width: 100%;
        }
        .total-label {
            display: table-cell;
            width: 60%;
            text-align: right;
            padding: 1.5mm 3mm;
            font-size: 9pt;
            color: #666;
        }
        .total-value {
            display: table-cell;
            width: 40%;
            text-align: right;
            padding: 1.5mm 3mm;
            font-size: 9pt;
        }
        .total-final {
            border-top: 2px solid #D97706;
            margin-top: 1mm;
            padding-top: 2mm;
        }
        .total-final .total-label {
            font-size: 11pt;
            font-weight: bold;
            color: #1a1a1a;
        }
        .total-final .total-value {
            font-size: 13pt;
            font-weight: bold;
            color: #D97706;
            white-space: nowrap;
        }

        /* QR code */
        .qr-label {
            font-size: 7pt;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.3pt;
            margin-bottom: 1mm;
        }

        /* Footer */
        .footer {
            margin-top: 8mm;
            padding-top: 3mm;
            border-top: 1px solid #e5e5e5;
        }
        .footer-row { display: table; width: 100%; }
        .footer-col { display: table-cell; width: 33%; font-size: 7.5pt; color: #999; }
        .footer-col.center { text-align: center; }
        .footer-col.right { text-align: right; }

        .notes {
            margin-top: 3mm;
            padding: 2mm 3mm;
            background: #fafafa;
            border-left: 3px solid #D97706;
            font-size: 8.5pt;
            color: #555;
        }

        .neplatce-dph {
            font-size: 8pt;
            color: #999;
            font-style: italic;
            margin-top: 1mm;
        }
    </style>
</head>
<body>
<div class="container">
    {{-- Header --}}
    <div class="header">
        <div class="header-left">
            <div class="invoice-title">FAKTURA</div>
            <div class="invoice-number">č. {{ $invoice->invoice_number }}</div>
        </div>
        <div class="header-right">
            <img src="{{ storage_path('app/email-assets/safari-logo-invoice.svg') }}" width="220" alt="Safari" style="border: none;">
        </div>
    </div>

    {{-- Parties --}}
    <div class="parties">
        <div class="party">
            <div class="party-label">Dodavatel</div>
            <div class="party-name">{{ $company->company_name }}</div>
            <div class="party-detail">
                @if(is_array($company->address))
                    @if(!empty($company->address['street'])){{ $company->address['street'] }}<br>@endif
                    @if(!empty($company->address['zip']) || !empty($company->address['city'])){{ $company->address['zip'] }} {{ $company->address['city'] }}<br>@endif
                @endif
                @if($company->ico)IČO: {{ $company->ico }}<br>@endif
                @if($company->dic)DIČ: {{ $company->dic }}<br>@endif
            </div>
        </div>
        <div class="party-spacer"></div>
        <div class="party">
            <div class="party-label">Odběratel</div>
            <div class="party-name">
                {{ $invoice->customer->company ?: $invoice->customer->name }}
            </div>
            <div class="party-detail">
                @if($invoice->customer->company && $invoice->customer->name)
                    {{ $invoice->customer->name }}<br>
                @endif
                @php $addr = $invoice->customer->billing_address; @endphp
                @if(is_array($addr))
                    @if(!empty($addr['street'])){{ $addr['street'] }}<br>@endif
                    @if(!empty($addr['zip']) || !empty($addr['city'])){{ $addr['zip'] }} {{ $addr['city'] }}<br>@endif
                @endif
                @if($invoice->customer->ico)IČO: {{ $invoice->customer->ico }}<br>@endif
                @if($invoice->customer->dic)DIČ: {{ $invoice->customer->dic }}<br>@endif
            </div>
        </div>
    </div>

    {{-- Meta --}}
    <table class="meta-table">
        <tr>
            <td class="meta-label">Datum vystavení</td>
            <td class="meta-value">{{ $invoice->issue_date->format('d.m.Y') }}</td>
            <td class="meta-label">Datum splatnosti</td>
            <td class="meta-value">{{ $invoice->due_date->format('d.m.Y') }}</td>
        </tr>
        <tr>
            <td class="meta-label">Variabilní symbol</td>
            <td class="meta-value">{{ $invoice->variable_symbol }}</td>
            <td class="meta-label">Způsob platby</td>
            <td class="meta-value">{{ match($invoice->payment_method) { 'hotovost' => 'Hotovost', 'barter' => 'Barter (bezhotovostní směna)', default => 'Bankovní převod' } }}</td>
        </tr>
        @if($company->bank_account)
        <tr>
            <td class="meta-label">Bankovní účet</td>
            <td class="meta-value" colspan="3">{{ $company->bank_account }}</td>
        </tr>
        @endif
    </table>

    {{-- Items --}}
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 4%;">#</th>
                <th style="width: 50%;">Popis</th>
                <th class="right" style="width: 8%;">Mn.</th>
                <th class="right" style="width: 8%;">Jedn.</th>
                <th class="right" style="width: 15%;">Cena/ks</th>
                <th class="right" style="width: 15%;">Celkem</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $i => $item)
            <tr>
                <td class="num">{{ $i + 1 }}</td>
                <td>{{ $item->description }}</td>
                <td class="num">{{ rtrim(rtrim(number_format($item->quantity, 2, ',', ' '), '0'), ',') }}</td>
                <td class="num">{{ $item->unit }}</td>
                <td class="right">{{ number_format($item->unit_price, 0, ',', ' ') }} Kč</td>
                <td class="right">{{ number_format($item->total_price, 0, ',', ' ') }} Kč</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Total + QR --}}
    <div class="total-section">
        <div class="total-qr">
            @if($qrSvg && $invoice->payment_method !== 'barter')
                <div class="qr-label">QR platba</div>
                <img src="data:image/svg+xml;base64,{{ $qrSvg }}" width="100" height="100" alt="QR kód">
            @endif
        </div>
        <div class="total-amounts">
            <div class="total-row total-final">
                <div class="total-label">Celkem k úhradě</div>
                <div class="total-value">{{ number_format($invoice->total, 0, ',', ' ') }} Kč</div>
            </div>
        </div>
    </div>

    {{-- Notes --}}
    @if($invoice->notes)
        <div class="notes">{{ $invoice->notes }}</div>
    @endif

    {{-- Footer --}}
    <div class="footer">
        <div class="neplatce-dph">Nejsme plátci DPH.</div>
        <div class="footer-row" style="margin-top: 2mm;">
            <div class="footer-col">{{ $company->company_name }}</div>
            <div class="footer-col center">IČO: {{ $company->ico }}</div>
            <div class="footer-col right">
                @if($company->email_from){{ $company->email_from }}@endif
            </div>
        </div>
    </div>
</div>
</body>
</html>
