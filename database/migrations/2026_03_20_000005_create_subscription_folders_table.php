<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('color', 7)->nullable(); // hex color
            $table->boolean('is_collapsed')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('folder_id')->nullable()->constrained('subscription_folders')->nullOnDelete();
            $table->index('folder_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('folder_id');
        });

        Schema::dropIfExists('subscription_folders');
    }
};
