<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add is_free boolean
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('is_free')->default(false)->after('auto_renew');
        });

        // 2. Set cost_yearly = 250 for all .cz domains that have cost_yearly = 0
        DB::table('subscriptions')
            ->where('type', 'domena')
            ->where('name', 'like', '%.cz')
            ->where('cost_yearly', 0)
            ->update(['cost_yearly' => 250]);
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('is_free');
        });
    }
};
