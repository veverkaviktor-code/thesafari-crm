<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            UPDATE time_entries
            SET duration_minutes = CEIL(EXTRACT(EPOCH FROM (stopped_at - started_at)) / 60)
            WHERE stopped_at IS NOT NULL
              AND (duration_minutes IS NULL OR duration_minutes = 0)
        ");
    }

    public function down(): void
    {
        // Nevratná migrace — data correction
    }
};
