<?php

namespace App\Http\Controllers;

use App\Http\Requests\InvoiceRequest;
use App\Models\BankTransaction;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\EmailLog;
use App\Models\Invoice;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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

        $allowedSorts = ['invoice_number', 'issue_date', 'due_date', 'paid_at', 'total'];
        $sortField = in_array($request->input('sort'), $allowedSorts) ? $request->input('sort') : 'created_at';
        $sortDirection = $request->input('direction') === 'asc' ? 'asc' : 'desc';

        $query->when($request->input('search'), function ($q, $term) {
                $q->where('invoice_number', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->input('date_from'), fn ($q, $d) => $q->where('issue_date', '>=', $d))
            ->when($request->input('date_to'), fn ($q, $d) => $q->where('issue_date', '<=', $d))
            ->orderBy($sortField, $sortDirection);

        $invoices = $query->paginate(25)->withQueryString();
        $trashedCount = Invoice::onlyTrashed()->count();
        $paidCount = Invoice::where('status', 'zaplacena')->count();

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'status', 'customer_id', 'date_from', 'date_to', 'trashed', 'sort', 'direction']),
            'trashedCount' => $trashedCount,
            'paidCount' => $paidCount,
            'lastBankSync' => cache('last_bank_sync'),
        ]);
    }

    public function show(Invoice $faktury)
    {
        $invoice = $faktury;
        $invoice->load(['items', 'customer', 'order', 'hostings:id,name,expires_at', 'domains:id,name,expires_at,is_registered_by_us', 'bankTransaction']);

        $activities = \Spatie\Activitylog\Models\Activity::query()
            ->where('subject_type', Invoice::class)
            ->where('subject_id', $invoice->id)
            ->orderBy('created_at', 'asc')
            ->get(['id', 'description', 'created_at', 'properties']);

        $emailLogs = \App\Models\EmailLog::where('invoice_id', $invoice->id)
            ->orderBy('sent_at', 'desc')
            ->get(['id', 'type', 'subject', 'recipient_email', 'status', 'error_message', 'sent_at']);

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'company' => CompanySetting::get(),
            'emailLogs' => $emailLogs->map(fn ($log) => [
                'id' => $log->id,
                'type' => $log->type,
                'subject' => $log->subject,
                'recipient_email' => $log->recipient_email,
                'status' => $log->status,
                'error_message' => $log->error_message,
                'sent_at' => $log->sent_at?->toIso8601String(),
            ]),
            'activities' => $activities->map(fn ($a) => [
                'id' => $a->id,
                'description' => $a->description,
                'created_at' => $a->created_at->toIso8601String(),
                'properties' => $a->properties->toArray(),
            ]),
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
                $item['total_price'] = (float) $item['quantity'] * (float) $item['unit_price'];
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
            ->with('success', 'Faktura vytvořena.');
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
            $item['total_price'] = (float) $item['quantity'] * (float) $item['unit_price'];
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
            ->with('success', 'Faktura aktualizována.');
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

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Invoice::whereIn('id', $request->ids)->each(fn ($i) => $i->delete());
        return back()->with('success', count($request->ids) . ' faktur přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Invoice::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($i) => $i->restore());
        return back()->with('success', count($request->ids) . ' faktur obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $invoices = Invoice::onlyTrashed()->whereIn('id', $request->ids)->get();
        foreach ($invoices as $invoice) {
            $invoice->items()->forceDelete();
            $invoice->forceDelete();
        }
        return back()->with('success', $invoices->count() . ' faktur trvale smazáno.');
    }

    public function emptyTrash()
    {
        $count = Invoice::onlyTrashed()->count();
        Invoice::onlyTrashed()->each(function ($invoice) {
            $invoice->items()->forceDelete();
            $invoice->forceDelete();
        });
        return back()->with('success', "Koš vysypán ($count faktur trvale smazáno).");
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
        $invoice->load(['items', 'customer', 'hostings', 'domains', 'order']);

        if (! $invoice->customer->email) {
            return back()->with('error', 'Zákazník nemá e-mail.');
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

        // Generate PNG QR for email body
        $qrPng = QrCode::format('png')->size(300)->generate($qrData);
        $qrBase64 = base64_encode((string) $qrPng);

        $htmlBody = view('emails.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'serviceDescription' => $serviceDescription,
            'qrBase64' => $qrBase64,
        ])->render();

        $logoPath = storage_path('app/email-assets/logo-email.png');
        $karelPath = storage_path('app/email-assets/karel-invoice.png');

        Mail::html($htmlBody, function ($message) use ($invoice, $pdfContent, $filename, $logoPath, $karelPath) {
            $message->to($invoice->customer->email)
                ->subject("Faktura č. {$invoice->invoice_number}")
                ->attachData($pdfContent, $filename, ['mime' => 'application/pdf']);

            $symfony = $message->getSymfonyMessage();
            if (file_exists($logoPath)) {
                $symfony->embedFromPath($logoPath, 'safari-logo', 'image/png');
            }
            if (file_exists($karelPath)) {
                $symfony->embedFromPath($karelPath, 'karel-invoice', 'image/png');
            }
        });

        EmailLog::create([
            'invoice_id'      => $invoice->id,
            'customer_id'     => $invoice->customer_id,
            'recipient_email' => $invoice->customer->email,
            'subject'         => "Faktura č. {$invoice->invoice_number}",
            'type'            => 'invoice',
            'status'          => 'sent',
            'sent_at'         => now(),
        ]);

        $invoice->update([
            'sent_at' => now(),
            'status' => 'odeslana',
        ]);

        return back()->with('success', 'Faktura odeslána na ' . $invoice->customer->email);
    }

    public function markAsPaid(Request $request, Invoice $invoice)
    {
        $paymentMethod = $request->input('payment_method', $invoice->payment_method ?? 'banka');

        $invoice->processPayment($paymentMethod);
        cache()->forget('dashboard_alerts');

        $invoice->loadMissing('customer');
        $user = auth()->user();
        $user->notify(new \App\Notifications\PaymentReceived($invoice));

        // Send thank-you email to customer
        $this->sendPaymentThanks($invoice);

        $label = $paymentMethod === 'hotovost' ? 'hotově' : 'převodem';

        return back()->with('success', "Faktura označena jako zaplacená ({$label}).");
    }

    private function sendPaymentThanks(Invoice $invoice): void
    {
        if (!$invoice->customer?->email) {
            return;
        }

        // Only send if invoice was actually sent to customer (has sent_at)
        if (!$invoice->sent_at) {
            return;
        }

        try {
            $htmlBody = view('emails.payment-thanks', [
                'invoice' => $invoice,
            ])->render();

            $karelPath = storage_path('app/email-assets/karel-payment-thanks.png');
            // Fallback to general Karel image
            if (!file_exists($karelPath)) {
                $karelPath = storage_path('app/email-assets/karel-email.png');
            }

            $logoPath = storage_path('app/email-assets/logo-email.png');

            Mail::html($htmlBody, function ($message) use ($invoice, $karelPath, $logoPath) {
                $message->to($invoice->customer->email)
                    ->subject("Platba přijata — faktura č. {$invoice->invoice_number} ✓");

                $symfony = $message->getSymfonyMessage();
                if (file_exists($logoPath)) {
                    $symfony->embedFromPath($logoPath, 'safari-logo', 'image/png');
                }
                if (file_exists($karelPath)) {
                    $symfony->embedFromPath($karelPath, 'karel-sloth', 'image/png');
                }
            });

            EmailLog::create([
                'invoice_id'      => $invoice->id,
                'customer_id'     => $invoice->customer_id,
                'recipient_email' => $invoice->customer->email,
                'subject'         => "Platba přijata — faktura č. {$invoice->invoice_number} ✓",
                'type'            => 'payment_thanks',
                'status'          => 'sent',
                'sent_at'         => now(),
            ]);
        } catch (\Exception $e) {
            Log::error("Payment thanks email failed for invoice #{$invoice->invoice_number}", [
                'error' => $e->getMessage(),
            ]);

            EmailLog::create([
                'invoice_id'      => $invoice->id,
                'customer_id'     => $invoice->customer_id,
                'recipient_email' => $invoice->customer->email,
                'subject'         => "Platba přijata — faktura č. {$invoice->invoice_number} ✓",
                'type'            => 'payment_thanks',
                'status'          => 'failed',
                'error_message'   => $e->getMessage(),
                'sent_at'         => now(),
            ]);
        }
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
            $payment = match ($inv->payment_method) {
                'hotovost' => 'Hotově',
                'barter' => 'Barter',
                default => 'Převodem',
            };
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

        $invoice->loadMissing('customer');
        $admin = auth()->user();
        if ($admin) {
            $admin->notify(new \App\Notifications\PaymentReceived($invoice));
        }

        // Send thank-you email to customer
        $this->sendPaymentThanks($invoice);

        return back()->with('success', "Faktura #{$invoice->invoice_number} spárována a označena jako zaplacená.");
    }

    public function syncFromBank()
    {
        \Artisan::call('fio:sync');
        cache()->put('last_bank_sync', now()->toIso8601String());

        return back()->with('success', 'Synchronizace z banky dokončena.');
    }

    private function buildServiceDescription(Invoice $invoice): string
    {
        $items = $invoice->items;

        if ($items->isNotEmpty()) {
            $descriptions = $items->pluck('description')->filter()->unique();
            $hasHosting = $descriptions->contains(fn ($d) => stripos($d, 'hosting') !== false);
            $hasDomena = $descriptions->contains(fn ($d) => stripos($d, 'doména') !== false || stripos($d, 'domena') !== false || stripos($d, 'Registrace') !== false);
            $hasSluzba = $descriptions->contains(fn ($d) => stripos($d, 'služb') !== false || stripos($d, 'web') !== false);

            $parts = [];
            if ($hasHosting) $parts[] = 'hostingu';
            if ($hasDomena) $parts[] = 'domény';
            if ($hasSluzba) $parts[] = 'webových služeb';

            if ($parts) {
                $names = $descriptions->implode(', ');
                return 'Fakturujeme vám za služby ' . implode(' a ', $parts) . ' (' . $names . ').';
            }

            return 'Fakturujeme vám za: ' . $descriptions->implode(', ') . '.';
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
