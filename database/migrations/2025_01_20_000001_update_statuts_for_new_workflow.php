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
        // Mettre à jour les statuts existants ou les créer s'ils n'existent pas
        $statuts = [
            'Nouveau' => 'Nouveau',
            'En attente de validation' => 'En attente de validation',
            'Validé par directeur' => 'Validé par directeur',
            'En instance' => 'En instance',
            'En cours' => 'En cours',
            'Terminé' => 'Terminé',
            'Clôturé' => 'Clôturé',
            'Refusé par administrateur' => 'Refusé par administrateur',
            'Refusé par directeur' => 'Refusé par directeur',
        ];
        
        foreach ($statuts as $ancienNom => $nouveauNom) {
            // Vérifier si le statut existe déjà
            $statutExistant = DB::table('T_STATUT')->where('designation', $ancienNom)->first();
            
            if ($statutExistant) {
                // Mettre à jour le statut existant
                DB::table('T_STATUT')
                    ->where('id', $statutExistant->id)
                    ->update([
                        'designation' => $nouveauNom,
                        'is_active' => true,
                        'updated_at' => DB::raw("CONVERT(date, GETDATE(), 120)")
                    ]);
            } else {
                // Créer un nouveau statut
                DB::table('T_STATUT')->insert([
                    'designation' => $nouveauNom,
                    'is_active' => true,
                    'created_at' => DB::raw("CONVERT(date, GETDATE(), 120)"),
                    'updated_at' => DB::raw("CONVERT(date, GETDATE(), 120)")
                ]);
            }
        }
        
        // Désactiver les anciens statuts qui ne sont plus utilisés
        $anciensStatuts = ['En attente', 'Refusé'];
        foreach ($anciensStatuts as $ancienStatut) {
            DB::table('T_STATUT')
                ->where('designation', $ancienStatut)
                ->update([
                    'is_active' => false,
                    'updated_at' => DB::raw("CONVERT(date, GETDATE(), 120)")
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remettre les anciens statuts
        $anciensStatuts = [
            'Nouveau' => 'Nouveau',
            'En attente de validation' => 'En attente',
            'Validé par directeur' => 'En attente',
            'En instance' => 'En instance',
            'En cours' => 'En cours',
            'Terminé' => 'Terminé',
            'Clôturé' => 'Clôturé',
            'Refusé par administrateur' => 'Refusé',
            'Refusé par directeur' => 'Refusé',
        ];
        
        foreach ($anciensStatuts as $nouveauNom => $ancienNom) {
            DB::table('T_STATUT')
                ->where('designation', $nouveauNom)
                ->update([
                    'designation' => $ancienNom,
                    'is_active' => true,
                    'updated_at' => DB::raw("CONVERT(date, GETDATE(), 120)")
                ]);
        }
    }
}; 