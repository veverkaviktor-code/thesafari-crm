<?php

namespace App\Console\Commands;

use App\Models\CompanySetting;
use App\Models\Invoice;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class SendInvoiceReminders extends Command
{
    protected $signature = 'invoices:send-reminders {--dry-run : Only show what would be sent}';
    protected $description = 'Send email reminders for overdue invoices (3, 10, 21 days)';

    /**
     * Reminder schedule: [days_after_due => reminder_number]
     * 1st reminder: 3 days after due date
     * 2nd reminder: 10 days after due date
     * 3rd reminder: 21 days after due date
     */
    private const REMINDER_SCHEDULE = [
        3 => 1,
        10 => 2,
        21 => 3,
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $company = CompanySetting::get();
        $sent = 0;

        $invoices = Invoice::with(['customer', 'items', 'subscriptions'])
            ->where('status', 'po_splatnosti')
            ->where('reminder_count', '<', 3)
            ->whereNotNull('due_date')
            ->get();

        foreach ($invoices as $invoice) {
            if (!$invoice->customer || !$invoice->customer->email) {
                continue;
            }

            $daysOverdue = (int) now()->diffInDays($invoice->due_date);
            $nextReminder = $this->getNextReminderNumber($invoice->reminder_count, $daysOverdue);

            if ($nextReminder === null) {
                continue;
            }

            if ($dryRun) {
                $this->line("  #{$invoice->invoice_number} — {$invoice->customer->name} — {$invoice->total} Kč — {$daysOverdue} dní po splatnosti — upomínka č. {$nextReminder}");
                $sent++;
                continue;
            }

            try {
                $this->sendReminder($invoice, $company, $nextReminder, $daysOverdue);

                $invoice->update([
                    'reminder_count' => $nextReminder,
                    'last_reminder_at' => now(),
                ]);

                $sent++;
                $this->line("  Odesláno: #{$invoice->invoice_number} — {$invoice->customer->name} — upomínka č. {$nextReminder}");

                // Notify admin
                $admin = User::first();
                if ($admin) {
                    $admin->notify(new \App\Notifications\ReminderSent($invoice, $nextReminder));
                }
            } catch (\Exception $e) {
                Log::error("Reminder failed for invoice #{$invoice->invoice_number}", [
                    'error' => $e->getMessage(),
                ]);
                $this->error("  Chyba: #{$invoice->invoice_number} — {$e->getMessage()}");
            }
        }

        $verb = $dryRun ? 'Odeslalo by se' : 'Odesláno';
        $this->info("{$verb} {$sent} upomínek.");

        return 0;
    }

    private function getNextReminderNumber(int $currentCount, int $daysOverdue): ?int
    {
        foreach (self::REMINDER_SCHEDULE as $days => $reminderNumber) {
            if ($daysOverdue >= $days && $currentCount < $reminderNumber) {
                return $reminderNumber;
            }
        }

        return null;
    }

    private function sendReminder(Invoice $invoice, CompanySetting $company, int $reminderNumber, int $daysOverdue): void
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
        $qrSvg = QrCode::format('svg')->size(120)->generate($qrData);

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'company' => $company,
            'qrSvg' => base64_encode($qrSvg),
        ]);
        $pdfContent = $pdf->output();
        $filename = "faktura-{$invoice->invoice_number}.pdf";

        // Generate PNG QR for email body
        $qrPng = QrCode::format('png')->size(300)->generate($qrData);
        $qrBase64 = base64_encode((string) $qrPng);

        $htmlBody = view('emails.invoice-reminder', [
            'invoice' => $invoice,
            'company' => $company,
            'reminderNumber' => $reminderNumber,
            'daysOverdue' => $daysOverdue,
            'qrBase64' => $qrBase64,
        ])->render();

        $subject = match ($reminderNumber) {
            1 => "Karel hlásí — faktura č. {$invoice->invoice_number} visí na větvi 🦥",
            2 => "Upomínka — faktura č. {$invoice->invoice_number} ({$daysOverdue} dní po splatnosti)",
            3 => "Poslední upomínka — faktura č. {$invoice->invoice_number} — 7 dní do pozastavení služeb",
        };

        $karelPath = storage_path("app/email-assets/karel-reminder-{$reminderNumber}.png");
        $logoPath = storage_path('app/email-assets/logo-email.png');

        Mail::html($htmlBody, function ($message) use ($invoice, $pdfContent, $filename, $subject, $karelPath, $logoPath) {
            $message->to($invoice->customer->email)
                ->subject($subject)
                ->attachData($pdfContent, $filename, ['mime' => 'application/pdf']);

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
