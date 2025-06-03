<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('T_TICKET', function (Blueprint $table) {
            $table->unsignedSmallInteger('Id_Executant')->nullable()->after('Id_Utilisat');
            
            $table->foreign('Id_Executant', 'FK_T_TICKET_T_EXECUTANT')
                  ->references('id')
                  ->on('T_EXECUTANT')
                  ->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::table('T_TICKET', function (Blueprint $table) {
            $table->dropForeign('FK_T_TICKET_T_EXECUTANT');
            $table->dropColumn('Id_Executant');
        });
    }
}; 