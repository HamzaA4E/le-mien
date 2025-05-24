<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('T_TICKET_REPORT', function (Blueprint $table) {
            $table->string('attachment_path')->nullable()->after('Raison');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('T_TICKET_REPORT', function (Blueprint $table) {
            $table->dropColumn('attachment_path');
        });
    }
};
