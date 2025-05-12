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
            $table->dateTime('date_creation');
            $table->unsignedSmallInteger('id_demandeur');
            $table->unsignedSmallInteger('id_utilisateur');
            $table->unsignedSmallInteger('id_societe');
            $table->unsignedSmallInteger('id_emplacement');
            $table->unsignedSmallInteger('id_priorite');
            $table->unsignedSmallInteger('id_categorie');
            $table->unsignedSmallInteger('id_type_demande');
            $table->unsignedSmallInteger('id_statut');
            $table->string('titre', 200);
            $table->string('description', 800)->nullable();
            $table->text('commentaire')->nullable();
            $table->dateTime('date_debut')->nullable();
            $table->dateTime('date_fin_prevue')->nullable();
            $table->dateTime('date_fin_reelle')->nullable();
            $table->timestamps();

            $table->foreign('id_demandeur')
                  ->references('id')
                  ->on('T_DEMDEUR')
                  ->onDelete('no action');

            $table->foreign('id_utilisateur')
                  ->references('id')
                  ->on('T_UTILISAT')
                  ->onDelete('no action');

            $table->foreign('id_societe')
                  ->references('id')
                  ->on('T_SOCIETE')
                  ->onDelete('no action');

            $table->foreign('id_emplacement')
                  ->references('id')
                  ->on('T_EMPLACEMENT')
                  ->onDelete('no action');

            $table->foreign('id_priorite')
                  ->references('id')
                  ->on('T_PRIORITE')
                  ->onDelete('no action');

            $table->foreign('id_categorie')
                  ->references('id')
                  ->on('T_CATEGORIE')
                  ->onDelete('no action');

            $table->foreign('id_type_demande')
                  ->references('id')
                  ->on('T_TYPEDEMANDE')
                  ->onDelete('no action');

            $table->foreign('id_statut')
                  ->references('id')
                  ->on('T_STATUT')
                  ->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('T_TICKET');
    }
}; 