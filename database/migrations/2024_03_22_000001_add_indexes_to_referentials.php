<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Liste des tables de référentiels (noms exacts)
     */
    protected $referentialTables = [
        'T_CATEGORIE',
        'T_DEMDEUR',
        'T_EMPLACEMENT',
        'T_PRIORITE',
        'T_SERVICE',
        'T_SOCIETE',
        'T_STATUT',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->referentialTables as $tableName) {
            $indexName = 'idx_' . strtolower($tableName) . '_is_active';
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->index('is_active', $indexName);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->referentialTables as $tableName) {
            $indexName = 'idx_' . strtolower($tableName) . '_is_active';
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->dropIndex($indexName);
            });
        }
    }
}; 