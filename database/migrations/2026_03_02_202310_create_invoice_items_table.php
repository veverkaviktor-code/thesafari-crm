<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->string('description', 500);
            $table->decimal('quantity', 8, 2)->default(1);
            $table->string('unit', 20)->nullable()->default('ks');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();

            $table->index('invoice_id');
        });

        DB::statement("ALTER TABLE invoice_items ADD CHECK (quantity > 0)");
        DB::statement("ALTER TABLE invoice_items ADD CHECK (unit_price >= 0)");
        DB::statement("ALTER TABLE invoice_items ADD CHECK (total_price >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
