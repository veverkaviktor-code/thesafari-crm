<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vps_servers', function (Blueprint $table) {
            $table->date('expires_at')->nullable()->after('status');
            $table->boolean('auto_invoice')->default(false)->after('expires_at');
        });

        // Set thaimassage VPS: started 17.9.2025, paid for 1 year → expires 17.9.2026
        DB::table('vps_servers')
            ->where('name', 'thaimassage-server.cz')
            ->update([
                'expires_at' => '2026-09-17',
                'auto_invoice' => true,
            ]);
    }

    public function down(): void
    {
        Schema::table('vps_servers', function (Blueprint $table) {
            $table->dropColumn(['expires_at', 'auto_invoice']);
        });
    }
};
