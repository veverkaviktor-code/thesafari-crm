<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // --- Extend subscriptions table ---
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->decimal('cost_yearly', 10, 2)->default(0)->after('price_yearly');
            $table->decimal('sell_yearly', 10, 2)->default(0)->after('cost_yearly');
            $table->string('billing_cycle', 20)->default('yearly')->after('sell_yearly');
            $table->decimal('monthly_price', 10, 2)->default(0)->after('billing_cycle');
            $table->string('monthly_plan', 50)->nullable()->after('monthly_price');
            $table->integer('vas_hosting_id')->nullable()->after('monthly_plan');
            $table->timestampTz('synced_at')->nullable()->after('vas_hosting_id');

            // Make customer_id nullable
            $table->foreignId('customer_id')->nullable()->change();

            // Index on vas_hosting_id
            $table->index('vas_hosting_id');
        });

        // CHECK constraints for subscriptions (PostgreSQL)
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time'))");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_cost_yearly CHECK (cost_yearly >= 0)");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_sell_yearly CHECK (sell_yearly >= 0)");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_monthly_price CHECK (monthly_price >= 0)");

        // --- Create subscription_payments table ---
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('status', 20)->default('nezaplaceno');
            $table->timestampTz('paid_at')->nullable();
            $table->foreignId('invoice_id')->nullable()->constrained('invoices')->nullOnDelete();
            $table->string('payment_method', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index('subscription_id');
            $table->index('status');
            $table->index('period_end');
        });

        // CHECK constraints for subscription_payments (PostgreSQL)
        DB::statement("ALTER TABLE subscription_payments ADD CONSTRAINT chk_sub_payments_status CHECK (status IN ('zaplaceno', 'nezaplaceno', 'po_splatnosti'))");
        DB::statement("ALTER TABLE subscription_payments ADD CONSTRAINT chk_sub_payments_amount CHECK (amount >= 0)");
    }

    public function down(): void
    {
        // Drop subscription_payments first (FK dependency)
        Schema::dropIfExists('subscription_payments');

        // Remove CHECK constraints from subscriptions
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_billing_cycle");
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_cost_yearly");
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_sell_yearly");
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_monthly_price");

        // Revert subscriptions columns
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['vas_hosting_id']);
            $table->dropColumn([
                'cost_yearly',
                'sell_yearly',
                'billing_cycle',
                'monthly_price',
                'monthly_plan',
                'vas_hosting_id',
                'synced_at',
            ]);

            // Revert customer_id to NOT NULL
            $table->foreignId('customer_id')->nullable(false)->change();
        });
    }
};
