<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Hash;
use App\Models\Categorie;
use App\Models\TypeDemande;
use App\Models\Emplacement;
use App\Models\Statut;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Supprimer l'utilisateur s'il existe déjà
        Utilisateur::where('email', 'it.support@famasser.com')->delete();

        // Créer le nouvel utilisateur
        Utilisateur::create([
            'designation' => 'Reda DAMRI',
            'email' => 'it.support@famasser.com',
            'password' => Hash::make('password'),
            'niveau' => 1,
            'statut' => 1,
            'created_at' => date('Y-m-d'),
            'updated_at' => date('Y-m-d'),
        ]);

        // Ajouter la catégorie "achat"
        Categorie::firstOrCreate(['designation' => 'achat']);

        // Ajouter le type de demande "projet"
        TypeDemande::firstOrCreate(['designation' => 'projet']);

        // Ajouter l'emplacement "sapino"
        Emplacement::firstOrCreate(['designation' => 'sapino']);

        // Ajouter les statuts de base
        $statuts = ['Nouveau', 'En instance','En cours', 'Terminé','Clôturé', 'Refusé'];
        foreach ($statuts as $statut) {
            Statut::firstOrCreate(['designation' => $statut]);
        }
    }
}
