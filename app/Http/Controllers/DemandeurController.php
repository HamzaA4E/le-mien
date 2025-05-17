<?php

namespace App\Http\Controllers;

use App\Models\Demandeur;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DemandeurController extends Controller
{
    use ReferentialControllerTrait;

    protected function getModel()
    {
        return Demandeur::class;
    }

    public function index(Request $request)
    {
        $query = Demandeur::query();
        
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
        
        return Demandeur::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $demandeur = Demandeur::findOrFail($id);
        $demandeur->update($request->all());
        return $demandeur;
    }

    public function destroy($id)
    {
        $demandeur = Demandeur::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $demandeur->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 