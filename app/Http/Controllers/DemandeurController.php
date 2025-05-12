<?php

namespace App\Http\Controllers;

use App\Models\Demandeur;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DemandeurController extends Controller
{
    public function index()
    {
        $demandeurs = Demandeur::with('service')->get();
        return response()->json($demandeurs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
            'id_service' => 'required|exists:T_SERVICE,id',
        ]);

        $demandeur = Demandeur::create($validated);
        return response()->json($demandeur, 201);
    }
} 