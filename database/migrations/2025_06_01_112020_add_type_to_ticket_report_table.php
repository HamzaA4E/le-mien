<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('T_TICKET_REPORT', function (Blueprint $table) {
            $table->string('type')->nullable()->after('Raison');
        });
    }
    
    public function down()
    {
        Schema::table('T_TICKET_REPORT', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
