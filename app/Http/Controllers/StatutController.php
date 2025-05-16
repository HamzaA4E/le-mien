<?php

namespace App\Http\Controllers;

use App\Models\Statut;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StatutController extends Controller
{
    public function index(Request $request)
    {
        $query = Statut::query();
        
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
        
        return Statut::create($data);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'designation' => 'required|string|max:255',
            'is_active' => 'boolean'
        ]);
        
        $statut = Statut::findOrFail($id);
        $statut->update($request->all());
        return $statut;
    }

    public function destroy($id)
    {
        $statut = Statut::findOrFail($id);
        // Au lieu de supprimer, on désactive l'entité
        $statut->update(['is_active' => false]);
        return response()->json(['success' => true]);
    }
} 