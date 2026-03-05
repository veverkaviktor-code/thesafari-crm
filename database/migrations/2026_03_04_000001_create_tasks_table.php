<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('status', 20)->default('novy');
            $table->string('priority', 10)->default('medium');
            $table->date('due_date')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained()->nullOnDelete();
            $table->jsonb('meta')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('status');
            $table->index('priority');
            $table->index('due_date');
            $table->index('customer_id');
            $table->index('order_id');
            $table->index('invoice_id');
            $table->index(['status', 'due_date']);
        });

        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_status CHECK (status IN ('novy', 'rozpracovany', 'hotovy', 'zruseny'))");
        DB::statement("ALTER TABLE tasks ADD CONSTRAINT chk_tasks_priority CHECK (priority IN ('low', 'medium', 'high'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
