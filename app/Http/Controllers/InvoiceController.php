<?php

namespace App\Http\Controllers;

use App\Http\Requests\InvoiceRequest;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::query()
            ->with('customer:id,name,company')
            ->when($request->input('search'), function ($q, $term) {
                $q->where('invoice_number', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->when($request->input('date_from'), fn ($q, $d) => $q->where('issue_date', '>=', $d))
            ->when($request->input('date_to'), fn ($q, $d) => $q->where('issue_date', '<=', $d))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'status', 'customer_id', 'date_from', 'date_to']),
        ]);
    }

    public function show(Invoice $faktury)
    {
        $invoice = $faktury;
        $invoice->load(['items', 'customer', 'order']);

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
        ]);
    }

    public function create(Request $request)
    {
        $customers = Customer::select('id', 'name', 'company', 'ico', 'dic', 'billing_address')->orderBy('name')->get();
        $prefill = null;

        if ($orderId = $request->input('order_id')) {
            $order = Order::with('customer', 'costs')->find($orderId);
            if ($order) {
                $prefill = [
                    'customer_id' => $order->customer_id,
                    'order_id' => $order->id,
                    'items' => $order->price ? [[
                        'description' => $order->title,
                        'quantity' => 1,
                        'unit' => 'komplet',
                        'unit_price' => $order->price,
                        'total_price' => $order->price,
                    ]] : [],
                ];
            }
        }

        return Inertia::render('Invoices/Create', [
            'customers' => $customers,
            'prefill' => $prefill,
            'nextNumber' => Invoice::getNextInvoiceNumber(),
        ]);
    }

    public function store(InvoiceRequest $request)
    {
        $invoiceNumber = Invoice::getNextInvoiceNumber();
        $items = $request->input('items');
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

        return redirect()->route('faktury.show', $invoice)
            ->with('success', 'Faktura vytvorena.');
    }

    public function edit(Invoice $faktury)
    {
        $invoice = $faktury;
        $invoice->load('items');
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Invoices/Edit', [
            'invoice' => $invoice,
            'customers' => $customers,
        ]);
    }

    public function update(InvoiceRequest $request, Invoice $faktury)
    {
        $invoice = $faktury;
        $items = $request->input('items');
        $total = collect($items)->sum('total_price');

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

        return redirect()->route('faktury.show', $invoice)
            ->with('success', 'Faktura aktualizovana.');
    }

    public function destroy(Invoice $faktury)
    {
        $faktury->delete();

        return redirect()->route('faktury.index')
            ->with('success', 'Faktura smazana.');
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
        $invoice->load(['items', 'customer']);

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

        Mail::raw("Dobrý den,\n\nv příloze zasíláme fakturu č. {$invoice->invoice_number}.\n\nS pozdravem,\n{$company->company_name}", function ($message) use ($invoice, $pdfContent, $filename) {
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

    public function markAsPaid(Invoice $invoice)
    {
        $invoice->update([
            'status' => 'zaplacena',
            'paid_at' => now(),
        ]);

        if ($invoice->order_id) {
            $invoice->order->update(['status' => 'fakturovano']);
        }

        return back()->with('success', 'Faktura oznacena jako zaplacena.');
    }

    private function generateSpdString(Invoice $invoice, CompanySetting $company): string
    {
        $parts = [
            'SPD*1.0',
            'ACC:' . ($company->bank_iban ? 'CZ' . $company->bank_iban : ''),
            'AM:' . number_format((float) $invoice->total, 2, '.', ''),
            'CC:CZK',
            'MSG:Faktura ' . $invoice->invoice_number,
            'X-VS:' . $invoice->variable_symbol,
        ];

        return implode('*', $parts);
    }
}
