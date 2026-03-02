<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('title');
            $table->decimal('amount', 10, 2);
            $table->timestampsTz();

            $table->index('order_id');
        });

        DB::statement("ALTER TABLE order_costs ADD CHECK (amount >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('order_costs');
    }
};
