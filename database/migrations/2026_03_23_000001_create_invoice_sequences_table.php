<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_sequences', function (Blueprint $table) {
            $table->string('prefix')->primary(); // e.g. "20261", "20266"
            $table->integer('last_number');       // e.g. 20261003
        });

        // Seed from existing invoices (including soft-deleted)
        $rows = DB::table('invoices')
            ->selectRaw("
                SUBSTRING(invoice_number FROM 1 FOR 5) as prefix,
                MAX(CAST(invoice_number AS INTEGER)) as last_number
            ")
            ->whereRaw("invoice_number ~ '^\d{5,}'")
            ->groupByRaw("SUBSTRING(invoice_number FROM 1 FOR 5)")
            ->get();

        foreach ($rows as $row) {
            DB::table('invoice_sequences')->insert([
                'prefix' => $row->prefix,
                'last_number' => $row->last_number,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_sequences');
    }
};
