<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('T_UTILISAT', function (Blueprint $table) {
            $table->smallIncrements('id');
            $table->string('designation');
            $table->string('email')->unique();
            $table->string('password');
            $table->integer('niveau')->default(1);
            $table->integer('statut')->default(1);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('T_UTILISAT');
    }
}; 