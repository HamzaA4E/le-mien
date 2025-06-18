<?php

namespace App\Http\Controllers;

use App\Models\TypeDemande;
use App\Traits\ReferentialControllerTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TypeDemandeController extends Controller
{
    use ReferentialControllerTrait;

    //Récupérer le model
    protected function getModel()
    {
        return TypeDemande::class;
    }

    //Affichage des types de demandes
    public function index(Request $request)
    {
        $query = TypeDemande::query();
        
        // Si tous les types sont actifs
        if ($request->has('all') && $request->all) {
            return $query->get();
        }
        
        // Par défaut, on ne retourne que les types actifs
        return $query->where('is_active', true)->get();
    }
}