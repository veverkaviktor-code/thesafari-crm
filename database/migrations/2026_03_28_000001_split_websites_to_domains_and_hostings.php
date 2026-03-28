<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            // ================================================================
            // STEP 1a: Rename websites → hostings
            // ================================================================

            DB::statement('ALTER TABLE websites RENAME TO hostings');

            // ================================================================
            // STEP 1b: Rename related tables and FK columns
            // ================================================================

            DB::statement('ALTER TABLE website_payments RENAME TO hosting_payments');
            DB::statement('ALTER TABLE hosting_payments RENAME COLUMN website_id TO hosting_id');

            DB::statement('ALTER TABLE website_credentials RENAME TO hosting_credentials');
            DB::statement('ALTER TABLE hosting_credentials RENAME COLUMN website_id TO hosting_id');

            DB::statement('ALTER TABLE invoice_website RENAME TO invoice_hosting');
            DB::statement('ALTER TABLE invoice_hosting RENAME COLUMN website_id TO hosting_id');

            // Rename email_accounts FK column too
            DB::statement('ALTER TABLE email_accounts RENAME COLUMN website_id TO hosting_id');

            // ================================================================
            // STEP 7 (moved early): Drop old computed/domain columns BEFORE
            // renaming hosting_* columns to avoid name collision
            // ================================================================

            // Drop the old computed totals (sell_yearly = domain + hosting combined)
            // Must happen BEFORE renaming hosting_sell_yearly → sell_yearly to avoid collision
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS sell_yearly');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS cost_yearly');

            // ================================================================
            // STEP 1c: Rename hosting_* columns → clean names
            // (safe now that computed sell_yearly/cost_yearly are dropped)
            // ================================================================

            DB::statement('ALTER TABLE hostings RENAME COLUMN hosting_sell_yearly TO sell_yearly');
            DB::statement('ALTER TABLE hostings RENAME COLUMN hosting_cost_yearly TO cost_yearly');
            DB::statement('ALTER TABLE hostings RENAME COLUMN hosting_expires_at TO expires_at');
            DB::statement('ALTER TABLE hostings RENAME COLUMN hosting_server_id TO server_id');

            // ================================================================
            // STEP 2: Create domains table
            // ================================================================

            DB::statement("
                CREATE TABLE domains (
                    id BIGSERIAL PRIMARY KEY,
                    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
                    hosting_id BIGINT REFERENCES hostings(id) ON DELETE SET NULL,
                    name VARCHAR(255) NOT NULL UNIQUE,
                    registrar VARCHAR(20) NOT NULL DEFAULT 'vas-hosting' CHECK (registrar IN ('vas-hosting', 'wedos', 'external')),
                    expires_at DATE,
                    is_registered_by_us BOOLEAN NOT NULL DEFAULT false,
                    sell_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
                    cost_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
                    auto_invoice BOOLEAN NOT NULL DEFAULT true,
                    ip_address VARCHAR(45),
                    dns_servers JSONB,
                    owner_name VARCHAR(255),
                    setup_date DATE,
                    synced_at TIMESTAMPTZ,
                    status VARCHAR(20) NOT NULL DEFAULT 'aktivni' CHECK (status IN ('aktivni', 'pozastaveno', 'zruseno')),
                    notes TEXT,
                    deleted_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ,
                    updated_at TIMESTAMPTZ
                )
            ");

            DB::statement('CREATE INDEX domains_customer_id_idx ON domains(customer_id)');
            DB::statement('CREATE INDEX domains_hosting_id_idx ON domains(hosting_id)');
            DB::statement('CREATE INDEX domains_registrar_idx ON domains(registrar)');
            DB::statement('CREATE INDEX domains_status_idx ON domains(status)');
            DB::statement('CREATE INDEX domains_expires_at_idx ON domains(expires_at)');

            // ================================================================
            // STEP 3: Create invoice_domain pivot
            // ================================================================

            DB::statement("
                CREATE TABLE invoice_domain (
                    id BIGSERIAL PRIMARY KEY,
                    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                    domain_id BIGINT NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    UNIQUE(invoice_id, domain_id)
                )
            ");

            // ================================================================
            // STEP 4: Extract domains from hostings
            // ================================================================

            // Wedos domains list for registrar detection
            $wedosDomains = [
                'alfabrno.cz', 'alfabrno.eu', 'apartmannapalave.cz', 'apartmanpavlov.cz',
                'bigfoodpoint.cz', 'bonamirestaurant.cz', 'brunchcafe.cz', 'drevotech.cz',
                'drevotech.eu', 'expresnijadrovevrtani.cz', 'face-promotion.cz',
                'jadrovevrtani-brno.cz', 'lumidis.cz', 'miliana-medium.cz', 'mrgelato.cz',
                'nolimitkebab.cz', 'prepravaletiste.cz', 'rucni-myti-aut-brno.cz',
                'smstylegarage.cz', 'topmyti.cz', 'viktorveverka.cz', 'zkclean.cz', 'zkelektro.cz',
            ];

            // Process each hosting record that has domain data
            $hostings = DB::table('hostings')
                ->select([
                    'id', 'customer_id', 'name', 'alias_of_id',
                    'domain_expires_at', 'is_registered_by_us',
                    'domain_sell_yearly', 'domain_cost_yearly',
                    'auto_invoice', 'ip_address', 'status', 'synced_at',
                    'created_at', 'updated_at', 'sell_yearly', 'cost_yearly',
                    'server_id', 'storage_used_mb',
                ])
                ->whereNull('deleted_at')
                ->get();

            foreach ($hostings as $hosting) {
                // Only create domain record if there's domain data
                $hasDomainExpiry = $hosting->domain_expires_at !== null;
                $isRegisteredByUs = (bool) $hosting->is_registered_by_us;

                if (! $hasDomainExpiry && ! $isRegisteredByUs) {
                    continue;
                }

                // Determine registrar
                $registrar = 'external';
                if (in_array($hosting->name, $wedosDomains)) {
                    $registrar = 'wedos';
                } elseif ($isRegisteredByUs) {
                    $registrar = 'vas-hosting';
                }

                // For aliases: hosting_id = parent's hosting id, not the alias itself
                $domainHostingId = $hosting->alias_of_id ?? $hosting->id;

                // For aliases: customer_id from parent if alias doesn't have one
                $customerId = $hosting->customer_id;
                if ($hosting->alias_of_id && ! $customerId) {
                    $parent = DB::table('hostings')
                        ->where('id', $hosting->alias_of_id)
                        ->first(['customer_id']);
                    $customerId = $parent?->customer_id;
                }

                DB::table('domains')->insert([
                    'customer_id' => $customerId,
                    'hosting_id' => $domainHostingId,
                    'name' => $hosting->name,
                    'registrar' => $registrar,
                    'expires_at' => $hosting->domain_expires_at,
                    'is_registered_by_us' => $isRegisteredByUs,
                    'sell_yearly' => $hosting->domain_sell_yearly ?? 0,
                    'cost_yearly' => $hosting->domain_cost_yearly ?? 0,
                    'auto_invoice' => $hosting->auto_invoice ?? true,
                    'ip_address' => $hosting->ip_address,
                    'status' => $hosting->status ?? 'aktivni',
                    'synced_at' => $hosting->synced_at,
                    'created_at' => $hosting->created_at,
                    'updated_at' => $hosting->updated_at,
                ]);

                // For alias hostings with no real hosting data: soft-delete them
                if ($hosting->alias_of_id !== null) {
                    $hasNoHostingData = (
                        $hosting->server_id === null
                        && (float) ($hosting->storage_used_mb ?? 0) == 0
                        && (float) ($hosting->sell_yearly ?? 0) == 0
                    );

                    if ($hasNoHostingData) {
                        DB::table('hostings')
                            ->where('id', $hosting->id)
                            ->update(['deleted_at' => now()]);
                    }
                }
            }

            // ================================================================
            // STEP 5: Insert 10 missing Wedos domains (standalone, no hosting)
            // ================================================================

            $missingWedos = [
                ['name' => 'apartmannapalave.cz', 'expires_at' => '2027-03-01'],
                ['name' => 'brunchcafe.cz', 'expires_at' => '2026-06-24'],
                ['name' => 'drevotech.cz', 'expires_at' => '2026-06-14'],
                ['name' => 'drevotech.eu', 'expires_at' => '2026-06-14'],
                ['name' => 'lumidis.cz', 'expires_at' => '2026-11-02'],
                ['name' => 'miliana-medium.cz', 'expires_at' => '2026-06-10'],
                ['name' => 'rucni-myti-aut-brno.cz', 'expires_at' => '2026-05-26'],
                ['name' => 'viktorveverka.cz', 'expires_at' => '2026-04-06'],
                ['name' => 'zkclean.cz', 'expires_at' => '2026-06-13'],
                ['name' => 'zkelektro.cz', 'expires_at' => '2027-02-06'],
            ];

            foreach ($missingWedos as $wedos) {
                // Only insert if not already created from step 4
                $exists = DB::table('domains')
                    ->where('name', $wedos['name'])
                    ->exists();

                if (! $exists) {
                    DB::table('domains')->insert([
                        'customer_id' => null,
                        'hosting_id' => null,
                        'name' => $wedos['name'],
                        'registrar' => 'wedos',
                        'expires_at' => $wedos['expires_at'],
                        'is_registered_by_us' => true,
                        'sell_yearly' => 0,
                        'cost_yearly' => 0,
                        'auto_invoice' => true,
                        'status' => 'aktivni',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            // ================================================================
            // STEP 6: Fix 3 missing domain expirations
            // ================================================================

            $expirationFixes = [
                'apartmanpavlov.cz' => '2027-03-01',
                'bigfoodpoint.cz' => '2027-01-13',
                'face-promotion.cz' => '2027-03-16',
            ];

            foreach ($expirationFixes as $domainName => $expiresAt) {
                DB::table('domains')
                    ->where('name', $domainName)
                    ->update(['expires_at' => $expiresAt]);
            }

            // ================================================================
            // STEP 7b: Drop remaining old columns from hostings
            // (sell_yearly/cost_yearly already dropped in step 7 above)
            // ================================================================

            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS domain_expires_at');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS domain_sell_yearly');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS domain_cost_yearly');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS is_registered_by_us');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS alias_of_id');
            DB::statement('ALTER TABLE hostings DROP COLUMN IF EXISTS auto_renew');

            // Drop the alias_of_id FK constraint and index
            DB::statement('DROP INDEX IF EXISTS idx_websites_alias_of_id');

            // ================================================================
            // STEP 8: Add type column to sync_pending
            // ================================================================

            DB::statement("ALTER TABLE sync_pending ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'domain' CHECK (type IN ('domain', 'hosting'))");

            // ================================================================
            // STEP 9: Update activity_log subject_type
            // ================================================================

            DB::statement("UPDATE activity_log SET subject_type = 'App\\Models\\Hosting' WHERE subject_type = 'App\\Models\\Website'");

            // Also update notifications
            DB::statement("UPDATE notifications SET data = REPLACE(data, '\"website_id\"', '\"hosting_id\"') WHERE data LIKE '%website_id%'");
            DB::statement("UPDATE notifications SET type = REPLACE(type, 'Website', 'Hosting') WHERE type LIKE '%Website%'");
        });
    }

    public function down(): void
    {
        // No rollback — pg_dump backup available
    }
};
