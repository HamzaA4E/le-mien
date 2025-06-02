<?php

namespace App\Http\Controllers;

use App\Models\Demandeur;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DemandeurController extends Controller
{
    use ReferentialControllerTrait;

    //Récupérer le model
    protected function getModel()
    {
        return Demandeur::class;
    }

    //Affichage des demandeurs
    public function index(Request $request)
    {
        $query = Demandeur::query();
        
        // Si tous les demandeurs sont actifs
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les demandeurs actifs
        return $query->where('is_active', true)->get();
    }

    // public function destroy($id)
    // {
    //     $demandeur = Demandeur::findOrFail($id);
    //     // Au lieu de supprimer, on désactive l'entité
    //     $demandeur->update(['is_active' => false]);
    //     return response()->json(['success' => true]);
    // }
} 