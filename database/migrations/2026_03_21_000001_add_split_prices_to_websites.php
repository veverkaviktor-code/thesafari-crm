<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('websites', function (Blueprint $table) {
            $table->decimal('domain_sell_yearly', 10, 2)->default(0)->after('cost_yearly');
            $table->decimal('domain_cost_yearly', 10, 2)->default(0)->after('domain_sell_yearly');
            $table->decimal('hosting_sell_yearly', 10, 2)->default(0)->after('domain_cost_yearly');
            $table->decimal('hosting_cost_yearly', 10, 2)->default(0)->after('hosting_sell_yearly');
        });

        // Migrate existing data: move combined prices to hosting_* (most existing data was hosting)
        DB::statement("
            UPDATE websites
            SET hosting_sell_yearly = sell_yearly,
                hosting_cost_yearly = cost_yearly
            WHERE sell_yearly > 0 OR cost_yearly > 0
        ");
    }

    public function down(): void
    {
        Schema::table('websites', function (Blueprint $table) {
            $table->dropColumn([
                'domain_sell_yearly',
                'domain_cost_yearly',
                'hosting_sell_yearly',
                'hosting_cost_yearly',
            ]);
        });
    }
};
