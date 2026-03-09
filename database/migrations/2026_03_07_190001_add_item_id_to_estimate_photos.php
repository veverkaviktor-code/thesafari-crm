<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estimate_photos', function (Blueprint $table) {
            $table->foreignId('estimate_item_id')->nullable()->index()->after('estimate_id')
                ->constrained('estimate_items')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estimate_photos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('estimate_item_id');
        });
    }
};
