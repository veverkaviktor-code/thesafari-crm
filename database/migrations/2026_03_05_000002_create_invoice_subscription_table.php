<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_subscription', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('subscription_id')->constrained('subscriptions')->onDelete('restrict');
            $table->timestampTz('created_at')->useCurrent();

            $table->unique(['invoice_id', 'subscription_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_subscription');
    }
};
