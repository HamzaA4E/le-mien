<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // Schema::table('T_TICKET', function (Blueprint $table) {
        //     // Supprimer d'abord la contrainte de clé étrangère
        //     $table->dropForeign('FK_T_TICKET_T_PRIORITE');
            
        //     // Modifier la colonne pour permettre les valeurs NULL
        //     $table->unsignedSmallInteger('Id_Priorite')->nullable()->change();
            
        //     // Recréer la contrainte de clé étrangère
        //     $table->foreign('Id_Priorite', 'FK_T_TICKET_T_PRIORITE')
        //           ->references('id')
        //           ->on('T_PRIORITE')
        //           ->onDelete('no action');
        // });
    }

    public function down()
    {
        // Schema::table('T_TICKET', function (Blueprint $table) {
        //     // Supprimer la contrainte de clé étrangère
        //     $table->dropForeign('FK_T_TICKET_T_PRIORITE');
            
        //     // Modifier la colonne pour ne plus permettre les valeurs NULL
        //     $table->unsignedSmallInteger('Id_Priorite')->nullable(false)->change();
            
        //     // Recréer la contrainte de clé étrangère
        //     $table->foreign('Id_Priorite', 'FK_T_TICKET_T_PRIORITE')
        //           ->references('id')
        //           ->on('T_PRIORITE')
        //           ->onDelete('no action');
        // });
    }
};