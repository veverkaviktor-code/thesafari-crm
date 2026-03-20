<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('admin_url', 500)->nullable()->after('notes');
            $table->string('admin_user', 255)->nullable()->after('admin_url');
            $table->text('admin_password')->nullable()->after('admin_user');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['admin_url', 'admin_user', 'admin_password']);
        });
    }
};
