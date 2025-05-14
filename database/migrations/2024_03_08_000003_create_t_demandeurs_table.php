<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('T_DEMDEUR', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('designation', 50);
            $table->unsignedSmallInteger('id_service')->nullable();
            $table->smallInteger('statut')->nullable();

            $table->foreign('id_service')
                  ->references('id')
                  ->on('T_SERVICE')
                  ->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('T_DEMDEUR');
    }
}; 