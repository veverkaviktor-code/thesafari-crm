<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('invoice_number', 20)->unique();
            $table->date('issue_date');
            $table->date('due_date');
            $table->timestampTz('paid_at')->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->string('status', 20)->default('vystavena');
            $table->string('payment_method', 20)->nullable();
            $table->string('variable_symbol', 20)->unique();
            $table->decimal('total', 10, 2);
            $table->text('notes')->nullable();
            $table->string('pdf_path', 500)->nullable();
            $table->unsignedBigInteger('bank_transaction_id')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('customer_id');
            $table->index('order_id');
            $table->index('status');
            $table->index('due_date');
            $table->index(['customer_id', 'status']);
        });

        DB::statement("ALTER TABLE invoices ADD CHECK (due_date >= issue_date)");
        DB::statement("ALTER TABLE invoices ADD CHECK (paid_at IS NULL OR paid_at >= issue_date::timestamptz)");
        DB::statement("ALTER TABLE invoices ADD CHECK (status IN ('vystavena', 'odeslana', 'zaplacena', 'po_splatnosti'))");
        DB::statement("ALTER TABLE invoices ADD CHECK (payment_method IS NULL OR payment_method IN ('banka', 'hotovost'))");
        DB::statement("ALTER TABLE invoices ADD CHECK (total >= 0)");
        DB::statement("CREATE INDEX idx_invoices_overdue ON invoices(status, due_date) WHERE status IN ('vystavena', 'odeslana')");
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
