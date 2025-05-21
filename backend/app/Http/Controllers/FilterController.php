<?php

namespace App\Http\Controllers;

use App\Models\Categorie;
use App\Models\Demandeur;
use App\Models\Societe;
use App\Models\Emplacement;
use App\Models\Statut;
use App\Models\Priorite;
use App\Models\Executant;
use Illuminate\Http\Request;

class FilterController extends Controller
{
    public function getAllFilters()
    {
        try {
            $filters = [
                'categories' => Categorie::where('is_active', true)->get(),
                'demandeurs' => Demandeur::where('statut', 1)->get(),
                'societes' => Societe::all(),
                'emplacements' => Emplacement::where('is_active', true)->get(),
                'statuts' => Statut::all(),
                'priorites' => Priorite::all(),
                'executants' => Executant::all(),
            ];

            return response()->json($filters);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des filtres',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 