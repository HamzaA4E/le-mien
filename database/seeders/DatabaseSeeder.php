<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Hash;
use App\Models\Categorie;
use App\Models\Emplacement;
use App\Models\Statut;
use App\Models\Service;
use App\Models\Societe;

use App\Models\Priorite;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Supprimer l'utilisateur s'il existe déjà
        Utilisateur::where('email', 'herohamza24@gmail.com')->delete();

        // Créer le nouvel utilisateur
        Utilisateur::create([
            'designation' => 'Reda DAMRI',
            'email' => 'herohamza24@gmail.com',
            'password' => Hash::make('password'),
            'niveau' => 1,
            'statut' => 1,
            'created_at' => date('Y-m-d'),
            'updated_at' => date('Y-m-d'),
        ]);

        Societe::firstOrCreate(['designation' => 'Famasser']);

       

        Priorite::firstOrCreate(['designation' => 'Urgent']);

        // Ajouter la catégorie "achat"
        Categorie::firstOrCreate(['designation' => 'achat']);

        // Ajouter l'emplacement "sapino"
        Emplacement::firstOrCreate(['designation' => 'sapino']);

        // Ajouter les statuts de base
        $statuts = ['Nouveau', 'En instance','En cours', 'Terminé','Clôturé', 'Refusé'];
        foreach ($statuts as $statut) {
            Statut::firstOrCreate(['designation' => $statut]);
        }

        // Ajouter les services
        $services = [
            'Achat',
            'Administration',
            'Finance et Comptabilité',
            'Marketing et Communication',
            'Fabrication',
            'Logistique',
            'Commercial'
        ];

        foreach ($services as $service) {
            Service::firstOrCreate(
                ['designation' => $service],
                ['is_active' => true]
            );
        }
    }
}
