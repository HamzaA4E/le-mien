<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Supprimer les contraintes de clé étrangère
        DB::statement('ALTER TABLE T_TICKET DROP CONSTRAINT IF EXISTS FK_T_TICKET_T_CATEGORIE');
        DB::statement('ALTER TABLE T_TICKET DROP CONSTRAINT IF EXISTS FK_T_TICKET_T_EMPLACEMENT');
        
        // Modifier les colonnes pour permettre NULL et type smallint
        DB::statement('ALTER TABLE T_TICKET ALTER COLUMN Id_Categorie smallint NULL');
        DB::statement('ALTER TABLE T_TICKET ALTER COLUMN Id_Emplacement smallint NULL');
        
        // Recréer les contraintes de clé étrangère
        DB::statement('ALTER TABLE T_TICKET ADD CONSTRAINT FK_T_TICKET_T_CATEGORIE FOREIGN KEY (Id_Categorie) REFERENCES T_CATEGORIE(id)');
        DB::statement('ALTER TABLE T_TICKET ADD CONSTRAINT FK_T_TICKET_T_EMPLACEMENT FOREIGN KEY (Id_Emplacement) REFERENCES T_EMPLACEMENT(id)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Supprimer les contraintes de clé étrangère
        DB::statement('ALTER TABLE T_TICKET DROP CONSTRAINT IF EXISTS FK_T_TICKET_T_CATEGORIE');
        DB::statement('ALTER TABLE T_TICKET DROP CONSTRAINT IF EXISTS FK_T_TICKET_T_EMPLACEMENT');
        
        // Modifier les colonnes pour ne plus permettre NULL et type smallint
        DB::statement('ALTER TABLE T_TICKET ALTER COLUMN Id_Categorie smallint NOT NULL');
        DB::statement('ALTER TABLE T_TICKET ALTER COLUMN Id_Emplacement smallint NOT NULL');
        
        // Recréer les contraintes de clé étrangère
        DB::statement('ALTER TABLE T_TICKET ADD CONSTRAINT FK_T_TICKET_T_CATEGORIE FOREIGN KEY (Id_Categorie) REFERENCES T_CATEGORIE(id)');
        DB::statement('ALTER TABLE T_TICKET ADD CONSTRAINT FK_T_TICKET_T_EMPLACEMENT FOREIGN KEY (Id_Emplacement) REFERENCES T_EMPLACEMENT(id)');
    }
};
