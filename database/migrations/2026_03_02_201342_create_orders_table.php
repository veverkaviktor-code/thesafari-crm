<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->string('division', 20);
            $table->string('status', 20)->default('nova');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->date('deadline')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('customer_id');
            $table->index('status');
            $table->index('division');
            $table->index('deadline');
            $table->index(['customer_id', 'status']);
        });

        DB::statement("ALTER TABLE orders ADD CHECK (division IN ('tisk', 'reklama', 'polepy', 'montaze', 'weby'))");
        DB::statement("ALTER TABLE orders ADD CHECK (status IN ('nova', 'v_reseni', 'hotovo', 'fakturovano'))");
        DB::statement("ALTER TABLE orders ADD CHECK (price IS NULL OR price >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
