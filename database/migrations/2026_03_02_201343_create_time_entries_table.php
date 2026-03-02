<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('started_at');
            $table->timestampTz('stopped_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->string('description', 500)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index('order_id');
            $table->index('user_id');
        });

        DB::statement("ALTER TABLE time_entries ADD CHECK (stopped_at IS NULL OR stopped_at > started_at)");
        DB::statement("ALTER TABLE time_entries ADD CHECK (duration_minutes IS NULL OR duration_minutes >= 0)");
        DB::statement("ALTER TABLE time_entries ADD CHECK (hourly_rate IS NULL OR hourly_rate >= 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entries');
    }
};
