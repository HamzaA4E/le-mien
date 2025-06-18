<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\Hash;
use App\Models\Categorie;
use App\Models\Emplacement;
use App\Models\Statut;
use App\Models\Service;

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

        
    }
}
