<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->string('source', 30)->default('web')->after('source_email');
            $table->string('first_name', 100)->nullable()->after('source');
            $table->string('last_name', 100)->nullable()->after('first_name');
            $table->string('phone', 50)->nullable()->after('last_name');
            $table->string('website', 255)->nullable()->after('phone');
            $table->text('content')->nullable()->after('website');
            $table->string('priority', 20)->default('normalni')->change();
        });

        // Add CHECK constraint for source
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
