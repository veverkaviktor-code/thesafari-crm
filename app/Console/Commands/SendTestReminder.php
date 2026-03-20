<?php

namespace App\Console\Commands;

use App\Models\CompanySetting;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class SendTestReminder extends Command
{
    protected $signature = 'test:reminder {email} {--reminder=1 : Reminder number (1, 2, or 3)}';
    protected $description = 'Send a test reminder email';

    public function handle(): int
    {
        $email = $this->argument('email');
        $reminderNumber = (int) $this->option('reminder');
        $company = CompanySetting::get();

        $invoice = Invoice::with(['customer', 'items', 'websites'])->first();
        if (!$invoice) {
            $this->error('Žádná faktura v DB.');
            return 1;
        }

        $daysOverdue = match ($reminderNumber) {
            1 => 5,
            2 => 12,
            3 => 23,
        };

        $iban = str_replace(' ', '', $company->bank_iban ?? '');
        $qrData = implode('*', [
            'SPD*1.0',
            'ACC:' . $iban,
            'AM:' . number_format((float) $invoice->total, 2, '.', ''),
            'CC:CZK',
            'MSG:Faktura ' . $invoice->invoice_number,
            'X-VS:' . $invoice->variable_symbol,
        ]);
        $qrSvg = QrCode::format('svg')->size(120)->generate($qrData);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'qrSvg' => base64_encode($qrSvg),
        ]);
        $pdfContent = $pdf->output();
        $filename = "faktura-{$invoice->invoice_number}.pdf";

        $htmlBody = view('emails.invoice-reminder', [
            'invoice' => $invoice,
            'company' => $company,
            'reminderNumber' => $reminderNumber,
            'daysOverdue' => $daysOverdue,
        ])->render();

        $subject = match ($reminderNumber) {
            1 => "TEST — Karel hlásí — faktura č. {$invoice->invoice_number} visí na větvi 🦥",
            2 => "TEST — Upomínka — faktura č. {$invoice->invoice_number} ({$daysOverdue} dní po splatnosti)",
            3 => "TEST — Poslední upomínka — faktura č. {$invoice->invoice_number} — 7 dní do pozastavení služeb",
        };

        $karelPath = storage_path("app/email-assets/karel-reminder-{$reminderNumber}.png");

        Mail::html($htmlBody, function ($message) use ($email, $pdfContent, $filename, $subject, $karelPath) {
            $message->to($email)
                ->subject($subject)
                ->attachData($pdfContent, $filename, ['mime' => 'application/pdf']);

            if (file_exists($karelPath)) {
                $message->getSymfonyMessage()
                    ->embedFromPath($karelPath, 'karel-sloth', 'image/png');
            }
        });

        $this->info("Testovací upomínka č. {$reminderNumber} odeslána na {$email}");
        return 0;
    }
}
