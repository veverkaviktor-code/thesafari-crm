<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add quarterly to billing_cycle CHECK
        DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT chk_subscriptions_billing_cycle');
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_billing_cycle CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'once', 'one_time'))");

        // Rename vps_servers.price_monthly → price_yearly
        Schema::table('vps_servers', function (Blueprint $table) {
            $table->renameColumn('price_monthly', 'price_yearly');
        });
    }

    public function down(): void
    {
        Schema::table('vps_servers', function (Blueprint $table) {
            $table->renameColumn('price_yearly', 'price_monthly');
        });

        DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT chk_subscriptions_billing_cycle');
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time'))");
    }
};
