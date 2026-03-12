<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('time_entries', function (Blueprint $table) {
            $table->timestamp('paused_at')->nullable()->after('stopped_at');
            $table->integer('total_paused_seconds')->default(0)->after('paused_at');
        });
    }

    public function down(): void
    {
        Schema::table('time_entries', function (Blueprint $table) {
            $table->dropColumn(['paused_at', 'total_paused_seconds']);
        });
    }
};
