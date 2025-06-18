<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('T_TICKET', function (Blueprint $table) {
            $table->unsignedSmallInteger('Id_TypeDemande')->nullable()->after('Id_Statut');
            
            $table->foreign('Id_TypeDemande', 'FK_T_TICKET_T_TYPEDEMANDE')
                  ->references('id')
                  ->on('T_TYPEDEMANDE')
                  ->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('T_TICKET', function (Blueprint $table) {
            $table->dropForeign('FK_T_TICKET_T_TYPEDEMANDE');
            $table->dropColumn('Id_TypeDemande');
        });
    }
}; 