<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->string('name');
            $table->string('provider')->nullable();
            $table->string('server')->nullable();
            $table->decimal('price_yearly', 10, 2)->default(0);
            $table->date('starts_at');
            $table->date('expires_at');
            $table->boolean('auto_renew')->default(false);
            $table->string('status', 20)->default('aktivni');
            $table->text('notes')->nullable();
            $table->timestampTz('customer_notified_at')->nullable();
            $table->timestampsTz();

            $table->index('customer_id');
            $table->index('type');
            $table->index('expires_at');
            $table->index('status');
        });

        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_type CHECK (type IN ('hosting', 'domena'))");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status CHECK (status IN ('aktivni', 'neaktivni', 'expirovana'))");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_price CHECK (price_yearly >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
