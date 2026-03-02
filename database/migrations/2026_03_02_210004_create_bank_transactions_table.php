<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('bank_id')->unique();
            $table->date('date');
            $table->decimal('amount', 12, 2);
            $table->string('variable_symbol', 20)->nullable();
            $table->string('counter_account')->nullable();
            $table->text('description')->nullable();
            $table->boolean('matched')->default(false);
            $table->timestampTz('created_at')->useCurrent();

            $table->index('variable_symbol');
            $table->index('matched');
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_transactions');
    }
};
