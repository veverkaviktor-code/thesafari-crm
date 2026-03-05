<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Drop old CHECK constraint
        DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_status');

        // 2. Migrate existing data BEFORE adding new constraint
        DB::statement("UPDATE subscriptions SET status = 'pozastaveno' WHERE status = 'neaktivni'");
        DB::statement("UPDATE subscriptions SET status = 'zruseno'    WHERE status IN ('expirovana', 'archivovana')");

        // 3. Add new CHECK constraint with updated statuses
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status CHECK (status IN ('aktivni', 'pozastaveno', 'zruseno'))");
    }

    public function down(): void
    {
        // 1. Drop new constraint
        DB::statement('ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS chk_subscriptions_status');

        // 2. Revert data (best-effort — 'pozastaveno' → 'neaktivni', 'zruseno' → 'expirovana')
        DB::statement("UPDATE subscriptions SET status = 'neaktivni'  WHERE status = 'pozastaveno'");
        DB::statement("UPDATE subscriptions SET status = 'expirovana' WHERE status = 'zruseno'");

        // 3. Restore old constraint
        DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_status CHECK (status IN ('aktivni', 'neaktivni', 'expirovana'))");
    }
};
