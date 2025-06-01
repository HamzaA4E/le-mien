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
            'T_SERVICE',
            'T_EMPLACEMENT',
            'T_EXECUTANT',
            'T_PRIORITE'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $tableBlueprint) use ($table) {
                    if (!Schema::hasColumn($table, 'created_at')) {
                        $tableBlueprint->timestamp('created_at')->nullable();
                    }
                    if (!Schema::hasColumn($table, 'updated_at')) {
                        $tableBlueprint->timestamp('updated_at')->nullable();
                    }
                });
            }
        }
    }

    public function down()
    {
        $tables = [
            'T_CATEGORIE',
            'T_SERVICE',
            'T_EMPLACEMENT',
            'T_EXECUTANT',
            'T_PRIORITE'
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $tableBlueprint) {
                    $tableBlueprint->dropColumn(['created_at', 'updated_at']);
                });
            }
        }
    }
}; 