<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vps_servers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('price_monthly', 10, 2)->default(0);
            $table->string('api_hostname')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->integer('storage_total_gb')->default(0);
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('aktivni');
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('customer_id');
            $table->index('status');
        });

        DB::statement("ALTER TABLE vps_servers ADD CONSTRAINT chk_vps_servers_status CHECK (status IN ('aktivni', 'neaktivni'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('vps_servers');
    }
};
