<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        $tables = [
            'T_CATEGORIE',
            'T_EMPLACEMENT',
            'T_SOCIETE',
            'T_DEMDEUR',
            'T_SERVICE',
            'T_PRIORITE',
            'T_STATUT',
            
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('designation');
            });
        }
    }

    public function down()
    {
        $tables = [
            'T_CATEGORIE',
            'T_EMPLACEMENT',
            'T_SOCIETE',
            'T_DEMDEUR',
            'T_SERVICE',
            'T_PRIORITE',
            'T_STATUT',
            
        ];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }
}; 