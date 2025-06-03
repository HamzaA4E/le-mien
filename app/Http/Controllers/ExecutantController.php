<?php

namespace App\Http\Controllers;

use App\Models\Executant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ExecutantController extends Controller
{
    public function index()
    {
        try {
            $executants = Executant::where('is_active', true)
                                 ->orderBy('designation')
                                 ->get();
            
            return response()->json($executants);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des exécutants', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la récupération des exécutants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'designation' => 'required|string|max:50|unique:T_EXECUTANT,designation'
            ]);

            $executant = Executant::create([
                'designation' => $validated['designation'],
                'is_active' => true
            ]);

            return response()->json([
                'message' => 'Exécutant créé avec succès',
                'executant' => $executant
            ], 201);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la création de l\'exécutant', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la création de l\'exécutant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Executant $executant)
    {
        try {
            $validated = $request->validate([
                'designation' => 'required|string|max:50|unique:T_EXECUTANT,designation,' . $executant->id . ',id',
                'is_active' => 'boolean'
            ]);

            $executant->update($validated);

            return response()->json([
                'message' => 'Exécutant mis à jour avec succès',
                'executant' => $executant
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la mise à jour de l\'exécutant', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la mise à jour de l\'exécutant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Executant $executant)
    {
        try {
            // Vérifier si l'exécutant est utilisé dans des tickets
            if ($executant->tickets()->exists()) {
                return response()->json([
                    'message' => 'Impossible de supprimer cet exécutant car il est assigné à des tickets'
                ], 400);
            }

            $executant->delete();

            return response()->json([
                'message' => 'Exécutant supprimé avec succès'
            ]);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression de l\'exécutant', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Erreur lors de la suppression de l\'exécutant',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 