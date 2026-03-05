<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old CHECK constraint and add new one with 'sluzba'
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_type");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_type CHECK (type IN ('hosting', 'domena', 'sluzba'))");

        // Add vps_server_id FK
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('vps_server_id')->nullable()->constrained('vps_servers')->nullOnDelete();
            $table->index('vps_server_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['vps_server_id']);
            $table->dropIndex(['vps_server_id']);
            $table->dropColumn('vps_server_id');
        });

        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_type");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_type CHECK (type IN ('hosting', 'domena'))");
    }
};
