<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('T_TICKET_REPORT', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->unsignedSmallInteger('Id_Ticket');
            $table->unsignedSmallInteger('Id_Responsable');
            $table->text('Raison');
            $table->dateTime('DateReport');
            $table->timestamps();

            $table->foreign('Id_Ticket', 'FK_T_TICKET_REPORT_T_TICKET')
                  ->references('id')
                  ->on('T_TICKET')
                  ->onDelete('cascade');

            $table->foreign('Id_Responsable', 'FK_T_TICKET_REPORT_T_UTILISAT')
                  ->references('id')
                  ->on('T_UTILISAT')
                  ->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::dropIfExists('T_TICKET_REPORT');
    }
}; 