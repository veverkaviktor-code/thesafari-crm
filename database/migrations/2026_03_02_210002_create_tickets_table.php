<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('subject');
            $table->string('status', 30)->default('novy');
            $table->string('priority', 10)->default('medium');
            $table->string('source_email')->nullable();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();

            $table->index('customer_id');
            $table->index('status');
            $table->index('priority');
        });

        DB::statement("ALTER TABLE tickets ADD CONSTRAINT chk_tickets_status CHECK (status IN ('novy', 'v_reseni', 'ceka_na_zakaznika', 'vyreseno'))");
        DB::statement("ALTER TABLE tickets ADD CONSTRAINT chk_tickets_priority CHECK (priority IN ('low', 'medium', 'high'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
