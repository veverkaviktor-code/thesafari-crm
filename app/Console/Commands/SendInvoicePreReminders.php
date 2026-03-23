<?php

namespace App\Console\Commands;

use App\Models\CompanySetting;
use App\Models\EmailLog;
use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class SendInvoicePreReminders extends Command
{
    protected $signature = 'invoices:send-pre-reminders {--dry-run : Only show what would be sent}';
    protected $description = 'Send friendly reminder 4 days before invoice due date';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $company = CompanySetting::get();
        $sent = 0;

        // Faktury odeslané zákazníkovi, splatné za přesně 4 dny, ještě nezaplacené
        $invoices = Invoice::with(['customer', 'items'])
            ->where('status', 'odeslana')
            ->whereNotNull('sent_at')
            ->whereNotNull('due_date')
            ->whereRaw("due_date::date = ?", [now()->addDays(4)->toDateString()])
            ->get();

        foreach ($invoices as $invoice) {
            if (!$invoice->customer || !$invoice->customer->email) {
                continue;
            }

            // Už jsme pre-reminder posílali?
            $alreadySent = EmailLog::where('invoice_id', $invoice->id)
                ->where('type', 'reminder_before_due')
                ->where('status', 'sent')
                ->exists();

            if ($alreadySent) {
                continue;
            }

            $daysUntilDue = 4;

            if ($dryRun) {
                $this->line("  #{$invoice->invoice_number} — {$invoice->customer->name} — {$invoice->total} Kč — splatnost za {$daysUntilDue} dny");
                $sent++;
                continue;
            }

            $subject = "Karel hlásí — faktura č. {$invoice->invoice_number} stále visí na větvi 🦥";

            try {
                $this->sendPreReminder($invoice, $company, $daysUntilDue, $subject);

                EmailLog::create([
                    'invoice_id'      => $invoice->id,
                    'customer_id'     => $invoice->customer_id,
                    'recipient_email' => $invoice->customer->email,
                    'subject'         => $subject,
                    'type'            => 'reminder_before_due',
                    'status'          => 'sent',
                    'sent_at'         => now(),
                ]);

                $sent++;
                $this->line("  Odesláno: #{$invoice->invoice_number} — {$invoice->customer->name}");

            } catch (\Exception $e) {
                Log::error("Pre-reminder failed for invoice #{$invoice->invoice_number}", [
                    'error' => $e->getMessage(),
                ]);

                EmailLog::create([
                    'invoice_id'      => $invoice->id,
                    'customer_id'     => $invoice->customer_id,
                    'recipient_email' => $invoice->customer->email ?? '',
                    'subject'         => $subject,
                    'type'            => 'reminder_before_due',
                    'status'          => 'failed',
                    'error_message'   => $e->getMessage(),
                    'sent_at'         => now(),
                ]);

                $this->error("  Chyba: #{$invoice->invoice_number} — {$e->getMessage()}");
            }
        }

        $verb = $dryRun ? 'Odeslalo by se' : 'Odesláno';
        $this->info("{$verb} {$sent} připomínek.");

        return 0;
    }

    private function sendPreReminder(Invoice $invoice, CompanySetting $company, int $daysUntilDue, string $subject): void
    {
        $iban = str_replace(' ', '', $company->bank_iban ?? '');
        $qrData = implode('*', [
            'SPD*1.0',
            'ACC:' . $iban,
            'AM:' . number_format((float) $invoice->total, 2, '.', ''),
            'CC:CZK',
            'MSG:Faktura ' . $invoice->invoice_number,
            'X-VS:' . $invoice->variable_symbol,
        ]);

        $qrPng = QrCode::format('png')->size(300)->generate($qrData);
        $qrBase64 = base64_encode((string) $qrPng);

        $htmlBody = view('emails.invoice-reminder-before-due', [
            'invoice' => $invoice,
            'company' => $company,
            'daysUntilDue' => $daysUntilDue,
            'qrBase64' => $qrBase64,
        ])->render();

        $logoPath = storage_path('app/email-assets/logo-email.png');
        $karelPath = storage_path('app/email-assets/karel-email.png');

        Mail::html($htmlBody, function ($message) use ($invoice, $subject, $logoPath, $karelPath) {
            $message->to($invoice->customer->email)
                ->subject($subject);

            $symfony = $message->getSymfonyMessage();
            if (file_exists($logoPath)) {
                $symfony->embedFromPath($logoPath, 'safari-logo', 'image/png');
            }
            if (file_exists($karelPath)) {
                $symfony->embedFromPath($karelPath, 'karel-sloth', 'image/png');
            }
        });
    }
}
