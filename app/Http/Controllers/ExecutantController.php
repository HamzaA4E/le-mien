<?php

namespace App\Http\Controllers;

use App\Models\Executant;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExecutantController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Executant::class;
    }

    public function index(Request $request)
    {
        $query = Executant::query();
        
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
        
        return Executant::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $executant = Executant::findOrFail($id);
        $executant->update($request->all());
        return $executant;
    }

    public function destroy($id)
    {
        $executant = Executant::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $executant->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 