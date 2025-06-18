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
        $tables = [
            'T_CATEGORIE',
            'T_SERVICE',
            'T_EMPLACEMENT',
            'T_EXECUTANT',
            'T_PRIORITE',
            'T_STATUT'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($table) {
                    // Modifier le type de created_at de timestamp vers date
                    if (Schema::hasColumn($table, 'created_at')) {
                        $tableBlueprint->date('created_at')->nullable()->change();
                    }
                    
                    // Modifier le type de updated_at de timestamp vers date
                    if (Schema::hasColumn($table, 'updated_at')) {
                        $tableBlueprint->date('updated_at')->nullable()->change();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'T_CATEGORIE',
            'T_SERVICE',
            'T_EMPLACEMENT',
            'T_EXECUTANT',
            'T_PRIORITE',
            'T_STATUT'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($table) {
                    // Revenir au type timestamp
                    if (Schema::hasColumn($table, 'created_at')) {
                        $tableBlueprint->timestamp('created_at')->nullable()->change();
                    }
                    
                    if (Schema::hasColumn($table, 'updated_at')) {
                        $tableBlueprint->timestamp('updated_at')->nullable()->change();
                    }
                });
            }
        }
    }
};