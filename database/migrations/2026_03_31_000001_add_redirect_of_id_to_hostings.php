<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE hostings ADD COLUMN redirect_of_id BIGINT REFERENCES hostings(id) ON DELETE SET NULL');
        DB::statement('CREATE INDEX hostings_redirect_of_id_idx ON hostings(redirect_of_id)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS hostings_redirect_of_id_idx');
        DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS redirect_of_id');
    }
};
