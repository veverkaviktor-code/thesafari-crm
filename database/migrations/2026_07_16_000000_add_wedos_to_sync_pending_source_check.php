<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE sync_pending DROP CONSTRAINT IF EXISTS chk_sync_pending_source');
        DB::statement("ALTER TABLE sync_pending ADD CONSTRAINT chk_sync_pending_source CHECK (source IN ('portal', 'sss06', 'ond08', 'thaimassage', 'wedos'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE sync_pending DROP CONSTRAINT IF EXISTS chk_sync_pending_source');
        DB::statement("ALTER TABLE sync_pending ADD CONSTRAINT chk_sync_pending_source CHECK (source IN ('portal', 'sss06', 'ond08', 'thaimassage'))");
    }
};
