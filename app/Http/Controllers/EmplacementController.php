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

    // public function destroy($id)
    // {
    //     $emplacement = Emplacement::findOrFail($id);
    //     // Au lieu de supprimer, on désactive l'entité
    //     $emplacement->update(['is_active' => false]);
    //     return response()->json(['success' => true]);
    // }
} 