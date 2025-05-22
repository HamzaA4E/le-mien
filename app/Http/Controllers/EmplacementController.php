<?php

namespace App\Http\Controllers;

use App\Models\Emplacement;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmplacementController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Emplacement::class;
    }
    //Affichage des emplacements
    public function index(Request $request)
    {
        $query = Emplacement::query();
        
        // Si tous les emplacements sont actifs (pour l'admin)
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les emplacements actifs
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
        
        return Emplacement::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $emplacement = Emplacement::findOrFail($id);
        $emplacement->update($request->all());
        return $emplacement;
    }

    public function destroy($id)
    {
        $emplacement = Emplacement::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $emplacement->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 