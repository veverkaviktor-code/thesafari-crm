<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('fyzicka');
            $table->string('name');
            $table->string('company')->nullable();
            $table->string('ico', 20)->nullable();
            $table->string('dic', 20)->nullable();
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('web', 500)->nullable();
            $table->jsonb('billing_address')->nullable();
            $table->jsonb('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->jsonb('tags')->nullable();
            $table->string('avatar_path', 500)->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('email');
            $table->index('ico');
        });

        DB::statement("ALTER TABLE customers ADD CHECK (type IN ('fyzicka', 'pravnicka'))");
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
