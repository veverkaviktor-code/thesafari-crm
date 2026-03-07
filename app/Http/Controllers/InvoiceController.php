<?php

namespace App\Http\Controllers;

use App\Http\Requests\InvoiceRequest;
use App\Models\BankTransaction;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $trashed = $request->boolean('trashed');

        $query = $trashed
            ? Invoice::onlyTrashed()->with('customer:id,name,company')
            : Invoice::query()->with('customer:id,name,company');

        $query->when($request->input('search'), function ($q, $term) {
                $q->where('invoice_number', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->input('date_from'), fn ($q, $d) => $q->where('issue_date', '>=', $d))
            ->when($request->input('date_to'), fn ($q, $d) => $q->where('issue_date', '<=', $d))
            ->latest();

        $invoices = $query->paginate(25)->withQueryString();
        $trashedCount = Invoice::onlyTrashed()->count();

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'status', 'customer_id', 'date_from', 'date_to', 'trashed']),
            'trashedCount' => $trashedCount,
            'lastBankSync' => \App\Models\BankTransaction::max('created_at'),
        ]);
    }

    public function show(Invoice $faktury)
    {
        $invoice = $faktury;
        $invoice->load(['items', 'customer', 'order', 'subscriptions:id,name,type,expires_at', 'bankTransaction']);

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'unmatchedTransactions' => $invoice->status !== 'zaplacena'
                ? BankTransaction::unmatched()
                    ->where('amount', '>', 0)
                    ->orderByDesc('date')
                    ->limit(20)
                    ->get(['id', 'date', 'amount', 'variable_symbol', 'counter_account_name', 'counter_account', 'description'])
                : [],
        ]);
    }

    public function create(Request $request)
    {
        $customers = Customer::select('id', 'name', 'company', 'ico', 'dic', 'billing_address')->orderBy('name')->get();
        $orders = Order::select('id', 'title', 'price', 'customer_id')->orderBy('title')->get();
        $prefillOrder = null;

        if ($orderId = $request->input('order_id')) {
            $prefillOrder = Order::with('items')->select('id', 'title', 'price', 'customer_id')->find($orderId);
        }

        return Inertia::render('Invoices/Create', [
            'customers' => $customers,
            'orders' => $orders,
            'prefill_order' => $prefillOrder,
            'next_number' => Invoice::getNextInvoiceNumber(),
        ]);
    }

    public function store(InvoiceRequest $request)
    {
        $invoice = DB::transaction(function () use ($request) {
            $invoiceNumber = Invoice::getNextInvoiceNumber();
            $items = collect($request->input('items'))->map(function ($item) {
                $item['total_price'] = $item['total_price'] ?? (float) $item['quantity'] * (float) $item['unit_price'];
                return $item;
            })->toArray();
            $total = collect($items)->sum('total_price');

            $invoice = Invoice::create([
                'customer_id' => $request->input('customer_id'),
                'order_id' => $request->input('order_id'),
                'invoice_number' => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date' => $request->input('issue_date'),
                'due_date' => $request->input('due_date'),
                'status' => $request->input('status', 'vystavena'),
                'payment_method' => $request->input('payment_method', 'banka'),
                'total' => $total,
                'notes' => $request->input('notes'),
            ]);

            foreach ($items as $i => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? 'ks',
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'sort_order' => $i,
                ]);
            }

            return $invoice;
        });

        return redirect()->route('faktury.show', $invoice)
            ->with('success', 'Faktura vytvorena.');
    }

    public function edit(Invoice $faktury)
    {
        $invoice = $faktury;
        $invoice->load('items');
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $orders = Order::select('id', 'title', 'price', 'customer_id')->orderBy('title')->get();

        return Inertia::render('Invoices/Edit', [
            'invoice' => $invoice,
            'customers' => $customers,
            'orders' => $orders,
        ]);
    }

    public function update(InvoiceRequest $request, Invoice $faktury)
    {
        $invoice = $faktury;
        $items = collect($request->input('items'))->map(function ($item) {
            $item['total_price'] = $item['total_price'] ?? (float) $item['quantity'] * (float) $item['unit_price'];
            return $item;
        })->toArray();
        $total = collect($items)->sum('total_price');

        DB::transaction(function () use ($invoice, $items, $total, $request) {
            $invoice->update([
                'customer_id' => $request->input('customer_id'),
                'order_id' => $request->input('order_id'),
                'issue_date' => $request->input('issue_date'),
                'due_date' => $request->input('due_date'),
                'status' => $request->input('status', $invoice->status),
                'payment_method' => $request->input('payment_method'),
                'total' => $total,
                'notes' => $request->input('notes'),
            ]);

            $invoice->items()->delete();
            foreach ($items as $i => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? 'ks',
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'sort_order' => $i,
                ]);
            }
        });

        return redirect()->route('faktury.show', $invoice)
            ->with('success', 'Faktura aktualizovana.');
    }

    public function destroy(Invoice $faktury)
    {
        // Mark related notifications as read before soft-deleting
        $user = auth()->user();
        $user->notifications()
            ->whereNull('read_at')
            ->whereRaw("data::jsonb->>'invoice_id' = ?", [(string) $faktury->id])
            ->update(['read_at' => now()]);

        $faktury->delete();

        return redirect()->route('faktury.index')
            ->with('success', 'Faktura přesunuta do koše.');
    }

    public function restore(int $id)
    {
        $invoice = Invoice::onlyTrashed()->findOrFail($id);
        $invoice->restore();

        return redirect()->route('faktury.index')
            ->with('success', "Faktura {$invoice->invoice_number} obnovena.");
    }

    public function forceDelete(int $id)
    {
        $invoice = Invoice::onlyTrashed()->findOrFail($id);
        $invoice->items()->forceDelete();
        $invoice->forceDelete();

        return redirect()->route('faktury.index', ['trashed' => 1])
            ->with('success', 'Faktura trvale smazána.');
    }

    public function downloadPdf(Invoice $invoice)
    {
        $invoice->load(['items', 'customer']);
        $company = CompanySetting::get();

        $qrData = $this->generateSpdString($invoice, $company);
        $qrSvg = QrCode::format('svg')->size(120)->generate($qrData);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'qrSvg' => base64_encode($qrSvg),
        ]);

        return $pdf->download("faktura-{$invoice->invoice_number}.pdf");
    }

    public function sendEmail(Invoice $invoice)
    {
        $invoice->load(['items', 'customer', 'subscriptions', 'order']);

        if (! $invoice->customer->email) {
            return back()->with('error', 'Zakaznik nema e-mail.');
        }

        $company = CompanySetting::get();
        $qrData = $this->generateSpdString($invoice, $company);
        $qrSvg = QrCode::format('svg')->size(120)->generate($qrData);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'qrSvg' => base64_encode($qrSvg),
        ]);

        $pdfContent = $pdf->output();
        $filename = "faktura-{$invoice->invoice_number}.pdf";

        $serviceDescription = $this->buildServiceDescription($invoice);

        $htmlBody = view('emails.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'serviceDescription' => $serviceDescription,
        ])->render();

        Mail::html($htmlBody, function ($message) use ($invoice, $pdfContent, $filename) {
            $message->to($invoice->customer->email)
                ->subject("Faktura č. {$invoice->invoice_number}")
                ->attachData($pdfContent, $filename, ['mime' => 'application/pdf']);
        });

        $invoice->update([
            'sent_at' => now(),
            'status' => 'odeslana',
        ]);

        return back()->with('success', 'Faktura odeslana na ' . $invoice->customer->email);
    }

    public function markAsPaid(Request $request, Invoice $invoice)
    {
        $paymentMethod = $request->input('payment_method', $invoice->payment_method ?? 'banka');

        $invoice->processPayment($paymentMethod);

        $invoice->loadMissing('customer');
        $user = auth()->user();
        $user->notify(new \App\Notifications\PaymentReceived($invoice));

        $label = $paymentMethod === 'hotovost' ? 'hotově' : 'převodem';

        return back()->with('success', "Faktura označena jako zaplacená ({$label}).");
    }

    public function exportCsv(Request $request)
    {
        $invoices = Invoice::query()
            ->with('customer:id,name,company')
            ->whereNotNull('sent_at')
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderBy('issue_date', 'desc')
            ->get();

        $csv = "Číslo faktury;Zákazník;Datum vystavení;Splatnost;Částka;Stav;Platba;Odesláno;Zaplaceno\n";

        foreach ($invoices as $inv) {
            $status = match ($inv->status) {
                'vystavena' => 'Vystavena',
                'odeslana' => 'Odeslaná',
                'zaplacena' => 'Zaplacena',
                'po_splatnosti' => 'Po splatnosti',
                default => $inv->status,
            };
            $payment = $inv->payment_method === 'hotovost' ? 'Hotově' : 'Převodem';
            $csv .= implode(';', [
                $inv->invoice_number,
                '"' . ($inv->customer->name ?? '') . '"',
                $inv->issue_date,
                $inv->due_date,
                number_format((float) $inv->total, 0, ',', ''),
                $status,
                $payment,
                $inv->sent_at ? $inv->sent_at->format('d.m.Y') : '',
                $inv->paid_at ? $inv->paid_at->format('d.m.Y') : '',
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="faktury-export.csv"',
        ]);
    }

    public function matchBankTransaction(Request $request, Invoice $invoice)
    {
        $request->validate([
            'bank_transaction_id' => 'required|exists:bank_transactions,id',
        ]);

        $bankTx = BankTransaction::findOrFail($request->bank_transaction_id);

        if ($bankTx->matched) {
            return back()->with('error', 'Tato transakce je již spárována s jinou fakturou.');
        }

        DB::transaction(function () use ($invoice, $bankTx) {
            $bankTx->update(['matched' => true]);
            $invoice->processPayment('banka', $bankTx->id);
        });

        $admin = auth()->user();
        if ($admin) {
            $admin->notify(new \App\Notifications\PaymentReceived($invoice));
        }

        return back()->with('success', "Faktura #{$invoice->invoice_number} spárována a označena jako zaplacená.");
    }

    public function syncFromBank()
    {
        \Artisan::call('fio:sync');
        $output = \Artisan::output();

        return back()->with('success', 'Synchronizace z banky dokončena.');
    }

    private function buildServiceDescription(Invoice $invoice): string
    {
        $subs = $invoice->subscriptions;

        if ($subs->isNotEmpty()) {
            $types = $subs->pluck('type')->unique();
            $hasDomena = $types->contains('domena');
            $hasHosting = $types->contains('hosting');
            $hasSluzba = $types->contains('sluzba');

            $parts = [];
            if ($hasHosting) $parts[] = 'hostingu';
            if ($hasDomena) $parts[] = 'domény';
            if ($hasSluzba) $parts[] = 'webových služeb';

            if ($parts) {
                $names = $subs->pluck('name')->unique()->implode(', ');
                return 'Fakturujeme vám za služby ' . implode(' a ', $parts) . ' (' . $names . ').';
            }
        }

        if ($invoice->order) {
            return 'Fakturujeme vám za zakázku „' . $invoice->order->title . '".';
        }

        return 'Fakturujeme vám za poskytnuté služby dle přiložené faktury.';
    }

    private function generateSpdString(Invoice $invoice, CompanySetting $company): string
    {
        // SPD standard: IBAN bez mezer, nebo český formát číslo-účtu/kód-banky
        $iban = str_replace(' ', '', $company->bank_iban ?? '');

        $parts = [
            'SPD*1.0',
            'ACC:' . $iban,
            'AM:' . number_format((float) $invoice->total, 2, '.', ''),
            'CC:CZK',
            'MSG:Faktura ' . $invoice->invoice_number,
            'X-VS:' . $invoice->variable_symbol,
        ];

        return implode('*', $parts);
    }
}
