<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('T_PRIORITE', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('designation', 50);
            
        });

        if (Schema::hasColumn('T_PRIORITE', 'ordre')) {
            Schema::table('T_PRIORITE', function (Blueprint $table) {
                $table->dropColumn('ordre');
            });
        }

        // Supprimer la colonne Id_Societe de T_TICKET si elle existe
        if (Schema::hasColumn('T_TICKET', 'Id_Societe')) {
            Schema::table('T_TICKET', function (Blueprint $table) {
                $table->dropForeign(['Id_Societe']);
                $table->dropColumn('Id_Societe');
            });
        }
        // Supprimer la table T_SOCIETE si elle existe
        if (Schema::hasTable('T_SOCIETE')) {
            Schema::drop('T_SOCIETE');
        }
    }

    public function down()
    {
        Schema::dropIfExists('T_PRIORITE');

        if (!Schema::hasColumn('T_PRIORITE', 'ordre')) {
            Schema::table('T_PRIORITE', function (Blueprint $table) {
                $table->smallInteger('ordre')->nullable();
            });
        }

        // Ajouter la colonne Id_Societe à T_TICKET si besoin
        if (!Schema::hasColumn('T_TICKET', 'Id_Societe')) {
            Schema::table('T_TICKET', function (Blueprint $table) {
                $table->unsignedSmallInteger('Id_Societe')->nullable();
            });
        }
        // Recréer la table T_SOCIETE si besoin
        if (!Schema::hasTable('T_SOCIETE')) {
            Schema::create('T_SOCIETE', function (Blueprint $table) {
                $table->smallIncrements('id');
                $table->string('designation', 50);
            });
        }
    }
}; 