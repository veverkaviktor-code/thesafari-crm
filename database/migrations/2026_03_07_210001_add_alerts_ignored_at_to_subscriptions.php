<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->timestamp('alerts_ignored_at')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('alerts_ignored_at');
        });
    }
};
