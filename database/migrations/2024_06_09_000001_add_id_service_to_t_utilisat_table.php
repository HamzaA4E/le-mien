<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('T_UTILISAT', function (Blueprint $table) {
            $table->unsignedSmallInteger('id_service')->nullable()->after('statut');
            $table->foreign('id_service')->references('id')->on('T_SERVICE')->onDelete('no action');
        });
    }

    public function down()
    {
        Schema::table('T_UTILISAT', function (Blueprint $table) {
            $table->dropForeign(['id_service']);
            $table->dropColumn('id_service');
        });
    }
};
