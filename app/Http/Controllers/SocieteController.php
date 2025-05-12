<?php

namespace App\Http\Controllers;

use App\Models\Societe;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SocieteController extends Controller
{
    public function index()
    {
        $societes = Societe::all();
        return response()->json($societes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'designation' => 'required|string|max:50',
        ]);

        $societe = Societe::create($validated);
        return response()->json($societe, 201);
    }
} 