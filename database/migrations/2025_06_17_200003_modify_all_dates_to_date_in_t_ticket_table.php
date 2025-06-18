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
                if (Schema::hasColumn('T_TICKET', 'DateDebut')) {
                    $tableBlueprint->date('DateDebut')->nullable()->change();
                }
                if (Schema::hasColumn('T_TICKET', 'DateFinPrevue')) {
                    $tableBlueprint->date('DateFinPrevue')->nullable()->change();
                }
                if (Schema::hasColumn('T_TICKET', 'DateFinReelle')) {
                    $tableBlueprint->date('DateFinReelle')->nullable()->change();
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
                if (Schema::hasColumn('T_TICKET', 'DateDebut')) {
                    $tableBlueprint->dateTime('DateDebut')->nullable()->change();
                }
                if (Schema::hasColumn('T_TICKET', 'DateFinPrevue')) {
                    $tableBlueprint->dateTime('DateFinPrevue')->nullable()->change();
                }
                if (Schema::hasColumn('T_TICKET', 'DateFinReelle')) {
                    $tableBlueprint->dateTime('DateFinReelle')->nullable()->change();
                }
            });
        }
    }
}; 