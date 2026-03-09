<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedSmallInteger('reminder_count')->default(0)->after('paid_at');
            $table->timestampTz('last_reminder_at')->nullable()->after('reminder_count');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['reminder_count', 'last_reminder_at']);
        });
    }
};
