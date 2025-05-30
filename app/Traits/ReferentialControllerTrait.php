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
        return $this->updateStatut(new Request(['is_active' => false]), $id);
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
     * Création d'un nouvel élément
     */
    public function store(Request $request)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
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
} 