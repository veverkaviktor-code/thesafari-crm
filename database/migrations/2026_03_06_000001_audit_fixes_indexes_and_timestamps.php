<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add missing indexes on FK columns (PostgreSQL doesn't auto-create these)
        Schema::table('order_items', function (Blueprint $table) {
            $table->index('order_id');
        });

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->index('invoice_id');
        });

        Schema::table('time_entries', function (Blueprint $table) {
            $table->index('started_at');
            $table->index(['order_id', 'user_id']);
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->index(['customer_id', 'status']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index(['customer_id', 'status']);
        });

        // 2. Fix timestamps consistency — users table should use timestampTz
        DB::statement('ALTER TABLE users ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE \'UTC\'');
        DB::statement('ALTER TABLE users ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE \'UTC\'');

        // 3. Normalize billing_cycle — remove duplicate 'one_time', keep 'once'
        DB::statement("UPDATE subscriptions SET billing_cycle = 'once' WHERE billing_cycle = 'one_time'");
        // Update CHECK constraint to remove 'one_time'
        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'once'))");
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id']);
        });

        Schema::table('subscription_payments', function (Blueprint $table) {
            $table->dropIndex(['invoice_id']);
        });

        Schema::table('time_entries', function (Blueprint $table) {
            $table->dropIndex(['started_at']);
            $table->dropIndex(['order_id', 'user_id']);
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['customer_id', 'status']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['customer_id', 'status']);
        });

        DB::statement('ALTER TABLE users ALTER COLUMN created_at TYPE timestamp USING created_at');
        DB::statement('ALTER TABLE users ALTER COLUMN updated_at TYPE timestamp USING updated_at');

        DB::statement("ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check");
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_cycle_check CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'once', 'one_time'))");
    }
};
