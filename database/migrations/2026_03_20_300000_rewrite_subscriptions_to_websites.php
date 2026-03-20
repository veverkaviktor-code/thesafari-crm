<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // ================================================================
            // STEP 1: Create new tables
            // ================================================================

            Schema::create('management_plans', function (Blueprint $table) {
                $table->id();
                $table->string('name', 255);
                $table->integer('price_monthly')->default(0);
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            Schema::create('sync_blacklist', function (Blueprint $table) {
                $table->id();
                $table->string('domain_name', 255)->unique();
                $table->string('reason', 20);
                $table->timestamp('created_at')->useCurrent();
            });

            DB::statement("ALTER TABLE sync_blacklist ADD CONSTRAINT chk_sync_blacklist_reason CHECK (reason IN ('lukas', 'deleted', 'manual'))");

            Schema::create('sync_pending', function (Blueprint $table) {
                $table->id();
                $table->string('domain_name', 255)->unique();
                $table->string('source', 20);
                $table->timestamp('discovered_at')->useCurrent();
            });

            DB::statement("ALTER TABLE sync_pending ADD CONSTRAINT chk_sync_pending_source CHECK (source IN ('portal', 'sss06', 'ond08', 'thaimassage'))");

            Schema::create('website_credentials', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('website_id');
                $table->string('label', 255);
                $table->string('login', 255)->nullable();
                $table->text('password')->nullable();
                $table->text('notes')->nullable();
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            // FK for website_credentials is added AFTER table rename in step 6

            // ================================================================
            // STEP 2: Seed data
            // ================================================================

            DB::table('management_plans')->insert([
                ['name' => 'Bez správy',      'price_monthly' => 0,    'is_active' => true, 'sort_order' => 0, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Základ',          'price_monthly' => 490,  'is_active' => true, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Klidný spánek',   'price_monthly' => 1490, 'is_active' => true, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'Aktivní rozvoj',  'price_monthly' => 2990, 'is_active' => true, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
                ['name' => 'VIP péče',        'price_monthly' => 5990, 'is_active' => true, 'sort_order' => 4, 'created_at' => now(), 'updated_at' => now()],
            ]);

            $blacklistDomains = [
                'beautyateliervoznicova.cz',
                'bropit.cz',
                'ceskapropiska.cz',
                'dominikpodsednik.cz',
                'dtftransferytisk.cz',
                'hotel-slaviaholesov.cz',
                'kempujstylove.cz',
                'kovovepropiskypotisk.cz',
                'kubicek-shop.com',
                'mipak.cz',
                'mltfa.cz',
                'natisknito.cz',
                'okruhovejizdy.cz',
                'orelslapanice.cz',
                'orlovnaslapanice.cz',
                'podolisrdcem.cz',
                'prolepsibosonohy.cz',
                'rautec.cz',
                'rdpromo.cz',
                'reklamnidarky.cz',
                'reklamnipropiskypotisk.cz',
                'reklamnitextilpotisk.cz',
                'rismont.cz',
                'sedlackovi2026.cz',
                'snurkynakrkpotisk.cz',
                'strakovi2025.cz',
                'svobodapridal.cz',
                'synwase.cz',
                'tabarin.cz',
                'truhlarstvidv.cz',
                'vonkypotisk.cz',
                'zapalovacepotisk.cz',
                'alfabrno.eu',
            ];

            foreach ($blacklistDomains as $domain) {
                DB::table('sync_blacklist')->insert([
                    'domain_name' => $domain,
                    'reason' => 'lukas',
                ]);
            }

            // ================================================================
            // STEP 3: Migrate credentials data BEFORE dropping columns
            // ================================================================

            // Admin credentials → website_credentials (label='Admin')
            DB::statement("
                INSERT INTO website_credentials (website_id, label, login, password, sort_order, created_at, updated_at)
                SELECT id, 'Admin', admin_user, admin_password, 0, NOW(), NOW()
                FROM subscriptions
                WHERE admin_url IS NOT NULL AND admin_user IS NOT NULL
            ");

            // Client credentials → website_credentials (label='Zákazník')
            DB::statement("
                INSERT INTO website_credentials (website_id, label, login, password, sort_order, created_at, updated_at)
                SELECT id, 'Zákazník', client_user, client_password, 1, NOW(), NOW()
                FROM subscriptions
                WHERE client_user IS NOT NULL
            ");

            // ================================================================
            // STEP 4: Rename tables
            // ================================================================

            DB::statement('ALTER TABLE subscriptions RENAME TO websites');
            DB::statement('ALTER TABLE subscription_payments RENAME TO website_payments');
            DB::statement('ALTER TABLE invoice_subscription RENAME TO invoice_website');

            // ================================================================
            // STEP 5: Rename FK columns
            // ================================================================

            DB::statement('ALTER TABLE website_payments RENAME COLUMN subscription_id TO website_id');
            DB::statement('ALTER TABLE invoice_website RENAME COLUMN subscription_id TO website_id');
            DB::statement('ALTER TABLE email_accounts RENAME COLUMN subscription_id TO website_id');

            // ================================================================
            // STEP 6: Fix PostgreSQL constraints
            // ================================================================

            // Fix unique constraint on invoice_website pivot
            DB::statement('ALTER TABLE invoice_website DROP CONSTRAINT IF EXISTS invoice_subscription_invoice_id_subscription_id_unique');
            DB::statement('ALTER TABLE invoice_website ADD CONSTRAINT invoice_website_invoice_id_website_id_unique UNIQUE (invoice_id, website_id)');

            // Add FK on website_credentials now that websites table exists
            DB::statement('
                ALTER TABLE website_credentials
                ADD CONSTRAINT website_credentials_website_id_foreign
                FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE CASCADE
            ');
            DB::statement('CREATE INDEX idx_website_credentials_website_id ON website_credentials(website_id)');

            // ================================================================
            // STEP 7: Add new columns to websites
            // ================================================================

            DB::statement('ALTER TABLE websites ADD COLUMN domain_expires_at TIMESTAMP NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN hosting_expires_at TIMESTAMP NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN hosting_server_id BIGINT NULL REFERENCES vps_servers(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN alias_of_id BIGINT NULL REFERENCES websites(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN management_plan_id BIGINT NULL REFERENCES management_plans(id) ON DELETE SET NULL');
            DB::statement("ALTER TABLE websites ADD COLUMN management_cycle VARCHAR(20) NULL CHECK (management_cycle IN ('quarterly', 'semi_annual', 'annual'))");
            DB::statement('ALTER TABLE websites ADD COLUMN auto_invoice_management BOOLEAN DEFAULT false');

            DB::statement('CREATE INDEX idx_websites_hosting_server_id ON websites(hosting_server_id)');
            DB::statement('CREATE INDEX idx_websites_alias_of_id ON websites(alias_of_id)');
            DB::statement('CREATE INDEX idx_websites_management_plan_id ON websites(management_plan_id)');

            // ================================================================
            // STEP 8: Rename column
            // ================================================================

            DB::statement('ALTER TABLE websites RENAME COLUMN customer_notified_at TO last_expiry_notified_at');

            // ================================================================
            // STEP 9: Data migration
            // ================================================================

            // Copy expires_at to hosting_expires_at for hostings and services
            DB::statement("UPDATE websites SET hosting_expires_at = expires_at WHERE type IN ('hosting', 'sluzba')");

            // Copy expires_at to domain_expires_at for own-registered domains
            DB::statement("UPDATE websites SET domain_expires_at = expires_at WHERE type = 'domena' AND is_registered_by_us = true");

            // Map vps_server_id to hosting_server_id
            DB::statement('UPDATE websites SET hosting_server_id = vps_server_id WHERE vps_server_id IS NOT NULL');

            // Map parent_subscription_id to alias_of_id
            DB::statement('UPDATE websites SET alias_of_id = parent_subscription_id WHERE parent_subscription_id IS NOT NULL');

            // ================================================================
            // STEP 10: Drop old columns
            // ================================================================

            // Drop CHECK constraints that reference columns we're about to drop
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS chk_subscriptions_type');
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS chk_subscriptions_billing_cycle');
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS chk_subscriptions_price');

            // Drop FK constraints on columns being removed
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS subscriptions_vps_server_id_foreign');
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS subscriptions_parent_subscription_id_foreign');
            DB::statement('ALTER TABLE websites DROP CONSTRAINT IF EXISTS subscriptions_folder_id_foreign');

            // Drop indexes on columns being removed
            DB::statement('DROP INDEX IF EXISTS subscriptions_vps_server_id_index');
            DB::statement('DROP INDEX IF EXISTS subscriptions_parent_subscription_id_index');
            DB::statement('DROP INDEX IF EXISTS subscriptions_folder_id_index');
            DB::statement('DROP INDEX IF EXISTS subscriptions_portal_domain_id_index');
            DB::statement('DROP INDEX IF EXISTS subscriptions_vas_hosting_id_index');

            // Drop all old columns in a single statement
            DB::statement('
                ALTER TABLE websites
                    DROP COLUMN type,
                    DROP COLUMN provider,
                    DROP COLUMN price_yearly,
                    DROP COLUMN billing_cycle,
                    DROP COLUMN monthly_price,
                    DROP COLUMN monthly_plan,
                    DROP COLUMN portal_domain_id,
                    DROP COLUMN vas_hosting_id,
                    DROP COLUMN tariff,
                    DROP COLUMN managed_since,
                    DROP COLUMN expires_at,
                    DROP COLUMN parent_subscription_id,
                    DROP COLUMN vps_server_id,
                    DROP COLUMN admin_user,
                    DROP COLUMN admin_password,
                    DROP COLUMN client_user,
                    DROP COLUMN client_password,
                    DROP COLUMN folder_id
            ');

            // ================================================================
            // STEP 11: Add invoice_type to pivot
            // ================================================================

            DB::statement("ALTER TABLE invoice_website ADD COLUMN invoice_type VARCHAR(20) DEFAULT 'hosting' CHECK (invoice_type IN ('hosting', 'management'))");

            // ================================================================
            // STEP 12: Cleanup notifications
            // ================================================================

            DB::statement("UPDATE notifications SET data = REPLACE(data, '\"subscription_id\"', '\"website_id\"') WHERE data LIKE '%subscription_id%'");
            DB::statement("UPDATE notifications SET data = REPLACE(data, '/neniweb/', '/webove-sluzby/') WHERE data LIKE '%/neniweb/%'");
            DB::statement("UPDATE notifications SET type = REPLACE(type, 'Subscription', 'Website') WHERE type LIKE '%Subscription%'");

            // ================================================================
            // STEP 13: Drop subscription_folders
            // ================================================================

            DB::statement('DROP TABLE IF EXISTS subscription_folders');
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            // ================================================================
            // STEP 1: Re-create subscription_folders
            // ================================================================

            Schema::create('subscription_folders', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('color', 7)->nullable();
                $table->boolean('is_collapsed')->default(false);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });

            // ================================================================
            // STEP 2: Re-add dropped columns to websites
            // ================================================================

            DB::statement("ALTER TABLE websites ADD COLUMN type VARCHAR(20) DEFAULT 'hosting'");
            DB::statement('ALTER TABLE websites ADD COLUMN provider VARCHAR(255) NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN price_yearly NUMERIC(10,2) DEFAULT 0');
            DB::statement("ALTER TABLE websites ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'yearly'");
            DB::statement('ALTER TABLE websites ADD COLUMN monthly_price NUMERIC(10,2) DEFAULT 0');
            DB::statement('ALTER TABLE websites ADD COLUMN monthly_plan VARCHAR(50) NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN portal_domain_id INTEGER NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN vas_hosting_id INTEGER NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN tariff VARCHAR(50) NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN managed_since DATE NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN expires_at DATE NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN parent_subscription_id BIGINT NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN vps_server_id BIGINT NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN admin_user VARCHAR(255) NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN admin_password TEXT NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN client_user VARCHAR(255) NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN client_password TEXT NULL');
            DB::statement('ALTER TABLE websites ADD COLUMN folder_id BIGINT NULL');

            // ================================================================
            // STEP 3: Data restore
            // ================================================================

            DB::statement("
                UPDATE websites SET
                    expires_at = COALESCE(hosting_expires_at, domain_expires_at),
                    type = CASE
                        WHEN hosting_server_id IS NOT NULL THEN 'hosting'
                        ELSE 'domena'
                    END,
                    vps_server_id = hosting_server_id,
                    parent_subscription_id = alias_of_id
            ");

            // ================================================================
            // STEP 4: Rename last_expiry_notified_at back
            // ================================================================

            DB::statement('ALTER TABLE websites RENAME COLUMN last_expiry_notified_at TO customer_notified_at');

            // ================================================================
            // STEP 5: Drop new columns
            // ================================================================

            DB::statement('DROP INDEX IF EXISTS idx_websites_hosting_server_id');
            DB::statement('DROP INDEX IF EXISTS idx_websites_alias_of_id');
            DB::statement('DROP INDEX IF EXISTS idx_websites_management_plan_id');

            DB::statement('
                ALTER TABLE websites
                    DROP COLUMN domain_expires_at,
                    DROP COLUMN hosting_expires_at,
                    DROP COLUMN hosting_server_id,
                    DROP COLUMN alias_of_id,
                    DROP COLUMN management_plan_id,
                    DROP COLUMN management_cycle,
                    DROP COLUMN auto_invoice_management
            ');

            // ================================================================
            // STEP 6: Drop invoice_type from invoice_website
            // ================================================================

            DB::statement('ALTER TABLE invoice_website DROP COLUMN IF EXISTS invoice_type');

            // ================================================================
            // STEP 7: Rename tables back
            // ================================================================

            DB::statement('ALTER TABLE websites RENAME TO subscriptions');
            DB::statement('ALTER TABLE website_payments RENAME TO subscription_payments');
            DB::statement('ALTER TABLE invoice_website RENAME TO invoice_subscription');

            // ================================================================
            // STEP 8: Rename FK columns back
            // ================================================================

            DB::statement('ALTER TABLE subscription_payments RENAME COLUMN website_id TO subscription_id');
            DB::statement('ALTER TABLE invoice_subscription RENAME COLUMN website_id TO subscription_id');
            DB::statement('ALTER TABLE email_accounts RENAME COLUMN website_id TO subscription_id');

            // ================================================================
            // STEP 9: Fix constraint names back
            // ================================================================

            DB::statement('ALTER TABLE invoice_subscription DROP CONSTRAINT IF EXISTS invoice_website_invoice_id_website_id_unique');
            DB::statement('ALTER TABLE invoice_subscription ADD CONSTRAINT invoice_subscription_invoice_id_subscription_id_unique UNIQUE (invoice_id, subscription_id)');

            // ================================================================
            // STEP 10: Re-add CHECK constraints
            // ================================================================

            DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_type CHECK (type IN ('hosting', 'domena', 'sluzba'))");
            DB::statement("ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_billing_cycle CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'once', 'one_time'))");
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_price CHECK (price_yearly >= 0)');

            // Re-add FK constraints
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_vps_server_id_foreign FOREIGN KEY (vps_server_id) REFERENCES vps_servers(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_parent_subscription_id_foreign FOREIGN KEY (parent_subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_folder_id_foreign FOREIGN KEY (folder_id) REFERENCES subscription_folders(id) ON DELETE SET NULL');

            // Re-add indexes
            DB::statement('CREATE INDEX subscriptions_vps_server_id_index ON subscriptions(vps_server_id)');
            DB::statement('CREATE INDEX subscriptions_parent_subscription_id_index ON subscriptions(parent_subscription_id)');
            DB::statement('CREATE INDEX subscriptions_folder_id_index ON subscriptions(folder_id)');
            DB::statement('CREATE INDEX subscriptions_portal_domain_id_index ON subscriptions(portal_domain_id)');
            DB::statement('CREATE INDEX subscriptions_vas_hosting_id_index ON subscriptions(vas_hosting_id)');

            // ================================================================
            // STEP 11: Drop website_credentials FK + table
            // ================================================================

            Schema::dropIfExists('website_credentials');

            // ================================================================
            // STEP 12: Drop new tables
            // ================================================================

            Schema::dropIfExists('management_plans');
            Schema::dropIfExists('sync_blacklist');
            Schema::dropIfExists('sync_pending');

            // ================================================================
            // STEP 13: Revert notification data
            // ================================================================

            DB::statement("UPDATE notifications SET data = REPLACE(data, '\"website_id\"', '\"subscription_id\"') WHERE data LIKE '%website_id%'");
            DB::statement("UPDATE notifications SET data = REPLACE(data, '/webove-sluzby/', '/neniweb/') WHERE data LIKE '%/webove-sluzby/%'");
            DB::statement("UPDATE notifications SET type = REPLACE(type, 'Website', 'Subscription') WHERE type LIKE '%Website%'");
        });
    }
};
