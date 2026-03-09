<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("tickets", function (Blueprint $table) {
            $table->string("source", 50)->default("email")->after("source_email");
            $table->string("phone", 30)->nullable()->after("source");
            $table->string("website")->nullable()->after("phone");
            $table->string("first_name", 100)->nullable()->after("website");
            $table->string("last_name", 100)->nullable()->after("first_name");
            $table->text("content")->nullable()->after("last_name");

            $table->index("source");
        });
    }

    public function down(): void
    {
        Schema::table("tickets", function (Blueprint $table) {
            $table->dropIndex(["source"]);
            $table->dropColumn(["source", "phone", "website", "first_name", "last_name", "content"]);
        });
    }
};
