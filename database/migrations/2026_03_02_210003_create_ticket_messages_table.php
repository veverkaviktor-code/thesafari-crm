<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->string('direction', 10);
            $table->string('from_email')->nullable();
            $table->text('content');
            $table->timestampTz('created_at')->useCurrent();

            $table->index('ticket_id');
        });

        DB::statement("ALTER TABLE ticket_messages ADD CONSTRAINT chk_ticket_messages_direction CHECK (direction IN ('inbound', 'outbound'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_messages');
    }
};
