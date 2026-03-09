<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('invoice_id')->nullable()->index();
            $table->unsignedBigInteger('customer_id')->nullable()->index();
            $table->string('recipient_email');
            $table->string('subject');
            $table->string('type');
            $table->string('status');
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->nullOnDelete();
            $table->foreign('customer_id')->references('id')->on('customers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
