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
        if (Schema::hasTable('T_TICKET')) {
            Schema::table('T_TICKET', function (Blueprint $tableBlueprint) {
                if (Schema::hasColumn('T_TICKET', 'DateCreation')) {
                    $tableBlueprint->date('DateCreation')->nullable()->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('T_TICKET')) {
            Schema::table('T_TICKET', function (Blueprint $tableBlueprint) {
                if (Schema::hasColumn('T_TICKET', 'DateCreation')) {
                    $tableBlueprint->dateTime('DateCreation')->nullable()->change();
                }
            });
        }
    }
}; 