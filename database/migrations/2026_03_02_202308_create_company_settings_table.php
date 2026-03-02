<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('ico', 20)->nullable();
            $table->string('dic', 20)->nullable();
            $table->jsonb('address');
            $table->string('logo_path', 500)->nullable();
            $table->string('bank_account', 50)->nullable();
            $table->string('bank_iban', 50)->nullable();
            $table->string('email_from')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
