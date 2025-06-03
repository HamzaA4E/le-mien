<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('T_EXECUTANT', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('designation', 50);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('T_EXECUTANT');
    }
}; 