<?php

namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

trait ReferentialControllerTrait
{
    /**
     * Mise à jour optimisée du statut d'un référentiel avec SQL brut
     */
    public function updateStatutOptimized(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $model = $this->getModel();
        $table = (new $model)->getTable();
        
        // Utilisation de SQL brut pour une mise à jour directe
        $updated = DB::update(
            "UPDATE {$table} SET is_active = ? WHERE id = ?",
            [$request->is_active, $id]
        );
        
        if (config('app.debug')) {
            $modelName = class_basename($model);
            Log::info("Update Statut Optimized {$modelName}", [
                'id' => $id, 
                'new_status' => $request->is_active,
                'success' => $updated > 0
            ]);
        }

        return response()->json([
            'success' => $updated > 0,
            'message' => $updated > 0 ? 'Statut mis à jour avec succès' : 'Échec de la mise à jour du statut'
        ]);
    }

    /**
     * Mise à jour optimisée du statut d'un référentiel
     */
    public function updateStatut(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $model = $this->getModel();
        $updated = $model::where('id', $id)->update(['is_active' => $request->is_active]);
        
        if (config('app.debug')) {
            $modelName = class_basename($model);
            Log::info("Update Statut {$modelName}", [
                'id' => $id, 
                'new_status' => $request->is_active,
                'success' => $updated > 0
            ]);
        }

        return response()->json([
            'success' => $updated > 0,
            'message' => $updated > 0 ? 'Statut mis à jour avec succès' : 'Échec de la mise à jour du statut'
        ]);
    }

    /**
     * Mise à jour optimisée d'un référentiel
     */
    public function update(Request $request, $id)
    {
        // Si on ne met à jour que le statut, on utilise la méthode dédiée
        if ($request->has('is_active') && count($request->all()) === 1) {
            return $this->updateStatut($request, $id);
        }

        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        // Vérifier l'unicité de la désignation en excluant l'élément en cours de modification
        if ($this->designationExists($request->designation, $id)) {
            return response()->json([
                'message' => 'Cette désignation existe déjà'
            ], 422);
        }
        
        $model = $this->getModel();
        $item = $model::findOrFail($id);
        $item->update($request->all());
        
        if (config('app.debug')) {
            $modelName = class_basename($model);
            Log::info("Update {$modelName}", ['id' => $id, 'changes' => $request->all()]);
        }
        
        return $item;
    }

    /**
     * Désactivation optimisée d'un référentiel
     */
    public function destroy($id)
    {
        \Log::info('Tentative de suppression d\'une entité référentielle', ['model' => $this->getModel(), 'id' => $id]);
        $model = $this->getModel();
        $item = $model::findOrFail($id);
        \Log::info('Entité trouvée', ['item' => $item->toArray()]);

        // Déterminer la colonne à vérifier dans T_TICKET selon l'entité
        $column = null;
        if ($model === \App\Models\Demandeur::class) {
            $column = 'Id_Demandeur';
        } elseif ($model === \App\Models\Categorie::class) {
            $column = 'Id_Categorie';
        } elseif ($model === \App\Models\Emplacement::class) {
            $column = 'Id_Emplacement';
        } elseif ($model === \App\Models\Service::class) {
            $demandeurIds = \App\Models\Demandeur::where('id_service', $id)->pluck('id');
            $used = \App\Models\Ticket::whereIn('Id_Demandeur', $demandeurIds)->exists();
            \Log::info('Vérification utilisation Service', ['demandeurIds' => $demandeurIds, 'used' => $used]);
            if ($used) {
                if (!$item->is_active) {
                    try {
                        $item->delete();
                        \Log::info('Suppression réelle effectuée (service inactif et utilisé)');
                        return response()->json(['success' => true, 'message' => 'Entité supprimée']);
                    } catch (\Exception $e) {
                        \Log::error('Erreur lors de la suppression réelle (service)', ['error' => $e->getMessage()]);
                        return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression', 'error' => $e->getMessage()], 500);
                    }
                }
                $item->update(['is_active' => false]);
                \Log::info('Entité désactivée (service utilisé dans un ticket)');
                return response()->json(['success' => true, 'message' => 'Entité désactivée (utilisée dans un ticket)']);
            } else {
                try {
                    $item->delete();
                    \Log::info('Suppression réelle effectuée (service non utilisé)');
                    return response()->json(['success' => true, 'message' => 'Entité supprimée']);
                } catch (\Exception $e) {
                    \Log::error('Erreur lors de la suppression réelle (service)', ['error' => $e->getMessage()]);
                    return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression', 'error' => $e->getMessage()], 500);
                }
            }
        } elseif ($model === \App\Models\Priorite::class) {
            $column = 'Id_Priorite';
        } elseif ($model === \App\Models\Statut::class) {
            $column = 'Id_Statut';
        } elseif ($model === \App\Models\TypeDemande::class) {
            $column = 'Id_TypeDemande';
        }

        if ($column) {
            $used = \App\Models\Ticket::where($column, $id)->exists();
            \Log::info('Vérification utilisation', ['column' => $column, 'id' => $id, 'used' => $used]);
            if ($used) {
                if (!$item->is_active) {
                    try {
                        $item->delete();
                        \Log::info('Suppression réelle effectuée (inactif et utilisé)');
                        return response()->json(['success' => true, 'message' => 'Entité supprimée']);
                    } catch (\Exception $e) {
                        \Log::error('Erreur lors de la suppression réelle', ['error' => $e->getMessage()]);
                        return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression', 'error' => $e->getMessage()], 500);
                    }
                }
                $item->update(['is_active' => false]);
                \Log::info('Entité désactivée (utilisée dans un ticket)');
                return response()->json(['success' => true, 'message' => 'Entité désactivée (utilisée dans un ticket)']);
            } else {
                try {
                    $item->delete();
                    \Log::info('Suppression réelle effectuée (non utilisé)');
                    return response()->json(['success' => true, 'message' => 'Entité supprimée']);
                } catch (\Exception $e) {
                    \Log::error('Erreur lors de la suppression réelle', ['error' => $e->getMessage()]);
                    return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression', 'error' => $e->getMessage()], 500);
                }
            }
        }

        // Par défaut, suppression réelle
        try {
            $item->delete();
            \Log::info('Suppression réelle effectuée (cas par défaut)');
            return response()->json(['success' => true, 'message' => 'Entité supprimée']);
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la suppression réelle (cas par défaut)', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erreur lors de la suppression', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Liste des éléments avec filtrage par statut
     */
    public function index(Request $request)
    {
        $model = $this->getModel();
        $query = $model::query();
        
        // Si on demande explicitement tous les éléments (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les éléments actifs
        return $query->where('is_active', true)->get();
    }

    /**
     * Vérifie si une désignation existe déjà (insensible à la casse)
     */
    protected function designationExists($designation, $excludeId = null)
    {
        $model = $this->getModel();
        $query = $model::whereRaw('LOWER(designation) = ?', [strtolower(trim($designation))]);
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return $query->exists();
    }

    /**
     * Création d'un nouvel élément
     */
    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        // Vérifier l'unicité de la désignation
        if ($this->designationExists($request->designation)) {
            return response()->json([
                'message' => 'Cette désignation existe déjà'
            ], 422);
        }
        
        $data = $request->all();
        // Par défaut, les nouvelles entités sont actives
        if (!isset($data['is_active'])) {
            $data['is_active'] = true;
        }
        
        $model = $this->getModel();
        return $model::create($data);
    }

    /**
     * Retourne le modèle associé au contrôleur
     */
    abstract protected function getModel();

    /**
     * Retourne les IDs des entités référentielles utilisées dans les tickets
     */
    public function usedItems()
    {
        $model = $this->getModel();
        $column = null;

        if ($model === \App\Models\Demandeur::class) {
            $column = 'Id_Demandeur';
        } elseif ($model === \App\Models\Categorie::class) {
            $column = 'Id_Categorie';
        } elseif ($model === \App\Models\Emplacement::class) {
            $column = 'Id_Emplacement';
        } elseif ($model === \App\Models\Service::class) {
            // Pour Service, il faut passer par Demandeur
            $ids = \App\Models\Demandeur::whereIn('id', \App\Models\Ticket::distinct()->pluck('Id_Demandeur'))
                ->pluck('id_service')
                ->unique()
                ->values();
            return response()->json($ids);
        } elseif ($model === \App\Models\Priorite::class) {
            $column = 'Id_Priorite';
        } elseif ($model === \App\Models\Statut::class) {
            $column = 'Id_Statut';
        } elseif ($model === \App\Models\TypeDemande::class) {
            $column = 'Id_TypeDemande';
        }

        if ($column) {
            $ids = \App\Models\Ticket::distinct()->pluck($column)->filter()->values();
            return response()->json($ids);
        }

        return response()->json([]);
    }
} 