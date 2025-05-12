<?php

namespace App\Http\Controllers;

use App\Models\TypeDemande;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TypeDemandeController extends Controller
{
    public function index()
    {
        $typesDemande = TypeDemande::all();
        return response()->json($typesDemande);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $typeDemande = TypeDemande::create($validated);
        return response()->json($typeDemande, 201);
    }
} 