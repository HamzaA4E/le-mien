<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('T_TICKET', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->dateTime('DateCreation');
            $table->unsignedSmallInteger('Id_Demandeur');
            $table->unsignedSmallInteger('Id_Utilisat');
            $table->unsignedSmallInteger('Id_Executant')->nullable();
            $table->unsignedSmallInteger('Id_Societe');
            $table->unsignedSmallInteger('Id_Emplacement');
            $table->unsignedSmallInteger('Id_Priorite');
            $table->unsignedSmallInteger('Id_Categorie');
            $table->unsignedSmallInteger('Id_TypeDemande');
            $table->unsignedSmallInteger('Id_Statut');
            $table->string('Titre', 200);
            $table->string('Description', 800)->nullable();
            $table->text('Commentaire')->nullable();
            $table->string('attachment_path')->nullable();
            $table->dateTime('DateDebut')->nullable();
            $table->dateTime('DateFinPrevue')->nullable();
            $table->dateTime('DateFinReelle')->nullable();
            $table->timestamps();

            $table->foreign('Id_Categorie', 'FK_T_TICKET_T_CATEGORIE')
                  ->references('id')
                  ->on('T_CATEGORIE')
                  ->onDelete('no action');

            $table->foreign('Id_Demandeur', 'FK_T_TICKET_T_DEMDEUR')
                  ->references('id')
                  ->on('T_DEMDEUR')
                  ->onDelete('no action');

            $table->foreign('Id_Emplacement', 'FK_T_TICKET_T_EMPLACEMENT')
                  ->references('id')
                  ->on('T_EMPLACEMENT')
                  ->onDelete('no action');

            $table->foreign('Id_Priorite', 'FK_T_TICKET_T_PRIORITE')
                  ->references('id')
                  ->on('T_PRIORITE')
                  ->onDelete('no action');

            $table->foreign('Id_Societe', 'FK_T_TICKET_T_SOCIETE')
                  ->references('id')
                  ->on('T_SOCIETE')
                  ->onDelete('no action');

            $table->foreign('Id_Statut', 'FK_T_TICKET_T_STATUT')
                  ->references('id')
                  ->on('T_STATUT')
                  ->onDelete('no action');

            $table->foreign('Id_TypeDemande', 'FK_T_TICKET_T_TYPEDEMENDE')
                  ->references('id')
                  ->on('T_TYPEDEMANDE')
                  ->onDelete('no action');

            $table->foreign('Id_Utilisat', 'FK_T_TICKET_T_UTILISAT')
                  ->references('id')
                  ->on('T_UTILISAT')
                  ->onDelete('no action');

            $table->foreign('Id_Executant', 'FK_T_TICKET_T_EXECUTANT')
                  ->references('id')
                  ->on('T_EXECUTANT')
                  ->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('T_TICKET');
    }
}; 