<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 2026_03_08_203549 already added these columns; this migration only
        // refines them (source 50->30 chars with a 'web' default, phone 30->50).
        // Add-or-alter keeps the set runnable from scratch — on a database that
        // has been migrated step by step, every column already exists.
        Schema::table('tickets', function (Blueprint $table) {
            $columns = [
                'source' => fn () => $table->string('source', 30)->default('web')->after('source_email'),
                'first_name' => fn () => $table->string('first_name', 100)->nullable()->after('source'),
                'last_name' => fn () => $table->string('last_name', 100)->nullable()->after('first_name'),
                'phone' => fn () => $table->string('phone', 50)->nullable()->after('last_name'),
                'website' => fn () => $table->string('website', 255)->nullable()->after('phone'),
                'content' => fn () => $table->text('content')->nullable()->after('website'),
            ];

            foreach ($columns as $name => $define) {
                if (Schema::hasColumn('tickets', $name)) {
                    continue;
                }

                $define();
            }

            $table->string('priority', 20)->default('normalni')->change();
        });

        // Widths and defaults differ from the earlier migration; align them.
        if (Schema::hasColumn('tickets', 'source')) {
            DB::statement("ALTER TABLE tickets ALTER COLUMN source TYPE varchar(30)");
            DB::statement("ALTER TABLE tickets ALTER COLUMN source SET DEFAULT 'web'");
        }

        // Add CHECK constraint for source
        DB::statement('ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_source');
        DB::statement("ALTER TABLE tickets ADD CONSTRAINT chk_tickets_source CHECK (source IN ('web', 'email', 'api', 'manual'))");

        // Drop old priority constraint and add new one with Czech values
        DB::statement("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_priority");
        DB::statement("ALTER TABLE tickets ADD CONSTRAINT chk_tickets_priority CHECK (priority IN ('nizka', 'normalni', 'vysoka', 'kriticka', 'low', 'medium', 'high'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_source");
        DB::statement("ALTER TABLE tickets DROP CONSTRAINT IF EXISTS chk_tickets_priority");
        DB::statement("ALTER TABLE tickets ADD CONSTRAINT chk_tickets_priority CHECK (priority IN ('low', 'medium', 'high'))");

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropColumn(['source', 'first_name', 'last_name', 'phone', 'website', 'content']);
        });
    }
};
