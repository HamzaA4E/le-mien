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
        if (Schema::hasTable('T_DEMDEUR')) {
            Schema::table('T_DEMDEUR', function (Blueprint $tableBlueprint) {
                // Modifier le type de created_at de timestamp vers date
                if (Schema::hasColumn('T_DEMDEUR', 'created_at')) {
                    $tableBlueprint->date('created_at')->nullable()->change();
                }
                
                // Modifier le type de updated_at de timestamp vers date
                if (Schema::hasColumn('T_DEMDEUR', 'updated_at')) {
                    $tableBlueprint->date('updated_at')->nullable()->change();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('T_DEMDEUR')) {
            Schema::table('T_DEMDEUR', function (Blueprint $tableBlueprint) {
                // Revenir au type timestamp
                if (Schema::hasColumn('T_DEMDEUR', 'created_at')) {
                    $tableBlueprint->timestamp('created_at')->nullable()->change();
                }
                
                if (Schema::hasColumn('T_DEMDEUR', 'updated_at')) {
                    $tableBlueprint->timestamp('updated_at')->nullable()->change();
                }
            });
        }
    }
}; 