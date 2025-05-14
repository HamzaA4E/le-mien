<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        if (DB::connection()->getDriverName() === 'sqlsrv') {
            // Pour SQL Server, créons la table avec datetime2 directement
            DB::statement('
                CREATE TABLE personal_access_tokens (
                    id bigint IDENTITY(1,1) PRIMARY KEY,
                    tokenable_type nvarchar(255) NOT NULL,
                    tokenable_id bigint NOT NULL,
                    name nvarchar(255) NOT NULL,
                    token nvarchar(64) NOT NULL UNIQUE,
                    abilities ntext NULL,
                    last_used_at datetime2 NULL,
                    expires_at datetime2 NULL,
                    created_at datetime2 NOT NULL DEFAULT GETDATE(),
                    updated_at datetime2 NOT NULL DEFAULT GETDATE()
                )
            ');
        } else {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->dateTime('last_used_at')->nullable();
                $table->dateTime('expires_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('personal_access_tokens');
    }
}; 