<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old CHECK and add new one with 'barter'
        DB::statement("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check");
        DB::statement("ALTER TABLE invoices ADD CHECK (payment_method IS NULL OR payment_method IN ('banka', 'hotovost', 'barter'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check");
        DB::statement("ALTER TABLE invoices ADD CHECK (payment_method IS NULL OR payment_method IN ('banka', 'hotovost'))");
    }
};
