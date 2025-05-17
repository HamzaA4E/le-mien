<?php

namespace App\Http\Controllers;

use App\Models\Societe;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class SocieteController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Societe::class;
    }

    public function index(Request $request)
    {
        $query = Societe::query();
        
        // Si on demande explicitement tous les éléments (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les éléments actifs
        return $query->where('is_active', true)->get();
    }

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
        
        return Societe::create($data);
    }

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
        
        $societe = Societe::findOrFail($id);
        $societe->update($request->all());
        
        if (config('app.debug')) {
            \Log::info('Update Societe', ['id' => $id, 'changes' => $request->all()]);
        }
        
        return $societe;
    }

    public function updateStatut(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $updated = Societe::where('id', $id)->update(['is_active' => $request->is_active]);
        
        if (config('app.debug')) {
            \Log::info('Update Statut Societe', [
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

    public function destroy($id)
    {
        // Utilisation de la méthode optimisée pour la désactivation
        return $this->updateStatut(new Request(['is_active' => false]), $id);
    }

    /**
     * Test de performance des différentes méthodes de mise à jour
     */
    public function testPerformance($id)
    {
        $iterations = 100;
        $results = [
            'eloquent' => 0,
            'query_builder' => 0,
            'raw_sql' => 0
        ];

        // Test avec Eloquent
        $start = microtime(true);
        for ($i = 0; $i < $iterations; $i++) {
            Societe::where('id', $id)->update(['is_active' => true]);
            Societe::where('id', $id)->update(['is_active' => false]);
        }
        $results['eloquent'] = microtime(true) - $start;

        // Test avec Query Builder
        $start = microtime(true);
        for ($i = 0; $i < $iterations; $i++) {
            DB::table('T_SOCIETE')->where('id', $id)->update(['is_active' => true]);
            DB::table('T_SOCIETE')->where('id', $id)->update(['is_active' => false]);
        }
        $results['query_builder'] = microtime(true) - $start;

        // Test avec SQL brut
        $start = microtime(true);
        for ($i = 0; $i < $iterations; $i++) {
            DB::update("UPDATE T_SOCIETE SET is_active = ? WHERE id = ?", [true, $id]);
            DB::update("UPDATE T_SOCIETE SET is_active = ? WHERE id = ?", [false, $id]);
        }
        $results['raw_sql'] = microtime(true) - $start;

        return response()->json([
            'iterations' => $iterations,
            'results' => $results,
            'comparison' => [
                'eloquent_vs_query_builder' => ($results['eloquent'] - $results['query_builder']) / $results['eloquent'] * 100,
                'eloquent_vs_raw_sql' => ($results['eloquent'] - $results['raw_sql']) / $results['eloquent'] * 100,
                'query_builder_vs_raw_sql' => ($results['query_builder'] - $results['raw_sql']) / $results['query_builder'] * 100
            ]
        ]);
    }
} 