<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_transactions', function (Blueprint $table) {
            $table->string('counter_account_name')->nullable()->after('counter_account');
            $table->string('transaction_type', 100)->nullable()->after('description');
            $table->jsonb('raw_data')->nullable()->after('transaction_type');
        });
    }

    public function down(): void
    {
        Schema::table('bank_transactions', function (Blueprint $table) {
            $table->dropColumn(['counter_account_name', 'transaction_type', 'raw_data']);
        });
    }
};
