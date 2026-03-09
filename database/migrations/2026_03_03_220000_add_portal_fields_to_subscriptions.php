<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('is_registered_by_us')->default(false)->after('vas_hosting_id');
            $table->string('ip_address', 45)->nullable()->after('is_registered_by_us');
            $table->integer('storage_quota_mb')->default(0)->after('ip_address');
            $table->integer('storage_used_mb')->default(0)->after('storage_quota_mb');
            $table->string('tariff', 50)->nullable()->after('storage_used_mb');
            $table->integer('portal_domain_id')->nullable()->after('tariff');

            $table->index('portal_domain_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropIndex(['portal_domain_id']);
            $table->dropColumn([
                'is_registered_by_us',
                'ip_address',
                'storage_quota_mb',
                'storage_used_mb',
                'tariff',
                'portal_domain_id',
            ]);
        });
    }
};
