<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add soft deletes to subscriptions
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->softDeletesTz();
        });

        // 2. Change subscriptions.customer_id FK from cascade to restrict
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->foreign('customer_id')
                ->references('id')
                ->on('customers')
                ->restrictOnDelete();
        });

        // 3. Add proper FK constraint on invoices.bank_transaction_id
        Schema::table('invoices', function (Blueprint $table) {
            $table->index('bank_transaction_id');
            $table->foreign('bank_transaction_id')
                ->references('id')
                ->on('bank_transactions')
                ->nullOnDelete();
        });

        // 4. Fix order_items timestamps to timestampsTz
        DB::statement('ALTER TABLE order_items ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE \'UTC\'');
        DB::statement('ALTER TABLE order_items ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE \'UTC\'');
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['bank_transaction_id']);
            $table->dropIndex(['bank_transaction_id']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->foreign('customer_id')
                ->references('id')
                ->on('customers')
                ->cascadeOnDelete();
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        DB::statement('ALTER TABLE order_items ALTER COLUMN created_at TYPE timestamp USING created_at');
        DB::statement('ALTER TABLE order_items ALTER COLUMN updated_at TYPE timestamp USING updated_at');
    }
};
