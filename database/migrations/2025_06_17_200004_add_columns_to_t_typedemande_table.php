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
        Schema::table('T_TYPEDEMANDE', function (Blueprint $table) {
            if (!Schema::hasColumn('T_TYPEDEMANDE', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('designation');
            }
            if (!Schema::hasColumn('T_TYPEDEMANDE', 'created_at')) {
                $table->date('created_at')->nullable();
            }
            if (!Schema::hasColumn('T_TYPEDEMANDE', 'updated_at')) {
                $table->date('updated_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('T_TYPEDEMANDE', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'created_at', 'updated_at']);
        });
    }
}; 