<?php

namespace App\Observers;

use App\Models\Utilisateur;
use App\Models\Demandeur;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;

class UtilisateurObserver
{
    /**
     * Handle the Utilisateur "created" event.
     */
    public function created(Utilisateur $utilisateur): void
    {
        // Si l'utilisateur est un demandeur (niveau 4)
        if ($utilisateur->niveau === 4) {
            try {
                // Vérifier si un demandeur existe déjà avec cette désignation
                $existingDemandeur = Demandeur::where('designation', $utilisateur->designation)->first();
                
                if (!$existingDemandeur) {
                    // Récupérer id_service depuis la requête courante
                    $id_service = request()->input('id_service');
                    // Créer un demandeur correspondant
                    $demandeur = Demandeur::create([
                        'designation' => $utilisateur->designation,
                        'id_service' => $id_service,
                        'statut' => 1, // Actif par défaut
                        'is_active' => true
                    ]);
                    
                    Log::info('Demandeur créé automatiquement pour l\'utilisateur', [
                        'utilisateur_id' => $utilisateur->id,
                        'demandeur_id' => $demandeur->id,
                        'designation' => $utilisateur->designation,
                        'id_service' => $id_service
                    ]);
                } else {
                    // Mettre à jour le demandeur existant
                    $existingDemandeur->update([
                        'is_active' => true,
                        'statut' => 1
                    ]);
                    
                    Log::info('Demandeur existant mis à jour pour l\'utilisateur', [
                        'utilisateur_id' => $utilisateur->id,
                        'demandeur_id' => $existingDemandeur->id,
                        'designation' => $utilisateur->designation
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création automatique du demandeur', [
                    'utilisateur_id' => $utilisateur->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }

    /**
     * Handle the Utilisateur "updated" event.
     */
    public function updated(Utilisateur $utilisateur): void
    {
        // Si l'utilisateur devient un demandeur (niveau 4)
        if ($utilisateur->niveau === 4 && $utilisateur->isDirty('niveau')) {
            try {
                // Vérifier si un demandeur existe déjà
                $demandeur = Demandeur::where('designation', $utilisateur->designation)->first();
                
                if (!$demandeur) {
                    // Créer un demandeur correspondant
                    $demandeur = Demandeur::create([
                        'designation' => $utilisateur->designation,
                        'id_service' => $utilisateur->id_service ?? null,
                        'statut' => 1, // Actif par défaut
                        'is_active' => true
                    ]);
                    
                    Log::info('Demandeur créé automatiquement pour l\'utilisateur mis à jour', [
                        'utilisateur_id' => $utilisateur->id,
                        'demandeur_id' => $demandeur->id,
                        'designation' => $utilisateur->designation
                    ]);
                } else {
                    // Mettre à jour le demandeur existant
                    $demandeur->update([
                        'is_active' => true,
                        'statut' => 1,
                        'id_service' => $utilisateur->id_service ?? $demandeur->id_service
                    ]);
                    
                    Log::info('Demandeur mis à jour pour l\'utilisateur', [
                        'utilisateur_id' => $utilisateur->id,
                        'demandeur_id' => $demandeur->id,
                        'designation' => $utilisateur->designation
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création/mise à jour du demandeur', [
                    'utilisateur_id' => $utilisateur->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }

    /**
     * Handle the Utilisateur "deleted" event.
     */
    public function deleted(Utilisateur $utilisateur): void
    {
        // Si l'utilisateur était un demandeur
        if ($utilisateur->niveau === 4) {
            try {
                // Désactiver le demandeur correspondant
                $demandeur = Demandeur::where('designation', $utilisateur->designation)->first();
                if ($demandeur) {
                    $demandeur->update([
                        'is_active' => false,
                        'statut' => 0
                    ]);
                    Log::info('Demandeur désactivé après suppression de l\'utilisateur', [
                        'utilisateur_id' => $utilisateur->id,
                        'demandeur_id' => $demandeur->id,
                        'designation' => $utilisateur->designation
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de la désactivation du demandeur', [
                    'utilisateur_id' => $utilisateur->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }
} 