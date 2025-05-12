<?php

namespace App\Http\Controllers;

use App\Models\Statut;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StatutController extends Controller
{
    public function index()
    {
        $statuts = Statut::all();
        return response()->json($statuts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $statut = Statut::create($validated);
        return response()->json($statut, 201);
    }
} 