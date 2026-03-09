<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estimates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('customer_id')->nullable()->index()->nullOnDelete()->constrained('customers');
            $table->date('deadline')->nullable();
            $table->text('notes')->nullable();
            $table->decimal('total_price', 10, 2)->default(0);
            $table->string('status', 20)->default('draft');
            $table->timestamps();
        });

        DB::statement("ALTER TABLE estimates ADD CONSTRAINT estimates_status_check CHECK (status IN ('draft','sent','accepted','rejected'))");

        Schema::create('estimate_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimate_id')->index()->constrained('estimates')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('width', 8, 4);
            $table->decimal('height', 8, 4);
            $table->integer('quantity')->default(1);
            $table->string('material', 30)->nullable();
            $table->string('lamination', 10)->nullable();
            $table->boolean('is_external')->default(false);
            $table->decimal('calculated_price', 10, 2)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        DB::statement("ALTER TABLE estimate_items ADD CONSTRAINT estimate_items_material_check CHECK (material IS NULL OR material IN ('folie_polymericka','folie_lita','owv','banner','rezana'))");
        DB::statement("ALTER TABLE estimate_items ADD CONSTRAINT estimate_items_lamination_check CHECK (lamination IS NULL OR lamination IN ('matna','leskla'))");

        Schema::create('estimate_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('estimate_id')->index()->constrained('estimates')->cascadeOnDelete();
            $table->string('path');
            $table->string('caption')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estimate_photos');
        Schema::dropIfExists('estimate_items');
        Schema::dropIfExists('estimates');
    }
};
