<?php

namespace App\Http\Controllers;

use App\Models\Demandeur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DemandeurController extends Controller
{
    public function index()
    {
        return Demandeur::all();
    }

    public function store(Request $request)
    {
        $request->validate(['designation' => 'required|string|max:255']);
        return Demandeur::create($request->all());
    }

    public function update(Request $request, $id)
    {
        $demandeur = Demandeur::findOrFail($id);
        $demandeur->update($request->all());
        return $demandeur;
    }

    public function destroy($id)
    {
        $demandeur = Demandeur::findOrFail($id);
        try {
            $demandeur->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impossible de supprimer ce demandeur car il est utilisé ailleurs.',
                'error' => $e->getMessage()
            ], 400);
        }
    }
} 